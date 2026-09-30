import { describe, expect, inject, it } from "vitest";

// The crit 7 spec, as far as a machine can hold it. These drive the RUNNING
// app over HTTP, so they assert the contract (what the app must do) rather
// than how it is built, and they would survive a change of stack.
//
// The spec lines these answer:
//   - "the core flow persists across a reload — create something, and it's
//     still there"
//   - "it models a slice of a real ANU system you actually deal with, wired
//     end to end"
//
// The lines no test here can hold, which stay on me at the crit:
//   - "the app loads at its *.fly.dev URL by the cutoff": deployment, checked
//     against the live URL by the course's verify-deploy script
//   - that the slice is one I ACTUALLY DEAL WITH, and that it is the right
//     slice of it
//   - "you can account for how you directed, grounded and corrected the work"
//
// The app acts for one seeded student (src/lib/seed.ts): Sam, undergraduate,
// capped at 24 units, has completed COMP1100 COMP1110 MATH1005 MATH1013
// COMP2100, and holds COMP2400 (Mon 16:00 to 18:00, Wed 16:00 to 17:00).
// Every test that enrols something drops it again, so each starts from that.

const baseUrl = inject("baseUrl");

// Astro checks form POSTs carry a same-origin Origin header (CSRF
// protection); browsers send it automatically, a bare fetch doesn't.
const post = (path: string, fields: Record<string, string>) =>
  fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { origin: baseUrl },
    body: new URLSearchParams(fields),
    redirect: "manual",
  });

const get = (path: string) => fetch(new URL(path, baseUrl));
const page = async (path: string) => (await get(path)).text();

const enrol = (code: string) => post("/api/enrol", { code });
const drop = (code: string) => post("/api/drop", { code });

/** The result code the app redirected back with. */
const outcomeOf = (res: Response): string | null =>
  new URL(res.headers.get("location") ?? "/", baseUrl).searchParams.get("result");

/** The enrolment panel, found by its heading rather than its position, so
 *  moving it around the page does not break the contract. */
const enrolmentPanel = (html: string): string => {
  const start = html.indexOf('id="load-heading"');
  expect(start, "no enrolment panel on the page").toBeGreaterThan(-1);
  return html.slice(start, html.indexOf("</section>", start));
};

describe("the catalogue is wired end to end", () => {
  it("serves the console with the seeded catalogue on it", async () => {
    const res = await get("/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("COMP4020");
    expect(html).toContain("Agentic Coding Studio");
  });

  it("shows whose enrolment it is", async () => {
    expect(await page("/")).toContain("Sam Okafor");
  });

  it("serves a course page carrying its own classes and prerequisites", async () => {
    const res = await get("/courses/COMP4020/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Agentic Coding Studio");
    // COMP4020 requires COMP2100 in the seeded catalogue
    expect(html).toContain("COMP2100");
    // and its classes come from the database, not the page
    expect(html).toContain("Marie Reay 4.03");
  });

  it("404s a course that is not in this session's catalogue", async () => {
    expect((await get("/courses/COMP9999/")).status).toBe(404);
  });
});

describe("search is a search, not a lookup", () => {
  const results = async (query: string) => {
    const res = await get(`/api/search?q=${encodeURIComponent(query)}`);
    expect(res.status).toBe(200);
    return (await res.json()) as { count: number; results: { code: string }[] };
  };

  it("ranks an exact course code first", async () => {
    const { results: rows } = await results("COMP2400");
    expect(rows[0]?.code).toBe("COMP2400");
  });

  it("finds a course by a word in its title, with no code typed", async () => {
    const { results: rows } = await results("databases");
    expect(rows.map((row) => row.code)).toContain("COMP2400");
  });

  it("finds a course by its description, which the real search cannot do", async () => {
    const { results: rows } = await results("pixels");
    expect(rows.map((row) => row.code)).toContain("COMP4610");
  });

  it("finds a course by its convenor", async () => {
    const { results: rows } = await results("Sorensen");
    expect(rows.map((row) => row.code)).toContain("COMP2300");
  });

  it("treats a space inside a course code as a typo, not a second word", async () => {
    const { results: rows } = await results("comp 4020");
    expect(rows.map((row) => row.code)).toContain("COMP4020");
  });

  it("requires every word to match something", async () => {
    expect((await results("databases zzzznotaword")).count).toBe(0);
  });

  it("returns the whole catalogue for an empty query, because browsing has to work", async () => {
    expect((await results("")).count).toBeGreaterThan(15);
  });
});

describe("the core flow persists across a reload", () => {
  it("adds a course, and a fresh page load still has it", async () => {
    // COMP3620 requires COMP2100, which Sam has, and touches no held class.
    const added = await enrol("COMP3620");
    expect(added.status).toBe(303);
    expect(outcomeOf(added)).toBe("enrolled");

    // The reload: a brand new request, carrying nothing from the last one.
    expect(
      enrolmentPanel(await page("/")),
      "COMP3620 is missing from the enrolment panel after a reload",
    ).toContain("COMP3620");
  });

  it("drops a course, and the drop persists too", async () => {
    const dropped = await drop("COMP3620");
    expect(dropped.status).toBe(303);
    expect(outcomeOf(dropped)).toBe("dropped");

    expect(enrolmentPanel(await page("/"))).not.toContain("COMP3620");
  });
});

describe("every rule is decided on the server, and every rejection names a cause", () => {
  it("refuses a second enrolment in the same course", async () => {
    expect(outcomeOf(await enrol("COMP2400"))).toBe("already-enrolled");
  });

  it("refuses a course the student has already completed", async () => {
    expect(outcomeOf(await enrol("COMP1100"))).toBe("already-completed");
  });

  it("refuses a course whose prerequisite is not completed, and names it", async () => {
    // COMP2310 requires COMP2300, which Sam has not done.
    expect(outcomeOf(await enrol("COMP2310"))).toBe("prerequisite");
    expect(
      await page("/?result=prerequisite&course=COMP2310"),
      "the page does not say WHICH prerequisite is missing",
    ).toContain("COMP2310 requires COMP2300");
  });

  it("refuses a graduate course to an undergraduate student", async () => {
    expect(outcomeOf(await enrol("COMP6490"))).toBe("career");
  });

  it("refuses a timetable clash, and names the course it collides with", async () => {
    // COMP3620's lecture is Mon 09:00 to 11:00; ENGN1211's lab is Mon 09:00
    // to 12:00. Sam could otherwise take both.
    expect(outcomeOf(await enrol("COMP3620"))).toBe("enrolled");
    expect(outcomeOf(await enrol("ENGN1211"))).toBe("clash");
    expect(
      await page("/?result=clash&course=ENGN1211"),
      "the page does not say WHAT the clash is with",
    ).toContain("collides with COMP3620");
    await drop("COMP3620");
  });

  it("refuses to take a student over their unit cap, and says by how much", async () => {
    // Sam holds 6 units. Three more courses that clash with nothing reach the
    // 24 unit cap exactly, and a fourth that also clashes with nothing is
    // refused on the cap alone.
    for (const code of ["COMP3620", "COMP2610", "MATH1014"]) {
      expect(outcomeOf(await enrol(code)), `could not add ${code}`).toBe("enrolled");
    }
    expect(outcomeOf(await enrol("COMP2300"))).toBe("unit-cap");
    expect(await page("/?result=unit-cap&course=COMP2300")).toContain("24 unit limit");

    for (const code of ["COMP3620", "COMP2610", "MATH1014"]) await drop(code);
  });

  it("refuses a course that is not in the catalogue at all", async () => {
    expect(outcomeOf(await enrol("COMP9999"))).toBe("unknown-course");
  });
});

describe("the console works with no JavaScript", () => {
  it("answers a search as a plain GET, with no script involved", async () => {
    const html = await page("/?q=graphics");
    expect(html).toContain("COMP4610");
    expect(html, "the GET search returned courses that do not match").not.toContain("COMP3620");
  });

  it("redirects after every write, so a reload is never a resubmit", async () => {
    const res = await enrol("COMP4020");
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toMatch(/^\/\?/);
    await drop("COMP4020");
  });
});

describe("seat counts reach other clients live", () => {
  it("broadcasts an enrolment change over the SSE stream", async () => {
    const stream = await fetch(new URL("/api/events", baseUrl));
    expect(stream.headers.get("content-type")).toContain("text/event-stream");
    const reader = stream.body?.getReader();
    if (!reader) throw new Error("no response body");

    await enrol("COMP4020");

    const decoder = new TextDecoder();
    let received = "";
    while (!received.includes("event: change")) {
      const { value, done } = await reader.read();
      if (done) throw new Error("stream ended before the change arrived");
      received += decoder.decode(value, { stream: true });
    }
    await reader.cancel();
    expect(received).toContain("data: ");

    await drop("COMP4020");
  }, 10_000);
});
