import type { APIRoute } from "astro";
import { courseByCode, enrol, currentStudent } from "../../lib/db";
import { announce } from "../../lib/events";

// The write half of the console: a plain HTML form POSTs here, the rules are
// re-decided inside a transaction, and the outcome comes back as a redirect.
// The 303 makes the flow work with no client side JavaScript at all, which is
// the point — the system this replaces loses your selection whenever one of
// its five pages fails to load.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const code = String(form.get("code") ?? "").trim();
  // The search state the student was looking at, carried through the redirect
  // so enrolling does not throw away the query they typed.
  const back = new URLSearchParams();
  for (const key of ["q", "career", "level", "eligibleOnly"]) {
    const value = form.get(key);
    if (value) back.set(key, String(value));
  }

  const student = currentStudent();
  const course = courseByCode(code);

  if (!student || !course) {
    back.set("result", "unknown-course");
    back.set("course", code || "that course");
    return redirect(`/?${back}`, 303);
  }

  const outcome = enrol(student.id, course.id);
  back.set("course", course.code);
  back.set("result", outcome.ok ? "enrolled" : outcome.blocker.code);
  if (outcome.ok) announce({ courseId: course.id });

  return redirect(`/?${back}`, 303);
};
