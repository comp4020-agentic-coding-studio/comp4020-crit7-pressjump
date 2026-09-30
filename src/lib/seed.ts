import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { classes, courses, enrolments, prerequisites, students } from "./schema";

// The seeded catalogue. Course codes, titles and unit values follow real ANU
// courses so the app is recognisable to someone who uses the real system;
// everything else here (class times, rooms, quotas, convenors, and the
// student record) is invented, and the app says so on every page that shows
// it. Nothing in this file is ANU data.
//
// Seeding runs once, at boot, and only into an empty database — see
// src/lib/db.ts. The deployed volume keeps its rows across every redeploy, so
// this is a starting catalogue rather than a fixture that gets reapplied.

/** Minutes from midnight, so an overlap is integer arithmetic. */
const at = (hour: number, minute = 0): number => hour * 60 + minute;

export const CURRENT_SESSION = "2026 S2";

type SeedClass = [kind: string, day: number, start: number, end: number, location: string];

type SeedCourse = {
  code: string;
  title: string;
  units: number;
  career: "UGRD" | "PGRD";
  mode: string;
  convenor: string;
  quota: number;
  description: string;
  classes: SeedClass[];
  prereqs?: string[];
};

const CATALOGUE: SeedCourse[] = [
  {
    code: "COMP1100",
    title: "Programming as Problem Solving",
    units: 6,
    career: "UGRD",
    mode: "In person",
    convenor: "Dr Ruth Halloran",
    quota: 320,
    description:
      "The first programming course: how to take a problem apart until the pieces are small enough to write down.",
    classes: [
      ["Lecture", 1, at(10), at(12), "Manning Clark Theatre 1"],
      ["Lab", 3, at(14), at(16), "CSIT N111"],
    ],
  },
  {
    code: "COMP1110",
    title: "Structured Programming",
    units: 6,
    career: "UGRD",
    mode: "In person",
    convenor: "Dr Ruth Halloran",
    quota: 260,
    description:
      "Building programs large enough that structure starts to matter, and the tools that keep them honest.",
    classes: [
      ["Lecture", 2, at(9), at(11), "Manning Clark Theatre 2"],
      ["Lab", 4, at(9), at(11), "CSIT N113"],
    ],
    prereqs: ["COMP1100"],
  },
  {
    code: "COMP1600",
    title: "Foundations of Computing",
    units: 6,
    career: "UGRD",
    mode: "In person",
    convenor: "Prof Nadia Belov",
    quota: 200,
    description: "Logic, proof and automata: the mathematics a computing degree is built on.",
    classes: [
      ["Lecture", 1, at(13), at(15), "Hancock Theatre"],
      ["Tutorial", 5, at(10), at(11), "CSIT N101"],
    ],
    prereqs: ["MATH1005"],
  },
  {
    code: "COMP2100",
    title: "Software Design Methodologies",
    units: 6,
    career: "UGRD",
    mode: "In person",
    convenor: "Dr Tomas Iversen",
    quota: 180,
    description: "How teams keep a growing codebase from collapsing under its own weight.",
    classes: [
      ["Lecture", 2, at(14), at(16), "Copland Theatre"],
      ["Tutorial", 4, at(14), at(15), "CSIT N109"],
    ],
    prereqs: ["COMP1110"],
  },
  {
    code: "COMP2300",
    title: "Introduction to Computer Systems",
    units: 6,
    career: "UGRD",
    mode: "In person",
    convenor: "Dr Ben Sorensen",
    quota: 200,
    description:
      "What is actually happening underneath your program, down to the instructions and the wires.",
    classes: [
      ["Lecture", 3, at(10), at(12), "Manning Clark Theatre 3"],
      ["Lab", 5, at(13), at(15), "CSIT N114"],
    ],
    prereqs: ["COMP1100"],
  },
  {
    code: "COMP2310",
    title: "Systems, Networks and Concurrency",
    units: 6,
    career: "UGRD",
    mode: "In person",
    convenor: "Dr Ben Sorensen",
    quota: 160,
    description:
      "Many things happening at once, and the small number of ideas that stop them corrupting each other.",
    classes: [
      ["Lecture", 2, at(10), at(12), "Hancock Theatre"],
      ["Lab", 4, at(16), at(18), "CSIT N114"],
    ],
    prereqs: ["COMP2300"],
  },
  {
    code: "COMP2400",
    title: "Relational Databases",
    units: 6,
    career: "UGRD",
    mode: "In person",
    convenor: "Dr Amara Osei",
    quota: 170,
    description:
      "Schemas, normalisation and query planning: why the shape of your data decides what your app can do.",
    classes: [
      ["Lecture", 1, at(16), at(18), "Copland Theatre"],
      ["Tutorial", 3, at(16), at(17), "CSIT N101"],
    ],
    prereqs: ["COMP1110"],
  },
  {
    code: "COMP2610",
    title: "Information Theory",
    units: 6,
    career: "UGRD",
    mode: "In person",
    convenor: "Prof Nadia Belov",
    quota: 120,
    description: "Measuring information, and the limits on compressing and transmitting it.",
    classes: [
      ["Lecture", 4, at(11), at(13), "Hancock Theatre"],
      ["Tutorial", 5, at(15), at(16), "CSIT N105"],
    ],
    prereqs: ["MATH1013"],
  },
  {
    code: "COMP3600",
    title: "Algorithms",
    units: 6,
    career: "UGRD",
    mode: "In person",
    convenor: "Prof Nadia Belov",
    quota: 150,
    description: "Designing algorithms and proving what they cost before you write a line of them.",
    classes: [
      ["Lecture", 2, at(10), at(12), "Manning Clark Theatre 1"],
      ["Tutorial", 4, at(13), at(14), "CSIT N101"],
    ],
    prereqs: ["COMP1600", "COMP2100"],
  },
  {
    code: "COMP3610",
    title: "Principles of Programming Languages",
    units: 6,
    career: "UGRD",
    mode: "In person",
    convenor: "Dr Tomas Iversen",
    quota: 90,
    description: "Why languages differ, stated precisely enough that you could build one.",
    classes: [
      ["Lecture", 3, at(13), at(15), "CSIT N101"],
      ["Tutorial", 5, at(11), at(12), "CSIT N105"],
    ],
    prereqs: ["COMP1600"],
  },
  {
    code: "COMP3620",
    title: "Artificial Intelligence",
    units: 6,
    career: "UGRD",
    mode: "In person",
    convenor: "Dr Amara Osei",
    quota: 140,
    description: "Search, planning and reasoning: the part of AI that runs on ideas rather than on data.",
    classes: [
      ["Lecture", 1, at(9), at(11), "Hancock Theatre"],
      ["Tutorial", 3, at(9), at(10), "CSIT N109"],
    ],
    prereqs: ["COMP2100"],
  },
  {
    code: "COMP4020",
    title: "Agentic Coding Studio",
    units: 6,
    career: "UGRD",
    mode: "In person",
    convenor: "Dr Ben Swift",
    quota: 60,
    description:
      "Rapidly prototyping web apps with coding agents, in a studio where you demo work in progress every week.",
    classes: [
      ["Lecture", 2, at(16), at(18), "Marie Reay 5.02"],
      ["Studio", 4, at(10), at(12), "Marie Reay 4.03"],
    ],
    prereqs: ["COMP2100"],
  },
  {
    code: "COMP4300",
    title: "Parallel Systems",
    units: 6,
    career: "UGRD",
    mode: "In person",
    convenor: "Dr Ben Sorensen",
    quota: 70,
    description: "Making a problem run on many processors, and finding out where the speedup went.",
    classes: [
      ["Lecture", 3, at(9), at(11), "CSIT N101"],
      ["Lab", 5, at(9), at(11), "CSIT N114"],
    ],
    prereqs: ["COMP2310"],
  },
  {
    code: "COMP4610",
    title: "Computer Graphics",
    units: 6,
    career: "UGRD",
    mode: "In person",
    convenor: "Dr Ruth Halloran",
    quota: 80,
    description: "How a scene becomes pixels, from the geometry through to the light.",
    classes: [
      ["Lecture", 1, at(14), at(16), "CSIT N109"],
      ["Lab", 4, at(14), at(16), "CSIT N113"],
    ],
    prereqs: ["COMP2100", "MATH1014"],
  },
  {
    code: "COMP6250",
    title: "Professional Practice 1",
    units: 6,
    career: "PGRD",
    mode: "In person",
    convenor: "Dr Amara Osei",
    quota: 200,
    description:
      "The non technical half of the job: ethics, teams, communication, and the obligations that come with the work.",
    classes: [
      ["Lecture", 5, at(14), at(16), "Copland Theatre"],
      ["Tutorial", 2, at(13), at(14), "CSIT N105"],
    ],
  },
  {
    code: "COMP6442",
    title: "Software Construction",
    units: 6,
    career: "PGRD",
    mode: "In person",
    convenor: "Dr Tomas Iversen",
    quota: 130,
    description: "Writing software another person can safely change six months from now.",
    classes: [
      ["Lecture", 3, at(14), at(16), "Copland Theatre"],
      ["Lab", 5, at(16), at(18), "CSIT N113"],
    ],
    prereqs: ["COMP6710"],
  },
  {
    code: "COMP6490",
    title: "Document Analysis",
    units: 6,
    career: "PGRD",
    mode: "In person",
    convenor: "Dr Amara Osei",
    quota: 110,
    description: "Getting structure and meaning out of text at a scale nobody could read by hand.",
    classes: [
      ["Lecture", 4, at(9), at(11), "CSIT N101"],
      ["Tutorial", 2, at(15), at(16), "CSIT N109"],
    ],
  },
  {
    code: "COMP6710",
    title: "Structured Programming",
    units: 6,
    career: "PGRD",
    mode: "In person",
    convenor: "Dr Ruth Halloran",
    quota: 240,
    description: "The graduate entry programming course, for people whose first degree was in something else.",
    classes: [
      ["Lecture", 1, at(11), at(13), "Manning Clark Theatre 2"],
      ["Lab", 3, at(11), at(13), "CSIT N111"],
    ],
  },
  {
    code: "COMP8020",
    title: "Agentic Coding Studio",
    units: 6,
    career: "PGRD",
    mode: "In person",
    convenor: "Dr Ben Swift",
    quota: 60,
    description:
      "Rapidly prototyping web apps with coding agents, in a studio where you demo work in progress every week.",
    classes: [
      ["Lecture", 2, at(16), at(18), "Marie Reay 5.02"],
      ["Studio", 4, at(10), at(12), "Marie Reay 4.03"],
    ],
    prereqs: ["COMP6710"],
  },
  {
    code: "MATH1005",
    title: "Discrete Mathematical Models",
    units: 6,
    career: "UGRD",
    mode: "In person",
    convenor: "Dr Helen Prosser",
    quota: 280,
    description: "Counting, graphs and recursion: the mathematics that shows up once things stop being continuous.",
    classes: [
      ["Lecture", 1, at(12), at(13), "Manning Clark Theatre 3"],
      ["Tutorial", 3, at(12), at(13), "Hanna Neumann 1.58"],
    ],
  },
  {
    code: "MATH1013",
    title: "Mathematics and Applications 1",
    units: 6,
    career: "UGRD",
    mode: "In person",
    convenor: "Dr Helen Prosser",
    quota: 300,
    description: "Calculus and linear algebra, taught alongside the problems that needed them.",
    classes: [
      ["Lecture", 2, at(8), at(9), "Manning Clark Theatre 1"],
      ["Tutorial", 4, at(8), at(9), "Hanna Neumann 1.58"],
    ],
  },
  {
    code: "MATH1014",
    title: "Mathematics and Applications 2",
    units: 6,
    career: "UGRD",
    mode: "In person",
    convenor: "Dr Helen Prosser",
    quota: 250,
    description: "The second half of the first year sequence, where the linear algebra starts doing real work.",
    classes: [
      ["Lecture", 5, at(12), at(13), "Manning Clark Theatre 1"],
      ["Tutorial", 3, at(15), at(16), "Hanna Neumann 1.33"],
    ],
    prereqs: ["MATH1013"],
  },
  {
    code: "STAT1008",
    title: "Quantitative Research Methods",
    units: 6,
    career: "UGRD",
    mode: "Online",
    convenor: "Dr Helen Prosser",
    quota: 220,
    description: "Reading data honestly, and noticing when someone else has not.",
    classes: [["Lecture", 4, at(12), at(13), "Online"]],
  },
  {
    code: "ENGN1211",
    title: "Discovering Engineering",
    units: 6,
    career: "UGRD",
    mode: "In person",
    convenor: "Dr Priyanka Raghavan",
    quota: 190,
    description: "What engineers actually do, learned by building something small and watching it fail.",
    classes: [
      ["Lecture", 5, at(9), at(10), "Llewellyn Hall"],
      ["Lab", 1, at(9), at(12), "Ian Ross N101"],
    ],
  },
];

type SeedStudent = {
  uid: string;
  name: string;
  program: string;
  career: "UGRD" | "PGRD";
  unitCap: number;
  completed: string[];
  enrolled: string[];
};

// One invented person: the student whose enrolment screen this is. Their
// history is chosen so that every rule has something to say somewhere in the
// catalogue: graduate courses to be refused on career, a completed course to be
// refused as a repeat, a missing prerequisite, and class times that collide.
const STUDENTS: SeedStudent[] = [
  {
    uid: "u6011234",
    name: "Sam Okafor",
    program: "Bachelor of Advanced Computing (Honours)",
    career: "UGRD",
    unitCap: 24,
    completed: ["COMP1100", "COMP1110", "MATH1005", "MATH1013", "COMP2100"],
    enrolled: ["COMP2400"],
  },
];

/** Fills an empty database with the starting catalogue. Returns false if the
 *  database already held courses, which is the normal case on every boot
 *  after the first. */
export function seed(db: BetterSQLite3Database): boolean {
  if (db.select({ id: courses.id }).from(courses).limit(1).all().length > 0) return false;

  const codeToId = new Map<string, number>();
  for (const course of CATALOGUE) {
    const row = db
      .insert(courses)
      .values({
        code: course.code,
        title: course.title,
        units: course.units,
        career: course.career,
        session: CURRENT_SESSION,
        mode: course.mode,
        convenor: course.convenor,
        description: course.description,
        quota: course.quota,
      })
      .returning()
      .get();
    codeToId.set(course.code, row.id);

    for (const [kind, day, startMin, endMin, location] of course.classes) {
      db.insert(classes).values({ courseId: row.id, kind, day, startMin, endMin, location }).run();
    }
    for (const requiresCode of course.prereqs ?? []) {
      db.insert(prerequisites).values({ courseId: row.id, requiresCode }).run();
    }
  }

  for (const student of STUDENTS) {
    const row = db
      .insert(students)
      .values({
        uid: student.uid,
        name: student.name,
        program: student.program,
        career: student.career,
        unitCap: student.unitCap,
      })
      .returning()
      .get();

    for (const code of student.completed) {
      const courseId = codeToId.get(code);
      if (courseId === undefined) continue;
      db.insert(enrolments)
        .values({ studentId: row.id, courseId, status: "completed", grade: "CR" })
        .run();
    }
    for (const code of student.enrolled) {
      const courseId = codeToId.get(code);
      if (courseId === undefined) continue;
      db.insert(enrolments).values({ studentId: row.id, courseId, status: "enrolled" }).run();
    }
  }

  return true;
}
