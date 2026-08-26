import sharp from 'sharp';
import { parse } from 'node-html-parser';
import { ContentError } from './join-sections.js';

/**
 * Reads the club's Google Drive photo folder and turns it into web images.
 *
 * Drive is the inbox; this repository is the server. Officers drop photos into
 * a subfolder named after a page, and the sync downloads, resizes, converts
 * and commits them. Nothing on the site ever points at drive.google.com:
 * those URLs are rate limited, uncacheable and change shape without notice.
 *
 * The transport is the same shape as the document and the sheet — a public URL
 * and no credential:
 *
 *   - `embeddedfolderview` lists a shared folder as plain HTML. It is the only
 *     no-auth listing Drive offers, so it is what an officer sharing a folder
 *     link actually enables. Folders are told apart from files by the SHAPE of
 *     their link (/drive/folders/ vs /file/d/), not by the icon sprite or the
 *     "Folder" aria-label — both are cosmetic and the label is localised.
 *   - `uc?export=download` fetches the bytes.
 *
 * Neither is a documented API. Both fail loudly rather than quietly, and the
 * sync's rule is that a failure leaves the previous site in place, so the cost
 * of one breaking is a build that stops, not a page that goes wrong.
 */

/** Drive's no-auth folder listing. */
const listUrl = (id) => `https://drive.google.com/embeddedfolderview?id=${id}#list`;

/** Drive's no-auth file download. */
export const fileUrl = (id) => `https://drive.google.com/uc?export=download&id=${id}`;

/**
 * What sharp will reliably decode from a phone or a camera.
 *
 * HEIC is deliberately absent. sharp links libheif and claims to read it, but
 * a real iPhone HEIC trips libheif's reference limit ("Number of references in
 * iref box (48) exceeds the security limits of 16") — measured against the
 * club's own 2026 photo. A format that works for some files and not others is
 * worse than one that never works, because the failure looks arbitrary.
 */
const READABLE = new Set(['jpeg', 'png', 'webp', 'gif', 'tiff']);

/**
 * An ISO base-media file whose brand says HEIF.
 *
 * Bytes 4..8 are "ftyp" and 8..12 are the brand. Read from the bytes rather
 * than the file name: Drive strips extensions from renamed files, so the
 * club's HEIC photo arrives called "2026" and nothing else.
 */
const HEIF_BRANDS = new Set(['heic', 'heix', 'hevc', 'heim', 'heis', 'mif1', 'msf1', 'avif']);

const isHeic = (buffer) =>
    buffer.length >= 12 &&
    buffer.toString('latin1', 4, 8) === 'ftyp' &&
    HEIF_BRANDS.has(buffer.toString('latin1', 8, 12));

/** Below this a photo is a portrait and cannot go in a wide slot. */
const PORTRAIT = 0.9;

/** Between these a photo is square-ish: a clipping, a scan, a screenshot. */
const SQUARISH = 1.15;

/** A folder name maps to a layout by lowercasing and hyphenating it. */
export const slugify = (name) =>
    name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * A photo whose name is a year or a decade labels itself.
 *
 * The club's history folder holds "2000s" beside "2024". Three of those photos
 * have no year visible in the image at all, so the name is the only thing that
 * can date them.
 */
export const yearOf = (name) => {
    const match = /^(\d{4}s?)$/.exec(name.trim());
    return match ? match[1] : null;
};

export async function listFolder(id, what) {
    let response;
    try {
        response = await fetch(listUrl(id), { redirect: 'follow' });
    } catch (cause) {
        throw new ContentError(
            `Could not reach Google to read the ${what} photo folder.\n\n` +
            `  ${listUrl(id)}\n\n` +
            `This is usually a temporary network problem. The website has not ` +
            `been changed; it is still showing the previous version.\n` +
            `Cause: ${cause.message}`
        );
    }

    if (!response.ok) {
        throw new ContentError(
            `Google returned an error (HTTP ${response.status}) for the ${what} ` +
            `photo folder.\n\n  ${listUrl(id)}\n\n` +
            `This usually means the folder is no longer shared. Open it in ` +
            `Drive, choose Share, and set "General access" to ` +
            `"Anyone with the link".\n\n` +
            `The website has not been changed. It is still showing the previous version.`
        );
    }

    const root = parse(await response.text());
    const entries = root.querySelectorAll('.flip-entry').map((entry) => {
        const href = entry.querySelector('a')?.getAttribute('href') ?? '';
        return {
            id: (entry.getAttribute('id') ?? '').replace(/^entry-/, ''),
            name: entry.querySelector('.flip-entry-title')?.textContent.trim() ?? '',
            isFolder: href.includes('/drive/folders/'),
        };
    });

    // An empty listing means the markup changed or the folder is not shared —
    // either way, publishing "this page now has no photos" would be wrong.
    if (entries.length === 0) {
        throw new ContentError(
            `The ${what} photo folder came back empty.\n\n  ${listUrl(id)}\n\n` +
            `Either the folder really is empty, or it is not shared with ` +
            `"Anyone with the link". Open that address in a private browser ` +
            `window: what you see there is what the website can see.\n\n` +
            `The website has not been changed. It is still showing the previous version.`
        );
    }

    return entries.filter((entry) => entry.id && entry.name);
}

export async function fetchImage(id, name, page) {
    let response;
    try {
        response = await fetch(fileUrl(id), { redirect: 'follow' });
    } catch (cause) {
        throw new ContentError(
            `Could not download "${name}" from the ${page} photo folder.\n\n` +
            `This is usually a temporary network problem. The website has not ` +
            `been changed.\nCause: ${cause.message}`
        );
    }
    if (!response.ok) {
        throw new ContentError(
            `Google returned an error (HTTP ${response.status}) downloading ` +
            `"${name}" from the ${page} photo folder.\n\n  ${fileUrl(id)}\n\n` +
            `The website has not been changed. It is still showing the previous version.`
        );
    }
    return Buffer.from(await response.arrayBuffer());
}

/**
 * What one downloaded file is, measured rather than declared.
 *
 * Orientation is read off the pixels, so an officer who drops a portrait into
 * a folder cannot break a page by doing it — the layout never has to be told
 * which way round a photo is. Returns `null` with a reason when the file is
 * not something the site can use.
 */
export async function describe(buffer, name) {
    // Sniffed before sharp is asked anything, because sharp throws on a real
    // iPhone HEIC rather than reporting its format — so the useful message has
    // to be reachable without sharp's help.
    if (isHeic(buffer)) {
        return {
            name,
            usable: false,
            reason: 'it is a HEIC file, which the website cannot read. Open it, ' +
                'export it as JPEG, and put the JPEG in the folder instead',
        };
    }

    let meta;
    try {
        meta = await sharp(buffer).metadata();
    } catch (cause) {
        return { name, usable: false, reason: `it could not be read (${cause.message.split('\n')[0]})` };
    }

    if (!READABLE.has(meta.format)) {
        return {
            name,
            usable: false,
            reason: `it is a ${meta.format} file, which the website cannot use. ` +
                `Re-save it as JPEG`,
        };
    }

    // EXIF can say "this landscape file is really a portrait". Ask sharp for
    // the size AFTER that rotation, or every phone photo held sideways is
    // classified the wrong way round.
    const turned = meta.orientation >= 5 && meta.orientation <= 8;
    const width = turned ? meta.height : meta.width;
    const height = turned ? meta.width : meta.height;
    const ratio = width / height;

    return {
        name,
        usable: true,
        format: meta.format,
        width,
        height,
        ratio,
        shape: ratio < PORTRAIT ? 'portrait' : ratio < SQUARISH ? 'square' : 'landscape',
        year: yearOf(name),
    };
}
