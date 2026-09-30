import type { Class, Course, Student } from "./schema";

// Every enrolment rule lives here and nowhere else. A page may display a
// reason; it may not invent one. That is what keeps the search result and the
// confirm button agreeing with each other, which is the whole complaint about
// the system this replaces: it decides on the last page, after four slow loads
// have already gone by.
//
// This module is pure. It takes the rows and answers a question, which is why
// the rules are testable without a server or a database.

export type CourseRecord = Course & {
  classes: Class[];
  /** Course codes this course requires, as codes rather than ids: a
   *  requirement may name a course that is not in this session's catalogue. */
  prereqs: string[];
};

export type StudentState = {
  student: Student;
  /** This session's load, with class times, because clashes are decided
   *  against it. */
  enrolled: CourseRecord[];
  /** Codes with a completed result, which is what prerequisites read. */
  completedCodes: string[];
  /** Live enrolled headcount per course id, for the quota rule. */
  seatsTaken: Record<number, number>;
};

/** Why an enrolment cannot go ahead. The code is what the tests assert; the
 *  sentence is what the student reads. Adding a rule means adding both. */
export type Blocker = {
  code:
    | "already-enrolled"
    | "already-completed"
    | "career"
    | "prerequisite"
    | "clash"
    | "full"
    | "unit-cap";
  message: string;
};

export type Eligibility =
  | { allowed: true; seatsLeft: number }
  | { allowed: false; blocker: Blocker; seatsLeft: number };

const DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri"];

/** Minutes from midnight as a 24 hour clock time. */
export const clock = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export const classLabel = (session: Class): string =>
  `${session.kind} ${DAYS[session.day] ?? "?"} ${clock(session.startMin)} to ${clock(session.endMin)}`;

/** Two classes collide when they share a day and their half open intervals
 *  overlap. A class ending exactly when another starts is not a clash. */
export const overlaps = (a: Class, b: Class): boolean =>
  a.day === b.day && a.startMin < b.endMin && b.startMin < a.endMin;

export const unitsOf = (records: CourseRecord[]): number =>
  records.reduce((total, record) => total + record.units, 0);

/** The number of places left in an offering, never below zero. */
export const seatsLeftIn = (course: Course, seatsTaken: Record<number, number>): number =>
  Math.max(0, course.quota - (seatsTaken[course.id] ?? 0));

/**
 * Can this student add this course? The rules are checked in the order a
 * person would want to hear them: what you have already done, then who you
 * are, then what you are missing, then what it collides with, then what the
 * offering and your degree allow.
 */
export function eligibility(course: CourseRecord, state: StudentState): Eligibility {
  const seatsLeft = seatsLeftIn(course, state.seatsTaken);
  const blocked = (blocker: Blocker): Eligibility => ({ allowed: false, blocker, seatsLeft });

  if (state.enrolled.some((record) => record.id === course.id)) {
    return blocked({
      code: "already-enrolled",
      message: `You are already enrolled in ${course.code} this session.`,
    });
  }

  if (state.completedCodes.includes(course.code)) {
    return blocked({
      code: "already-completed",
      message: `You have already completed ${course.code}, so you cannot take it again.`,
    });
  }

  if (course.career !== state.student.career) {
    // "a undergraduate course" is the kind of thing a template produces and a
    // person never writes, so the article is chosen rather than assumed.
    const name = (career: string) => (career === "UGRD" ? "undergraduate" : "graduate");
    const article = (word: string) => (word.startsWith("u") ? "an" : "a");
    const yours = name(state.student.career);
    const theirs = name(course.career);
    return blocked({
      code: "career",
      message: `${course.code} is ${article(theirs)} ${theirs} course and you are enrolled in ${article(yours)} ${yours} program.`,
    });
  }

  const missing = course.prereqs.filter((code) => !state.completedCodes.includes(code));
  if (missing.length > 0) {
    const list = missing.join(" and ");
    return blocked({
      code: "prerequisite",
      message:
        missing.length === 1
          ? `${course.code} requires ${list}, and you have not completed it.`
          : `${course.code} requires ${list}, and you have completed neither.`,
    });
  }

  for (const mine of state.enrolled) {
    for (const theirClass of course.classes) {
      const hit = mine.classes.find((myClass) => overlaps(myClass, theirClass));
      if (hit) {
        return blocked({
          code: "clash",
          message: `${classLabel(theirClass)} collides with ${mine.code} ${classLabel(hit)}.`,
        });
      }
    }
  }

  if (seatsLeft === 0) {
    return blocked({
      code: "full",
      message: `${course.code} is full. All ${course.quota} places are taken.`,
    });
  }

  const current = unitsOf(state.enrolled);
  if (current + course.units > state.student.unitCap) {
    const over = current + course.units - state.student.unitCap;
    return blocked({
      code: "unit-cap",
      message: `Adding ${course.code} puts you ${over} units over your ${state.student.unitCap} unit limit. You hold ${current}.`,
    });
  }

  return { allowed: true, seatsLeft };
}

/** Self clashes inside the load a student already holds. The real system can
 *  leave you in this state through a withdrawal and a re add, so the console
 *  reports it rather than assuming it cannot happen. */
export function clashesWithin(
  enrolled: CourseRecord[],
): { a: CourseRecord; b: CourseRecord; label: string }[] {
  const found: { a: CourseRecord; b: CourseRecord; label: string }[] = [];
  for (let i = 0; i < enrolled.length; i++) {
    for (let j = i + 1; j < enrolled.length; j++) {
      for (const first of enrolled[i].classes) {
        const hit = enrolled[j].classes.find((second) => overlaps(first, second));
        if (hit) {
          found.push({
            a: enrolled[i],
            b: enrolled[j],
            label: `${classLabel(first)} and ${classLabel(hit)}`,
          });
        }
      }
    }
  }
  return found;
}
