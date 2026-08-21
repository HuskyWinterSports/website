import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
    seasonEndYear, lessonWeekends, refundDeadline, lessonRange,
    endsOnSecondSaturdayOfMarch,
} from '../scripts/sync/lesson-dates.js';
import { ContentError } from '../scripts/sync/join-sections.js';
import { execFileSync } from 'node:child_process';

const MODULE = new URL('../scripts/sync/lesson-dates.js', import.meta.url).href;

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

    test('an empty cell is refused rather than treated as year zero', () => {
        assert.throws(() => seasonEndYear('', 'lesson-info'), ContentError);
        assert.throws(() => seasonEndYear(undefined, 'lesson-info'), ContentError);
    });
});

describe('the six lesson weekends', () => {
    test('2027 matches what the sheet used to say by hand', () => {
        // These exact six were in the published sheet before its date columns
        // were deleted in August 2026. If the rule cannot reproduce them, the
        // rule is wrong.
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
        // skip the run would read Jan 30, Feb 6, Feb 13, ...
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

    test('and every run starts on the last Saturday in January', () => {
        for (let year = 2025; year <= 2125; year++) {
            assert.match(lessonWeekends(year)[0].label, /^Jan (2[5-9]|3[01]) /, `season ${year}`);
        }
    });
});

describe('the second-weekend-of-March consequence', () => {
    // The club describes the season as ending on the second weekend in March.
    // That falls out of the rule rather than being part of it, and it is not
    // universal — so it is asserted where it is true and named where it is not.
    test('holds for every season from 2025 to 2047', () => {
        for (let year = 2025; year <= 2047; year++) {
            assert.ok(endsOnSecondSaturdayOfMarch(year), `season ${year}`);
        }
    });

    test('and is false for 2048 and 2076 — named, not pretended away', () => {
        // Leap years whose last January Saturday is the 25th: February 29
        // absorbs a weekend and the run ends on the FIRST Saturday of March.
        assert.equal(endsOnSecondSaturdayOfMarch(2048), false);
        assert.equal(endsOnSecondSaturdayOfMarch(2076), false);
        assert.equal(lessonWeekends(2048)[5].label, 'Mar 7 - Mar 8');
    });

    test('those two are the only exceptions this century', () => {
        const exceptions = [];
        for (let year = 2025; year <= 2100; year++) {
            if (!endsOnSecondSaturdayOfMarch(year)) exceptions.push(year);
        }
        assert.deepEqual(exceptions, [2048, 2076]);
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

    test('the range agrees with the table it sits under', () => {
        // Two ways of arriving at the same fact. If they ever disagree, the
        // page contradicts itself in a way no test of either alone would catch.
        const asShort = (written) => {
            const [month, day] = written.replace(',', '').split(' ');
            return `${month.slice(0, 3)} ${day}`;
        };
        for (let year = 2025; year <= 2125; year++) {
            const weekends = lessonWeekends(year);
            const { start, end } = lessonRange(year);
            assert.equal(asShort(start), weekends[0].label.split(' - ')[0], `${year} start`);
            assert.equal(asShort(end), weekends[5].label.split(' - ')[1], `${year} end`);
        }
    });
});

describe('the result does not depend on when or where it is run', () => {
    test('the same year gives the same answer under any timezone', () => {
        // The build runs in UTC on a GitHub runner and in Pacific time on an
        // officer's laptop, and these dates land in March, next to the
        // daylight-saving change.
        //
        // Run in CHILD PROCESSES: assigning process.env.TZ in-process does not
        // re-latch Node's timezone, so the in-process version of this test
        // passes no matter what the module does.
        //
        // Honest about what this catches. Rewriting lesson-dates.js to use
        // local time was measured to keep this green — it constructs and reads
        // in one frame, and a Saturday plus 24 hours never crosses a 2am
        // transition. So this is a guard against a FUTURE change that
        // introduces a real dependency on where the build runs (a
        // toLocaleDateString, a Date.now(), an hour offset), not proof that
        // today's UTC arithmetic is load-bearing.
        const under = (tz) => execFileSync(
            process.execPath,
            ['-e', `import('${MODULE}').then((m) => process.stdout.write(
                JSON.stringify([m.lessonWeekends(2027), m.lessonRange(2027)])
            ))`],
            { env: { ...process.env, TZ: tz }, encoding: 'utf8' }
        );

        const utc = under('UTC');
        assert.match(utc, /Jan 30 - Jan 31/, 'sanity: the child actually ran');
        for (const tz of ['America/Los_Angeles', 'Pacific/Kiritimati', 'Etc/GMT+12', 'Asia/Kolkata']) {
            assert.equal(under(tz), utc, `disagreed under ${tz}`);
        }
    });
});
