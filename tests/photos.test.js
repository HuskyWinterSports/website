import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { parse } from 'node-html-parser';
import { slugify, yearOf, describe as describeImage } from '../scripts/sync/photos.js';
import { photoBlock, assignInline } from '../scripts/sync/apply-photos.js';
import { ContentError } from '../scripts/sync/join-sections.js';

/**
 * The photos come from a folder officers fill themselves, so every one of
 * these covers something a real upload can do: a portrait among landscapes, a
 * HEIC straight off a phone, a file named after a decade rather than a year.
 */

const listing = readFileSync(new URL('./fixtures/drive-folder-listing.html', import.meta.url), 'utf8');

/** A real JPEG of a given size, so the shape rules are tested on real pixels. */
const jpeg = (width, height) =>
    sharp({ create: { width, height, channels: 3, background: '#502c84' } }).jpeg().toBuffer();

describe('reading a shared Drive folder', () => {
    // The parsing half of listFolder, against markup captured from the club's
    // own folder. Kept separate from the fetch so it needs no network.
    const entries = parse(listing).querySelectorAll('.flip-entry').map((entry) => ({
        id: (entry.getAttribute('id') ?? '').replace(/^entry-/, ''),
        name: entry.querySelector('.flip-entry-title')?.textContent.trim() ?? '',
        isFolder: (entry.querySelector('a')?.getAttribute('href') ?? '').includes('/drive/folders/'),
    }));

    test('tells a subfolder from a photo by the shape of its link', () => {
        // NOT by the icon sprite or the aria-label: the sprite is cosmetic and
        // the label is localised, so either would break for a club that used
        // Drive in another language.
        assert.deepEqual(entries.map((e) => e.isFolder), [true, false]);
    });

    test('reads the name and the id of each entry', () => {
        assert.equal(entries[0].name, 'become an instructor');
        assert.equal(entries[0].id, '1o1RCk-sjUcLYQHgobeP5ViMU2YpLoU3l');
        assert.equal(entries[1].name, 'IMG_0647.HEIC');
    });
});

describe('folder and file names', () => {
    test('a folder name becomes the page it belongs to', () => {
        assert.equal(slugify('become an instructor'), 'become-an-instructor');
        assert.equal(slugify('Our History'), 'our-history');
    });

    test('a year in the name dates the photo', () => {
        assert.equal(yearOf('2024'), '2024');
        // The club's oldest photo is a decade, not a year.
        assert.equal(yearOf('2000s'), '2000s');
    });

    test('anything else is not a date', () => {
        // "newspaper 1" and "STS 4" live in the same folders as the years.
        assert.equal(yearOf('newspaper 1'), null);
        assert.equal(yearOf('summit'), null);
        assert.equal(yearOf('2024 group'), null);
    });
});

describe('describing an uploaded photo', () => {
    test('measures a landscape photo', async () => {
        const d = await describeImage(await jpeg(4032, 3024), 'summit');
        assert.equal(d.usable, true);
        assert.equal(d.shape, 'landscape');
        assert.equal(d.width, 4032);
    });

    test('a portrait is recognised rather than assumed away', async () => {
        // Three of the five folders contain exactly one portrait. The frame
        // fits whatever shape arrives, but only because it is told the shape.
        const d = await describeImage(await jpeg(3024, 4032), 'heart hands');
        assert.equal(d.shape, 'portrait');
    });

    test('a near-square scan is neither', async () => {
        const d = await describeImage(await jpeg(1206, 1197), 'newspaper 1');
        assert.equal(d.shape, 'square');
    });

    test('a HEIC is refused with an instruction, not an error code', async () => {
        // sharp links libheif and CLAIMS to read HEIC, then throws on a real
        // iPhone file over its reference limit. The club's 2026 photo is one.
        // So this is sniffed from the bytes before sharp is asked anything.
        const heic = Buffer.concat([
            Buffer.from([0, 0, 0, 24]), Buffer.from('ftypheic'), Buffer.alloc(64),
        ]);
        const d = await describeImage(heic, '2026');
        assert.equal(d.usable, false);
        assert.match(d.reason, /HEIC/);
        assert.match(d.reason, /export it as JPEG/);
    });

    test('a file that is not an image at all is refused too', async () => {
        const d = await describeImage(Buffer.from('this is a text file'), 'notes');
        assert.equal(d.usable, false);
    });
});

describe('turning photos into a block', () => {
    const photo = (name, year, shape = 'landscape') => ({
        slug: slugify(name), name, alt: name, year, shape, width: 2000, height: 1500, ratio: 1.333,
        sources: [
            { src: `/images/photos/x/${slugify(name)}-640.avif`, width: 640 },
            { src: `/images/photos/x/${slugify(name)}-1280.avif`, width: 1280 },
        ],
    });

    const history = [photo('2024', '2024'), photo('newspaper 1', null, 'square')];

    test('"dated" takes the year photos and leaves the clippings', () => {
        const block = photoBlock({ photos: { use: 'carousel', only: 'dated' } }, history, 'our-history');
        assert.equal(block.slider.slides.length, 1);
        assert.equal(block.slider.slides[0].caption, '2024');
    });

    test('"undated" takes exactly the rest', () => {
        const block = photoBlock({ photos: { use: 'figures', only: 'undated' } }, history, 'our-history');
        assert.deepEqual(block.figures.map((f) => f.alt), ['newspaper 1']);
    });

    test('the request itself never reaches the page', () => {
        // `photos` is an instruction to the sync, like `_note`. Shipping it
        // would put it in the JavaScript every visitor downloads.
        const block = photoBlock({ type: 'white-stripe', photos: { use: 'carousel' } }, history, 'x');
        assert.ok(!('photos' in block));
        assert.equal(block.type, 'white-stripe');
    });

    test('every size is offered to the browser, widest as the fallback', () => {
        const [slide] = photoBlock({ photos: { use: 'carousel' } }, [photo('summit', null)], 'x').slider.slides;
        assert.equal(slide.srcset, '/images/photos/x/summit-640.avif 640w, /images/photos/x/summit-1280.avif 1280w');
        assert.match(slide.src, /1280/);
        // The blur behind a slide is never seen sharply, so it takes the
        // smallest file rather than the one on screen.
        assert.match(slide.wash, /640/);
    });

    test('the layout can name the alt text for a group of pictures', () => {
        // Two scans of newsprint called "newspaper 1" and "newspaper 2"
        // describe nothing to somebody who cannot see them, and nobody should
        // have to rename a file to make a screen reader work.
        const block = photoBlock(
            { photos: { use: 'figures', only: 'undated', alt: 'Historical newspaper clipping' } },
            history, 'our-history'
        );
        assert.deepEqual(block.figures.map((f) => f.alt), ['Historical newspaper clipping']);
    });

    test('without one, the file name is still the alt text', () => {
        // The default keeps alt text in the hands of whoever uploads a photo.
        const block = photoBlock({ photos: { use: 'carousel', only: 'dated' } }, history, 'x');
        assert.equal(block.slider.slides[0].alt, '2024');
    });

    test('an empty folder loses a picture, not the website', () => {
        // An officer clearing a folder, or filling it with files the site
        // cannot read, must not be able to take a page down.
        const block = photoBlock({ photos: { use: 'carousel' } }, [], 'x');
        assert.equal(block.empty, 'carousel:all');
        assert.ok(!block.slider);
    });

    test('a layout asking for something impossible says what is available', () => {
        assert.throws(
            () => photoBlock({ photos: { use: 'mosaic' } }, history, 'home'),
            (error) => error instanceof ContentError && /carousel, figures/.test(error.message)
        );
    });
});

/**
 * A block naming the photographs it wants.
 *
 * Which picture sits beside which paragraph is sometimes chosen by eye, and no
 * rule about folder order can express that. The names are Drive file names.
 */
describe('photographs a block asks for by name', () => {
    const photo = (name) => ({
        slug: slugify(name), name, alt: name, year: null, shape: 'landscape',
        width: 2000, height: 1500, ratio: 1.333,
        sources: [{ src: `/images/photos/x/${slugify(name)}-640.avif`, width: 640 }],
    });

    const pool = ['peace signs', 'sts 1', 'sts 2', 'sts 3', 'sts 4'].map(photo);
    const slot = (section, only) => ({
        type: 'white-stripe', section, photos: { use: 'inline', ...(only ? { only } : {}) },
    });

    test('they come out in the order the layout asks for, not folder order', () => {
        const block = photoBlock({ photos: { use: 'figures', only: ['sts 3', 'sts 1'] } }, pool, 'd');
        assert.deepEqual(block.figures.map((f) => f.alt), ['sts 3', 'sts 1']);
    });

    test('a name is matched the way a folder name is', () => {
        // "STS 3", "sts-3" and "sts 3" are the same file to everyone but a
        // string comparison.
        const block = photoBlock({ photos: { use: 'figures', only: ['STS 3'] } }, pool, 'd');
        assert.deepEqual(block.figures.map((f) => f.alt), ['sts 3']);
    });

    test('a name matching no file is reported, not fatal', () => {
        const block = photoBlock({ photos: { use: 'figures', only: ['sts 3', 'gone'] } }, pool, 'd');
        assert.deepEqual(block.figures.map((f) => f.alt), ['sts 3']);
        assert.deepEqual(block._missing, ['gone']);
    });

    test('a named slot takes its photographs wherever they sit in the folder', () => {
        const { blocks } = assignInline([
            slot('Mission Statement', ['sts 3', 'sts 1']),
            slot('What is T60?', ['sts 2']),
            slot('Spread The Shred', ['peace signs', 'sts 4']),
        ], pool, 'd');
        assert.deepEqual(blocks.map((b) => b.figures.map((f) => f.alt)), [
            ['sts 3', 'sts 1'], ['sts 2'], ['peace signs', 'sts 4'],
        ]);
    });

    test('what no slot named is shared out among the slots that named nothing', () => {
        const { blocks } = assignInline([
            slot('Mission Statement', ['sts 3']),
            slot('What is T60?'),
            slot('Spread The Shred'),
        ], pool, 'd');
        assert.deepEqual(blocks.map((b) => b.figures.map((f) => f.alt)), [
            ['sts 3'], ['peace signs'], ['sts 1', 'sts 2', 'sts 4'],
        ]);
    });

    test('an upload nobody asked for still lands somewhere', () => {
        // Every slot names one, and then a sixth photo appears in Drive. It is
        // not dropped and it is not guessed at: it joins the last section.
        const { blocks, spare } = assignInline([
            slot('a', ['sts 1']),
            slot('b', ['sts 2']),
        ], [photo('sts 1'), photo('sts 2'), photo('new one')], 'd');
        assert.deepEqual(blocks.at(-1).figures.map((f) => f.alt), ['sts 2', 'new one']);
        assert.equal(spare, 1);
    });

    test('no photograph is counted as spare just because a slot named it', () => {
        // The old count was "photos minus slots", which stopped being the
        // number that had doubled up the moment a slot asked for two.
        const { spare } = assignInline([
            slot('Mission Statement', ['sts 3', 'sts 1']),
            slot('What is T60?', ['sts 2']),
            slot('Spread The Shred', ['peace signs', 'sts 4']),
        ], pool, 'd');
        assert.equal(spare, 0);
    });

    test('a slot whose photograph has been renamed keeps its words and says so', () => {
        const { blocks } = assignInline([
            slot('Mission Statement', ['gone']),
            slot('Spread The Shred', ['peace signs', 'sts 1', 'sts 2', 'sts 3', 'sts 4']),
        ], pool, 'd');
        assert.equal(blocks[0].section, 'Mission Statement');
        assert.ok(!blocks[0].figures);
        assert.ok(!('photos' in blocks[0]));
        assert.deepEqual(blocks[0]._missing, ['gone']);
    });

    test('a section that also carries words survives losing its picture', () => {
        // Our History asks for its clippings on the block that carries the
        // whole article. Emptying that folder must not empty the page.
        const block = photoBlock(
            { type: 'white-stripe qa', lead: true, showTitle: true, photos: { use: 'figures', only: 'undated' } },
            [], 'our-history'
        );
        assert.ok(!block.empty, 'the block would have been dropped, and the article with it');
        assert.equal(block._empty, 'figures:undated');
        assert.equal(block.lead, true);
    });

    test('a block that was only ever the photographs still goes', () => {
        const block = photoBlock({ photos: { use: 'carousel' } }, [], 'home');
        assert.equal(block.empty, 'carousel:all');
    });

    test('a layout naming something that is not a file name says so', () => {
        assert.throws(
            () => photoBlock({ photos: { use: 'figures', only: [3] } }, pool, 'd'),
            (error) => error instanceof ContentError && /not a file name/.test(error.message)
        );
    });
});
