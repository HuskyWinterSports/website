import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseGoogleDoc, unwrapHref } from '../scripts/sync/parse-google-doc.js';

// A real response body from /document/d/e/<pubId>/pub, captured 2026-08-10.
// Kept in the repo so these tests never touch the network.
const FIXTURE = readFileSync(
    new URL('./fixtures/google-doc-published.html', import.meta.url),
    'utf8'
);

const flatten = (spans) => spans.map((s) => s.text).join('');

describe('unwrapHref', () => {
    test('unwraps the Google redirector', () => {
        assert.equal(
            unwrapHref(
                'https://www.google.com/url?q=https://gentoo.org/&sa=D&source=editors' +
                '&ust=1786417243084217&usg=AOvVaw04fY'
            ),
            'https://gentoo.org/'
        );
    });

    test('leaves ordinary links alone', () => {
        assert.equal(unwrapHref('https://gentoo.org/'), 'https://gentoo.org/');
        assert.equal(unwrapHref('mailto:huskywslessons@gmail.com'), 'mailto:huskywslessons@gmail.com');
    });

    test('does not mistake a link TO google for the redirector', () => {
        assert.equal(unwrapHref('https://www.google.com/maps'), 'https://www.google.com/maps');
    });

    test('survives a malformed href', () => {
        assert.equal(unwrapHref('not a url'), 'not a url');
        assert.equal(unwrapHref(''), '');
    });
});

describe('parseGoogleDoc', () => {
    const doc = parseGoogleDoc(FIXTURE);

    test('reads the document title from Heading 1', () => {
        assert.equal(doc.title, 'Heading 1');
    });

    test('starts a new section at each Heading 2', () => {
        const named = doc.sections.filter((s) => s.heading !== null);
        assert.deepEqual(named.map((s) => s.heading), ['Heading 2']);
    });

    test('keeps content that appears before the first Heading 2', () => {
        // Parked in an unnamed section rather than silently dropped, so that
        // validation can tell an editor their text has nowhere to go.
        const leading = doc.sections.find((s) => s.heading === null);
        assert.ok(leading, 'expected a leading unnamed section');
        assert.equal(flatten(leading.blocks[0].spans), 'normal text');
    });

    test('detects bold and italic', () => {
        const blocks = doc.sections.find((s) => s.heading === 'Heading 2').blocks;
        const bold = blocks.find((b) => b.spans?.some((s) => s.bold));
        const italic = blocks.find((b) => b.spans?.some((s) => s.italic));
        assert.equal(flatten(bold.spans), 'bold text');
        assert.equal(flatten(italic.spans), 'italic text');
    });

    test('keeps Heading 3 as a heading inside its section', () => {
        const blocks = doc.sections.find((s) => s.heading === 'Heading 2').blocks;
        const h3 = blocks.find((b) => b.type === 'heading');
        assert.equal(h3.level, 3);
        assert.equal(flatten(h3.spans), 'Heading 3');
    });

    test('unwraps links in body text', () => {
        const blocks = doc.sections.find((s) => s.heading === 'Heading 2').blocks;
        const link = blocks.flatMap((b) => b.spans ?? []).find((s) => s.href);
        assert.equal(link.href, 'https://gentoo.org/');
        assert.doesNotMatch(link.href, /google\.com/);
    });

    test('reads bulleted and numbered lists', () => {
        const lists = doc.sections
            .find((s) => s.heading === 'Heading 2')
            .blocks.filter((b) => b.type === 'list');
        assert.equal(lists.length, 2);
        assert.equal(lists[0].ordered, false);
        assert.equal(lists[1].ordered, true);
        assert.deepEqual(lists[0].items.map(flatten), ['a', 'bulleted', 'list']);
    });
});

describe('spacing in the document never reaches the website', () => {
    // Editors ask whether the blank line between a heading and its text
    // matters. It must not: they are laying out a document to read, and the
    // answer has to be "arrange it however looks right to you". Google emits
    // those blank lines as real <p> elements, so this is a decision the parser
    // makes, not something that is true by accident.
    test('blank paragraphs are dropped', () => {
        const doc = parseGoogleDoc(FIXTURE);
        const empties = doc.sections.flatMap((s) => s.blocks)
            .filter((b) => b.type === 'paragraph' && flatten(b.spans).trim() === '');
        assert.deepEqual(empties, []);
    });

    test('adding blank lines changes nothing at all', () => {
        // Not just "no empty blocks" — byte-identical output. An editor
        // pressing Enter must not produce a commit.
        // Deliberately class-agnostic: an earlier version of this test keyed
        // on `<p class="c1">`, which does not occur in this fixture, so the
        // "padding" was a no-op and the test proved nothing.
        const paragraphs = (FIXTURE.match(/<p /g) ?? []).length;
        assert.ok(paragraphs >= 10, `fixture should have paragraphs to pad, found ${paragraphs}`);

        const spaced = FIXTURE.replace(/<p /g, '<p><span></span></p><p ');
        assert.notEqual(spaced, FIXTURE, 'fixture should actually have been padded');
        assert.deepEqual(parseGoogleDoc(spaced), parseGoogleDoc(FIXTURE));
    });
});

describe('resilience to Google regenerating its markup', () => {
    // THE test. Google renumbers its CSS classes on every republish: `c7` was
    // observed meaning bold in one publish and being the link class in the
    // next. Renaming every class here must change nothing about the output.
    // A parser that hard-coded a class number would pass every other test in
    // this file and corrupt the site the first time an officer edited the doc.
    test('output is unchanged when every CSS class is renamed', () => {
        const renamed = FIXTURE.replace(/\bc(\d+)\b/g, (_, n) => `z${Number(n) + 500}`);
        assert.notEqual(renamed, FIXTURE, 'fixture should actually have been rewritten');
        assert.deepEqual(parseGoogleDoc(renamed), parseGoogleDoc(FIXTURE));
    });

    test('output is a pure function of content, so no-op syncs commit nothing', () => {
        // Per-request `nonce` values and per-republish `ust`/`usg` values must
        // not reach the output, or the pipeline would commit on every run.
        const jittered = FIXTURE
            .replace(/nonce="[^"]*"/g, 'nonce="DIFFERENT"')
            .replace(/ust=\d+/g, 'ust=9999999999999')
            .replace(/usg=[A-Za-z0-9_-]+/g, 'usg=DIFFERENT');
        assert.deepEqual(parseGoogleDoc(jittered), parseGoogleDoc(FIXTURE));
    });
});

describe('failure messages', () => {
    test('explains itself when the document is not published', () => {
        // What a fetch actually returns when publishing is revoked: a sign-in
        // page, HTTP 200, no #contents.
        assert.throws(
            () => parseGoogleDoc('<html><body><h1>Sign in</h1></body></html>'),
            (error) => {
                assert.match(error.message, /no longer published|sign-in/i);
                return true;
            }
        );
    });
});
