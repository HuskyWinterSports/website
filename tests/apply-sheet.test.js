import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSheet } from '../scripts/sync/parse-sheet.js';
import { sheetBlock, fillTokens, fillLayoutTokens, applyStatus } from '../scripts/sync/apply-sheet.js';
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

describe('registration status', () => {
    const STATUS = {
        type: 'big-white-box',
        status: {
            sports: [
                { state: 'skiState', label: 'Ski lessons', sheetLabel: 'Ski Registration State' },
                { state: 'snowboardState', label: 'Snowboard lessons', sheetLabel: 'Snowboard Registration State' },
            ],
            bothLabel: 'Ski and snowboard lessons',
            states: {
                not_yet_open: { says: 'are not open yet', form: false },
                open: { says: 'are open', form: true },
                waitlist: { says: 'are full, but you can join the waitlist', form: true },
                full: { says: 'are full', form: false },
            },
            then: { form: 'Fill out the form below.', none: '[Join our mailing list](/join-our-mailing-list) later.' },
        },
        form: { src: 'https://example/form?embedded=true', title: 'Form' },
    };

    const render = (skiState, snowboardState) => {
        const block = applyStatus(STATUS, { skiState, snowboardState }, 'lesson-registration');
        return {
            text: block.content.map((c) => c.spans.map((s) => s.text).join('')).join(' '),
            form: !!block.form,
        };
    };

    test('says it once when both sports agree', () => {
        // "Ski lessons are full. Snowboard lessons are full." reads like a
        // mistake, so the two collapse into one subject.
        const { text } = render('full', 'full');
        assert.match(text, /^Ski and snowboard lessons are full\./);
        assert.doesNotMatch(text, /Snowboard lessons are full/);
    });

    test('says both when they differ — the reason they were separated', () => {
        const { text, form } = render('full', 'open');
        assert.match(text, /Ski lessons are full\. Snowboard lessons are open\./);
        assert.ok(form, 'snowboard is open, so the form must be offered');
    });

    test('offers the form when ANY sport can take a signup', () => {
        assert.ok(render('full', 'waitlist').form);
        assert.ok(render('waitlist', 'full').form);
        assert.ok(!render('full', 'not_yet_open').form);
        assert.ok(!render('not_yet_open', 'not_yet_open').form);
    });

    test('never shows a form under wording that says you cannot sign up', () => {
        // The pairing the hand-written page got wrong for months.
        for (const ski of ['not_yet_open', 'open', 'waitlist', 'full']) {
            for (const snowboard of ['not_yet_open', 'open', 'waitlist', 'full']) {
                const { text, form } = render(ski, snowboard);
                if (form) assert.match(text, /Fill out the form below/);
                else assert.match(text, /mailing list/);
            }
        }
    });

    test('a missing state names the sheet row to add', () => {
        assert.throws(
            () => applyStatus(STATUS, { snowboardState: 'open' }, 'lesson-registration'),
            (error) => {
                assert.ok(error instanceof ContentError);
                assert.match(error.message, /whether ski lessons are open/);
                assert.match(error.message, /"Ski Registration State" row/);
                assert.match(error.message, /waitlist/);
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
