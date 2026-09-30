import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { type Blocker, type CourseRecord, type StudentState, eligibility } from "./enrolment";
import { classes, courses, enrolments, prerequisites, students } from "./schema";
import { CURRENT_SESSION, seed } from "./seed";

// One SQLite file is the app's whole persistent state. In production
// fly.toml points DATABASE_PATH at the machine's volume (/data), which is
// how state survives a reload and a redeploy; locally it defaults to an
// untracked file in .data/.
const path = process.env.DATABASE_PATH ?? "./.data/app.db";
mkdirSync(dirname(path), { recursive: true });

const client = new Database(path);
client.pragma("journal_mode = WAL");
// SQLite enforces foreign keys only when asked. The schema declares them, so
// the connection has to turn them on or they are decoration.
client.pragma("foreign_keys = ON");

export const db = drizzle(client);

// Migrations run at boot, on whatever machine holds the volume — the
// recommended shape for SQLite on Fly, where there's no separate machine to
// run them from. The flow: edit src/lib/schema.ts, `pnpm db:generate`,
// commit the migration it writes to drizzle/.
migrate(db, { migrationsFolder: "./drizzle" });

// The catalogue has to exist before the app means anything, and an empty
// volume on a fresh machine is the only time it is written.
seed(db);

export { CURRENT_SESSION };
export type { Student, Course, Class, Enrolment } from "./schema";

/** The student the console acts for. There is exactly one: this is the
 *  enrolment screen as you would see it once signed in, and signing in (ANU
 *  single sign on) is the part deliberately not built. The students table
 *  still exists because enrolments belong to a person, and a second person
 *  is a row, not a redesign. */
export function currentStudent() {
  return db.select().from(students).orderBy(asc(students.id)).get();
}

/** Every course in the current session, with its classes and prerequisites.
 *  Three queries rather than one join per course: the catalogue is small
 *  enough that loading it whole is cheaper than a round trip per row, and it
 *  is what lets the search results carry a decision each. */
export function loadCatalogue(): CourseRecord[] {
  const rows = db
    .select()
    .from(courses)
    .where(eq(courses.session, CURRENT_SESSION))
    .orderBy(asc(courses.code))
    .all();
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const allClasses = db.select().from(classes).where(inArray(classes.courseId, ids)).all();
  const allPrereqs = db
    .select()
    .from(prerequisites)
    .where(inArray(prerequisites.courseId, ids))
    .all();

  return rows.map((row) => ({
    ...row,
    classes: allClasses
      .filter((session) => session.courseId === row.id)
      .sort((a, b) => a.day - b.day || a.startMin - b.startMin),
    prereqs: allPrereqs.filter((p) => p.courseId === row.id).map((p) => p.requiresCode),
  }));
}

/** Live enrolled headcount per course id, which is what the quota rule and
 *  the seats remaining figure both read. */
export function seatsTaken(): Record<number, number> {
  const rows = db
    .select({ courseId: enrolments.courseId, taken: sql<number>`count(*)` })
    .from(enrolments)
    .where(eq(enrolments.status, "enrolled"))
    .groupBy(enrolments.courseId)
    .all();
  return Object.fromEntries(rows.map((row) => [row.courseId, Number(row.taken)]));
}

/** Everything the rules need about one student, assembled once per request. */
export function loadStudentState(
  student: StudentState["student"],
  catalogue: CourseRecord[] = loadCatalogue(),
): StudentState {
  const byId = new Map(catalogue.map((record) => [record.id, record]));

  const mine = db
    .select({ courseId: enrolments.courseId, status: enrolments.status, code: courses.code })
    .from(enrolments)
    .innerJoin(courses, eq(courses.id, enrolments.courseId))
    .where(eq(enrolments.studentId, student.id))
    .all();

  const enrolled = mine
    .filter((row) => row.status === "enrolled")
    .map((row) => byId.get(row.courseId))
    .filter((record): record is CourseRecord => record !== undefined);

  return {
    student,
    enrolled,
    completedCodes: mine.filter((row) => row.status === "completed").map((row) => row.code),
    seatsTaken: seatsTaken(),
  };
}

export function courseByCode(code: string, catalogue: CourseRecord[] = loadCatalogue()) {
  const wanted = code.trim().toUpperCase();
  return catalogue.find((record) => record.code === wanted);
}

/** Courses in the catalogue that require this one. Answering "what does this
 *  unlock" is the question the real system makes you work out by hand. */
export function requiredBy(code: string, catalogue: CourseRecord[] = loadCatalogue()) {
  return catalogue.filter((record) => record.prereqs.includes(code));
}

export type EnrolResult = { ok: true } | { ok: false; blocker: Blocker };

/**
 * Add a course to a student's enrolment, deciding inside a transaction.
 *
 * The decision is re-made here rather than trusted from the page, because the
 * page's copy of the state is as old as the last render: two tabs, or two
 * people racing for the last place, both saw seats remaining. Re-reading
 * inside the transaction is what makes the quota and unit cap rules true
 * rather than advisory, and the unique index on (student, course) is the last
 * line of defence under a genuine race.
 */
export function enrol(studentId: number, courseId: number): EnrolResult {
  return db.transaction((tx): EnrolResult => {
    const student = tx.select().from(students).where(eq(students.id, studentId)).get();
    if (!student) {
      return { ok: false, blocker: { code: "career", message: "That student record is gone." } };
    }

    const catalogue = loadCatalogue();
    const course = catalogue.find((record) => record.id === courseId);
    if (!course) {
      return {
        ok: false,
        blocker: { code: "career", message: "That course is not in this session's catalogue." },
      };
    }

    const verdict = eligibility(course, loadStudentState(student, catalogue));
    if (!verdict.allowed) return { ok: false, blocker: verdict.blocker };

    tx.insert(enrolments).values({ studentId, courseId, status: "enrolled" }).run();
    return { ok: true };
  });
}

/** Remove an enrolled course. Completed results are history and are never
 *  removed by this path. */
export function drop(studentId: number, courseId: number): boolean {
  const removed = db
    .delete(enrolments)
    .where(
      and(
        eq(enrolments.studentId, studentId),
        eq(enrolments.courseId, courseId),
        eq(enrolments.status, "enrolled"),
      ),
    )
    .returning()
    .all();
  return removed.length > 0;
}
