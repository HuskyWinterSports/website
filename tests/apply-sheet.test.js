import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSheet } from '../scripts/sync/parse-sheet.js';
import { sheetBlock, fillTokens, fillLayoutTokens, applyStatus, derive, fillContentTokens } from '../scripts/sync/apply-sheet.js';
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

    test('the dates come from the season year, not from the sheet', () => {
        // The sheet's Session/Lesson/Date columns were deleted in August 2026.
        // These six are what it used to say by hand for 2026/27.
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
        assert.equal(grown.boxes[1].items[2], 'Lesson 3: Mar 11 - Mar 12');
    });

    test('a note under the table is filled in and rendered as prose', () => {
        // Mirrors the real pipeline: fillLayoutTokens runs over the layout
        // before sheetBlock sees it, so the note arrives already filled in.
        const settings = derive(SHEET.settings, 'lesson-info');
        const entry = fillLayoutTokens(
            { sheet: 'dates', note: 'They run from {lesson_start} to {lesson_end}.' },
            settings, 'lesson-info'
        );
        const block = sheetBlock(entry, SHEET, 'lesson-info');
        const text = block.content.map((c) => c.spans.map((s) => s.text).join('')).join('');
        assert.equal(text, 'They run from January 30, 2027 to March 14, 2027.');
    });

    test('a season the sheet cannot express stops the build', () => {
        // Rather than publishing a year of confidently wrong dates.
        const broken = { ...SHEET, settings: { ...SHEET.settings, seasonYear: 'this winter' } };
        assert.throws(
            () => sheetBlock({ sheet: 'dates' }, broken, 'lesson-info'),
            (error) => {
                assert.ok(error instanceof ContentError);
                assert.match(error.message, /"Season Year" cell/);
                return true;
            }
        );
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

    test('prices are not zipped against the longer settings column', () => {
        // They live in the same grid and have different lengths: three prices
        // against ten rows of settings. Reading by row would pair them up.
        assert.equal(boxes.length, 3);
        assert.deepEqual(boxes.map((b) => b.heading), ['Group', 'Single-Student', 'Friends & Family']);
    });
});

describe('an empty table stops the build rather than publishing a blank panel', () => {
    // Dates no longer have this failure mode — there is no way to empty them.
    // That is the point of computing them.
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
                not_yet_open: { says: 'are not open yet', form: 'link' },
                open: { says: 'are open', form: 'embed' },
                waitlist: { says: 'are full, but you can join the waitlist', form: 'embed' },
                full: { says: 'are full', form: false },
            },
            then: {
                embed: 'Fill out the form below.',
                link: 'You can [open the form]({form_url}) and wait for it.',
                none: '[Join our mailing list](/join-our-mailing-list) later.',
            },
        },
        form: { src: 'https://example/form?embedded=true', title: 'Form' },
    };

    const render = (skiState, snowboardState) => {
        const block = applyStatus(STATUS, { skiState, snowboardState }, 'lesson-registration');
        return {
            text: block.content.map((c) => c.spans.map((s) => s.text).join('')).join(' '),
            form: !!block.form,
            links: block.content.flatMap((c) => c.spans.filter((s) => s.href).map((s) => s.href)),
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

    test('embeds the form when ANY sport can take a signup', () => {
        assert.ok(render('full', 'waitlist').form);
        assert.ok(render('waitlist', 'full').form);
        assert.ok(!render('full', 'not_yet_open').form);
        assert.ok(!render('not_yet_open', 'not_yet_open').form);
    });

    test('links to the form, without embedding it, before registration opens', () => {
        // Embedding invites somebody to fill in a form that will not accept
        // them; hiding it gives them nowhere to go. A link lets a parent look
        // at what it asks and keep the tab.
        const { text, form, links } = render('not_yet_open', 'not_yet_open');
        assert.ok(!form, 'must not embed');
        assert.match(text, /open the form/);
        assert.ok(links.some((h) => h.includes('example/form')), 'the link must point at the form');
        assert.ok(!links.some((h) => h.includes('embedded=true')), 'the embed URL is not the link URL');
    });

    test('the strongest treatment across the two sports wins', () => {
        assert.ok(render('open', 'not_yet_open').form, 'embed beats link');
        assert.match(render('full', 'not_yet_open').text, /open the form/, 'link beats none');
    });

    test('never embeds a form under wording that says you cannot sign up', () => {
        // The pairing the hand-written page got wrong for months.
        for (const ski of ['not_yet_open', 'open', 'waitlist', 'full']) {
            for (const snowboard of ['not_yet_open', 'open', 'waitlist', 'full']) {
                const { text, form } = render(ski, snowboard);
                if (form) assert.match(text, /Fill out the form below/);
                else assert.doesNotMatch(text, /Fill out the form below/);
            }
        }
    });

    test('a placeholder that survived filling in is caught, not printed', () => {
        // The club once published a literal "{}" this way and it sat live.
        const broken = { ...STATUS, status: { ...STATUS.status,
            then: { ...STATUS.status.then, none: 'Opens {some_day}.' } } };
        assert.throws(
            () => applyStatus(broken, { skiState: 'full', snowboardState: 'full' }, 'lesson-registration'),
            (error) => {
                assert.match(error.message, /still contains \{some_day\}/);
                assert.match(error.message, /printed on the page exactly as written/);
                return true;
            }
        );
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
            () => fillTokens('opens {first_lesson}', SHEET.settings, 'lesson-info'),
            (error) => {
                assert.match(error.message, /\{first_lesson\}, which is not something the sheet provides/);
                assert.match(error.message, /\{season_year\}/);
                assert.match(error.message, /\{lesson_start\}/);
                return true;
            }
        );
    });

    test('the refund deadline is derived, not typed into the sheet', () => {
        // It used to be a hand-maintained "Refund Deadline" row that agreed
        // with the document's "December 31st" only by luck.
        assert.equal(
            fillTokens(
                'Cancel by {refund_deadline}.',
                derive(SHEET.settings, 'lesson-registration'),
                'lesson-registration'
            ),
            'Cancel by December 31, 2026.'
        );
    });

    test('a token the sheet has no value for says which row to add', () => {
        // Publishing "Ask {lesson_director}" verbatim would be worse than not
        // publishing at all.
        assert.throws(
            () => fillTokens('Ask {lesson_director}', {}, 'lesson-registration'),
            (error) => {
                assert.match(error.message, /does not have a value for it/);
                assert.match(error.message, /"lesson director" row/);
                return true;
            }
        );
    });

    test('leaves text with no tokens exactly as it was', () => {
        assert.equal(fillTokens('Prices', SHEET.settings, 'x'), 'Prices');
    });
});

describe('tokens in the document text', () => {
    // Without this, {refund_deadline} is a token the club cannot actually use:
    // only strings the LAYOUT sets get filled in, so a token typed into the
    // Google Doc would publish as literal braces.
    const settings = derive(SHEET.settings, 'lesson-registration');
    const para = (text) => ({
        type: 'paragraph',
        spans: [{ text, bold: false, italic: false, href: null }],
    });
    const textOf = (blocks) => blocks[0].content[0].spans.map((s) => s.text).join('');

    test('an officer can write {refund_deadline} in the document', () => {
        const filled = fillContentTokens(
            [{ content: [para('Cancel by {refund_deadline}.')] }], settings, 'lesson-registration'
        );
        assert.equal(textOf(filled), 'Cancel by December 31, 2026.');
    });

    test('it reaches grouped sections too', () => {
        const filled = fillContentTokens(
            [{ groups: [{ heading: 'Refunds', content: [para('By {refund_deadline}.')] }] }],
            settings, 'lesson-registration'
        );
        assert.match(filled[0].groups[0].content[0].spans[0].text, /December 31, 2026/);
    });

    test('and list items, which is where half the policy lives', () => {
        const filled = fillContentTokens(
            [{ content: [{ type: 'list', ordered: false, items: [
                [{ text: 'Before {refund_deadline}: full refund.', bold: false, italic: false, href: null }],
            ] }] }],
            settings, 'lesson-registration'
        );
        assert.equal(filled[0].content[0].items[0][0].text, 'Before December 31, 2026: full refund.');
    });

    test('braces that are not a known token are left exactly alone', () => {
        // The layout is written by developers, so an unknown token there is a
        // typo worth stopping the build for. The document is written by
        // officers, who may reasonably type a brace — and freezing the whole
        // site over "{warm} jacket" would be the tool getting in the way of
        // the people it exists for.
        const filled = fillContentTokens(
            [{ content: [para('Wear a {warm} jacket.')] }], settings, 'lesson-info'
        );
        assert.equal(textOf(filled), 'Wear a {warm} jacket.');
    });

    test('a known token with no value is left alone rather than blanked', () => {
        const filled = fillContentTokens(
            [{ content: [para('Ask {lesson_director}.')] }], {}, 'lesson-registration'
        );
        assert.equal(textOf(filled), 'Ask {lesson_director}.');
    });

    test('text with no tokens comes back byte-identical', () => {
        // Every block passes through this, so it must not perturb the 8 pages
        // that use no tokens at all.
        const blocks = [{ type: 'white-stripe', content: [para('Plain prose.')] }];
        assert.deepEqual(fillContentTokens(blocks, settings, 'faq'), blocks);
    });
});
