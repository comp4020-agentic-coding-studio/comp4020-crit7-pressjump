import { EventEmitter } from "node:events";

// One process, one bus: every open SSE connection subscribes here, and an
// enrolment change is broadcast to all of them. This only works because the
// app runs on exactly one machine (see fly.toml) — a second machine would
// have its own bus and clients would miss events.
//
// What it carries is deliberately thin: the id of the course whose seat count
// moved, not the new page. A client that hears about a change re-fetches the
// results it is actually showing, so the server stays the only thing that
// knows how a result renders.
export const bus = new EventEmitter();
bus.setMaxListeners(0);

export type Change = { courseId: number };

export const announce = (change: Change): void => {
  bus.emit("change", change);
};
