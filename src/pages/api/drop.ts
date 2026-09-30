import type { APIRoute } from "astro";
import { courseByCode, drop, currentStudent } from "../../lib/db";
import { announce } from "../../lib/events";

// Dropping is the same shape as enrolling: a form POST, a decision on the
// server, a redirect. Nothing is removed that the student did not hold as an
// enrolled course this session, so a completed result is never lost this way.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const code = String(form.get("code") ?? "").trim();
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

  const removed = drop(student.id, course.id);
  back.set("course", course.code);
  back.set("result", removed ? "dropped" : "unknown-course");
  if (removed) announce({ courseId: course.id });

  return redirect(`/?${back}`, 303);
};
