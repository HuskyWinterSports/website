import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { joinSections, ContentError } from '../scripts/sync/join-sections.js';

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
        assert.equal(blocks.length, 1);
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

    test('gathered sections are not reported as orphans', () => {
        const { orphans } = joinSections(
            layout([{ type: 'big-white-box', sections: ['Support Our Instructors', 'Empty Section'] }]),
            {
                ...parsed,
                sections: parsed.sections.map((s) =>
                    s.heading === 'Empty Section' ? { ...s, blocks: [paragraph('filled')] } : s
                ),
            },
            'x'
        );
        assert.deepEqual(orphans, []);
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
        assert.throws(
            () => joinSections(layout([{ section: 'Renamed Away', type: 'white-stripe' }]), parsed, 'diversity-and-inclusion'),
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
        assert.throws(
            () => joinSections(layout([{ section: 'Empty Section', type: 'white-stripe' }]), parsed, 'x'),
            (error) => {
                assert.match(error.message, /is empty/);
                assert.match(error.message, /website has not been changed/i);
                return true;
            }
        );
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

describe('sections the website does not use yet', () => {
    test('are reported as orphans, not treated as failures', () => {
        // An officer drafting a new section before a developer wires it up
        // must not be able to take the site down.
        const { orphans } = joinSections(
            layout([{ section: 'Support Our Instructors', type: 'white-stripe' }]),
            parsed,
            'x'
        );
        assert.deepEqual(orphans, ['Empty Section']);
    });

    test('nothing is orphaned when the layout uses every section', () => {
        const { orphans } = joinSections(
            layout([
                { section: 'Support Our Instructors', type: 'white-stripe' },
                { section: 'Empty Section', type: 'white-stripe' },
            ]),
            { ...parsed, sections: parsed.sections.map((s) => (s.heading === 'Empty Section' ? { ...s, blocks: [paragraph('now filled')] } : s)) },
            'x'
        );
        assert.deepEqual(orphans, []);
    });
});
