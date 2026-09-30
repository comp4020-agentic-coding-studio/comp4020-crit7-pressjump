import { sql } from "drizzle-orm";
import { index, int, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both — the migration applies automatically when the server
// boots (see src/lib/db.ts), locally and deployed. Never edit the database
// by hand: state on the deployed volume outlives every deploy, and the
// migration trail is what keeps old state and new code compatible.
//
// Five tables model the slice of enrolment this app replaces. The shape is
// chosen so the rules the real system defers to its last page — clashes,
// prerequisites, unit caps, career, quota — are answerable from the database
// with the data already loaded for the search results.

/** A person enrolling. Career and unit cap are what make a course eligible
 *  or not, so they live on the student rather than in session state. */
export const students = sqliteTable("students", {
  id: int().primaryKey({ autoIncrement: true }),
  uid: text().notNull().unique(),
  name: text().notNull(),
  program: text().notNull(),
  /** "UGRD" or "PGRD": a course declares the career it admits. */
  career: text().notNull(),
  /** Maximum units the student may hold in one session. ANU's standard full
   *  time load is 24 units; this is per student so an overload approval is a
   *  data change rather than a code change. */
  unitCap: int("unit_cap").notNull().default(24),
});

/** A course offering in one session. Code is unique because the whole app
 *  addresses courses by code, and the database is where that is guaranteed. */
export const courses = sqliteTable(
  "courses",
  {
    id: int().primaryKey({ autoIncrement: true }),
    code: text().notNull().unique(),
    title: text().notNull(),
    units: int().notNull(),
    career: text().notNull(),
    session: text().notNull(),
    mode: text().notNull(),
    convenor: text().notNull(),
    description: text().notNull(),
    /** Places in the offering. Compared against live enrolment counts. */
    quota: int().notNull(),
  },
  (t) => [index("courses_session_idx").on(t.session)],
);

/** A scheduled meeting of a course. Times are minutes from midnight so an
 *  overlap is integer arithmetic the database can do, not string parsing. */
export const classes = sqliteTable(
  "classes",
  {
    id: int().primaryKey({ autoIncrement: true }),
    courseId: int("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    /** "Lecture", "Tutorial", "Lab". */
    kind: text().notNull(),
    /** 1 is Monday through 5 is Friday. */
    day: int().notNull(),
    startMin: int("start_min").notNull(),
    endMin: int("end_min").notNull(),
    location: text().notNull(),
  },
  (t) => [index("classes_course_idx").on(t.courseId)],
);

/** A course this course requires, held by code rather than by id so a
 *  requirement can name a course not in this session's catalogue. */
export const prerequisites = sqliteTable(
  "prerequisites",
  {
    id: int().primaryKey({ autoIncrement: true }),
    courseId: int("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    requiresCode: text("requires_code").notNull(),
  },
  (t) => [index("prerequisites_course_idx").on(t.courseId)],
);

/** The thing the app creates. "completed" rows are the student's history and
 *  are what prerequisite checks read; "enrolled" rows are this session's
 *  load. One row per student per course is a database constraint, so the
 *  double enrolment rule cannot be forgotten by a code path. */
export const enrolments = sqliteTable(
  "enrolments",
  {
    id: int().primaryKey({ autoIncrement: true }),
    studentId: int("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    courseId: int("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    /** "enrolled" or "completed". */
    status: text().notNull().default("enrolled"),
    grade: text(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [
    uniqueIndex("enrolments_student_course_idx").on(t.studentId, t.courseId),
    index("enrolments_course_idx").on(t.courseId),
  ],
);

export type Student = typeof students.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Class = typeof classes.$inferSelect;
export type Prerequisite = typeof prerequisites.$inferSelect;
export type Enrolment = typeof enrolments.$inferSelect;
