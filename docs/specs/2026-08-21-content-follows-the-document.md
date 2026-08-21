# Content follows the document

**Date:** 2026-08-21
**Status:** design, approved for implementation
**Amends:** `docs/content-sync-spec.md` (§4, §5.4, §7)

## Why

In August 2026 an officer made a large content edit to the source document.
Afterwards `npm run sync` failed and the site froze on its previous version for
several days. The failures were not one bug:

| Page | Cause |
| --- | --- |
| `become-an-instructor` | the tab has no Heading 2 left; its four headings became **bold paragraphs** |
| `home` | the layout named `Why Us`, the document now says `Why Us?`; the three card titles lost their Heading 3 style |
| `diversity-and-inclusion` | the section the layout named was moved to a different tab; three new sections appeared |
| `lesson-info` | the sheet's `Session` / `Lesson` / `Date` columns were deleted |
| `lesson-registration` | same sheet, same missing column |

Three of the five are the same root cause: **heading styles are lost when text
is pasted into Google Docs, and nothing told anyone.** The other two are a
layout naming a thing the source no longer has.

The design that follows treats the document as the authority on what sections
exist, tells an editor when a line *looks* like a heading but is not, and stops
the whole site freezing because one heading was renamed.

It is deliberately five separate changes, shipped in order, because the first
one gets the site moving again and the rest can take as long as they take.

---

## 1. Sections follow the document

**Today.** `content/<page>.layout.json` lists blocks; each names a Heading 2 in
the document. A heading the layout does not name is an *orphan*: reported in the
sync log and dropped from the page.

**Change.** The layout becomes a set of **overrides** rather than a whitelist.

Every Heading 2 in the tab becomes a section on the page, **in document order**.
Where the layout names a section, its styling and payload win. Where it does
not, the section renders in one plain default style and the sync prints a note:

```
NOTE: the home document has a new section "Mission Statement". It is being
shown in the default style. Ask a developer if it should look different.
```

### Ordering

Layout entries that name no section — the photo slider, the sheet tables, the
home banner's buttons — are *floating*. They keep their position relative to the
sections around them in the layout array.

The merge walks the document's sections in order. When a section is claimed by a
layout entry, any floating entries that preceded that entry in the layout array
and have not been emitted yet are emitted first, then the claiming entry. Any
floating entries left over are emitted at the end.

This reproduces every current page exactly, because all eight layouts already
list their sections in document order. That is the regression test: **the eight
committed `content/*.json` files must be byte-identical** except where step 1
deliberately repairs them.

### One default style, no inference

Auto-sections render as `white-stripe qa` — the same treatment the FAQ uses,
which already renders Heading 3s as sub-headings and reads well left-aligned.

Explicitly **not** doing:

- **No alternating stripe colours.** Alternation is stateful. Inserting one
  section would flip the colour of every section below it, so a one-line
  document edit would produce a large diff and a visibly rearranged page.
- **No inferring `cards`.** Cards are a deliberate choice for a set meant to be
  compared side by side. Guessing at it from heading counts and text lengths
  produces a plausible-looking wrong layout, which is worse than a plain one.

The user's framing was "the styling could be chosen automatically, and then
updated later" — a placeholder, not a finished look.

### Drafting in the document

This **reverses** a guarantee `join-sections.js` currently makes:

> A section the document has but the layout does not is a warning, never an
> error: an officer drafting ahead of a developer must not be able to take the
> site down.

Under the new rule that draft does not take the site down — it *goes live*. The
`-- Planning` tab is proof that officers draft inside this document.

So: **a Heading 2 whose text starts with `--` is skipped entirely**, along with
everything under it, until the next heading. Same marker the `-- Planning` tab
already uses, one level down.

---

## 2. A renamed heading stops being fatal — mostly

**Today.** A layout block naming a section that no longer exists throws, and
the whole sync fails. All eight pages stop updating because one heading on one
page was renamed.

**Change.** Under §1 the content is no longer lost when this happens — the
section still renders, just in the default style. So a missing section becomes a
warning.

**Except** where the layout block carries something the document cannot supply.
The discriminator is the block's own payload keys:

```
map, form, buttons, slider, sheet, status, cards
```

A block with any of those and no matching section is still a hard error. Losing
the map from Location, or the buttons from the home banner, is a real regression
that a log line would not save anyone from.

A block with none of those degrades to the default style with a warning naming
the old and the likely-new heading.

No new configuration: the payload is already visible in the layout file.

---

## 3. Editor notes never reach the page

The document contains lines addressed to a developer, not to a visitor:

```
***insert flowchart
***Joining mailing list button?
***insert links to training manuals
```

Two of those sit in `Become an Instructor`'s body and one in
`Diversity and Inclusion` → `What is T60?`. They are safe today **only because
those sections are not wired**. Wiring them is exactly what publishes them.

**Convention.** A paragraph whose text starts with `--` is an editor note. It is
stripped from the content and listed in the sync log.

This is the same marker as §1's skipped headings: `--` means "note to a
developer, not content", whether it is on a heading or a paragraph.

**Transitional.** A line starting with `***` is also treated as a note, and the
log says it is the old marker and should be changed to `--`. This closes the
window where step 1 wires those two tabs before the document has been converted.

**Sequencing constraint:** this must land **before or in the same change as**
any rewiring of `Become an Instructor` or `What is T60?`. Not after.

---

## 4. Headings that aren't headings

The failure that caused most of this. `How can I ski for free?` is a **bold
paragraph** on its own line, directly above ordinary text. So are the three
Home card titles.

The sync detects that shape and names every instance:

```
NOTE: 4 lines in the Become an Instructor tab look like headings but are
styled as normal text:
  • "How can I ski for free?"
  • "I'm a student, how do I join?"
  ...
Style them "Heading 2" to turn them into sections.
```

**A warning, not an error, and not a silent promotion.** Guessing that a bold
line is a heading would be the same class of mistake as inferring `cards`: it
would work until the day someone bolds a sentence for emphasis and the page
splits in two. The document stays the authority; the sync just says what it
sees.

Detection: a paragraph whose every span is bold, under ~80 characters, with no
terminal period, followed by a non-bold paragraph.

---

## 5. Lesson dates are computed, not typed

**Today.** `Session` / `Lesson` / `Date` columns in the sheet, read by
`parse-sheet.js` into `sessions` and rendered by `sheetBlock({sheet: 'dates'})`.
Those columns have been deleted.

**Change.** The season's dates are generated from one rule:

> Six lesson weekends, starting on the last Saturday in January, skipping
> Presidents' Day weekend.

Session A is the first three weekends, Session B the last three — matching the
document's own sentence, *"We offer 3-week (A or B) or 6-week lesson packages."*
That split used to live in the sheet and now becomes an assumption in code, so
it carries a comment pointing at the sentence it is coupled to.

The year comes from the sheet's existing `Season Year` cell (`2026/27` → 2027).
A value that does not parse fails with a message in the house style rather than
computing a wrong season.

### Verified

For 2026/27 the rule produces Jan 30-31, Feb 6-7, Feb 20-21, Feb 27-28,
Mar 6-7, Mar 13-14 — exactly what the sheet contained before the columns were
deleted.

Presidents' Day is the third Monday in February, so its weekend is always the
3rd or 4th of the seven candidate weekends; the skip is never out of range.

**The "ends the second weekend in March" phrasing is a consequence, not the
rule, and it is not universal.** Checked across every season from 2025 to 2100:
it holds for all of them except **2048 and 2076**, both leap years in which
January's last Saturday is the 25th, so February 29 absorbs a weekend and the
run ends on the *first* Saturday of March.

The code implements the six-weekends rule. The test asserts that rule, and
asserts the March consequence for 2025-2047 with the two exceptions named
rather than pretending to a universal that is false.

### Durability

These dates have to keep being right long after everyone involved in writing
them has graduated. Five properties, each of which is testable:

**One input, and it is not the clock.** Every date derives from the sheet's
`Season Year` cell. The build never asks what today is. The same sheet produces
the same dates on any machine, in any timezone, in any year — so a run in a
GitHub runner set to UTC and a run on an officer's laptop in Pacific time cannot
disagree, and a test can assert 2025-2100 without mocking time.

**UTC arithmetic only.** Date maths is done in UTC, where a week is always
exactly 7 × 86,400,000 ms. Local-time arithmetic across a DST boundary is the
classic way this kind of code produces an off-by-one-day in March.

**The rule is statutory.** Presidents' Day has been the third Monday in February
since the Uniform Monday Holiday Act took effect in 1971. It is not a moving
target.

**The known divergence is reported, not silent.** For 2048 and 2076 the run ends
on the first weekend of March. The sync notices when the computed end date is
not the second Saturday in March and says so in the log, so whoever is running
the club that season finds out from a build note rather than from a parent.

**No date is ever typed twice.** See below.

### Every published date comes from the same computation

Today `{refund_deadline}` and `{lesson_director}` exist in `apply-sheet.js` but
are **used by no layout**. The Lesson Registration tab instead has
*"Cancellation by December 31st"* typed literally into its prose, and a
`Refund Deadline` row in the sheet that nothing reads. The one date the club is
held to is hand-maintained in two places and agrees with nothing.

So:

- The `Refund Deadline` row is **removed from the sheet**. The deadline is
  computed from `Season Year`.
- The literal dates in the document's prose become tokens —
  `{refund_deadline}`, `{lesson_start}`, `{lesson_end}` — so a sentence can no
  longer contradict the table above it. `fillTokens` already refuses to publish
  an unresolved placeholder, so a typo'd token stops the build instead of
  printing braces on the page.
- `{lesson_director}` gets used where the policy says *"contact our lesson
  director"*, or the sheet row is deleted. An unread row is a trap: someone
  updates it, nothing changes, and they lose trust in the sheet.

**One thing to confirm during review.** The document's policy currently reads
*"by December 31st, one month before the lessons' scheduled start date"*, which
is two different rules. "One month before the start" gives Dec 30 in some
seasons and Dec 31 in others. I recommend defining it as **December 31 of the
calendar year before the season** — it matches what is published today, it is
easy to quote in an email, and a refund deadline that wobbles by a day each year
is harder to administer than one that does not. The wobbling version is a
one-line change if you would rather have it.

### Cleanup this requires

Leaving these behind would be a half-done job:

- `parse-sheet.js` — remove `sessions`, the `session`/`lesson`/`date` column
  lookups, and the "no lesson dates" warning.
- `tests/fixtures/published-sheet.csv` — drop the dates columns so the fixture
  matches the real published sheet.
- `tests/apply-sheet.test.js` — the whole `describe('dates')` block, including
  *"a session added to the sheet appears without anyone editing code"*, whose
  premise no longer exists.
- The `Refund Deadline` row, per the durability section above.

After this the sheet holds only what genuinely varies by season and cannot be
derived: the lesson director, the season year, the prices, and the two
registration states.

### Content note

Added to the Lesson Info tab, so a parent reading the page understands the shape
of the season without counting rows in a table:

> Lessons begin the last weekend in January and run for six weekends, skipping
> Presidents' Day weekend. This season they run from {lesson_start} to
> {lesson_end}.

The first sentence is the rule and is true every year. The second is generated,
so it stays right in 2048 when "the second weekend in March" would not.

---

## 6. Two new pages

`Our History` and `Support Us` already exist as tabs.

| | |
| --- | --- |
| `/our-history` | under **About Us** in the nav |
| `/support-us` | its own **top-level** nav item |

Support Us is top-level because donating is an action rather than a fact about
the club, and a donation page two levels down gets very little traffic.

Both need a route, a layout, and a search-engine description in `src/routes.js`.

**Blocked on a document fix:** the `Our History` tab has no Heading 1, so the
page has no title. It needs *Our History* as Heading 1, and the shouty `ABOUT
US` Heading 2 under it deleted or renamed.

**A dangling reference to repair:** `Diversity and Inclusion` →
`Spread The Shred` ends *"Interested in supporting this program? Support us."*
and that phrase carries **no hyperlink**. It becomes a link to `/support-us`.

---

## 7. Photos from Drive

Two folders on the org Google account: **season group photos**, and a general
pool for photos placed individually around the site.

### Drive is the inbox, not the server

Drive hotlinks slowly, serves unoptimised originals, and rate-limits. So the
sync **downloads at build time**: it reads the folder listing, fetches anything
new, resizes and optimises it, and commits it to `public/images/`. Officers drop
a file in Drive and never touch GitHub; visitors load a fast local file.

### Listing the folder

Google gives away nothing about a folder's contents without a credential. A
small **Apps Script**, installed on the org account the same way the sync
watcher already is, lists each folder and returns JSON. It runs as the account
that owns the folder, so there is no API key and no Google Cloud project — one
fewer secret to hand to the next set of officers.

### Naming

**A single year:** `2025.jpg`. The year is the caption and the sort key; the
carousel shows newest first. Adding next season's photo is a drag and drop.

Alt text is generated (`Husky Winter Sports, 2025`), which is honest but
generic. Worth revisiting if the general pool needs real descriptions.

### The cost, named

**The sync will start committing binary files**, which are large and permanent
in git history. So it downloads only when the folder listing actually changes,
and refuses anything above a size ceiling rather than quietly bloating the repo.

### Later

The group photos eventually move from the home carousel to `/our-history`. With
the folder as the source that is a one-line move, not a content migration.

---

## Sequencing

One change per step, in this order.

1. **Unbreak the sync.** Rewire the five broken pages, computed dates (§5),
   strip editor notes (§3). Built against the document **exactly as it is
   today**, so the site is not held hostage to any document editing.
2. **Sections follow the document** (§1, §2, §4). After this, restyling the bold
   lines to Heading 2 restores the lost structure with no code change — which is
   the feature demonstrating itself.
3. **Our History and Support Us** (§6).
4. **Photos from Drive** (§7).
5. **Buttons and embeds.** Blocked on links from the club.

Step 1 rewires `Become an Instructor` as a single unstructured block, because
the tab has no headings to work with. That is temporary and ugly and it is the
right trade: the site updates again today, and step 2 plus a document edit fixes
it properly.

---

## Open, waiting on the club

- **The refund deadline rule** — fixed December 31, or genuinely one calendar
  month before the first lesson? See §5. This one changes what the club is
  held to, so it wants a decision rather than a default.
- The **T60 flowchart** — an image, or a document to link to?
- **Training manual** URLs.
- *"Joining mailing list button?"* — read as a button to `/join-our-mailing-list`
  unless told otherwise.
- The two **Drive folder** links.
- Restyle the four bold lines in `Become an Instructor` to Heading 2.
- Restyle the three `Why Us?` card titles to Heading 3.
- Give `Our History` a Heading 1.

Nothing in steps 1-4 is blocked on these; they improve the output when they
arrive.
