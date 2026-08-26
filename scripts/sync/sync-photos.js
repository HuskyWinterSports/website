import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ContentError } from './join-sections.js';
import { listFolder, fetchImage, describe, slugify } from './photos.js';

/**
 * Turns the club's Drive photo folder into committed web images.
 *
 * Run separately from the content sync: photos change a few times a season,
 * the document changes weekly, and downloading 40 MB of holiday snaps every
 * hour to discover nothing moved is not a reasonable thing to do to anyone.
 *
 * The output is deterministic — the same photo always encodes to the same
 * bytes, verified before this was written — so an unchanged folder produces
 * no git diff and therefore no commit.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = join(ROOT, 'public', 'images', 'photos');
const MANIFEST = join(ROOT, 'content', 'photos.json');
const CONTENT_DIR = join(ROOT, 'content');

/**
 * The one thing about this that lives in the repo.
 *
 * Officers add and remove subfolders and photos; nobody has to touch a file
 * here to do it. Change this only if the club makes a new top-level folder.
 */
const FOLDER_ID = '1JUmR_5rX7OHtkZevEwa2QE0jQ30lYkV_';

/**
 * Widths to emit, largest last.
 *
 * 2240 is the widest the carousel is ever displayed at (1120 CSS pixels on a
 * 2x screen). A photo smaller than a given width is never blown up to reach
 * it — an archival scan stays its own size and the browser picks it.
 */
const WIDTHS = [640, 1280, 2240];

/** Visually lossless enough for photographs at these sizes; measured, not guessed. */
const AVIF = { quality: 58, effort: 4 };

const alt = (name, year) =>
    year
        ? `Husky Winter Sports, ${year}`
        : name.charAt(0).toUpperCase() + name.slice(1);

/** Photos sort by year when they have one, and by name when they do not. */
function inOrder(photos) {
    return [...photos].sort((a, b) => {
        if (a.year && b.year) return a.year.localeCompare(b.year, 'en', { numeric: true });
        if (a.year) return -1;
        if (b.year) return 1;
        return a.name.localeCompare(b.name, 'en');
    });
}

async function derive(buffer, page, slug, meta) {
    const dir = join(OUT_DIR, page);
    mkdirSync(dir, { recursive: true });

    // Never upscale. A 604 px archival scan emitted at 2240 would be a bigger
    // file that looks worse than the original.
    const widths = WIDTHS.filter((w) => w < meta.width);
    if (widths.length !== WIDTHS.length) widths.push(Math.min(meta.width, WIDTHS.at(-1)));

    const sources = [];
    for (const width of widths) {
        const file = `${slug}-${width}.avif`;
        const bytes = await sharp(buffer).rotate().resize({ width }).avif(AVIF).toBuffer();
        const path = join(dir, file);

        // Written only when the bytes actually differ, so an unchanged photo
        // leaves no git diff even though it was re-encoded.
        let previous = null;
        try { previous = readFileSync(path); } catch { /* new */ }
        if (!previous || !previous.equals(bytes)) writeFileSync(path, bytes);

        sources.push({ src: `/images/photos/${page}/${file}`, width, bytes: bytes.length });
    }
    return sources;
}

/** Remove derivatives for photos that are no longer in Drive. */
function prune(page, keep) {
    const dir = join(OUT_DIR, page);
    if (!existsSync(dir)) return [];
    const gone = readdirSync(dir).filter((f) => !keep.has(f));
    for (const file of gone) rmSync(join(dir, file));
    return gone;
}

async function main() {
    const known = new Set(
        readdirSync(CONTENT_DIR)
            .filter((f) => f.endsWith('.layout.json'))
            .map((f) => f.replace('.layout.json', ''))
    );

    const top = await listFolder(FOLDER_ID, 'photo');
    const folders = top.filter((entry) => entry.isFolder);

    if (folders.length === 0) {
        throw new ContentError(
            `The Drive photo folder has no subfolders in it.\n\n` +
            `The website looks for one subfolder per page, named after the ` +
            `page — for example "home" or "our history". Loose photos ` +
            `outside those subfolders are ignored on purpose.\n\n` +
            `The website has not been changed. It is still showing the previous version.`
        );
    }

    const manifest = {};
    const notes = [];
    let written = 0;

    for (const folder of folders) {
        const page = slugify(folder.name);
        if (!known.has(page)) {
            notes.push(
                `the Drive folder "${folder.name}" does not match any page on the ` +
                `website, so its photos are not used. The pages are: ` +
                `${[...known].sort().join(', ')}.`
            );
            continue;
        }

        const photos = [];
        const keep = new Set();

        for (const entry of await listFolder(folder.id, folder.name)) {
            if (entry.isFolder) {
                notes.push(
                    `"${entry.name}" inside the ${folder.name} photo folder is ` +
                    `another folder. Only photos directly inside "${folder.name}" ` +
                    `are used.`
                );
                continue;
            }

            const buffer = await fetchImage(entry.id, entry.name, folder.name);
            const meta = await describe(buffer, entry.name);
            if (!meta.usable) {
                notes.push(
                    `"${entry.name}" in the ${folder.name} photo folder is not on ` +
                    `the website: ${meta.reason}.`
                );
                continue;
            }

            const slug = slugify(entry.name);
            const sources = await derive(buffer, page, slug, meta);
            sources.forEach((s) => keep.add(s.src.split('/').pop()));

            photos.push({
                slug,
                name: entry.name,
                alt: alt(entry.name, meta.year),
                year: meta.year,
                shape: meta.shape,
                width: meta.width,
                height: meta.height,
                ratio: Number(meta.ratio.toFixed(3)),
                sources: sources.map(({ src, width }) => ({ src, width })),
            });
            written += sources.length;
        }

        const removed = prune(page, keep);
        if (removed.length) notes.push(`removed ${removed.length} image file(s) for photos no longer in Drive.`);

        manifest[page] = inOrder(photos);
    }

    // Pages whose folder was deleted keep no stale images behind.
    if (existsSync(OUT_DIR)) {
        for (const dir of readdirSync(OUT_DIR)) {
            if (dir in manifest) continue;
            rmSync(join(OUT_DIR, dir), { recursive: true });
            notes.push(`removed every image for "${dir}": it no longer has a Drive folder.`);
        }
    }

    const serialised = JSON.stringify(manifest, null, 2) + '\n';
    let previous = null;
    try { previous = readFileSync(MANIFEST, 'utf8'); } catch { /* first run */ }

    for (const note of notes) console.log(`NOTE: ${note}`);

    for (const [page, photos] of Object.entries(manifest)) {
        const shapes = photos.reduce((acc, p) => ({ ...acc, [p.shape]: (acc[p.shape] ?? 0) + 1 }), {});
        console.log(
            `${page}: ${photos.length} photo(s) — ` +
            Object.entries(shapes).map(([k, v]) => `${v} ${k}`).join(', ')
        );
    }

    if (previous === serialised) {
        console.log(`\ncontent/photos.json is already up to date (${written} image files checked).`);
        return;
    }
    writeFileSync(MANIFEST, serialised);
    console.log(`\nupdated content/photos.json (${written} image files).`);
}

main().catch((error) => {
    if (error instanceof ContentError) {
        console.error(`\n${'='.repeat(72)}\nPHOTO SYNC FAILED\n${'='.repeat(72)}\n`);
        console.error(error.message);
        console.error(`\n${'='.repeat(72)}\n`);
        process.exit(1);
    }
    throw error;
});
