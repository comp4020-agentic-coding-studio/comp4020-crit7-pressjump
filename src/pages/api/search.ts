import type { APIRoute } from "astro";
import { loadCatalogue, currentStudent, loadStudentState } from "../../lib/db";
import { eligibility } from "../../lib/enrolment";
import { search } from "../../lib/search";

// Search as data. The page itself renders results server side and the browser
// swaps in a fresh fragment as you type, so this endpoint is not what the UI
// eats; it exists because the ranking is a promise the app makes, and a
// promise worth making is worth being able to check from outside the page.
// Both paths call the same search() and the same eligibility(), so they
// cannot drift apart.
export const GET: APIRoute = ({ url }) => {
  const catalogue = loadCatalogue();
  const student = currentStudent();
  const state = student ? loadStudentState(student, catalogue) : undefined;

  const filters = {
    career: url.searchParams.get("career") ?? "any",
    level: url.searchParams.get("level") ?? "any",
    eligibleOnly: url.searchParams.get("eligibleOnly") === "on",
  };

  const hits = search(catalogue, url.searchParams.get("q") ?? "", filters);

  const results = hits.map((hit) => {
    const verdict = state ? eligibility(hit.course, state) : undefined;
    return {
      code: hit.course.code,
      title: hit.course.title,
      units: hit.course.units,
      career: hit.course.career,
      score: hit.score,
      matched: hit.matched,
      seatsLeft: verdict?.seatsLeft,
      allowed: verdict?.allowed ?? null,
      blocker: verdict && !verdict.allowed ? verdict.blocker : null,
    };
  });

  const filtered = filters.eligibleOnly ? results.filter((row) => row.allowed) : results;

  return new Response(JSON.stringify({ count: filtered.length, results: filtered }, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
