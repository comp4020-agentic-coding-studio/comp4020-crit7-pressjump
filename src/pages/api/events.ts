import type { APIRoute } from "astro";
import { type Change, bus } from "../../lib/events";

// The minimal server-sent-events (SSE) pattern: a long-lived streaming
// response the browser consumes with `new EventSource("/api/events")`.
// SSE is one-directional (server → browser) and plain HTTP, which makes it
// the simplest live channel that works everywhere.
//
// Here it carries one thing: somebody's enrolment changed a course's seat
// count. Places in a small course are the part of enrolment that is genuinely
// contested, and a seats remaining figure that was true when the page
// rendered is the figure that sends you to a full course.
export const GET: APIRoute = () => {
  let onChange: (change: Change) => void;
  let heartbeat: ReturnType<typeof setInterval>;

  const stream = new ReadableStream<string>({
    start(controller) {
      // an opening comment so the client (and the post-deploy CI probe) sees
      // bytes immediately, and a periodic one so proxies don't drop the
      // connection as idle
      controller.enqueue(": connected\n\n");
      heartbeat = setInterval(() => controller.enqueue(": ping\n\n"), 30_000);
      onChange = (change) => {
        controller.enqueue(`event: change\ndata: ${JSON.stringify(change)}\n\n`);
      };
      bus.on("change", onChange);
    },
    cancel() {
      clearInterval(heartbeat);
      bus.off("change", onChange);
    },
  });

  return new Response(stream.pipeThrough(new TextEncoderStream()), {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
    },
  });
};
