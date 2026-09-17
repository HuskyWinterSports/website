import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
    vagueLinks, bareUrlLinks, headingOutline, headingJumps, cameraNames,
} from '../scripts/sync/content-warnings.js';

/**
 * These checks report; they never fail a build. All based on WCAG content guildlines
 */

const link = (text, href) => ({ bold: false, italic: false, href, text });
const words = (text) => ({ bold: false, italic: false, href: null, text });
const para = (...spans) => ({ type: 'paragraph', spans });
const heading = (level, text) => ({ type: 'heading', level, spans: [words(text)] });

describe('vagueLinks', () => {
    test('finds link text that says nothing on its own', () => {
        const blocks = [{ content: [para(words('Register '), link('here', '/x'))] }];
        assert.deepEqual(vagueLinks(blocks), [{ text: 'here', href: '/x' }]);
    });

    test('ignores case and trailing punctuation', () => {
        const blocks = [{ content: [para(link('Click Here.', '/x'))] }];
        assert.equal(vagueLinks(blocks).length, 1);
    });

    test('does not flag a link that names its destination', () => {
        const blocks = [{ content: [para(link('read the refund policy', '/r'))] }];
        assert.deepEqual(vagueLinks(blocks), []);
    });

    test('reports one line per distinct link, not per mention', () => {
        const blocks = [
            { content: [para(link('here', '/same'))] },
            { content: [para(link('here', '/same'))] },
            { content: [para(link('here', '/other'))] },
        ];
        assert.equal(vagueLinks(blocks).length, 2);
    });

    test('reaches links nested in lists and groups', () => {
        const blocks = [{
            groups: [{
                heading: 'How to donate',
                content: [{ type: 'list', ordered: false, items: [[link('more', '/m')]] }],
            }],
        }];
        assert.deepEqual(vagueLinks(blocks), [{ text: 'more', href: '/m' }]);
    });
});

describe('bareUrlLinks', () => {
    test('flags a long web address used as the words of a link', () => {
        const url = 'https://www.huskywintersports.org/lesson-registration/forms';
        assert.equal(bareUrlLinks([{ content: [para(link(url, url))] }]).length, 1);
    });

    test('leaves a short address alone', () => {
        const url = 'https://uw.edu';
        assert.deepEqual(bareUrlLinks([{ content: [para(link(url, url))] }]), []);
    });

    test('leaves an email address alone', () => {
        const blocks = [{ content: [para(link('huskyws@gmail.com', 'mailto:huskyws@gmail.com'))] }];
        assert.deepEqual(bareUrlLinks(blocks), []);
    });
});

describe('headingOutline', () => {
    test('mirrors how ContentBlocks renders each kind of block', () => {
        const page = {
            title: 'Lesson Info',
            blocks: [
                { showTitle: true, type: 'big-white-box' },          // h1
                { heading: 'Dates', boxes: [{ heading: 'Session A' }] }, // h2 then h3
                { groups: [{ heading: 'Getting there', content: [heading(3, 'Parking')] }] },
            ],
        };
        assert.deepEqual(headingOutline(page), [1, 2, 3, 2, 3]);
    });

    test('a heading with no page title does not invent an h1', () => {
        const page = { title: null, blocks: [{ showTitle: true }, { heading: 'Contact' }] };
        assert.deepEqual(headingOutline(page), [2]);
    });

    test('the document cannot produce an h1 mid-page', () => {
        // ContentBlocks clamps to 2..6, so a stray Heading 1 in the body
        // renders as an h2 rather than a second top-level heading.
        const page = { title: 'X', blocks: [{ content: [heading(1, 'Oops')] }] };
        assert.deepEqual(headingOutline(page), [2]);
    });

    test('a carousel caption is announced as a heading', () => {
        const page = { title: 'X', blocks: [{ slider: { caption: 'Our seasons', slides: [] } }] };
        assert.deepEqual(headingOutline(page), [2]);
    });
});

describe('headingJumps', () => {
    test('finds a level skipped', () => {
        const page = { title: 'X', blocks: [{ showTitle: true }, { content: [heading(4, 'Deep')] }] };
        assert.deepEqual(headingJumps(page), [{ from: 1, to: 4, at: 1 }]);
    });

    test('an ordinary outline is quiet', () => {
        const page = {
            title: 'X',
            blocks: [{ showTitle: true }, { heading: 'A', content: [heading(3, 'A1')] }],
        };
        assert.deepEqual(headingJumps(page), []);
    });

    test('coming back UP several levels is fine', () => {
        const page = {
            title: 'X',
            blocks: [{ heading: 'A', content: [heading(3, 'A1'), heading(4, 'A1a')] }, { heading: 'B' }],
        };
        assert.deepEqual(headingJumps(page), []);
    });
});

describe('cameraNames', () => {
    test('finds the names cameras and phones hand out', () => {
        const photos = [
            { name: 'IMG 4821' }, { name: 'DSC 0001' }, { name: 'PXL 20260114' },
            { name: 'screenshot' }, { name: 'untitled' },
        ];
        assert.equal(cameraNames(photos).length, 5);
    });

    test('leaves a name somebody chose alone', () => {
        const photos = [
            { name: 'in front of ullr' }, { name: 'summit' },
            { name: 'peace signs' }, { name: '2024' },
        ];
        assert.deepEqual(cameraNames(photos), []);
    });

    test('a page with no photos is not an error', () => {
        assert.deepEqual(cameraNames(undefined), []);
    });
});
