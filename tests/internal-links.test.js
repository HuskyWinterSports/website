import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { internalPath } from '../src/links.js';

/**
 * An editor linking to one of our own pages types or pastes the full address,
 * because that is what Google Docs gives them. They should not have to know
 * that the site treats its own pages differently — so the renderer works it
 * out, and these are the cases it has to get right.
 */
describe('internalPath', () => {
    test('recognises our own pages, with or without www', () => {
        assert.equal(
            internalPath('https://www.huskywintersports.org/lesson-registration'),
            '/lesson-registration'
        );
        assert.equal(
            internalPath('https://huskywintersports.org/lesson-registration'),
            '/lesson-registration'
        );
    });

    test('keeps a bare root as a path', () => {
        assert.equal(internalPath('https://www.huskywintersports.org'), '/');
    });

    test('carries the query and fragment across', () => {
        assert.equal(
            internalPath('https://www.huskywintersports.org/faq?x=1#refunds'),
            '/faq?x=1#refunds'
        );
    });

    test('passes through a path written directly', () => {
        assert.equal(internalPath('/contact-us'), '/contact-us');
    });

    test('leaves other sites alone', () => {
        assert.equal(internalPath('https://www.summitatsnoqualmie.com/tickets'), null);
        assert.equal(internalPath('https://gentoo.org/'), null);
    });

    test('is not fooled by a lookalike hostname', () => {
        // The check must compare the whole host, not merely contain it.
        assert.equal(internalPath('https://huskywintersports.org.evil.example/x'), null);
        assert.equal(internalPath('https://nothuskywintersports.org/x'), null);
    });

    test('leaves mailto and tel alone', () => {
        assert.equal(internalPath('mailto:huskywslessons@gmail.com'), null);
        assert.equal(internalPath('tel:+12065551234'), null);
    });

    test('survives nonsense', () => {
        assert.equal(internalPath('not a url'), null);
        assert.equal(internalPath(''), null);
        assert.equal(internalPath(null), null);
    });
});
