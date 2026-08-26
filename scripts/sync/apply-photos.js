import { ContentError } from './join-sections.js';

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
 */

const FILTERS = {
    all: () => true,
    dated: (photo) => Boolean(photo.year),
    undated: (photo) => !photo.year,
};

const USES = ['carousel', 'figures', 'inline'];

export function photoBlock(entry, photos, layoutName) {
    const { use = 'carousel', only = 'all', alt } = entry.photos;

    if (!USES.includes(use)) {
        throw new ContentError(
            `content/${layoutName}.layout.json asks for photos as "${use}", ` +
            `which is not something the website can draw.\n\n` +
            `Available: ${USES.join(', ')}`
        );
    }
    if (!(only in FILTERS)) {
        throw new ContentError(
            `content/${layoutName}.layout.json asks for "${only}" photos, ` +
            `which is not a group the website knows.\n\n` +
            `Available: ${Object.keys(FILTERS).join(', ')}`
        );
    }

    const chosen = entry._chosen ?? (photos ?? []).filter(FILTERS[only]);
    const { photos: _request, _chosen: _picked, ...rest } = entry;

    // No photos is not a failure. An officer emptying a folder, or filling it
    // with files the site cannot read, must not be able to take the site down
    // — the page simply has one less thing on it, and the sync says so.
    if (chosen.length === 0) return { ...rest, empty: `${use}:${only}` };

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
        ? { ...rest, slider: { slides } }
        : { ...rest, figures: slides };
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
 * Nothing is ever dropped. If there are more photos than slots the last
 * section shows several; if there are fewer, the empty slots simply have no
 * picture.
 */
export function assignInline(blocks, photos, layoutName) {
    const slots = blocks.filter((b) => b.photos?.use === 'inline');
    if (slots.length === 0) return { blocks, slots: 0, placed: 0 };

    const pool = photos ?? [];
    const share = new Map(slots.map((slot, i) => [
        slot,
        i === slots.length - 1 ? pool.slice(i) : pool.slice(i, i + 1),
    ]));

    return {
        blocks: blocks.map((block) => {
            if (!share.has(block)) return block;
            const mine = share.get(block);
            if (mine.length === 0) {
                const { photos: _drop, ...rest } = block;
                return rest;
            }
            return photoBlock({ ...block, _chosen: mine }, pool, layoutName);
        }),
        slots: slots.length,
        placed: Math.min(pool.length, Infinity),
    };
}
