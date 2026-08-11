import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseGoogleDoc } from '../scripts/sync/parse-google-doc.js';
import { selectTab, ContentError } from '../scripts/sync/join-sections.js';

// A real response body from a document with three tabs, captured 2026-08-11.
// Publish-to-web ignores ?tab=t.N — every tab always arrives in one stream —
// so splitting them correctly is entirely our problem.
const FIXTURE = readFileSync(
    new URL('./fixtures/google-doc-tabs.html', import.meta.url),
    'utf8'
);

const PLAIN = readFileSync(
    new URL('./fixtures/google-doc-published.html', import.meta.url),
    'utf8'
);

describe('splitting a document into tabs', () => {
    const doc = parseGoogleDoc(FIXTURE);

    test('finds every tab, in document order', () => {
        assert.deepEqual(
            doc.tabs.map((t) => t.name),
            ['Diversity and Inclusion', 'Lessons', 'Tab 3']
        );
    });

    test('a tab name is not page content', () => {
        // It is the label in the Docs sidebar. Rendering it would put the page
        // title on screen twice.
        const dni = doc.tabs[0];
        const texts = dni.sections.flatMap((s) =>
            s.blocks.map((b) => (b.spans ?? []).map((x) => x.text).join(''))
        );
        assert.ok(!texts.includes('Lessons'), 'the next tab\'s name leaked into this tab');
    });

    test('each tab has its own title and its own sections', () => {
        assert.equal(doc.tabs[0].title, 'Diversity and Inclusion');
        assert.deepEqual(
            doc.tabs[0].sections.map((s) => s.heading),
            ['Support our Stoked Volunteer Instructors!']
        );
        assert.equal(doc.tabs[1].title, 'Heading 1 Lessons Test Content');
    });

    test('a heading in one tab cannot be reached from another', () => {
        // Without this, two pages that both use "How to Donate" would collide.
        const headings = (i) => doc.tabs[i].sections.map((s) => s.heading);
        assert.ok(!headings(0).includes('Our Commitment'));
        assert.ok(headings(2).includes('Our Commitment'));
    });

    test('a document with no tabs reports none and parses as before', () => {
        const plain = parseGoogleDoc(PLAIN);
        assert.deepEqual(plain.tabs, []);
        assert.equal(plain.title, 'Heading 1');
    });
});

describe('resilience to Google regenerating its markup', () => {
    test('tab splitting survives every CSS class being renumbered', () => {
        // The tab marker is `<p class="c10 title">`. Only `title` is stable —
        // `c10` is regenerated on every republish. Keying on the full class
        // string, or on c10, passes every other test here and then strips the
        // page the first time an officer edits the document.
        const renamed = FIXTURE.replace(/\bc(\d+)\b/g, (_, n) => `z${Number(n) + 500}`);
        assert.notEqual(renamed, FIXTURE, 'fixture should actually have been rewritten');
        assert.deepEqual(parseGoogleDoc(renamed), parseGoogleDoc(FIXTURE));
    });
});

describe('selectTab', () => {
    const doc = parseGoogleDoc(FIXTURE);

    test('narrows the document to the named tab', () => {
        const tab = selectTab(doc, 'Lessons', 'lesson-info');
        assert.equal(tab.title, 'Heading 1 Lessons Test Content');
    });

    test('ignores surrounding whitespace, as section matching does', () => {
        assert.equal(selectTab(doc, '  Lessons  ', 'x').name, 'Lessons');
    });

    test('a layout with no tab reads the whole document', () => {
        assert.equal(selectTab(doc, undefined, 'x'), doc);
    });

    test('a renamed tab names it AND lists the tabs that exist', () => {
        assert.throws(
            () => selectTab(doc, 'Diversity', 'diversity-and-inclusion'),
            (error) => {
                assert.ok(error instanceof ContentError);
                assert.match(error.message, /"Diversity" was not found/);
                assert.match(error.message, /Diversity and Inclusion/);
                assert.match(error.message, /Tab 3/);
                assert.match(error.message, /diversity-and-inclusion\.layout\.json/);
                assert.match(error.message, /website has not been changed/i);
                return true;
            }
        );
    });

    test('asking for a tab in a document that has none says how to add them', () => {
        assert.throws(
            () => selectTab(parseGoogleDoc(PLAIN), 'Lessons', 'x'),
            (error) => {
                assert.match(error.message, /no tabs at all/);
                assert.match(error.message, /Show tabs & outlines/);
                return true;
            }
        );
    });
});
