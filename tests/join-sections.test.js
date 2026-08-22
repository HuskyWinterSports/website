import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { joinSections, looksLikeHeadings, ContentError } from '../scripts/sync/join-sections.js';

/**
 * These cover the paths a club officer will actually hit — a renamed heading,
 * an emptied section, a section drafted before anyone wired it up. The message
 * text is part of the contract, not decoration: an officer who gets a useless
 * error is back to "go find a CS major", which is the whole thing this system
 * exists to avoid.
 */

const paragraph = (text) => ({ type: 'paragraph', spans: [{ text, bold: false, italic: false, href: null }] });

const parsed = {
    title: 'Diversity and Inclusion',
    sections: [
        { heading: null, blocks: [paragraph('intro text')] },
        { heading: 'Support Our Instructors', blocks: [paragraph('body text')] },
        { heading: 'Empty Section', blocks: [] },
    ],
};

const layout = (blocks) => ({ route: '/x', blocks });

describe('joinSections', () => {
    test('attaches a document section to its layout block', () => {
        const { blocks } = joinSections(
            layout([{ section: 'Support Our Instructors', type: 'white-stripe' }]),
            parsed,
            'diversity-and-inclusion'
        );
        assert.equal(blocks[0].type, 'white-stripe');
        assert.equal(blocks[0].heading, 'Support Our Instructors');
        assert.equal(blocks[0].content.length, 1);
    });

    test('matches section names ignoring surrounding whitespace', () => {
        const { blocks } = joinSections(
            layout([{ section: '  Support Our Instructors  ', type: 'white-stripe' }]),
            parsed,
            'x'
        );
        assert.equal(blocks[0].content.length, 1);
    });

    test('lead blocks take the text before the first Heading 2', () => {
        const { blocks } = joinSections(layout([{ lead: true, type: 'big-white-box' }]), parsed, 'x');
        assert.equal(blocks[0].content[0].spans[0].text, 'intro text');
    });

    test('one block can carry both the title and the opening text', () => {
        // Contact Us and Email List are a title and some paragraphs, with no
        // headings at all. Inventing a heading just to have something to hang
        // content on would put a join key in the club's document that nobody
        // asked for and everybody then has to preserve.
        const { blocks } = joinSections(
            layout([{ type: 'big-white-box centered-text', showTitle: true, lead: true }]),
            parsed,
            'contact-us'
        );
        assert.equal(blocks[0].showTitle, true);
        assert.equal(blocks[0].content[0].spans[0].text, 'intro text');
    });

    test('a title-and-lead block still checks the title exists', () => {
        // The lead branch used to return before this check ran, so exactly the
        // pages that need it were the ones skipping it.
        assert.throws(
            () => joinSections(
                layout([{ type: 'big-white-box', showTitle: true, lead: true }]),
                { ...parsed, title: null },
                'contact-us'
            ),
            (error) => {
                assert.match(error.message, /no page title/);
                return true;
            }
        );
    });

    test('layout-only blocks need nothing from the document', () => {
        const { blocks } = joinSections(
            layout([{ type: 'button', label: 'Donate', href: 'https://example.org' }]),
            parsed,
            'x'
        );
        assert.equal(blocks[0].label, 'Donate');
        assert.equal(blocks[0].content, undefined);
    });

    test('gathers several sections into one block', () => {
        // Contact Us and FAQ are each a single panel holding two headed
        // groups. One block per heading would give the page boxes it never
        // had, so this is parity machinery, not a convenience.
        const { blocks } = joinSections(
            layout([{ type: 'big-white-box', sections: ['Support Our Instructors', 'Second'] }]),
            {
                ...parsed,
                sections: [...parsed.sections, { heading: 'Second', blocks: [paragraph('more')] }],
            },
            'x'
        );
        assert.equal(blocks.length, 1, 'must stay a single block');
        assert.deepEqual(blocks[0].groups.map((g) => g.heading), ['Support Our Instructors', 'Second']);
        assert.equal(blocks[0].groups[1].content[0].spans[0].text, 'more');
    });

    test('gathered sections do not also render on their own', () => {
        const { auto } = joinSections(
            layout([{ type: 'big-white-box', sections: ['Support Our Instructors', 'Empty Section'] }]),
            {
                ...parsed,
                sections: parsed.sections.map((s) =>
                    s.heading === 'Empty Section' ? { ...s, blocks: [paragraph('filled')] } : s
                ),
            },
            'x'
        );
        assert.deepEqual(auto, []);
    });

    test('a gathered section that is missing fails like any other', () => {
        // Same message, so an editor cannot tell which layout shape was used —
        // and should not have to.
        assert.throws(
            () => joinSections(
                layout([{ type: 'big-white-box', sections: ['Support Our Instructors', 'Gone'] }]),
                parsed,
                'contact-us'
            ),
            (error) => {
                assert.match(error.message, /"Gone" was not found/);
                assert.match(error.message, /contact-us\.layout\.json/);
                assert.match(error.message, /website has not been changed/i);
                return true;
            }
        );
    });

    test('a title-only block is allowed to carry no section', () => {
        const { blocks } = joinSections(
            layout([{ type: 'big-white-box', showTitle: true }]),
            parsed,
            'x'
        );
        assert.equal(blocks[0].showTitle, true);
    });
});

describe('failure messages', () => {
    test('a renamed heading names the section AND lists what the document has', () => {
        // Fatal only when the block carries something the document cannot
        // supply. A plain block degrades instead — see the test below.
        assert.throws(
            () => joinSections(
                layout([{ section: 'Renamed Away', type: 'white-stripe', map: { src: 'x', title: 'y' } }]),
                parsed, 'diversity-and-inclusion'),
            (error) => {
                assert.ok(error instanceof ContentError);
                assert.match(error.message, /"Renamed Away" was not found/);
                // Listing the real headings is what turns this from "something
                // broke" into "oh, I renamed that one".
                assert.match(error.message, /Support Our Instructors/);
                assert.match(error.message, /diversity-and-inclusion\.layout\.json/);
                assert.match(error.message, /website has not been changed/i);
                return true;
            }
        );
    });

    test('an emptied section says so rather than publishing a blank block', () => {
        // No longer fatal — an officer clearing a section while they rewrite it
        // should not freeze every other page — but nothing blank is published
        // and the log names the heading that needs text.
        const { blocks, warnings } = joinSections(
            layout([{ section: 'Empty Section', type: 'white-stripe' }]), parsed, 'x'
        );
        assert.ok(!blocks.some((b) => b.heading === 'Empty Section'));
        assert.match(warnings.join('\n'), /"Empty Section"[\s\S]*is empty/);
    });

    test('a deleted page title is caught rather than shipping a page with no h1', () => {
        // The renderer skips the <h1> when the title is missing, so this would
        // otherwise go out looking almost right and cost search traffic.
        assert.throws(
            () => joinSections(
                layout([{ type: 'big-white-box', showTitle: true }]),
                { ...parsed, title: null },
                'diversity-and-inclusion'
            ),
            (error) => {
                assert.ok(error instanceof ContentError);
                assert.match(error.message, /no page title/);
                assert.match(error.message, /Heading 1/);
                assert.match(error.message, /website has not been changed/i);
                return true;
            }
        );
    });

    test('a cards section with no Heading 3 says what a card is made of', () => {
        // Otherwise the page renders an empty grid: visibly broken, but only
        // to whoever happened to look at it.
        assert.throws(
            () => joinSections(
                layout([{ section: 'Support Our Instructors', type: 'white-stripe', cards: true }]),
                parsed,
                'lesson-info'
            ),
            (error) => {
                assert.ok(error instanceof ContentError);
                assert.match(error.message, /row of cards, one per "Heading 3"/);
                assert.match(error.message, /has no Heading 3 in it/);
                assert.match(error.message, /website has not been changed/i);
                return true;
            }
        );
    });

    test('a missing opening paragraph is explained in plain language', () => {
        const noLead = { title: 'x', sections: [{ heading: 'A', blocks: [paragraph('t')] }] };
        assert.throws(
            () => joinSections(layout([{ lead: true, type: 'big-white-box' }]), noLead, 'x'),
            (error) => {
                assert.match(error.message, /missing its opening text/);
                return true;
            }
        );
    });
});

describe('sections the layout does not mention', () => {
    test('are published in the default style, and reported', () => {
        // They used to be dropped. After the August 2026 content edit that
        // meant pages silently lost sections nobody had wired up yet.
        const { blocks, auto } = joinSections(
            layout([{ section: 'Support Our Instructors', type: 'white-stripe' }]),
            { ...parsed, sections: parsed.sections.map((s) =>
                s.heading === 'Empty Section' ? { ...s, blocks: [paragraph('now filled')] } : s) },
            'x'
        );
        assert.deepEqual(auto, ['Empty Section']);
        assert.deepEqual(blocks.map((b) => b.heading), ['Support Our Instructors', 'Empty Section']);
    });

    test('nothing is auto-styled when the layout covers every section', () => {
        const { auto } = joinSections(
            layout([
                { section: 'Support Our Instructors', type: 'white-stripe' },
                { section: 'Empty Section', type: 'white-stripe' },
            ]),
            { ...parsed, sections: parsed.sections.map((s) => (s.heading === 'Empty Section' ? { ...s, blocks: [paragraph('now filled')] } : s)) },
            'x'
        );
        assert.deepEqual(auto, []);
    });

    test('a renamed heading on a plain block warns instead of failing', () => {
        const { warnings } = joinSections(
            layout([{ section: 'Renamed Away', type: 'white-stripe' }]), parsed, 'x'
        );
        assert.match(warnings.join('\n'), /no longer has a section "Renamed Away"/);
    });
});

describe('notes to developers stay in the repo', () => {
    // Layout files carry "_note" explanations of why a block looks the way it
    // does. They were being copied straight into content/<page>.json, which is
    // bundled into the JavaScript — so ~4.6 KB of prose about CSS specificity
    // and box rhythm was downloaded by every parent looking for lesson times.
    test('underscore keys are dropped from the built page', () => {
        const { blocks } = joinSections(
            layout([{ type: 'white-stripe', section: 'Support Our Instructors', _note: 'why this is a stripe' }]),
            parsed, 'x'
        );
        assert.ok(!('_note' in blocks[0]), '_note must not reach the browser');
        assert.equal(blocks[0].type, 'white-stripe');
        assert.ok(blocks[0].content.length > 0, 'the real content still comes through');
    });

    test('including on blocks that carry no document section', () => {
        const { blocks } = joinSections(
            layout([{ slider: { slides: [] }, _note: 'photos are layout', _pending: 'later' }]),
            parsed, 'x'
        );
        assert.deepEqual(Object.keys(blocks[0]), ['slider']);
    });

    test('a layout-level note is dropped too', () => {
        const { blocks } = joinSections(
            { ...layout([{ type: 'white-stripe', section: 'Support Our Instructors' }]), _pending: 'a section held back' },
            parsed, 'x'
        );
        assert.equal(blocks.length, 1);
    });
});

describe('sections follow the document', () => {
    // The layout used to be a whitelist: a heading it did not name was dropped.
    // After the August 2026 content edit that meant three pages silently lost
    // sections, so the layout is now a set of OVERRIDES and the document
    // decides what exists.
    const doc = (...headings) => ({
        title: 'A Page',
        sections: headings.map((h) =>
            typeof h === 'string'
                ? { heading: h, blocks: [paragraph(`${h} body`)] }
                : h),
    });
    const headings = (blocks) => blocks.map((b) => b.heading ?? '(none)');

    test('a heading the layout never mentions still reaches the page', () => {
        const { blocks } = joinSections(
            layout([{ type: 'purple-stripe', section: 'Known' }]),
            doc('Known', 'Brand New'), 'x'
        );
        assert.deepEqual(headings(blocks), ['Known', 'Brand New']);
        assert.equal(blocks[1].content[0].spans[0].text, 'Brand New body');
    });

    test('and it is reported, so a developer can style it later', () => {
        const { auto } = joinSections(
            layout([{ section: 'Known' }]), doc('Known', 'Brand New'), 'x'
        );
        assert.deepEqual(auto, ['Brand New']);
    });

    test('new sections land in document order, not at the end', () => {
        // A section written in the middle of the document belongs in the
        // middle of the page.
        const { blocks } = joinSections(
            layout([{ section: 'First' }, { section: 'Last' }]),
            doc('First', 'Middle', 'Last'), 'x'
        );
        assert.deepEqual(headings(blocks), ['First', 'Middle', 'Last']);
    });

    test('one plain style for every auto section, with no guessing', () => {
        // Not alternating colours: inserting one section would repaint every
        // section below it. Not inferring cards either — a plausible wrong
        // layout is worse than a plain one.
        const { blocks } = joinSections(
            layout([]), doc('One', 'Two', 'Three'), 'x'
        );
        assert.deepEqual(blocks.map((b) => b.type), ['white-stripe qa', 'white-stripe qa', 'white-stripe qa']);
    });

    test('blocks that name no section keep their place among those that do', () => {
        // The home page's photo carousel sits between two sections; the sheet
        // tables on Lesson Info sit between four.
        const { blocks } = joinSections(
            layout([
                { section: 'Alpha' },
                { slider: { slides: [] } },
                { section: 'Beta' },
            ]),
            doc('Alpha', 'Beta'), 'x'
        );
        assert.deepEqual(blocks.map((b) => b.heading ?? (b.slider ? 'SLIDER' : '?')),
            ['Alpha', 'SLIDER', 'Beta']);
    });

    test('a leading block with no section comes before everything', () => {
        // Three pages open with a title-only block.
        const { blocks } = joinSections(
            layout([{ type: 'big-white-box', showTitle: true }, { section: 'Alpha' }]),
            doc('Alpha'), 'x'
        );
        assert.equal(blocks[0].showTitle, true);
        assert.equal(blocks[1].heading, 'Alpha');
    });

    test('a heading starting with -- is a draft and stays off the site', () => {
        // Officers draft inside this document — the "-- Planning" tab is proof.
        // Auto-sectioning would otherwise publish that draft the moment it was
        // typed, which reverses a guarantee the sync used to make.
        const { blocks, auto } = joinSections(
            layout([]), doc('Real', '-- Draft for next year'), 'x'
        );
        assert.deepEqual(headings(blocks), ['Real']);
        assert.deepEqual(auto, ['Real']);
    });

    test('a section held back by the layout stays off the site', () => {
        // "Check out how we teach!" is one sentence ending in a colon until
        // the training manual links arrive.
        const { blocks, held } = joinSections(
            layout([{ section: 'Not ready', hidden: true }]),
            doc('Real', 'Not ready'), 'x'
        );
        assert.deepEqual(headings(blocks), ['Real']);
        assert.deepEqual(held, ['Not ready']);
    });

    test('an empty section is skipped rather than rendered as a blank panel', () => {
        const { blocks } = joinSections(
            layout([]), doc('Real', { heading: 'Nothing here', blocks: [] }), 'x'
        );
        assert.deepEqual(headings(blocks), ['Real']);
    });

    test('several document headings can still be gathered into one panel', () => {
        // Contact Us and FAQ are each a single box holding headed groups.
        const { blocks } = joinSections(
            layout([{ type: 'white-stripe qa', sections: ['Registration', 'Lessons'] }]),
            doc('Registration', 'Lessons'), 'x'
        );
        assert.equal(blocks.length, 1, 'gathered sections must not also auto-render');
        assert.deepEqual(blocks[0].groups.map((g) => g.heading), ['Registration', 'Lessons']);
    });
});

describe('a renamed heading no longer takes the whole site down', () => {
    const doc = (...hs) => ({
        title: 'A Page',
        sections: hs.map((h) => ({ heading: h, blocks: [paragraph(`${h} body`)] })),
    });

    test('the content survives under the new name, in the default style', () => {
        // The whole point: renaming a heading used to fail every page on the
        // site, hourly, until a developer noticed.
        const { blocks, warnings } = joinSections(
            layout([{ type: 'big-purple-box', section: 'Old Name' }]),
            doc('New Name'), 'x'
        );
        assert.deepEqual(blocks.map((b) => b.heading), ['New Name']);
        assert.equal(blocks[0].type, 'white-stripe qa');
        assert.match(warnings.join('\n'), /"Old Name"/);
    });

    test('but a block carrying a map still fails loudly', () => {
        // Losing the map from Location, or the buttons from the home banner,
        // is a real regression that a log line would not save anyone from.
        for (const payload of [
            { map: { src: 'x', title: 'y' } },
            { buttons: [{ label: 'a', href: '/b' }] },
            { form: { src: 'x', title: 'y' } },
            { slider: { slides: [] } },
            { cards: true },
        ]) {
            assert.throws(
                () => joinSections(layout([{ section: 'Gone', ...payload }]), doc('Here'), 'x'),
                (error) => {
                    assert.ok(error instanceof ContentError);
                    assert.match(error.message, /"Gone" was not found/);
                    return true;
                },
                `a block carrying ${Object.keys(payload)[0]} must not degrade silently`
            );
        }
    });
});

describe('headings that are not headings', () => {
    test('a bold line on its own above ordinary text is reported', () => {
        // The failure that broke five pages: styles are lost when text is
        // pasted into Google Docs, and nothing said so.
        const bold = (text) => ({ type: 'paragraph', spans: [{ text, bold: true, italic: false, href: null }] });
        const found = looksLikeHeadings({
            sections: [{ heading: null, blocks: [
                bold('How can I ski for free?'),
                paragraph('Husky Winter Sports brings together students each season.'),
            ] }],
        });
        assert.deepEqual(found, ['How can I ski for free?']);
    });

    test('bold used for emphasis mid-paragraph is not mistaken for one', () => {
        // Promoting a bold line automatically would split a page in two the
        // first time somebody emphasised a sentence. This only reports.
        const mixed = { type: 'paragraph', spans: [
            { text: 'Please ', bold: false, italic: false, href: null },
            { text: 'arrive early', bold: true, italic: false, href: null },
        ] };
        assert.deepEqual(looksLikeHeadings({ sections: [{ heading: null, blocks: [mixed, paragraph('x')] }] }), []);
    });

    test('a long bold sentence is prose, not a heading', () => {
        const bold = (text) => ({ type: 'paragraph', spans: [{ text, bold: true, italic: false, href: null }] });
        const long = bold('This is a whole bold sentence that runs on well past the length of any heading anyone would write here.');
        assert.deepEqual(looksLikeHeadings({ sections: [{ heading: null, blocks: [long, paragraph('x')] }] }), []);
    });

    test('a bold line with nothing under it is not a heading either', () => {
        const bold = (text) => ({ type: 'paragraph', spans: [{ text, bold: true, italic: false, href: null }] });
        assert.deepEqual(looksLikeHeadings({ sections: [{ heading: null, blocks: [bold('Sign-off')] }] }), []);
    });
});
