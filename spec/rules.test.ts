import { describe, expect, it } from "vitest";
import {
  type CourseRecord,
  type StudentState,
  clashesWithin,
  eligibility,
  overlaps,
  unitsOf,
} from "../src/lib/enrolment";
import { search } from "../src/lib/search";

// The rules, checked directly. spec/enrolment.test.ts proves the running app
// applies them; this proves the arithmetic underneath is right, including the
// cases the seeded catalogue happens not to contain. It needs no server and
// no database, which is the payoff for keeping src/lib/enrolment.ts pure.

const klass = (day: number, startMin: number, endMin: number, id = 1) => ({
  id,
  courseId: 1,
  kind: "Lecture",
  day,
  startMin,
  endMin,
  location: "Somewhere",
});

const course = (over: Partial<CourseRecord> & { code: string }): CourseRecord => ({
  id: 1,
  title: "A course",
  units: 6,
  career: "UGRD",
  session: "2026 S2",
  mode: "In person",
  convenor: "Dr Someone",
  description: "About something.",
  quota: 100,
  classes: [],
  prereqs: [],
  ...over,
});

const state = (over: Partial<StudentState> = {}): StudentState => ({
  student: {
    id: 1,
    uid: "u0000001",
    name: "Test Student",
    program: "A program",
    career: "UGRD",
    unitCap: 24,
  },
  enrolled: [],
  completedCodes: [],
  seatsTaken: {},
  ...over,
});

describe("class overlap is half open", () => {
  it("counts a genuine overlap", () => {
    expect(overlaps(klass(2, 600, 720), klass(2, 660, 780))).toBe(true);
  });

  it("does not count a class that starts exactly when another ends", () => {
    expect(overlaps(klass(2, 600, 720), klass(2, 720, 840))).toBe(false);
  });

  it("does not count the same times on different days", () => {
    expect(overlaps(klass(2, 600, 720), klass(3, 600, 720))).toBe(false);
  });

  it("counts a class wholly inside another", () => {
    expect(overlaps(klass(4, 540, 720), klass(4, 600, 660))).toBe(true);
  });
});

describe("eligibility answers in the order a person would want to hear it", () => {
  const held = course({ id: 9, code: "HELD1000", classes: [klass(1, 600, 720, 9)] });

  it("allows a course with nothing in the way", () => {
    const verdict = eligibility(course({ code: "OK1000" }), state());
    expect(verdict.allowed).toBe(true);
  });

  it("reports what you already hold before anything else", () => {
    const verdict = eligibility(held, state({ enrolled: [held] }));
    expect(verdict.allowed).toBe(false);
    if (!verdict.allowed) expect(verdict.blocker.code).toBe("already-enrolled");
  });

  it("reports a career mismatch before a missing prerequisite", () => {
    const verdict = eligibility(
      course({ code: "PG6000", career: "PGRD", prereqs: ["NEVER1000"] }),
      state(),
    );
    expect(verdict.allowed).toBe(false);
    if (!verdict.allowed) {
      expect(verdict.blocker.code).toBe("career");
      // "a undergraduate" is the tell that a sentence was assembled rather
      // than written, so the article agreement is part of the contract
      expect(verdict.blocker.message).toBe(
        "PG6000 is a graduate course and you are enrolled in an undergraduate program.",
      );
    }
  });

  it("names every prerequisite that is missing", () => {
    const verdict = eligibility(
      course({ code: "HARD3000", prereqs: ["EASY1000", "EASY1001"] }),
      state({ completedCodes: ["EASY1000"] }),
    );
    expect(verdict.allowed).toBe(false);
    if (!verdict.allowed) {
      expect(verdict.blocker.code).toBe("prerequisite");
      expect(verdict.blocker.message).toContain("EASY1001");
      expect(verdict.blocker.message).not.toContain("EASY1000,");
    }
  });

  it("names the course a clash is with", () => {
    const verdict = eligibility(
      course({ code: "CLASH2000", classes: [klass(1, 660, 780)] }),
      state({ enrolled: [held] }),
    );
    expect(verdict.allowed).toBe(false);
    if (!verdict.allowed) {
      expect(verdict.blocker.code).toBe("clash");
      expect(verdict.blocker.message).toContain("HELD1000");
    }
  });

  it("blocks a full course, and reports zero places left", () => {
    const full = course({ id: 5, code: "FULL1000", quota: 2 });
    const verdict = eligibility(full, state({ seatsTaken: { 5: 2 } }));
    expect(verdict.seatsLeft).toBe(0);
    expect(verdict.allowed).toBe(false);
    if (!verdict.allowed) expect(verdict.blocker.code).toBe("full");
  });

  it("blocks going over the unit cap, and says by how much", () => {
    // two held courses at 6 units each, plus an 18 unit course, is 30 of 24
    const verdict = eligibility(
      course({ code: "ONEMORE", units: 18 }),
      state({ enrolled: [held, { ...held, id: 10, code: "HELD1001" }] }),
    );
    expect(verdict.allowed).toBe(false);
    if (!verdict.allowed) {
      expect(verdict.blocker.code).toBe("unit-cap");
      expect(verdict.blocker.message).toContain("24 unit limit");
    }
  });

  it("lets a course exactly fill the cap", () => {
    const state18 = state({
      enrolled: [
        { ...held, id: 11, units: 18, classes: [] },
      ],
    });
    expect(unitsOf(state18.enrolled)).toBe(18);
    expect(eligibility(course({ code: "FITS1000", units: 6 }), state18).allowed).toBe(true);
  });
});

describe("clashes inside a load the student already holds", () => {
  it("finds a pair that collides", () => {
    const a = course({ id: 1, code: "AAA1000", classes: [klass(3, 540, 660, 1)] });
    const b = course({ id: 2, code: "BBB1000", classes: [klass(3, 600, 720, 2)] });
    const found = clashesWithin([a, b]);
    expect(found).toHaveLength(1);
    expect(found[0].a.code).toBe("AAA1000");
    expect(found[0].b.code).toBe("BBB1000");
  });

  it("finds nothing in a load that is fine", () => {
    const a = course({ id: 1, code: "AAA1000", classes: [klass(3, 540, 660, 1)] });
    const b = course({ id: 2, code: "BBB1000", classes: [klass(4, 540, 660, 2)] });
    expect(clashesWithin([a, b])).toEqual([]);
  });
});

describe("search ranking", () => {
  const catalogue = [
    course({ id: 1, code: "COMP2400", title: "Relational Databases" }),
    course({
      id: 2,
      code: "COMP2410",
      title: "Networked Information Systems",
      description: "Databases across a network.",
    }),
    course({ id: 3, code: "MATH1013", title: "Mathematics and Applications 1", career: "UGRD" }),
    course({ id: 4, code: "COMP6490", title: "Document Analysis", career: "PGRD" }),
  ];

  it("puts an exact code above a code that merely starts the same", () => {
    const hits = search(catalogue, "COMP2400");
    expect(hits[0].course.code).toBe("COMP2400");
  });

  it("puts a title match above a description match", () => {
    const hits = search(catalogue, "databases");
    expect(hits[0].course.code).toBe("COMP2400");
    expect(hits[1].course.code).toBe("COMP2410");
  });

  it("filters by career without reordering what is left", () => {
    const hits = search(catalogue, "", { career: "PGRD", level: "any", eligibleOnly: false });
    expect(hits.map((hit) => hit.course.code)).toEqual(["COMP6490"]);
  });

  it("filters by the level digit of the code", () => {
    const hits = search(catalogue, "", { career: "any", level: "1", eligibleOnly: false });
    expect(hits.map((hit) => hit.course.code)).toEqual(["MATH1013"]);
  });

  it("returns the catalogue in code order when nothing is typed", () => {
    const hits = search(catalogue, "");
    expect(hits.map((hit) => hit.course.code)).toEqual([
      "COMP2400",
      "COMP2410",
      "COMP6490",
      "MATH1013",
    ]);
  });

  it("says which field a hit matched on", () => {
    expect(search(catalogue, "COMP2400")[0].matched).toContain("code");
    expect(search(catalogue, "relational")[0].matched).toContain("title");
  });
});
