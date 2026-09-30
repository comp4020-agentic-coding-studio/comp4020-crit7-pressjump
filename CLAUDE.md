# CLAUDE.md - harness for the enrolment console

This repo replaces one ANU system: the flow in ISIS where you add a course to
your enrolment. The deployed app is the deliverable; this repo is how the
process is read. These rules are the standard the work runs against, not
suggestions.

Carried forward from C1, C2, A1, C4, C5 and A2. The writing rules are nearly
unchanged because they are about register, not about a stack. The platform
rules are new: this is the first full-stack week, so the old Pages rules were
replaced rather than kept.

## The app, in one sentence

**Enrolment is not a form to fill in, it is a set of rules, and ANU makes you
discover them one slow page at a time.**

That sentence is the whole app. Every feature either serves it or does not
ship. If a screen cannot say which rule it is surfacing, it is a wizard step
wearing a different hat and it goes.

## What I decided a good replacement is

Four positions, taken from using the real thing and from what the rebuild kept
proving. Each one is here because it changed what I accepted back from the
agent.

1. **One page, not five.** The real flow splits search, selection, class
   choice, confirmation and receipt across separate slow loads. Every one of
   those is a round trip that can fail and a place to lose your state. The
   replacement does the whole job on one page, and adding a page needs an
   argument.
2. **Every rule is visible before you commit to anything.** Unit caps, clashes,
   prerequisites, career, capacity. The real system tells you on the last page,
   after you have spent four loads getting there. Here, a course you cannot
   take says so in the search result, with the reason, before you click.
3. **Search is the product.** If you cannot find the course, nothing else in
   the app matters. Search matches code, title, description and convenor, ranks
   an exact code first, and answers as you type. A search that needs an exact
   course code is a lookup, not a search.
4. **Never block without a reason.** No rule may reject an action without
   naming, in the same breath, the specific thing that caused it: which course
   clashes, which prerequisite is missing, how many units over the cap.
   "Invalid selection" is the failure mode being replaced.

Positions 1, 2 and 4 are enforced in `spec/`. Position 3 is partly enforced
(ranking and matching are tested); whether the results feel right is a
judgement and it is mine.

## Rules for the data

- **The schema is the ground truth, and `src/lib/schema.ts` is the schema.**
  To change the shape of the data: edit that file, run `pnpm db:generate`,
  commit the generated migration with the schema change in the same commit.
  Never hand write a migration to match a schema edit, and never edit a
  database by hand. The deployed volume outlives every deploy, so the migration
  trail is the only thing keeping old state and new code compatible.
- **A rule that can be expressed as a constraint lives in the database.** Unique
  course codes, one enrolment row per student per course, foreign keys. A rule
  the database can hold is a rule the application cannot forget.
- **Rules that need context live in one place, not scattered through pages.**
  All enrolment eligibility is decided in `src/lib/enrolment.ts` and nowhere
  else. A page may display a reason; it may not invent one. This is what keeps
  the search result and the confirm button agreeing with each other.
- **Every rejection carries a machine readable code and a human sentence.** The
  code is what the tests assert; the sentence is what the student reads. Adding
  a rule means adding both.

## Rules about the fiction

- **Course codes, titles and unit values are real ANU ones; everything else in
  the seed is openly invented.** Class times, quotas, convenor names and the
  student record are illustrative, and the app says so on the page and in the
  README. Never invent a fact and present it as ANU data.
- **The app does not pretend to be connected to ANU.** No ANU logo, no claim of
  live data, no implication a real enrolment happened. It is a replacement
  someone wishes existed, and it says that plainly.
- **Numbers are real or openly invented.** Any figure presented as measured is
  either sourced or written so a reader can see it is illustrative.

## Rules for the writing

Carried forward from C1, C2, A1, C4, C5 and A2. **The intent behind all of them
is that the work must not read as generated.** The default output has a
register, and the register is the tell.

- **No em dashes anywhere in page copy.** Use a comma, a semicolon or a full
  stop. `spec/voice.test.ts` fails the build on one in any rendered page. Code
  comments are exempt; nobody reads those on the page.
- **No slop phrases.** The banned list lives in `spec/voice.test.ts` and it
  fails the build. It covers the "not just X, but Y" construction, "delve",
  "in today's fast-paced", "tapestry", "testament to", "navigate the
  complexities", "at its core", "it's important to note", "embark on a
  journey", "unlock", "leverage" as a verb, and "the world of". Add to the list
  when a new one appears; never remove one to make a sentence pass.
- **The colon ban from C5 stays dropped.** It was written for a one page
  prototype and it cannot survive an app with a catalogue, a timetable and a
  list of reasons. The tell was never the colon, it was the register, so the
  check hunts the register.
- **Vary sentence length on purpose.** Three medium sentences in a row is the
  house style of generated prose. Break it.
- **Second person, present tense, for anything the student does.** "You are
  over the unit cap." Not "the student will be required to reduce their load."
- **An error message is writing too.** It gets the same rules, and it is the
  copy most likely to be read.
- **It looks like university software, not a web page.** An application shell:
  the header is a university masthead (a white band with the wordmark between
  two gold rules, a gold chevron and the section title in capitals, utility
  text low at the right) over a black navigation bar with a home icon, the
  sections right aligned, and search. A breadcrumb bar under that, then a plain
  white page holding bordered cards. No side rail. A page that reads as a
  document is the failure mode: four rounds of redirecting the look came
  before this rule existed.
- **The masthead's shape is borrowed; the crest and the name never are.** The
  wordmark slot holds this app's own mark. An ANU crest or "Australian National
  University" wordmark would make a prototype read as an official service.
- **The palette is the house palette from A2, and nothing else.** Gold
  `#b97d1c`, bronze `#8a5c13`, warm grey `#6b6154`, on a plain white page with
  neutral greys, and Public Sans for type. No cream or tinted page background. It reads as ANU because of the
  colours; it never carries an ANU crest, lockup or name. Gold is too light for
  white text, so anything on gold is dark ink.
- **Meaning is carried by words, not by colour.** A blocked result is a quiet
  grey pill that says "Blocked" and a sentence that says why. No red: as in A2,
  colour sets how loud a thing is and the label says what it is.
- **One accent colour, and it marks what you can act on.** The gold, plus the
  neutrals: buttons, links, the current nav item and focus, nothing else. Do
  not introduce a second hue for variety. No gradients, no drop shadows, no
  accent bar on any edge of a panel. A status colour for a blocked result is
  not a second accent; it is information, and it must never be the only carrier
  of that information. The rule limits how loud colour is, not only how many
  hues there are: a single bright hue splashed over content still fails it.
- **Look at it before calling it done.** Every visual change gets a screenshot
  of the built page, at desktop and phone width, read by eye. The tests cannot
  see a layout.
- **Alt text describes the file, checked against the file.** Written from
  memory it drifts. It also does not assert an identity a picture cannot carry.

## Rules for the platform

The C5 rule about root absolute `href` in `.astro` files was a Pages base path
rule. This app deploys to Fly at the domain root, so it no longer applies and
has been dropped. These replace it.

- **`spec/routes.ts` is the coverage list, and adding a page means adding its
  route.** A server rendered app has no built HTML files to walk, so a page
  missing from that list is a page the invariants silently stop checking.
- **The app must work with JavaScript turned off.** Every state changing action
  is a form POST that redirects. The client side script is an enhancement on
  top of that and may never be the only way to do something. This is not
  ceremony: it is what makes the flow testable over plain HTTP, and the real
  system's reliance on a slow client is part of what is being replaced.
- **One machine, one volume, one SQLite file.** The SSE bus in
  `src/lib/events.ts` is process local and only works because `fly.toml` runs
  exactly one machine. Do not scale the app out without replacing that bus.
- **Migrations run at boot from the committed `drizzle/` folder.** A migration
  that is not committed does not exist in production.
- **Never carry last week's prototype source or spec tests into a new repo.**
  The harness accumulates; the prototype does not.
