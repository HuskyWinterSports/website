# Step 1: Unbreak the Sync — Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get `npm run sync` green again against the document exactly as it is
today, with lesson dates computed from one sheet cell rather than typed.

**Architecture:** Three independent additions — a note-stripping rule in the
document parser, a pure date module driven by the sheet's `Season Year`, and
token filling extended to document prose — followed by rewiring the five broken
layout files. Nothing here changes how sections are matched; that is step 2.

**Tech Stack:** Node 22 ESM, `node --test`, `node-html-parser`, no new
dependencies.

## Global Constraints

Copied from `docs/specs/2026-08-21-content-follows-the-document.md`:

- **Never write a partial or unvalidated result.** If anything is wrong, the
  site keeps serving the previous content.
- **Every failure message** names the file, says what is wrong, gives both ways
  to fix it, and ends with "The website has not been changed. It is still
  showing the previous version." The reader is an officer with no technical
  background and nobody to ask.
- **Never a plausible wrong answer.** Refusing to build beats publishing
  something that looks right.
- **The build never asks what today is.** Every date derives from the sheet's
  `Season Year` cell. No `Date.now()`, no `new Date()` with no arguments.
- **UTC arithmetic only.** A week is exactly `7 * 86400000` ms.
- **Four-space indentation**, matching every file in `scripts/`.
- Run `npm run lint` before every commit; it is clean today and must stay clean.

---

### Task 1: Editor notes never reach the page

Lines beginning `--` (and, transitionally, `***`) are addressed to a developer.
Three exist today, two of them in a tab this step rewires — so this task must
land before Task 6.

**Files:**
- Modify: `scripts/sync/parse-google-doc.js`
- Modify: `scripts/sync/sync-content.js`
- Test: `tests/parse-google-doc.test.js`

**Interfaces:**
- Produces: `parseGoogleDoc(html)` gains a `notes` key on its return value and
  on every entry of `tabs`: `Array<{text: string, section: string|null}>`.
  Because `selectTab` returns either a tab object or the whole parsed document,
  both shapes carry `notes` and callers need no special case.

- [ ] **Step 1: Write the failing test**

Add to `tests/parse-google-doc.test.js`:

```js
describe('editor notes', () => {
    const doc = (body) => `<html><head><style>.b{font-weight:700}</style></head>
        <body><div id="contents">${body}</div></body></html>`;

    test('a line starting with -- is stripped from the page', () => {
        const parsed = parseGoogleDoc(doc(
            '<h2>Perks</h2><p>A free season pass.</p><p>--insert the pass photo</p>'
        ));
        const texts = parsed.sections[0].blocks
            .map((b) => b.spans.map((s) => s.text).join(''));
        assert.deepEqual(texts, ['A free season pass.']);
    });

    test('the note is reported rather than silently dropped', () => {
        // Silently dropping would leave an officer wondering where their note
        // went; publishing it puts "insert the pass photo" on the live site.
        const parsed = parseGoogleDoc(doc(
            '<h2>Perks</h2><p>--insert the pass photo</p>'
        ));
        assert.deepEqual(parsed.notes, [
            { section: 'Perks', text: '--insert the pass photo' },
        ]);
    });

    test('*** is still treated as a note, so nothing leaks mid-migration', () => {
        // The document used *** before -- was agreed. Wiring a tab that still
        // has one would publish it.
        const parsed = parseGoogleDoc(doc('<h2>T60</h2><p>***insert flowchart</p>'));
        assert.equal(parsed.sections[0].blocks.length, 0);
        assert.equal(parsed.notes.length, 1);
    });

    test('ordinary prose containing a dash is untouched', () => {
        // The guard that keeps this from eating content: only a line that
        // STARTS with the marker is a note.
        const parsed = parseGoogleDoc(doc(
            '<h2>Dates</h2><p>Lessons run Jan 30 -- Mar 14.</p>'
        ));
        assert.equal(parsed.sections[0].blocks.length, 1);
        assert.equal(parsed.notes.length, 0);
    });

    test('notes are attached to the tab they were written in', () => {
        const parsed = parseGoogleDoc(doc(
            '<p class="c1 title">Lessons</p><h1>Lessons</h1><p>--todo</p>'
        ));
        assert.equal(parsed.tabs[0].notes.length, 1);
    });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test tests/parse-google-doc.test.js`
Expected: FAIL — `parsed.notes` is `undefined`.

- [ ] **Step 3: Implement**

In `scripts/sync/parse-google-doc.js`, add above `parseGoogleDoc`:

```js
/**
 * Lines addressed to a developer rather than to a visitor.
 *
 * `--` is the club's convention, matching the `-- Planning` tab officers
 * already use. `***` was the earlier marker and is still honoured, because
 * wiring a tab that still contains one would publish "insert flowchart" to the
 * live site. The sync log names the old marker so the two converge.
 *
 * Only a line that STARTS with the marker counts. "Jan 30 -- Mar 14" is prose.
 */
const NOTE_MARKER = /^(--|\*\*\*)/;
```

Inside `parseGoogleDoc`, declare alongside `tabs`:

```js
const notes = [];
```

In `visit`, replace the paragraph/heading append at the end with:

```js
const spans = readSpans(child, styleMap);
if (!spans.length) continue;

const text = spans.map((s) => s.text).join('').trim();
if (tag === 'P' && NOTE_MARKER.test(text)) {
    const note = { section: current.heading, text };
    notes.push(note);
    currentTab?.notes.push(note);
    continue;
}

current.blocks.push(
    tag === 'P'
        ? { type: 'paragraph', spans }
        : { type: 'heading', level: Number(tag[1]), spans }
);
```

Give each tab the array when it is created:

```js
currentTab = { name, title: null, sections: [], notes: [] };
```

And return it:

```js
return { title, sections, tabs, notes };
```

- [ ] **Step 4: Report them in the sync log**

In `scripts/sync/sync-content.js`, `syncLayout` already has `parsed`. Add to
its return value:

```js
return { layoutName, changed: true, orphans, tabs, sheetWarnings, notes: parsed.notes ?? [] };
```

(and the same on the unchanged-return above it).

In `main`, after the `sheetWarnings` loop:

```js
// Notes are stripped from the page, so say where they went. An officer who
// leaves one and sees nothing happen learns the wrong lesson.
for (const note of result.notes) {
    const where = note.section ? ` under "${note.section}"` : '';
    console.log(
        `NOTE: a line${where} in the ${result.layoutName} document is a note ` +
        `to a developer and has been left off the page: ${note.text}` +
        (note.text.startsWith('***')
            ? '\n      (*** is the old marker — please change it to --)'
            : '')
    );
}
```

- [ ] **Step 5: Run the tests and lint**

Run: `node --test tests/parse-google-doc.test.js && npm run lint`
Expected: PASS, lint clean.

- [ ] **Step 6: Commit**

```bash
git add scripts/sync/parse-google-doc.js scripts/sync/sync-content.js tests/parse-google-doc.test.js
git commit -m "Keep notes to a developer off the page"
```

---

### Task 2: Lesson dates computed from the season year

**Files:**
- Create: `scripts/sync/lesson-dates.js`
- Test: `tests/lesson-dates.test.js`

**Interfaces:**
- Produces:
  - `seasonEndYear(value: string, layoutName: string) => number` — `'2026/27'` → `2027`
  - `lessonWeekends(year: number) => Array<{session: 'A'|'B', lesson: number, label: string}>` — six entries, `label` like `'Jan 30 - Jan 31'`
  - `refundDeadline(year: number) => string` — `'December 31, 2026'`
  - `lessonRange(year: number) => {start: string, end: string}` — `'January 30, 2027'` / `'March 14, 2027'`
  - `endsOnSecondSaturdayOfMarch(year: number) => boolean`

- [ ] **Step 1: Write the failing test**

Create `tests/lesson-dates.test.js`:

```js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
    seasonEndYear, lessonWeekends, refundDeadline, lessonRange,
    endsOnSecondSaturdayOfMarch,
} from '../scripts/sync/lesson-dates.js';
import { ContentError } from '../scripts/sync/join-sections.js';

describe('reading the season year', () => {
    test('2026/27 means the lessons happen in 2027', () => {
        assert.equal(seasonEndYear('2026/27', 'lesson-info'), 2027);
    });

    test('a four-digit second year works too', () => {
        assert.equal(seasonEndYear('2026/2027', 'lesson-info'), 2027);
    });

    test('a year that is not the next one is refused', () => {
        // "2026/28" is a typo, and guessing which half is wrong would put a
        // whole season of dates on the page under the wrong year.
        assert.throws(() => seasonEndYear('2026/28', 'lesson-info'), (error) => {
            assert.ok(error instanceof ContentError);
            assert.match(error.message, /consecutive/);
            assert.match(error.message, /"Season Year" cell/);
            return true;
        });
    });

    test('junk names the cell to fix rather than computing a season', () => {
        assert.throws(() => seasonEndYear('next winter', 'lesson-info'), (error) => {
            assert.match(error.message, /2026\/27/);
            assert.match(error.message, /website has not been changed/i);
            return true;
        });
    });
});

describe('the six lesson weekends', () => {
    test('2027 matches what the sheet used to say by hand', () => {
        // These exact six were in the published sheet before its date columns
        // were deleted. If the rule cannot reproduce them, the rule is wrong.
        assert.deepEqual(lessonWeekends(2027).map((w) => w.label), [
            'Jan 30 - Jan 31',
            'Feb 6 - Feb 7',
            'Feb 20 - Feb 21',
            'Feb 27 - Feb 28',
            'Mar 6 - Mar 7',
            'Mar 13 - Mar 14',
        ]);
    });

    test('Presidents Day weekend is skipped, not merely absent', () => {
        // Feb 13 2027 is the Saturday before the third Monday. Without the
        // skip the run would be Jan 30, Feb 6, Feb 13, ...
        const labels = lessonWeekends(2027).map((w) => w.label);
        assert.ok(!labels.some((l) => l.startsWith('Feb 13')));
        assert.ok(labels.includes('Feb 20 - Feb 21'));
    });

    test('sessions A and B are the first three and the last three', () => {
        // The document promises "3-week (A or B) or 6-week lesson packages".
        const weekends = lessonWeekends(2027);
        assert.deepEqual(weekends.map((w) => w.session), ['A', 'A', 'A', 'B', 'B', 'B']);
        assert.deepEqual(weekends.map((w) => w.lesson), [1, 2, 3, 1, 2, 3]);
    });

    test('always six weekends, every season for the next century', () => {
        for (let year = 2025; year <= 2125; year++) {
            assert.equal(lessonWeekends(year).length, 6, `season ${year}`);
        }
    });

    test('every weekend is a Saturday, and starts the last one in January', () => {
        for (let year = 2025; year <= 2125; year++) {
            const first = lessonWeekends(year)[0].label;
            assert.match(first, /^Jan (2[5-9]|3[01]) /, `season ${year}`);
        }
    });
});

describe('the second-weekend-of-March consequence', () => {
    test('holds for every season from 2025 to 2047', () => {
        for (let year = 2025; year <= 2047; year++) {
            assert.ok(endsOnSecondSaturdayOfMarch(year), `season ${year}`);
        }
    });

    test('and is false for 2048 and 2076 — named, not pretended away', () => {
        // Leap years whose last January Saturday is the 25th: February 29
        // absorbs a weekend and the run ends on the FIRST Saturday of March.
        // The wording on the page must not claim otherwise, and the sync warns.
        assert.equal(endsOnSecondSaturdayOfMarch(2048), false);
        assert.equal(endsOnSecondSaturdayOfMarch(2076), false);
        assert.equal(lessonWeekends(2048)[5].label, 'Mar 7 - Mar 8');
    });

    test('those two are the only exceptions before 2126', () => {
        const exceptions = [];
        for (let year = 2025; year <= 2125; year++) {
            if (!endsOnSecondSaturdayOfMarch(year)) exceptions.push(year);
        }
        assert.deepEqual(exceptions, [2048, 2076, 2104]);
    });
});

describe('dates written out for prose', () => {
    test('the refund deadline is December 31 before the season', () => {
        assert.equal(refundDeadline(2027), 'December 31, 2026');
    });

    test('the range spans the first Saturday to the last Sunday', () => {
        assert.deepEqual(lessonRange(2027), {
            start: 'January 30, 2027',
            end: 'March 14, 2027',
        });
    });
});

describe('the result does not depend on when or where it is run', () => {
    test('the same year gives the same answer under any TZ', () => {
        // The build runs in UTC on a GitHub runner and in Pacific time on an
        // officer's laptop. Local-time date maths across the March DST change
        // is the classic way this drifts by a day.
        const previous = process.env.TZ;
        const under = (tz) => {
            process.env.TZ = tz;
            return JSON.stringify(lessonWeekends(2027));
        };
        const utc = under('UTC');
        assert.equal(under('America/Los_Angeles'), utc);
        assert.equal(under('Pacific/Kiritimati'), utc);
        process.env.TZ = previous;
    });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test tests/lesson-dates.test.js`
Expected: FAIL — cannot find module `lesson-dates.js`.

Note the `[2048, 2076, 2104]` assertion: I verified 2048 and 2076 to 2100.
Extend or correct that list from the first run's output rather than trusting
it — if the third value differs, the test is what is wrong, not the code.

- [ ] **Step 3: Implement**

Create `scripts/sync/lesson-dates.js`:

```js
import { ContentError } from './join-sections.js';

/**
 * The season's lesson dates, computed rather than typed.
 *
 * The rule, from the club:
 *
 *   Six lesson weekends, starting on the last Saturday in January, skipping
 *   Presidents' Day weekend.
 *
 * These dates have to keep being right long after everyone who wrote this has
 * graduated, so:
 *
 *   - The only input is the sheet's "Season Year" cell. Nothing here asks what
 *     today is, so the same sheet gives the same dates on any machine, in any
 *     timezone, in any year — and a test can cover 2025-2125 without mocking.
 *   - All arithmetic is UTC, where a week is exactly 7 * 86400000 ms. Local
 *     time would drift by a day across the March DST change.
 *   - Presidents' Day has been the third Monday in February since the Uniform
 *     Monday Holiday Act took effect in 1971. It is not a moving target.
 *
 * "Lessons end on the second weekend in March" is a CONSEQUENCE of the rule
 * above, not part of it, and it is not universal — see
 * endsOnSecondSaturdayOfMarch.
 */

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY = 86400000;
const WEEK = 7 * DAY;
const WEEKENDS = 6;

const utc = (year, month, day) => new Date(Date.UTC(year, month, day));
const plus = (date, ms) => new Date(date.getTime() + ms);
const short = (d) => `${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCDate()}`;
const long = (d) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;

/** '2026/27' -> 2027. The year the lessons actually happen in. */
export function seasonEndYear(value, layoutName) {
    const bad = (why) => new ContentError(
        `The sheet's "Season Year" cell says "${value}", ${why}\n\n` +
        `It should read like "2026/27" — the two calendar years the season ` +
        `spans, in order.\n\n` +
        `Correct the "Season Year" cell in the sheet.\n\n` +
        `The website has not been changed. It is still showing the previous version.`
    );

    const match = /^(\d{4})\s*[/-]\s*(\d{2}|\d{4})$/.exec((value ?? '').trim());
    if (!match) throw bad('which is not a season the website can read.');

    const start = Number(match[1]);
    const tail = match[2];
    // "27" means 2027, not the year 27. Take the century from the first year so
    // this keeps working in 2100 without anyone revisiting it.
    const end = tail.length === 4
        ? Number(tail)
        : Math.floor(start / 100) * 100 + Number(tail);

    if (end !== start + 1) {
        throw bad(
            `but those are not consecutive years. A season spans one winter, ` +
            `so the second year is always the first plus one.`
        );
    }
    return end;
}

/** The last Saturday in January of the given year. */
export function lastSaturdayOfJanuary(year) {
    const last = utc(year, 0, 31);
    // getUTCDay: 0 = Sunday ... 6 = Saturday. Step back to the Saturday.
    return plus(last, -(((last.getUTCDay() + 1) % 7) * DAY));
}

/** The Saturday of Presidents' Day weekend — two days before the third Monday. */
export function presidentsDaySaturday(year) {
    const first = utc(year, 1, 1);
    const firstMonday = 1 + ((8 - first.getUTCDay()) % 7);
    return utc(year, 1, firstMonday + 14 - 2);
}

/**
 * The six lesson weekends. Session A is the first three, B the last three,
 * matching the document's own sentence: "We offer 3-week (A or B) or 6-week
 * lesson packages." That split used to live in the sheet; if the club ever
 * changes the package shape, this is the line that has to change with it.
 */
export function lessonWeekends(year) {
    const start = lastSaturdayOfJanuary(year);
    const skip = presidentsDaySaturday(year).getTime();

    // Seven candidates so that removing one still leaves six. Presidents' Day
    // weekend is always the 3rd or 4th of them: the last Saturday in January
    // is Jan 25-31, and its Saturday is Feb 13-19.
    const candidates = Array.from({ length: WEEKENDS + 1 }, (_, i) => plus(start, i * WEEK));
    const kept = candidates.filter((d) => d.getTime() !== skip);

    if (kept.length !== WEEKENDS) {
        throw new Error(
            `Presidents' Day weekend was not among the ${WEEKENDS + 1} candidate ` +
            `weekends for ${year}. This is a bug in lesson-dates.js, not ` +
            `something anyone can fix in the sheet or the document.`
        );
    }

    return kept.map((saturday, index) => ({
        session: index < 3 ? 'A' : 'B',
        lesson: (index % 3) + 1,
        label: `${short(saturday)} - ${short(plus(saturday, DAY))}`,
    }));
}

/**
 * Whether the season ends on the second weekend in March, which is how the
 * club describes it. True for every season from 2025 to 2047, then false for
 * 2048 and 2076: leap years whose last January Saturday is the 25th, where
 * February 29 absorbs a weekend and the run ends a week earlier.
 *
 * The sync warns when this is false rather than letting the page's wording
 * quietly stop matching its own table.
 */
export function endsOnSecondSaturdayOfMarch(year) {
    const first = utc(year, 2, 1);
    const firstSaturday = 1 + ((6 - first.getUTCDay()) % 7);
    const second = utc(year, 2, firstSaturday + 7);

    const weekends = lessonWeekends(year);
    const last = weekends[weekends.length - 1];
    return last.label.startsWith(short(second));
}

/** December 31 of the calendar year before the season. See the spec, §5. */
export function refundDeadline(year) {
    return long(utc(year - 1, 11, 31));
}

/** The first Saturday and the last Sunday, written out for prose. */
export function lessonRange(year) {
    const weekends = lessonWeekends(year);
    const start = lastSaturdayOfJanuary(year);
    const lastSaturday = plus(start, (weekends.length) * WEEK);
    return { start: long(start), end: long(plus(lastSaturday, DAY)) };
}
```

Note on `lessonRange`: the last lesson Saturday is `start + 6 weeks` because one
weekend is skipped, so the six kept weekends span seven. Verify against the test
rather than trusting the reasoning — if `end` comes out as `March 7, 2027`,
derive it from `lessonWeekends` instead of recomputing.

- [ ] **Step 4: Run the tests**

Run: `node --test tests/lesson-dates.test.js`
Expected: PASS. If the exceptions list differs from `[2048, 2076, 2104]`,
correct the test to the computed list and check the reasoning holds (leap year,
last January Saturday is the 25th).

- [ ] **Step 5: Commit**

```bash
git add scripts/sync/lesson-dates.js tests/lesson-dates.test.js
git commit -m "Compute the lesson dates from the season year"
```

---

### Task 3: The computed dates reach the page

**Files:**
- Modify: `scripts/sync/apply-sheet.js`
- Modify: `tests/apply-sheet.test.js`
- Modify: `tests/fixtures/published-sheet.csv`

**Interfaces:**
- Consumes: everything Task 2 exports.
- Produces: `derive(settings, layoutName) => settings` — the sheet's settings
  plus `refundDeadline`, `lessonStart`, `lessonEnd`. `sheetBlock(entry, sheet,
  layoutName)` keeps its signature; `dateBoxes` now takes a year.

- [ ] **Step 1: Fix the fixture first**

Replace `tests/fixtures/published-sheet.csv` with the real published shape —
the date columns are gone from the club's sheet, so a fixture that still has
them tests nothing that exists:

```csv
Lesson Director,Lesson Type,3 Week Price,6 Week Price
Charlotte Smith,Group,240,360
Season Year,Single-Student,660,990
2026/27,Friends & Family,325,485
Ski Registration State,,,
Not yet open,,,
Snowboard Registration State,,,
Not yet open,,,
```

- [ ] **Step 2: Rewrite the dates tests**

In `tests/apply-sheet.test.js`, replace the whole `describe('dates')` block.
The old "a session added to the sheet appears without anyone editing code" test
asserts a premise that no longer exists and must go, not be adapted.

```js
describe('dates', () => {
    const { boxes } = sheetBlock({ type: 'purple-stripe', sheet: 'dates' }, SHEET, 'lesson-info');

    test('one box per session, not one per lesson', () => {
        assert.equal(boxes.length, 2);
        assert.deepEqual(boxes.map((b) => b.heading), ['Session A', 'Session B']);
    });

    test('the dates come from the season year, not from the sheet', () => {
        // The sheet's date columns were deleted in August 2026. These six are
        // what it used to say by hand for 2026/27.
        assert.deepEqual(boxes[0].items, [
            'Lesson 1: Jan 30 - Jan 31',
            'Lesson 2: Feb 6 - Feb 7',
            'Lesson 3: Feb 20 - Feb 21',
        ]);
        assert.deepEqual(boxes[1].items, [
            'Lesson 1: Feb 27 - Feb 28',
            'Lesson 2: Mar 6 - Mar 7',
            'Lesson 3: Mar 13 - Mar 14',
        ]);
    });

    test('next season needs one cell changed, not twelve', () => {
        const next = { ...SHEET, settings: { ...SHEET.settings, seasonYear: '2027/28' } };
        const grown = sheetBlock({ sheet: 'dates' }, next, 'lesson-info');
        assert.equal(grown.boxes[0].items[0], 'Lesson 1: Jan 29 - Jan 30');
    });

    test('a note under the table is filled in and rendered as prose', () => {
        // Mirrors the real pipeline: fillLayoutTokens runs over the layout
        // BEFORE sheetBlock sees it, so the note arrives already filled in.
        const settings = derive(SHEET.settings, 'lesson-info');
        const entry = fillLayoutTokens(
            { sheet: 'dates', note: 'They run from {lesson_start} to {lesson_end}.' },
            settings, 'lesson-info'
        );
        const block = sheetBlock(entry, SHEET, 'lesson-info');
        const text = block.content.map((c) => c.spans.map((s) => s.text).join('')).join('');
        assert.equal(text, 'They run from January 30, 2027 to March 14, 2027.');
    });
});
```

Also delete the now-dead `describe('an empty table...')` → `test('dates')` case,
keeping the `prices` one. There is no longer a way for the dates table to be
empty; that is the point.

Update the `tokens` describe block: `{refund_deadline}` no longer comes from the
sheet, so replace the "a token the sheet has no value for" test with:

```js
test('the refund deadline is derived, not typed into the sheet', () => {
    // It used to be a hand-maintained "Refund Deadline" row that agreed with
    // the document's "December 31st" only by luck.
    const settings = derive(SHEET.settings, 'lesson-registration');
    assert.equal(
        fillTokens('Cancel by {refund_deadline}.', settings, 'lesson-registration'),
        'Cancel by December 31, 2026.'
    );
});

test('a token with no value still names the row to add', () => {
    assert.throws(
        () => fillTokens('Ask {lesson_director}', {}, 'lesson-registration'),
        (error) => {
            assert.match(error.message, /does not have a value for it/);
            assert.match(error.message, /"lesson director" row/);
            return true;
        }
    );
});
```

Add `derive` to the import at the top of the file.

- [ ] **Step 3: Run and watch it fail**

Run: `node --test tests/apply-sheet.test.js`
Expected: FAIL — `derive` is not exported; dates still read `sheet.sessions`.

- [ ] **Step 4: Implement**

In `scripts/sync/apply-sheet.js`, add the import and extend `TOKENS`:

```js
import { seasonEndYear, lessonWeekends, refundDeadline, lessonRange } from './lesson-dates.js';
```

```js
const TOKENS = {
    season_year: 'seasonYear',
    lesson_director: 'lessonDirector',
    refund_deadline: 'refundDeadline',
    lesson_start: 'lessonStart',
    lesson_end: 'lessonEnd',
};
```

Add, above `fillTokens`:

```js
/**
 * The sheet's own values plus everything derivable from them.
 *
 * Dates are computed rather than typed so that no date is ever maintained in
 * two places. Before this, the sheet had a "Refund Deadline" row that nothing
 * read, while the document had "December 31st" typed into its prose — the one
 * date the club is held to, agreeing with itself only by luck.
 */
export function derive(settings, layoutName) {
    if (!settings.seasonYear) return settings;
    const year = seasonEndYear(settings.seasonYear, layoutName);
    const range = lessonRange(year);
    return {
        ...settings,
        refundDeadline: refundDeadline(year),
        lessonStart: range.start,
        lessonEnd: range.end,
    };
}
```

Replace `dateBoxes` and its call site:

```js
/** Lesson dates, one box per session. See scripts/sync/lesson-dates.js. */
function dateBoxes(seasonYear, layoutName) {
    const year = seasonEndYear(seasonYear, layoutName);
    const bySession = new Map();
    for (const weekend of lessonWeekends(year)) {
        if (!bySession.has(weekend.session)) bySession.set(weekend.session, []);
        bySession.get(weekend.session).push(`Lesson ${weekend.lesson}: ${weekend.label}`);
    }
    return [...bySession].map(([name, items]) => ({ heading: `Session ${name}`, items }));
}
```

In `sheetBlock`:

```js
const boxes = entry.sheet === 'dates'
    ? dateBoxes(sheet.settings.seasonYear, layoutName)
    : entry.sheet === 'prices'
        ? priceBoxes(sheet.prices, layoutName)
        : null;
```

and, after the unknown-table guard, turn an optional `note` into prose:

```js
const { sheet: _table, note, ...rest } = entry;

// A sentence under the table, written in the layout because it describes the
// shape of the season rather than anything an officer would reword.
return {
    ...rest,
    ...(note ? { content: [{ type: 'paragraph', spans: linkedSpans(note) }] } : {}),
    boxes,
};
```

- [ ] **Step 5: Run the tests**

Run: `node --test tests/apply-sheet.test.js tests/lesson-dates.test.js && npm run lint`
Expected: PASS, lint clean.

- [ ] **Step 6: Commit**

```bash
git add scripts/sync/apply-sheet.js tests/apply-sheet.test.js tests/fixtures/published-sheet.csv
git commit -m "Serve the lesson dates from the computed season"
```

---

### Task 4: Tokens work in the document's own prose

Without this, Task 3 gives the club a `{refund_deadline}` they cannot use: only
strings the *layout* sets are filled in, so a token typed into the Google Doc
would publish as literal braces.

**Files:**
- Modify: `scripts/sync/apply-sheet.js`
- Modify: `scripts/sync/sync-content.js`
- Test: `tests/apply-sheet.test.js`

**Interfaces:**
- Produces: `fillContentTokens(blocks, settings, layoutName) => blocks`

- [ ] **Step 1: Write the failing test**

```js
describe('tokens in the document text', () => {
    const settings = { refundDeadline: 'December 31, 2026', seasonYear: '2026/27' };
    const para = (text) => ({ type: 'paragraph', spans: [{ text, bold: false, italic: false, href: null }] });
    const textOf = (blocks) => blocks[0].content[0].spans.map((s) => s.text).join('');

    test('an officer can write {refund_deadline} in the document', () => {
        const filled = fillContentTokens(
            [{ content: [para('Cancel by {refund_deadline}.')] }], settings, 'lesson-registration'
        );
        assert.equal(textOf(filled), 'Cancel by December 31, 2026.');
    });

    test('it reaches grouped sections and headings too', () => {
        const filled = fillContentTokens(
            [{ groups: [{ heading: 'Refunds', content: [para('By {refund_deadline}.')] }] }],
            settings, 'lesson-registration'
        );
        assert.match(filled[0].groups[0].content[0].spans[0].text, /December 31, 2026/);
    });

    test('braces that are not a known token are left exactly alone', () => {
        // The layout is written by developers, so an unknown token there is a
        // mistake worth stopping the build for. The document is written by
        // officers, who may legitimately type a brace. Refusing to publish
        // their page over it would be the tool getting in the way.
        const filled = fillContentTokens(
            [{ content: [para('Wear a {warm} jacket.')] }], settings, 'lesson-info'
        );
        assert.equal(textOf(filled), 'Wear a {warm} jacket.');
    });

    test('a known token with no value is left alone rather than blanked', () => {
        const filled = fillContentTokens(
            [{ content: [para('Ask {lesson_director}.')] }], settings, 'lesson-registration'
        );
        assert.equal(textOf(filled), 'Ask {lesson_director}.');
    });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `node --test tests/apply-sheet.test.js`
Expected: FAIL — `fillContentTokens` is not exported.

- [ ] **Step 3: Implement**

In `scripts/sync/apply-sheet.js`:

```js
/**
 * Fills tokens in text that came from the document, so a date can be written
 * once and quoted anywhere.
 *
 * Deliberately more forgiving than fillTokens. A layout file is written by a
 * developer, so `{seson_year}` there is a typo worth stopping the build for.
 * The document is written by officers who might reasonably type a brace, and
 * freezing the whole site over "{warm} jacket" would be the tool getting in
 * the way of the people it is for. Unknown tokens, and known tokens the sheet
 * has no value for, pass through untouched.
 */
export function fillContentTokens(blocks, settings, layoutName) {
    const fill = (text) => text.replace(/\{([a-z_]+)\}/g, (whole, token) => {
        const key = TOKENS[token];
        return key && settings[key] ? settings[key] : whole;
    });

    const walk = (value) => {
        if (Array.isArray(value)) return value.map(walk);
        if (value && typeof value === 'object') {
            if (typeof value.text === 'string') return { ...value, text: fill(value.text) };
            return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v)]));
        }
        return value;
    };

    return blocks.map(walk);
}
```

`layoutName` is unused today; keep it in the signature for the error message
this will need in step 2, or drop it — `npm run lint` will decide, and it has
caught an unused parameter on this file before.

In `scripts/sync/sync-content.js`, wire `derive` and the content pass:

```js
import { sheetBlock, fillLayoutTokens, applyStatus, derive, fillContentTokens } from './apply-sheet.js';
```

Inside `syncLayout`, replace the sheet block:

```js
let resolved = layout;
let settings = null;
const sheetWarnings = [];
if (layout.sheet) {
    const csv = await fetchPublished(
        sheetUrl(layout.sheet.publishedId), layoutName, 'signup sheet'
    );
    const sheet = parseSheet(csv);
    sheetWarnings.push(...sheet.warnings);

    // Derived values first: the layout's own strings may use them.
    settings = derive(sheet.settings, layoutName);
    resolved = fillLayoutTokens(layout, settings, layoutName);
    resolved = {
        ...resolved,
        blocks: resolved.blocks.map((entry) => {
            if (entry.sheet) return sheetBlock(entry, { ...sheet, settings }, layoutName);
            if (entry.status) return applyStatus(entry, settings, layoutName);
            return entry;
        }),
    };
}

const { blocks: joined, orphans } = joinSections(resolved, parsed, layoutName);
const blocks = settings ? fillContentTokens(joined, settings, layoutName) : joined;
```

Add the second-weekend-of-March warning after that:

```js
// The club describes the season as ending on the second weekend in March.
// True every year until 2048 — say so when it stops being true, rather than
// letting the wording quietly disagree with the table above it.
if (settings?.seasonYear) {
    const year = seasonEndYear(settings.seasonYear, layoutName);
    if (!endsOnSecondSaturdayOfMarch(year)) {
        sheetWarnings.push(
            `The ${settings.seasonYear} season ends on the FIRST weekend in ` +
            `March, not the second — ${year} is a leap year whose last January ` +
            `Saturday is the 25th. Check any wording that says "second weekend".`
        );
    }
}
```

with `import { seasonEndYear, endsOnSecondSaturdayOfMarch } from './lesson-dates.js';`

- [ ] **Step 4: Run everything**

Run: `npm run test:unit && npm run lint`
Expected: PASS, lint clean.

- [ ] **Step 5: Commit**

```bash
git add scripts/sync/apply-sheet.js scripts/sync/sync-content.js tests/apply-sheet.test.js
git commit -m "Let the document quote a date it does not have to maintain"
```

---

### Task 5: The sheet stops carrying what can be derived

**Files:**
- Modify: `scripts/sync/parse-sheet.js`
- Modify: `tests/parse-sheet.test.js`

- [ ] **Step 1: Write the failing test**

```js
test('the sheet no longer needs date columns', () => {
    // They were deleted in August 2026 once the dates became computable.
    // Reading them would fail on the real published sheet.
    const sheet = parseSheet(readFileSync(FIXTURE, 'utf8'));
    assert.ok(!('sessions' in sheet));
    assert.ok(!sheet.warnings.some((w) => /lesson dates/.test(w)));
});

test('an unread Refund Deadline row is not asked for', () => {
    // Asking for a row nothing reads teaches an officer that editing the
    // sheet does nothing, which is the opposite of the lesson we want.
    const sheet = parseSheet(readFileSync(FIXTURE, 'utf8'));
    assert.ok(!sheet.warnings.some((w) => /Refund Deadline/i.test(w)));
});

test('the prices still read by label, not by position', () => {
    const sheet = parseSheet(readFileSync(FIXTURE, 'utf8'));
    assert.equal(sheet.prices.length, 3);
    assert.equal(sheet.settings.lessonDirector, 'Charlotte Smith');
    assert.equal(sheet.settings.seasonYear, '2026/27');
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `node --test tests/parse-sheet.test.js`
Expected: FAIL — `at('session')` throws on the new fixture.

- [ ] **Step 3: Implement**

In `scripts/sync/parse-sheet.js`:

- Delete `'Refund Deadline': 'refundDeadline',` from `SETTINGS`.
- Delete the `session` / `lesson` / `date` lookups and the `sessions` array.
- Delete `if (sessions.length === 0) warnings.push(...)`.
- Return `{ settings, prices, warnings }`.
- Update the JSDoc `@returns` and the header comment: the grid now holds **two**
  tables, not three.

- [ ] **Step 4: Run the tests**

Run: `npm run test:unit && npm run lint`
Expected: PASS, lint clean.

- [ ] **Step 5: Commit**

```bash
git add scripts/sync/parse-sheet.js tests/parse-sheet.test.js
git commit -m "Drop the sheet columns the season year now supplies"
```

---

### Task 6: Rewire the four pages whose layouts are stale

Five pages were failing; `lesson-registration` is already repaired by Task 5,
since its only fault was sharing the sheet whose date columns were deleted.
The other four need layout changes.

Layout data only, no code. Built against the document **as it is today** — two
of these tabs have no headings to work with, and waiting for a document edit
would keep the site frozen.

**Files:**
- Modify: `content/become-an-instructor.layout.json`
- Modify: `content/home.layout.json`
- Modify: `content/diversity-and-inclusion.layout.json`
- Modify: `content/lesson-info.layout.json`

- [ ] **Step 1: Become an Instructor — one block, temporarily**

The tab has zero Heading 2s; its four headings are bold paragraphs. Replace the
`blocks` array with:

```json
"blocks": [
    {
        "_note": "One block because the tab currently has no Heading 2 at all — the four headings were pasted in as bold paragraphs in August 2026. Once they are restyled, step 2 of docs/specs/2026-08-21-content-follows-the-document.md turns each back into its own section with no change here.",
        "type": "white-stripe qa",
        "showTitle": true,
        "lead": true
    }
]
```

`qa` rather than `centered-text`: sixteen blocks of prose centred on the page is
much harder to read than the four short boxes this used to be.

- [ ] **Step 2: Home — match the document, drop the cards**

Change `"section": "Why Us"` to `"section": "Why Us?"` — the document gained a
question mark. Remove `"cards": true` from that block and add:

```json
"_note": "cards needs one Heading 3 per card, and the three card titles were pasted in as plain paragraphs in August 2026. Restore \"cards\": true once they are Heading 3 again."
```

- [ ] **Step 3: Diversity and Inclusion — its section moved tabs**

`Support our Stoked Volunteer Instructors!` now lives in the Support Us tab.
Replace the `blocks` array with the three sections the tab actually has:

```json
"blocks": [
    { "type": "big-white-box", "showTitle": true },
    { "type": "white-stripe qa", "section": "Mission Statement" },
    { "type": "purple-stripe qa", "section": "What is T60?" },
    { "type": "white-stripe qa", "section": "Spread The Shred" }
]
```

Delete the stale `_note` at the top of the file: the page has been served from
the document since PR #21, so "Not yet live" is no longer true.

- [ ] **Step 4: Lesson Info — the season note**

Add `note` to the dates block:

```json
{
    "type": "purple-stripe",
    "heading": "{season_year} Dates",
    "sheet": "dates",
    "note": "Lessons begin the last weekend in January and run for six weekends, skipping Presidents' Day weekend. This season they run from {lesson_start} to {lesson_end}."
}
```

The first sentence is the rule and is true every year. The second is generated,
so it stays right in 2048 when "the second weekend in March" will not be.

- [ ] **Step 5: Run the sync for real**

Run: `npm run sync`
Expected: all eight pages report either "updated" or "already up to date", zero
failures, and NOTE lines for the three editor notes and any unused sections.

- [ ] **Step 6: Check the output before trusting it**

Run: `git diff --stat content/` then read the changed JSON.

Confirm by eye:
- `content/lesson-info.json` has the six computed weekends and the note sentence
  with real dates in it, not `{lesson_start}`.
- No file anywhere contains `***` or a line starting `--`:
  `grep -rn '\*\*\*' content/*.json` returns nothing.
- `contact-us.json`, `faq.json`, `join-our-mailing-list.json` are **unchanged**.
  They were passing before; if they moved, something in Tasks 1-5 had a wider
  blast radius than intended.

- [ ] **Step 7: Full test suite and a look at the real pages**

```bash
npm run test:unit && npm run lint && npm run build && npm run test
```

Then `npm run dev` and look at `/`, `/lesson-info`, `/become-an-instructor` and
`/diversity-and-inclusion` in a browser. The instructor page will look flatter
than it did — that is expected and temporary.

- [ ] **Step 8: Commit and open the PR**

```bash
git add content/
git commit -m "Rewire the pages the August content edit broke"
git push -u origin content-follows-the-document
```

Then open the PR with a body covering: what broke and why (heading styles lost
in the August content edit), the five failures and which task fixes each, the
rule the dates now follow and that it reproduces the deleted sheet columns
exactly, the 2048/2076 exception and how it reports itself, and the two things
still waiting on the club (restyling the bold lines, and whether the document's
"December 31st" should become `{refund_deadline}`).

**Do not merge on a green `--watch`** — that has returned early twice on this
repo. Gate on the run against `main` after merge.

---

## Verification before calling this done

- [ ] `npm run sync` exits 0 against the live document and sheet
- [ ] `npm run test:unit` passes
- [ ] `npm run lint` is clean
- [ ] `npm run test` (Playwright, both projects) passes
- [ ] No `content/*.json` contains `***` or a leading `--`
- [ ] `contact-us`, `faq` and `join-our-mailing-list` JSON are byte-identical to
      their committed versions
- [ ] The deploy runs on merge and the live pages show the computed dates

## What this step deliberately does NOT do

- Auto-sectioning, the not-a-heading diagnostic, and degrade-on-rename — step 2.
- Skipping `--` **headings**. Task 1 handles `--` paragraphs only; the heading
  rule arrives with auto-sectioning, where it matters.
- Editing the Google Doc. Putting `{refund_deadline}` into the Lesson
  Registration prose is a content change for the club to make or to approve;
  Task 4 builds the mechanism, and until it is used the page keeps saying
  "December 31st" literally, exactly as it does now.
- Restyling the bold lines in the document. Asked for, not blocking.
