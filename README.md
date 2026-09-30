# Enrolment console

A one page replacement for the part of ANU enrolment that adds a course to
your program. The real flow spreads searching, choosing, checking and
confirming across five separate pages, each one a slow load that can fail, and
the page that finally tells you the course clashes with something you already
hold is the last of them. This does the whole job in one place, and puts every
rule that could stop you on the result before you click it.

Search the catalogue, see what you can take and why you cannot take the rest,
add a course, drop a course. Your enrolment is stored in SQLite on the
machine's volume, so it survives a reload, a restart and a redeploy.

**This is a prototype, not an ANU service.** Course codes, titles and unit
values follow real ANU courses so the app is recognisable to someone who uses
the real one. Everything else is invented: the class times, rooms, quotas and
convenors, and the student record. Nothing you do here changes a real
enrolment, and the catalogue is a sample of about two dozen courses rather than
the ANU course list. Check Programs and Courses for anything that matters.

## What good looks like here

The thing being replaced is not ugly, it is **slow to tell you the truth**. You
can spend four page loads getting to a confirmation screen that then rejects
you for a prerequisite you could have been told about at the start. So the
standard this app is held to is not "nicer forms". It is: the answer arrives
before you have invested anything in the question.

Four positions came out of that, and each one changed what got built.

**One page, not five.** Every state the real flow puts on its own page is a
region of this one. Adding a second page needs an argument, and only the course
detail page won one, because "what does this require, and what requires it" is
a genuinely different question from "what should I take".

**Every rule is visible before you commit.** Unit caps, timetable clashes,
prerequisites, career, and places remaining are all decided for every result in
the list, not on submission. A course you cannot take says so, in the result,
with the reason.

**Search is the product.** If you cannot find the course, nothing else matters.
The real search wants a code you already know, which makes it a lookup. This
one matches the code, the title, the description and the convenor, requires
every word you type to match something, ranks an exact code first, and answers
as you type. Searching `pixels` finds Computer Graphics. Searching `comp 4020`
finds COMP4020, because a space inside a code is a typo, not a second word.

**Never block without a reason.** No rule may reject an action without naming,
in the same breath, the thing that caused it: which course the clash is with,
which prerequisite is missing, how many units over the cap you would be.
"Invalid selection" is the failure mode being replaced, so every rejection here
carries a code for the tests and a sentence for the person.

### What is enforced, and what is judgement

The positions above are not decoration, so most of them are checks that fail
the build.

- `spec/enrolment.test.ts` drives the running app over HTTP: the add and drop
  round trip, persistence across a reload, and every one of the seven refusal
  rules, including that the page names the specific cause.
- `spec/rules.test.ts` checks the rules directly, including the cases the
  seeded catalogue does not happen to contain: half open interval overlap, the
  order the refusals are reported in, and the search ranking.
- `spec/voice.test.ts` is carried forward from earlier weeks. It fails the
  build on an em dash or a banned phrase in any rendered page.
- `spec/invariants.test.ts` and `spec/readme.test.ts` ship with the starter and
  cover the accessibility floor, the document basics and this file.

What no test holds, and what I answer for at the crit: whether this is a slice
of a system I actually deal with, whether the results *feel* right rather than
merely rank correctly, and whether one page is genuinely better here or just
denser.

### What was deliberately left out

Authentication, because ANU single sign on would have taught nothing this week;
the app acts for one seeded student, as if already signed in, and the page says
whose enrolment it is. Class stream selection,
waitlists, withdrawal deadlines and fees, all of which are real parts of
enrolment and none of which are the part that wastes the time. Course
availability across sessions, since the catalogue models one session. A real
search index: at two dozen courses a scan over rows already in memory answers
in well under a millisecond, and SQLite's FTS5 is the move when the catalogue
is the real one, which would change one file.

## How it is built

Astro with a Node adapter, server rendered, on Fly with one machine and one
volume. Drizzle over SQLite, with `src/lib/schema.ts` as the ground truth and
migrations generated from it into `drizzle/`, applied at boot. Five tables:
students, courses, classes, prerequisites and enrolments.

Two decisions worth naming. Class times are stored as minutes from midnight, so
a clash is integer arithmetic rather than string parsing. And every enrolment
rule lives in `src/lib/enrolment.ts`, which is pure, takes rows and returns a
verdict; the page displays reasons and never invents them, which is what keeps
the search result and the confirm button agreeing with each other.

The app works with JavaScript turned off. Every action is a form POST that
redirects, and the live search and the server sent events stream are an
enhancement on top of that.
