# Process overview

## What I built

**Enrolment console**: a one page replacement for the ANU flow that adds a
course to your program. `README.md` is the account of what it is and what good
means here, and the deployed app publishes it at `/readme/`. This file is how I
got there.

## Picking the slice

I started from the wrong one. My first instinct was a degree audit, checking
majors and unit rules against a plan, and I dropped it within a few minutes of
saying it out loud, because it is not what actually costs me time. What costs me
time is adding a course: the search wants a code I do not have, and the form is
five separate pages that are each slow enough to notice.

That correction is the most important one in the week, so it is worth being
precise about what it changed. A degree audit is a rules engine with a report at
the end. The thing I actually deal with is a *latency* problem wearing a rules
problem's clothes: the rules are not hard, they are just told to you last. Once
I had that sentence, the build had a shape, and it went into `CLAUDE.md` as the
line the whole app answers to:

> Enrolment is not a form to fill in, it is a set of rules, and ANU makes you
> discover them one slow page at a time.

Everything after that was decided by asking whether it served that sentence.
One page, because five is the complaint. Every rule on the result rather than on
submission, because "told you last" is the complaint. Search over description
and convenor, because "wants a code you already know" is the complaint.

## Directing the work

The harness came first, before any code: [`a3d7b12`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-pressjump/commit/a3d7b12).
It is carried forward from C1, C2, A1, C4, C5 and A2, and the merge was a
decision each way rather than a copy. The writing rules came over almost
unchanged, because they are about register and not about a stack: no em dashes
in page copy, the banned phrase list, vary sentence length. The C5 rule about
root absolute `href` under a Pages base path was dropped on purpose and is
recorded as dropped, because this app deploys to Fly at the domain root. The
platform rules that replaced it are new this week: the schema is ground truth,
migrations are committed with the schema change that caused them, a rule that
can be a database constraint lives in the database, and every rejection carries
both a code for the tests and a sentence for the person.

Then the schema, because this was the week the database gets real:
[`8e651f1`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-pressjump/commit/8e651f1). Five tables, and one shape decision
that paid for itself repeatedly: class times are stored as minutes from
midnight, so a timetable clash is integer arithmetic rather than string
parsing. The guestbook the starter ships was retired in its own migration
rather than by editing the first one, so the migration trail reads honestly:
`0000` creates the starter's table, `0001` drops it, `0002` creates the
enrolment model.

The rules went into one pure module next
([`ddfaa6e`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-pressjump/commit/ddfaa6e)), and the spec tests came before the
pages ([`feb386a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-pressjump/commit/feb386a)), written from the published
spec so they started red. The two lines a test can hold are persistence across a reload and
the end to end round trip; the rest of the file is the rules, each asserting
both the refusal code and that the page names the specific cause. The lines no
test can hold are written into the top of that file so I cannot quietly forget
them: that this is a system I actually deal with, and that I can account for
how the work was directed.

## Grounding it

The catalogue is seeded, and being honest about that was a rule before it was a
paragraph. Course codes, titles and unit values follow real ANU courses so the
app is recognisable; class times, rooms, quotas, convenors and the
student record are invented, and the app says so on every page that shows them
rather than only in the README. Position 4 of my A2 harness was that the site
must not lie about the work, and the version of that here is that a prototype
must not imply it is connected to ANU.

The other grounding move was refusing to let the page decide anything. Every
rule lives in `src/lib/enrolment.ts`, which is pure: it takes rows and returns a
verdict. The console renders verdicts and the API route re-decides inside a
transaction, so the search result and the confirm button cannot disagree, and a
stale page cannot talk the server into an enrolment.

## Correcting it

Five corrections worth citing, because they are the ones that caught real
problems rather than typos.

**A test that agreed with itself.** My first clash test enrolled a student in
COMP3600 and asserted it succeeded. COMP3600 requires COMP1600, which that
student had not completed, so the enrolment would have been refused for a
different reason and the test would have passed for the wrong one. I rewrote
the timetable by hand, found the pair the seed genuinely guarantees (COMP6490
Thursday 09:00 and COMP8020 Thursday 10:00), and the test now asserts the
clash *and* that the page names what it clashes with.

**A boundary that was off by one course.** The unit cap test held twelve units
and added twelve more against a cap of twenty four, which is exactly the cap,
which is allowed. It failed, correctly, and the fix was to the test rather than
the rule. There is now a companion test asserting a course may exactly fill the
cap, because that is the behaviour I actually want.

**My own banned word list caught me.** The course detail page had a heading
reading "What this unlocks". "Unlock" is on the slop phrase list I have carried
since A2. I renamed it to "Required by", which is also the better label.

**A sentence no person would write.** The career refusal rendered as "COMP1100
is a undergraduate course". No test could see it, because the tests asserted the
refusal *code* and the code was right; I only found it by booting the built
server and reading the output. The article is now chosen rather than assumed in
[`ddfaa6e`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-pressjump/commit/ddfaa6e), and an assertion on the exact sentence
locks it in [`feb386a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-pressjump/commit/feb386a).

**It looked like a page, not like software.** This took two rounds, and both
were my call rather than a check's. The first stylesheet used a bright teal with
green and red status panels, and when I saw it running it read as a startup
dashboard. I asked for something more like a university, and the revision muted
the colours but kept the structure, so I rejected that too: the nav did not look
like a nav, it had no background, and the whole thing was still a document with
a header. What I actually wanted was the thing it replaces to look like
enterprise software, and the reference I gave was Canvas, because that is the
university software every student already knows.

So the styling was scrapped rather than tuned. The rebuild moved the chrome
into a shared layout (`src/layouts/App.astro`) shaped like Canvas: a dark nav
rail down the side, a header bar with breadcrumbs and a student switcher, cards
on a grey workspace, one working blue. That was closer, and it still was not
right, so I made a third call with three specific instructions: a top navbar,
not a sidebar; no switcher; and the colours of my A2 site, which read as ANU.

Each of those changed more than the stylesheet. The palette was read from the
A2 repo rather than guessed: the three tokens in `astro-theme-slop` (gold
`#b97d1c`, bronze `#8a5c13`, warm grey `#6b6154`), the neutrals derived from the
gold the way that theme derives them, and Public Sans. Gold is too light to
carry white text, so buttons are dark ink on gold. Taking A2's colours meant
taking its rule about colour too: a blocked result is no longer red, it is a
grey pill that says "Blocked" and a sentence that says why.

The fourth round was the header and the background. I pointed at a screenshot
of the ANU college site's header, and asked for the cream page colour to go. The
header now follows that shape exactly (white masthead, gold rules and chevron,
capitals title, black bar with home, right aligned sections and search) with one
deliberate difference: the crest and the university's name are replaced by the
app's own mark, because a prototype wearing ANU's crest reads as an official
service, and the README says in so many words that it is not one.

Removing the switcher was a data change, not a markup change. The app now acts
for one seeded student, as if already signed in, so the cookie, the switch
route and the redirect it needed are gone, and so are the two invented students
who only existed to be switched to. That broke most of `spec/enrolment.test.ts`,
which had used the other two students to reach the career, prerequisite, clash
and cap rules. I worked the timetable again for the one student left and every
rule is still reached over HTTP: the clash is now COMP3620 against ENGN1211's
Monday lab, and the cap is three clash free courses to exactly 24 units and a
fourth refused. Two assertions also got stronger on the way: they had checked
that a course code appeared somewhere on the page, which it always does in the
catalogue, and now check the sentence that names the cause. Earlier, moving
the enrolment panel into the right hand column had broken a helper that found
the panel by its position; it now finds it by its heading.

The lesson went into `CLAUDE.md` as rules. The one accent rule was satisfied on
paper by the teal version, so it now limits how loud colour is as well as how
many hues there are. The shell, the A2 palette and "words carry meaning, not
colour" are written down. And every visual change gets a screenshot of the
built page, at desktop and phone width, read by eye, because the tests cannot
see a layout and I had to redirect it four times.

That last one is the honest summary of the week. The checks catch what they
were pointed at, and looking at the running thing catches what they were not.

## Where it ended up

`pnpm check` is green: 87 tests across six files, covering the invariants, the
README promise, the rules, the running app and the voice rules.
The full range of the week's work is
[`a3d7b12...236e8c3`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-pressjump/compare/a3d7b12...236e8c3).
