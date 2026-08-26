import { ContentError } from './join-sections.js';
// From names.js rather than photos.js: that module loads sharp, and the
// hourly content sync has no other reason to want an image library.
import { slugify } from './names.js';

/**
 * Turns a layout's `photos` request into the block the page renders.
 *
 * The layout asks for a shape of presentation; it never lists files. Which
 * photos exist is the officers' business, decided by what they drop in the
 * Drive folder named after the page, so adding next season's group shot is a
 * Drive upload and nothing else.
 *
 *   { "photos": { "use": "carousel" } }              every photo for this page
 *   { "photos": { "use": "carousel", "only": "dated" } }   only the year ones
 *   { "photos": { "use": "figures", "only": "undated" } }  everything else
 *
 * "dated" means the file is named after a year — the club's history folder
 * holds "2024" beside "newspaper 1", and those are two different kinds of
 * thing that belong in two different places on the page.
 *
 * A block can also name the photographs it wants, in the order it wants them:
 *
 *   { "photos": { "use": "inline", "only": ["sts 3", "sts 1"] } }
 *
 * That is for an arrangement somebody chose by eye — this picture beside that
 * paragraph, that one on the left — which no rule about folder order can
 * express. The names are Drive file names, matched the same way folder names
 * are matched to pages, so an officer reading the layout sees the words they
 * typed. A name that matches nothing is reported and skipped: renaming a file
 * must not be able to take the site down.
 */

const FILTERS = {
    all: () => true,
    dated: (photo) => Boolean(photo.year),
    undated: (photo) => !photo.year,
};

const USES = ['carousel', 'figures', 'inline'];

/**
 * Keys that mean a block is more than its photographs.
 *
 * A block whose photo request matches nothing has to go, or the page draws an
 * empty frame — but only if the photographs were all it ever was. Our History
 * asks for its newspaper clippings on the same block that carries the whole
 * article, and losing nine hundred words because somebody tidied two scans out
 * of a Drive folder is not a trade anybody would make.
 */
const BESIDES = [
    'section', 'sections', 'lead', 'showTitle', 'heading',
    'buttons', 'form', 'map', 'boxes', 'sheet', 'status', 'cards',
];

const onlyPhotos = (block) => !BESIDES.some((key) => key in block);

/**
 * The photographs a request asks for, in the order it asks for them.
 *
 * A list of names is a selection; a group name is a filter. Returns what was
 * asked for and what could not be found, because a name matching nothing is
 * worth a line in the log — an officer who renames a file and sees a picture
 * quietly vanish has nothing to go on.
 */
export function select(photos, only, layoutName) {
    if (!Array.isArray(only)) return { chosen: photos.filter(FILTERS[only]), missing: [] };

    const bySlug = new Map(photos.map((photo) => [photo.slug, photo]));
    const chosen = [];
    const missing = [];
    for (const name of only) {
        if (typeof name !== 'string') {
            throw new ContentError(
                `content/${layoutName}.layout.json names a photo that is not a ` +
                `file name: ${JSON.stringify(name)}`
            );
        }
        const found = bySlug.get(slugify(name));
        if (found) chosen.push(found); else missing.push(name);
    }
    return { chosen, missing };
}

export function photoBlock(entry, photos, layoutName) {
    const { use = 'carousel', only = 'all', alt } = entry.photos;

    if (!USES.includes(use)) {
        throw new ContentError(
            `content/${layoutName}.layout.json asks for photos as "${use}", ` +
            `which is not something the website can draw.\n\n` +
            `Available: ${USES.join(', ')}`
        );
    }
    if (!Array.isArray(only) && !(only in FILTERS)) {
        throw new ContentError(
            `content/${layoutName}.layout.json asks for "${only}" photos, ` +
            `which is not a group the website knows.\n\n` +
            `Available: ${Object.keys(FILTERS).join(', ')}, or a list of file names`
        );
    }

    // Inline slots are worked out a page at a time, above, because how many
    // photographs each gets depends on what the others asked for.
    const picked = entry._chosen
        ? { chosen: entry._chosen, missing: entry._missing ?? [] }
        : select(photos ?? [], only, layoutName);
    const { chosen, missing } = picked;
    const { photos: _request, _chosen: _c, _missing: _m, ...rest } = entry;
    // Stripped from the page later, along with every other leading-underscore
    // key, so this never reaches a visitor.
    const noted = missing.length ? { _missing: missing } : {};

    // No photos is not a failure. An officer emptying a folder, or filling it
    // with files the site cannot read, must not be able to take the site down
    // — the page simply has one less thing on it, and the sync says so.
    if (chosen.length === 0) {
        const report = `${use}:${Array.isArray(only) ? 'named' : only}`;
        // `empty` drops the block; `_empty` is the same line in the log for a
        // block that survives without its picture. Leading underscore, so it
        // is stripped along with the rest of the layout's notes.
        return onlyPhotos(rest)
            ? { ...rest, ...noted, empty: report }
            : { ...rest, ...noted, _empty: report };
    }

    const slides = chosen.map((photo) => ({
        // The file name is the alt text by default, because that puts it in
        // the hands of whoever uploads the photo. `alt` in the layout
        // overrides it for a group of pictures whose file names are only
        // handles — two scans of newsprint called "newspaper 1" and
        // "newspaper 2" describe nothing to somebody who cannot see them.
        alt: alt ?? photo.alt,
        caption: photo.year ?? null,
        ratio: photo.ratio,
        shape: photo.shape,
        // Its real size. The frame never blows a photo up past this — the
        // club's oldest scan is 604 px wide and stretching it to fill a
        // 620 px band is how an archive photo starts looking like a mistake.
        width: photo.width,
        height: photo.height,
        // Widest last, which is the order a srcset reads best in.
        src: photo.sources.at(-1).src,
        srcset: photo.sources.map((s) => `${s.src} ${s.width}w`).join(', '),
        // The blurred wash behind a slide is never seen sharply, so it always
        // uses the smallest file — no reason to pay for detail nobody sees.
        wash: photo.sources[0].src,
    }));

    return use === 'carousel'
        ? { ...rest, ...noted, slider: { slides } }
        : { ...rest, ...noted, figures: slides };
}

/**
 * Hands a page's photos to the sections that asked for one.
 *
 * `{ "photos": { "use": "inline" } }` on a section means "put a picture here".
 * Slots are filled one photo each in name order, and anything left over goes
 * to the last slot — so adding a photo to the Drive folder changes ONE place
 * on the page. Sharing them out evenly instead would move every picture on the
 * page to a different paragraph the moment somebody uploaded a fifth, which is
 * the same objection that keeps the auto-styled sections from alternating
 * colours: one upload should not repaint the page.
 *
 * A slot that NAMES its photographs takes those first, wherever they sit in
 * the folder, and what is left is shared out as before. That is how a page
 * gets an arrangement somebody chose by eye without giving up the property
 * that a new upload still lands somewhere by itself.
 *
 * Nothing is ever dropped. If there are more photos than slots the last
 * section shows several; if there are fewer, the empty slots simply have no
 * picture.
 */
export function assignInline(blocks, photos, layoutName) {
    const slots = blocks.filter((b) => b.photos?.use === 'inline');
    if (slots.length === 0) return { blocks, slots: 0, placed: 0 };

    const pool = photos ?? [];
    const share = new Map();
    const missed = new Map();
    const claimed = new Set();

    // Named slots first, so what they ask for is theirs whatever else happens.
    for (const slot of slots) {
        if (!Array.isArray(slot.photos.only)) continue;
        const { chosen, missing } = select(pool, slot.photos.only, layoutName);
        share.set(slot, chosen);
        if (missing.length) missed.set(slot, missing);
        for (const photo of chosen) claimed.add(photo.slug);
    }

    const spare = pool.filter((photo) => !claimed.has(photo.slug));
    const open = slots.filter((slot) => !share.has(slot));
    open.forEach((slot, i) => share.set(
        slot,
        i === open.length - 1 ? spare.slice(i) : spare.slice(i, i + 1)
    ));

    // Every slot named one, and somebody has since uploaded another. It is not
    // dropped and it is not guessed at: it joins the last section on the page,
    // which is where a spare goes when the slots are not named either.
    if (open.length === 0 && spare.length) {
        const last = slots.at(-1);
        share.set(last, [...share.get(last), ...spare]);
    }

    return {
        blocks: blocks.map((block) => {
            if (!share.has(block)) return block;
            const mine = share.get(block);
            const missing = missed.get(block) ?? [];
            // An inline slot is a section that also has a picture, so an empty
            // one loses the picture and keeps the section. It never goes
            // through photoBlock, which is where a block gets dropped.
            if (mine.length === 0) {
                const { photos: _drop, ...rest } = block;
                return missing.length ? { ...rest, _missing: missing } : rest;
            }
            return photoBlock({ ...block, _chosen: mine, _missing: missing }, pool, layoutName);
        }),
        slots: slots.length,
        // How many photographs ended up doubled up because there was nowhere
        // else for them — not how many more there are than slots, which stops
        // being the same number the moment a slot names what it wants.
        spare: open.length ? Math.max(0, spare.length - open.length) : spare.length,
    };
}
