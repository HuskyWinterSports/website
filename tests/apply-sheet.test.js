import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSheet } from '../scripts/sync/parse-sheet.js';
import { sheetBlock, fillTokens, fillLayoutTokens } from '../scripts/sync/apply-sheet.js';
import { ContentError } from '../scripts/sync/join-sections.js';

const SHEET = parseSheet(readFileSync(
    new URL('./fixtures/published-sheet.csv', import.meta.url), 'utf8'
));

describe('dates', () => {
    const { boxes } = sheetBlock({ type: 'purple-stripe', sheet: 'dates' }, SHEET, 'lesson-info');

    test('one box per session, not one per lesson', () => {
        assert.equal(boxes.length, 2);
        assert.deepEqual(boxes.map((b) => b.heading), ['Session A', 'Session B']);
    });

    test('lessons keep the sheet order within their session', () => {
        assert.deepEqual(boxes[0].items, [
            'Lesson 1: Jan 30 - Jan 31',
            'Lesson 2: Feb 6 - Feb 7',
            'Lesson 3: Feb 20 - Feb 21',
        ]);
    });

    test('a session added to the sheet appears without anyone editing code', () => {
        // The point of the whole exercise: next season's shape is not fixed
        // here.
        const withC = {
            ...SHEET,
            sessions: [...SHEET.sessions, { session: 'C', lesson: '1', date: 'Mar 20 - Mar 21' }],
        };
        const grown = sheetBlock({ sheet: 'dates' }, withC, 'lesson-info');
        assert.equal(grown.boxes.length, 3);
        assert.deepEqual(grown.boxes[2], { heading: 'Session C', items: ['Lesson 1: Mar 20 - Mar 21'] });
    });
});

describe('prices', () => {
    const { boxes } = sheetBlock({ type: 'purple-stripe', sheet: 'prices' }, SHEET, 'lesson-info');

    test('one box per lesson type, with both durations', () => {
        assert.equal(boxes.length, 3);
        assert.deepEqual(boxes[0], {
            heading: 'Group',
            inset: true,
            items: ['3 weeks - $240', '6 weeks - $360'],
        });
    });

    test('prices are not zipped against the longer dates column', () => {
        // The two live in the same grid and have different lengths.
        assert.notEqual(boxes.length, SHEET.sessions.length);
    });
});

describe('an empty table stops the build rather than publishing a blank panel', () => {
    test('dates', () => {
        assert.throws(
            () => sheetBlock({ sheet: 'dates' }, { ...SHEET, sessions: [] }, 'lesson-info'),
            (error) => {
                assert.ok(error instanceof ContentError);
                assert.match(error.message, /no lesson dates/);
                assert.match(error.message, /website has not been changed/i);
                return true;
            }
        );
    });

    test('prices', () => {
        assert.throws(
            () => sheetBlock({ sheet: 'prices' }, { ...SHEET, prices: [] }, 'lesson-info'),
            (error) => {
                assert.match(error.message, /no prices/);
                return true;
            }
        );
    });
});

describe('tokens', () => {
    test('fills a value from the sheet into a layout string', () => {
        assert.equal(
            fillTokens('{season_year} Dates', SHEET.settings, 'lesson-info'),
            '2026/27 Dates'
        );
    });

    test('reaches strings anywhere in the layout', () => {
        const filled = fillLayoutTokens(
            { blocks: [{ heading: '{season_year} Dates', map: { title: 'Map for {season_year}' } }] },
            SHEET.settings,
            'lesson-info'
        );
        assert.equal(filled.blocks[0].heading, '2026/27 Dates');
        assert.equal(filled.blocks[0].map.title, 'Map for 2026/27');
    });

    test('an unknown token names what is available', () => {
        assert.throws(
            () => fillTokens('opens {lesson_start}', SHEET.settings, 'lesson-info'),
            (error) => {
                assert.match(error.message, /\{lesson_start\}, which is not something the sheet provides/);
                assert.match(error.message, /\{season_year\}/);
                return true;
            }
        );
    });

    test('a token the sheet has no value for says which row to add', () => {
        // Publishing "Cancel by {refund_deadline}" verbatim would be worse
        // than not publishing at all.
        assert.throws(
            () => fillTokens('Cancel by {refund_deadline}', {}, 'lesson-registration'),
            (error) => {
                assert.match(error.message, /does not have a value for it/);
                assert.match(error.message, /"refund deadline" row/);
                return true;
            }
        );
    });

    test('leaves text with no tokens exactly as it was', () => {
        assert.equal(fillTokens('Prices', SHEET.settings, 'x'), 'Prices');
    });
});
