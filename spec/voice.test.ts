import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, inject, it } from "vitest";
import { ROUTES } from "./routes";

// Carried forward from C1, C2, A1, C4, C5 and A2, and rewritten for this
// repo rather than copied: the rule is mine, the check is new, and it runs
// against this app's rendered pages.
//
// The intent is that the work must not read as generated. The default output
// has a register, and the register is the tell. An em dash is the single most
// reliable signal of it, and the phrase list below is everything that has
// slipped past me in an earlier week.
//
// Code comments are exempt on purpose: nobody reads those on the page. This
// checks served HTML, which is why it catches copy wherever it came from,
// including the seeded course descriptions and the README.

const baseUrl = inject("baseUrl");

const BANNED_PHRASES = [
  "delve",
  "in today's fast-paced",
  "tapestry",
  "testament to",
  "navigate the complexities",
  "at its core",
  "it's important to note",
  "embark on a journey",
  "unlock",
  "the world of",
];

/** "not just X, but Y", the construction that survives every other filter. */
const NOT_JUST_BUT = /\bnot just\b[^.!?]{0,80}?\bbut\b/i;

/** Verb "leverage". The noun is a real word and is left alone. */
const LEVERAGE_AS_VERB = /\b(leverages?|leveraged|leveraging)\b/i;

describe.each(ROUTES)("voice: %s", (route) => {
  let text: string;

  beforeAll(async () => {
    const res = await fetch(new URL(route, baseUrl));
    expect(res.status).toBe(200);
    text = new JSDOM(await res.text()).window.document.body.textContent ?? "";
  });

  it("uses no em dash in page copy", () => {
    const offenders = text
      .split(/(?<=[.!?])\s+/)
      .filter((sentence) => sentence.includes("—"))
      .map((sentence) => sentence.trim().slice(0, 120));
    expect(offenders, "an em dash in page copy: use a comma, a semicolon or a full stop").toEqual(
      [],
    );
  });

  it("uses none of the banned phrases", () => {
    const lower = text.toLowerCase();
    expect(BANNED_PHRASES.filter((phrase) => lower.includes(phrase))).toEqual([]);
  });

  it('avoids the "not just X, but Y" construction', () => {
    expect(NOT_JUST_BUT.test(text)).toBe(false);
  });

  it('does not use "leverage" as a verb', () => {
    expect(LEVERAGE_AS_VERB.test(text)).toBe(false);
  });
});
