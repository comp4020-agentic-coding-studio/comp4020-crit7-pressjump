# Crit 7

## What was the breakthrough that moved the work forward?

Naming the problem as latency rather than as rules. I started towards a degree
audit, which is a rules engine with a report at the end, and abandoned it once I
said out loud what actually wastes my time: the search wants a course code I do
not have, and the form is five slow pages that only tell you about the clash on
the last one. The rules in ANU enrolment are not hard. They are just told to you
last, after you have already spent the time.

Once that was a sentence I could hold, it decided everything else. One page,
because five is the complaint. Every rule shown on the search result rather than
on submission, because being told last is the complaint. That sentence went into
`CLAUDE.md` before any code, and it settled arguments all week: a second page
had to earn its place, and only one did.

The technical version of the same breakthrough was putting every rule in one
pure function that takes rows and returns a verdict. That is what let the search
result and the confirm button agree with each other by construction, and it is
why the rules could be tested without a server at all.

## What did this work change about who I want to be as a software developer?

I want to be the kind of developer who still opens the thing. My checks were
green and thorough, and the app was rendering "COMP1100 is a undergraduate
course" to every graduate student who looked at it. No test caught it, because I
had written the tests to assert the refusal code, and the code was right. I
found it by booting the built server and reading the output with my own eyes.

That is a useful, slightly humbling lesson about what automated backpressure is
for. Tests hold the contracts I thought to write down. They are not a
substitute for looking, and the parts they cannot see are exactly the parts a
person experiences: the wording, the ordering, whether the reason given is the
reason that helps. I am getting better at directing an agent, and the skill that
matters most is still knowing which claims to go and check by hand.
