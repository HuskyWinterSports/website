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
            skiState: 'not_yet_open',
            snowboardState: 'not_yet_open',
        });
    });

    test('the sheet no longer carries lesson dates', () => {
        // The Session/Lesson/Date columns were deleted in August 2026, once
        // the season became computable from the Season Year cell.
        assert.ok(!('sessions' in sheet));
    });

    test('a leftover Refund Deadline row is ignored without complaint', () => {
        // Officers can delete it whenever. Not deleting it must also be safe,
        // and must not produce a warning telling them to fix a non-problem.
        assert.ok(!('refundDeadline' in sheet.settings));
        assert.deepEqual(sheet.warnings, []);
    });

    test('reads prices as their own column group, ignoring the shorter run', () => {
        // The settings column runs ten rows against three prices in the same
        // grid: the two must not be zipped together.
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
        const withNote = FIXTURE.trimEnd() + '\nask Charlotte about session B,,,\n';
        const sheet = parseSheet(withNote);
        assert.equal(sheet.settings.seasonYear, '2026/27');
    });

    test('never records one label as another label\'s value', () => {
        // Sorting the sheet reorders whole rows, which shuffles this column
        // against itself. Taking the next cell blindly would record the lesson
        // director as "Season Year" and publish it as the season.
        const shuffled = [
            'Lesson Director,Lesson Type,3 Week Price,6 Week Price',
            'Season Year,Group,240,360',
            'Charlotte Smith,Single-Student,660,990',
            '2026/27,Friends & Family,325,485',
        ].join('\n');

        const { settings, warnings } = parseSheet(shuffled);
        // It refuses rather than guessing: the search stops at the next label
        // instead of hunting past it for something that looks like a value.
        assert.notEqual(settings.lessonDirector, 'Season Year');
        assert.equal(settings.lessonDirector, undefined);
        assert.match(warnings.join('\n'), /Lesson Director/i);
    });

    test('a label with nothing under it warns rather than failing', () => {
        const emptied = FIXTURE.replace('\n2026/27,', '\n,');
        const sheet = parseSheet(emptied);
        assert.match(sheet.warnings.join('\n'), /Season Year/i);
        assert.equal(sheet.settings.seasonYear, undefined);
    });

    test('an emptied value does not adopt a RETIRED label as its own', () => {
        // The trap this closes: "Refund Deadline" is no longer a setting the
        // website reads, but the row is still in the club's sheet, sitting
        // directly under Season Year. An emptied Season Year that hunted for
        // the next non-blank cell would publish "Refund Deadline" as the
        // season, and every lesson date would be computed from it.
        const emptied = FIXTURE.replace('\n2026/27,', '\n,');
        assert.equal(parseSheet(emptied).settings.seasonYear, undefined);
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
                parseSheet(FIXTURE.replace('Not yet open,', `${written},`)).settings.skiState,
                expected
            );
        }
    });

    test('the two sports are read independently', () => {
        // The reason they were separated: ski lessons fill first, and one
        // combined state turned away snowboarders the club had room for.
        // Only the first "Not yet open" — ski's — is replaced here.
        const { settings } = parseSheet(FIXTURE.replace('Not yet open,', 'Full,'));
        assert.equal(settings.skiState, 'full');
        assert.equal(settings.snowboardState, 'not_yet_open');
    });

    test('never guesses at an unrecognised value', () => {
        // This is the value that tells a parent whether they can book. Guessing
        // "closed" means "full" would be a reasonable-looking way to turn
        // customers away.
        assert.throws(
            () => parseSheet(FIXTURE.replace('Not yet open,', 'closed,')),
            (error) => {
                assert.ok(error instanceof ContentError);
                assert.match(error.message, /"closed", which is not one/);
                assert.match(error.message, /Ski Registration State/);
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
            () => parseSheet(FIXTURE.replace('Lesson Type,', 'Lesson Types,')),
            (error) => {
                assert.match(error.message, /missing its "lesson type" column/);
                assert.match(error.message, /lesson types/);
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
