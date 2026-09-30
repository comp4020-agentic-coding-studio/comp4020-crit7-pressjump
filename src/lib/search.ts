import type { CourseRecord } from "./enrolment";

// Search is the product. The system this replaces wants a course code you
// already know, which makes it a lookup rather than a search: if you cannot
// remember whether the databases course is COMP2400 or COMP2410, you are
// browsing a paginated table. So this matches code, title, description and
// convenor, requires every word you typed to match something, and ranks an
// exact code first.
//
// At this catalogue size a scan over rows already in memory answers in well
// under a millisecond, and staying in TypeScript keeps the ranking readable
// and testable. SQLite's FTS5 is the move when the catalogue is the real one
// and the whole of it no longer fits in a request; it would change this file
// and nothing else.

export type Filters = {
  /** "any", "UGRD" or "PGRD". */
  career: string;
  /** "any", or the leading digit of a course code as a string. */
  level: string;
  /** Hide courses the student cannot currently add. */
  eligibleOnly: boolean;
};

export const NO_FILTERS: Filters = { career: "any", level: "any", eligibleOnly: false };

export type Hit = {
  course: CourseRecord;
  score: number;
  /** Which fields the query matched, for the "why am I seeing this" line. */
  matched: string[];
};

const words = (text: string): string[] => text.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean);

/** The level a code sits at: the first digit of COMP2400 is 2. */
export const levelOf = (code: string): string => code.match(/\d/)?.[0] ?? "";

/**
 * Score one course against one search word. Zero means no match, and because
 * every word has to match something, zero on any word drops the course.
 */
function scoreToken(course: CourseRecord, token: string): { score: number; field?: string } {
  const code = course.code.toLowerCase();
  if (code === token) return { score: 1000, field: "code" };
  if (code.startsWith(token)) return { score: 500, field: "code" };
  if (code.includes(token)) return { score: 200, field: "code" };

  const titleWords = words(course.title);
  if (titleWords.includes(token)) return { score: 160, field: "title" };
  if (titleWords.some((word) => word.startsWith(token))) return { score: 120, field: "title" };
  if (course.title.toLowerCase().includes(token)) return { score: 80, field: "title" };

  if (course.convenor.toLowerCase().includes(token)) return { score: 40, field: "convenor" };
  if (course.description.toLowerCase().includes(token)) return { score: 20, field: "description" };

  return { score: 0 };
}

/**
 * Rank the catalogue against a query and a set of filters.
 *
 * An empty query is not an empty result: it is the whole catalogue, in code
 * order, filtered. Browsing has to work, because a student who does not know
 * what they want is the common case in week one.
 */
export function search(
  catalogue: CourseRecord[],
  query: string,
  filters: Filters = NO_FILTERS,
): Hit[] {
  const narrowed = catalogue.filter((course) => {
    if (filters.career !== "any" && course.career !== filters.career) return false;
    if (filters.level !== "any" && levelOf(course.code) !== filters.level) return false;
    return true;
  });

  const tokens = words(query);
  if (tokens.length === 0) {
    return narrowed
      .map((course) => ({ course, score: 0, matched: [] }))
      .sort((a, b) => a.course.code.localeCompare(b.course.code));
  }

  // "comp 4020" and "comp4020" are the same intent, so the spaceless form of
  // the whole query gets a shot at the code as well.
  const compact = query.replace(/[^a-z0-9]+/gi, "").toLowerCase();

  const hits: Hit[] = [];
  for (const course of narrowed) {
    let total = 0;
    const matched = new Set<string>();
    let everyTokenMatched = true;

    for (const token of tokens) {
      const { score, field } = scoreToken(course, token);
      if (score === 0) {
        everyTokenMatched = false;
        break;
      }
      total += score;
      if (field) matched.add(field);
    }

    if (!everyTokenMatched) {
      const code = course.code.toLowerCase();
      if (compact.length >= 3 && code.includes(compact)) {
        hits.push({ course, score: 900, matched: ["code"] });
      }
      continue;
    }

    hits.push({ course, score: total, matched: [...matched] });
  }

  return hits.sort((a, b) => b.score - a.score || a.course.code.localeCompare(b.course.code));
}
