import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSheet, parseCsv } from '../scripts/sync/parse-sheet.js';
import { ContentError } from '../scripts/sync/join-sections.js';

// The club's real published sheet, captured 2026-08-12.
const FIXTURE = readFileSync(
    new URL('./fixtures/published-sheet.csv', import.meta.url),
    'utf8'
);

describe('parseCsv', () => {
    test('does not cut a quoted field in half at its comma', () => {
        // Google quotes any field containing a comma. A naive split would turn
        // "Seattle, WA 98195" into two columns and shift everything after it —
        // a plausible wrong answer rather than an error.
        const rows = parseCsv('a,"Seattle, WA 98195",c\n');
        assert.deepEqual(rows, [['a', 'Seattle, WA 98195', 'c']]);
    });

    test('handles escaped quotes and blank trailing fields', () => {
        assert.deepEqual(parseCsv('"say ""hi""",,\n'), [['say "hi"', '', '']]);
    });
});

describe('reading the real sheet', () => {
    const sheet = parseSheet(FIXTURE);

    test('finds every setting', () => {
        assert.deepEqual(sheet.settings, {
            lessonDirector: 'Charlotte Smith',
            seasonYear: '2026/27',
            registrationState: 'not_yet_open',
            refundDeadline: 'Dec 31',
        });
    });

    test('reads the calendar as its own column group', () => {
        assert.equal(sheet.sessions.length, 6);
        assert.deepEqual(sheet.sessions[0], { session: 'A', lesson: '1', date: 'Jan 30 - Jan 31' });
        assert.deepEqual(sheet.sessions[5], { session: 'B', lesson: '3', date: 'Mar 13 - Mar 14' });
    });

    test('reads prices as their own column group, ignoring the shorter run', () => {
        // Three prices against six dates in the same grid: the two must not be
        // zipped together.
        assert.equal(sheet.prices.length, 3);
        assert.deepEqual(sheet.prices[1], { type: 'Single-Student', threeWeek: '660', sixWeek: '990' });
    });

    test('a correct sheet produces no warnings', () => {
        assert.deepEqual(sheet.warnings, []);
    });
});

describe('the settings column is read by label, not by position', () => {
    // THE test. The labels and values alternate down column A, so reading by
    // position works perfectly until somebody inserts a row — and then every
    // value lands on the wrong key, silently, and the site publishes a
    // confident lie about when refunds close.
    test('inserting a row does not shift the values', () => {
        const rows = FIXTURE.split('\n');
        const spaced = [rows[0], ',,,,,,', ...rows.slice(1)].join('\n');
        assert.deepEqual(parseSheet(spaced).settings, parseSheet(FIXTURE).settings);
    });

    test('a note typed into a spare cell is ignored, not fatal', () => {
        const withNote = FIXTURE.trimEnd() + '\nask Charlotte about B3,,,,,,\n';
        const sheet = parseSheet(withNote);
        assert.equal(sheet.settings.refundDeadline, 'Dec 31');
    });

    test('never records one label as another label\'s value', () => {
        // Sorting the sheet by Date reorders whole rows, which shuffles this
        // column against itself. Taking the next cell blindly would record the
        // lesson director as "Season Year" and publish it on the refund page.
        const shuffled = [
            'Lesson Director,Session,Lesson,Date,Lesson Type,3 Week Price,6 Week Price',
            'Season Year,A,1,Jan 30 - Jan 31,Group,240,360',
            'Charlotte Smith,A,2,Feb 6 - Feb 7,Single-Student,660,990',
            '2026/27,A,3,Feb 20 - Feb 21,Friends & Family,325,485',
        ].join('\n');

        const { settings, warnings } = parseSheet(shuffled);
        assert.notEqual(settings.lessonDirector, 'Season Year');
        assert.equal(settings.lessonDirector, 'Charlotte Smith');
        assert.match(warnings.join('\n'), /registration state/i);
    });

    test('a label with nothing under it warns rather than failing', () => {
        const emptied = FIXTURE.replace(/\nDec 31,/, '\n,');
        const sheet = parseSheet(emptied);
        assert.match(sheet.warnings.join('\n'), /Refund Deadline/i);
        assert.equal(sheet.settings.refundDeadline, undefined);
    });

    test('a missing label says where to put it back', () => {
        const removed = FIXTURE.replace('Season Year,', ',');
        const sheet = parseSheet(removed);
        assert.match(sheet.warnings.join('\n'), /no "season year" row/i);
        assert.match(sheet.warnings.join('\n'), /first column/i);
    });
});

describe('registration state', () => {
    test('accepts what a person would actually type', () => {
        for (const [written, expected] of [
            ['Not yet open', 'not_yet_open'],
            ['OPEN', 'open'],
            ['Waitlist', 'waitlist'],
            ['full', 'full'],
        ]) {
            assert.equal(
                parseSheet(FIXTURE.replace('Not yet open,', `${written},`)).settings.registrationState,
                expected
            );
        }
    });

    test('never guesses at an unrecognised value', () => {
        // This is the value that tells a parent whether they can book. Guessing
        // "closed" means "full" would be a reasonable-looking way to turn
        // customers away.
        assert.throws(
            () => parseSheet(FIXTURE.replace('Not yet open,', 'closed,')),
            (error) => {
                assert.ok(error instanceof ContentError);
                assert.match(error.message, /"closed", which is not one of the values/);
                assert.match(error.message, /waitlist/);
                assert.match(error.message, /website has not been changed/i);
                return true;
            }
        );
    });
});

describe('columns are found by name', () => {
    test('so the sheet can be rearranged without breaking', () => {
        const swapped = FIXTURE.replace(
            '3 Week Price,6 Week Price',
            '6 Week Price,3 Week Price'
        );
        const sheet = parseSheet(swapped);
        assert.equal(sheet.prices[0].threeWeek, '360', 'columns must follow their headings');
    });

    test('a renamed column says what the sheet actually contains', () => {
        assert.throws(
            () => parseSheet(FIXTURE.replace('Date,', 'Dates,')),
            (error) => {
                assert.match(error.message, /missing its "date" column/);
                assert.match(error.message, /dates/);
                return true;
            }
        );
    });
});

describe('failure messages', () => {
    test('an empty response reads as unpublished', () => {
        assert.throws(
            () => parseSheet(''),
            (error) => {
                assert.match(error.message, /Publish to the web/);
                return true;
            }
        );
    });
});
