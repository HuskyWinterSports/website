import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseGoogleDoc } from './parse-google-doc.js';
import { parseSheet } from './parse-sheet.js';
import { joinSections, selectTab, ContentError } from './join-sections.js';
import { sheetBlock, fillLayoutTokens, applyStatus } from './apply-sheet.js';

/**
 * Fetches published Google content, validates it against the repo's layout
 * files, and writes content/<page>.json.
 *
 * Design rules from docs/content-sync-spec.md:
 *   - Never write a partial or unvalidated result. If anything is wrong the
 *     site keeps serving the previous content.
 *   - Every failure message names the file, says what is wrong, and gives the
 *     two ways to fix it. The reader is an officer with no technical
 *     background and nobody to ask.
 *   - Exit 0 without writing when nothing changed, so cron does not produce a
 *     commit every hour.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONTENT_DIR = join(ROOT, 'content');

const docUrl = (publishedId) =>
    `https://docs.google.com/document/d/e/${publishedId}/pub`;

const sheetUrl = (publishedId) =>
    `https://docs.google.com/spreadsheets/d/e/${publishedId}/pub?output=csv`;

async function fetchPublished(url, layoutName, what) {
    let response;
    try {
        response = await fetch(url, { redirect: 'follow' });
    } catch (cause) {
        throw new ContentError(
            `Could not reach Google to read the ${what} for ${layoutName}.\n\n` +
            `  ${url}\n\n` +
            `This is usually a temporary network problem. The website has not ` +
            `been changed; it is still showing the previous version.\n` +
            `Cause: ${cause.message}`
        );
    }

    if (!response.ok) {
        throw new ContentError(
            `Google returned an error (HTTP ${response.status}) for the ${what} ` +
            `used by ${layoutName}.\n\n  ${url}\n\n` +
            `This usually means it is no longer published to the web. Open it and ` +
            `choose File > Share > Publish to the web, then press Publish.\n\n` +
            `The website has not been changed. It is still showing the previous version.`
        );
    }
    return response.text();
}

async function fetchDoc(publishedId, layoutName) {
    const url = docUrl(publishedId);
    let response;
    try {
        response = await fetch(url, { redirect: 'follow' });
    } catch (cause) {
        throw new ContentError(
            `Could not reach Google to read the document for ${layoutName}.\n\n` +
            `  ${url}\n\n` +
            `This is usually a temporary network problem. The website has not ` +
            `been changed; it is still showing the previous version.\n` +
            `Cause: ${cause.message}`
        );
    }

    if (!response.ok) {
        throw new ContentError(
            `Google returned an error (HTTP ${response.status}) for ${layoutName}.\n\n` +
            `  ${url}\n\n` +
            `This usually means the document is no longer published to the web.\n` +
            `To fix it, open the document and choose File > Share > Publish to ` +
            `the web, then press Publish.\n\n` +
            `The website has not been changed. It is still showing the previous version.`
        );
    }
    return response.text();
}

async function syncLayout(layoutPath) {
    const layoutName = basename(layoutPath, '.layout.json');
    const layout = JSON.parse(readFileSync(layoutPath, 'utf8'));

    if (layout.source?.kind !== 'google-doc') {
        throw new ContentError(
            `content/${layoutName}.layout.json has an unsupported source kind: ` +
            `${layout.source?.kind ?? '(missing)'}`
        );
    }

    const html = await fetchDoc(layout.source.publishedId, layoutName);
    const document = parseGoogleDoc(html);
    const parsed = selectTab(document, layout.source.tab, layoutName);

    // The sheet is resolved first: its values can appear inside strings the
    // layout sets, so the layout has to be filled in before it is joined
    // against the document.
    let resolved = layout;
    const sheetWarnings = [];
    if (layout.sheet) {
        const csv = await fetchPublished(
            sheetUrl(layout.sheet.publishedId), layoutName, 'signup sheet'
        );
        const sheet = parseSheet(csv);
        sheetWarnings.push(...sheet.warnings);

        resolved = fillLayoutTokens(layout, sheet.settings, layoutName);
        resolved = {
            ...resolved,
            blocks: resolved.blocks.map((entry) => {
                if (entry.sheet) return sheetBlock(entry, sheet, layoutName);
                if (entry.status) return applyStatus(entry, sheet.settings, layoutName);
                return entry;
            }),
        };
    }

    const { blocks, orphans } = joinSections(resolved, parsed, layoutName);

    const output = { route: layout.route, title: parsed.title, blocks };
    const outputPath = join(CONTENT_DIR, `${layoutName}.json`);
    const serialised = JSON.stringify(output, null, 2) + '\n';

    let previous = null;
    try { previous = readFileSync(outputPath, 'utf8'); } catch { /* first run */ }

    const tabs = document.tabs.map((t) => t.name);

    const notes = parsed.notes ?? [];

    if (previous === serialised) {
        return { layoutName, changed: false, orphans, tabs, sheetWarnings, notes };
    }

    writeFileSync(outputPath, serialised);
    return { layoutName, changed: true, orphans, tabs, sheetWarnings, notes };
}

async function main() {
    const layouts = readdirSync(CONTENT_DIR)
        .filter((f) => f.endsWith('.layout.json'))
        .map((f) => join(CONTENT_DIR, f));

    if (layouts.length === 0) {
        console.log('No layout files found in content/. Nothing to do.');
        return;
    }

    let changedCount = 0;
    for (const layoutPath of layouts) {
        const result = await syncLayout(layoutPath);

        // Printed every run so a forged tab boundary is visible. Tabs are
        // marked by the Title paragraph style, so applying that style inside a
        // tab's body would split it in two and silently strip the remainder.
        if (result.tabs.length) {
            console.log(`tabs in the ${result.layoutName} document: ${result.tabs.join(', ')}`);
        }

        // Anything odd about the sheet is reported but never fatal: an
        // officer adding a note to a spreadsheet must not take the site down.
        for (const warning of result.sheetWarnings ?? []) {
            console.log(`NOTE: ${warning}`);
        }

        // Notes are stripped from the page, so say where they went. An officer
        // who leaves one and sees nothing happen learns the wrong lesson.
        for (const note of result.notes) {
            const where = note.section ? ` under "${note.section}"` : '';
            console.log(
                `NOTE: a line${where} in the ${result.layoutName} document is a ` +
                `note to a developer, so it has been left off the page:\n` +
                `      ${note.text}` +
                (note.text.startsWith('***')
                    ? `\n      (*** is the old marker — please change it to --)`
                    : '')
            );
        }

        // Orphans are a warning, not a failure: an editor adding a section
        // before a developer wires it up should not take the site down.
        for (const heading of result.orphans) {
            console.log(
                `NOTE: the ${result.layoutName} document has a section ` +
                `"${heading}" that the website does not use yet. It has been ` +
                `ignored. Ask a developer to add it if it should appear.`
            );
        }

        console.log(
            result.changed
                ? `updated content/${result.layoutName}.json`
                : `content/${result.layoutName}.json is already up to date`
        );
        if (result.changed) changedCount++;
    }

    console.log(
        changedCount === 0
            ? '\nNothing changed. No commit needed.'
            : `\n${changedCount} page(s) updated.`
    );
}

main().catch((error) => {
    if (error instanceof ContentError) {
        console.error(`\n${'='.repeat(72)}\nCONTENT SYNC FAILED\n${'='.repeat(72)}\n`);
        console.error(error.message);
        console.error(`\n${'='.repeat(72)}\n`);
        process.exit(1);
    }
    throw error;
});
