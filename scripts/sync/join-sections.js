/**
 * Joins a page's layout (which lives in this repo) against the sections found
 * in its source document (which club officers edit).
 *
 * This is where a renamed heading gets caught, so the messages matter as much
 * as the logic. Every one names the file, says what is wrong, gives both ways
 * to fix it, and ends by saying the website is unchanged — the reader is an
 * officer with no technical background and nobody to ask.
 */

export class ContentError extends Error {}

/**
 * Narrows a parsed document to the one tab a page is built from.
 *
 * A layout with no `tab` reads the whole document, which is what a
 * single-page document looks like. Tab names are the join key, exactly as
 * Heading 2 names are inside a tab.
 */
export function selectTab(parsed, tabName, layoutName) {
    if (!tabName) {
        // Reading a tabbed document whole would concatenate every page and
        // take its title from whichever tab happens to be first — a wrong
        // page that syncs cleanly. Refuse instead.
        if (parsed.tabs.length) {
            throw new ContentError(
                `content/${layoutName}.layout.json does not say which tab of the ` +
                `document it is built from, but the document has tabs:\n` +
                parsed.tabs.map((t) => `  • ${t.name}`).join('\n') + `\n\n` +
                `Ask a developer to add a "tab" to the "source" section of that file.\n\n` +
                `If the document is not supposed to have tabs, this can also mean ` +
                `the "Title" style was used somewhere inside it — that style is how ` +
                `Google marks the start of a tab, so using it splits the page. Use ` +
                `Heading 1 for a page title instead.\n\n` +
                `The website has not been changed. It is still showing the previous version.`
            );
        }
        return parsed;
    }

    const match = parsed.tabs.find((t) => t.name.trim() === tabName.trim());
    if (match) return match;

    const found = parsed.tabs.length
        ? `The document currently has these tabs:\n` +
          parsed.tabs.map((t) => `  • ${t.name}`).join('\n')
        : `The document has no tabs at all. Tabs are the panel down the left ` +
          `side of Google Docs; if it is not showing, use View > Show tabs & outlines.`;

    throw new ContentError(
        `The tab "${tabName}" was not found in the ${layoutName} document.\n\n` +
        `${found}\n\n` +
        `This usually means a tab was renamed or deleted. Either:\n` +
        `  1. Rename the tab back to "${tabName}", or\n` +
        `  2. Ask a developer to update content/${layoutName}.layout.json\n\n` +
        `The website has not been changed. It is still showing the previous version.`
    );
}

/**
 * Keys that instruct the sync rather than describe the block: the `_note`
 * explanations layout files carry, and the two gates below.
 *
 * They are for whoever reads the layout, and content/<page>.json is bundled
 * into the JavaScript — so without this every visitor downloads prose about
 * CSS specificity along with the page they came for.
 */
const GATE_KEYS = ['hidden', 'hiddenUntil'];

const withoutNotes = (entry) =>
    Object.fromEntries(Object.entries(entry).filter(
        ([key]) => !key.startsWith('_') && !GATE_KEYS.includes(key)
    ));

/** Block keys holding something the document cannot supply. */
const PAYLOAD_KEYS = ['map', 'form', 'buttons', 'slider', 'sheet', 'status', 'cards', 'boxes'];

/** A heading an officer has marked as not ready, matching the "-- Planning" tab. */
const DRAFT_MARKER = '--';

/** What an unclaimed section looks like until a developer says otherwise. */
const DEFAULT_TYPE = 'white-stripe qa';

export function joinSections(layout, parsed, layoutName) {
    const warnings = [];
    const held = [];
    const waiting = [];
    const bySection = new Map(
        parsed.sections.filter((s) => s.heading).map((s) => [s.heading.trim(), s])
    );

    const listSections = () =>
        parsed.sections
            .filter((s) => s.heading)
            .map((s) => `  • ${s.heading}`)
            .join('\n') || '  (the document has no Heading 2 sections at all)';

    /** Find a section by heading, or fail with the message an editor needs. */
    const requireSection = (name) => {
        const match = bySection.get(name.trim());
        if (!match) {
            throw new ContentError(
                `The section "${name}" was not found in the ${layoutName} document.\n\n` +
                `The document currently contains these sections:\n${listSections()}\n\n` +
                `This usually means a heading was renamed, or its style was ` +
                `changed away from "Heading 2". Either:\n` +
                `  1. Rename the heading in the document back to "${name}", or\n` +
                `  2. Ask a developer to update content/${layoutName}.layout.json\n\n` +
                `The website has not been changed. It is still showing the previous version.`
            );
        }
        if (match.blocks.length === 0) {
            throw new ContentError(
                `The section "${name}" in the ${layoutName} document is empty.\n\n` +
                `Add some text underneath that heading, or ask a developer to ` +
                `remove the section from content/${layoutName}.layout.json\n\n` +
                `The website has not been changed. It is still showing the previous version.`
            );
        }
        return match;
    };

    /** Turn one layout entry into a page block, or null if it renders nothing. */
    const resolve = (raw) => {
        const entry = withoutNotes(raw);

        // Sheet-driven blocks were resolved before this ran and carry their
        // own content; they never look anything up in the document.
        if (entry.boxes) return { ...entry };

        // Checked before `lead`, because a block can carry both: a page whose
        // whole body sits under the title uses one block for the h1 and the
        // text. Checking after the lead branch would skip this for exactly
        // those pages.
        if (entry.showTitle && !parsed.title) {
            throw new ContentError(
                `The ${layoutName} document has no page title.\n\n` +
                `The website takes it from the first line styled "Heading 1". ` +
                `That line seems to have been deleted, or restyled to something else.\n\n` +
                `Set the page's title line back to "Heading 1", or ask a developer ` +
                `to remove "showTitle" from content/${layoutName}.layout.json\n\n` +
                `The website has not been changed. It is still showing the previous version.`
            );
        }

        // `lead: true` takes the text under the document's Heading 1 but
        // before its first Heading 2. Pages often open with an introduction
        // that has no heading of its own.
        if (entry.lead) {
            const leading = parsed.sections.find((s) => s.heading === null);
            if (!leading || leading.blocks.length === 0) {
                throw new ContentError(
                    `The ${layoutName} document is missing its opening text.\n\n` +
                    `The website expects one or more paragraphs directly below the ` +
                    `title, before the first "Heading 2" section.\n\n` +
                    `Add that text to the document, or ask a developer to remove the ` +
                    `opening block from content/${layoutName}.layout.json\n\n` +
                    `The website has not been changed. It is still showing the previous version.`
                );
            }
            return { ...entry, content: leading.blocks };
        }

        // `sections` gathers several of the document's headings into ONE box
        // on the page. Contact Us and FAQ are both a single panel containing
        // two headed groups; without this, each heading would become its own
        // panel and the page would gain boxes it never had.
        if (entry.sections) {
            return {
                ...entry,
                groups: entry.sections.map((name) => {
                    const found = requireSection(name);
                    return { heading: found.heading, content: found.blocks };
                }),
            };
        }

        // Blocks with no `section` carry their own content (a button, or a
        // block that only renders the page title), so they never need to
        // exist in the document.
        if (!entry.section) return { ...entry };

        // Held back on purpose — a section whose content is not ready to
        // publish. Without this, auto-sectioning would put it on the site.
        if (raw.hidden) {
            held.push(entry.section);
            return null;
        }

        const match = bySection.get(entry.section.trim());
        if (!match || match.blocks.length === 0) {
            // The heading was renamed or deleted. Under the old whitelist this
            // failed the whole site, hourly, until a developer noticed — while
            // the renamed section still carries its text and will render below
            // in the default style. So it is only fatal when the block carries
            // something the document cannot supply.
            const payload = PAYLOAD_KEYS.filter((k) => k in entry);
            if (payload.length) requireSection(entry.section);

            warnings.push(match
                ? `The section "${entry.section}" in the ${layoutName} document is ` +
                  `empty, so nothing has been published for it. Add some text under ` +
                  `that heading.`
                : `The ${layoutName} document no longer has a section ` +
                  `"${entry.section}". If it was renamed, its text is still on the ` +
                  `page but in the default style. Rename the heading back, or ask a ` +
                  `developer to update content/${layoutName}.layout.json`
            );
            return null;
        }

        // Held back until the document itself supplies what the section is
        // for. "Check out how we teach!" is one sentence ending in a colon
        // until its training-manual bullets are pasted in — and becomes one
        // again while an officer is replacing them with a new version. A
        // sentence pointing at nothing is worse than no section at all, and
        // this needs no developer at either edge: the section appears the
        // moment the list does.
        if (raw.hiddenUntil && !match.blocks.some((b) => b.type === raw.hiddenUntil)) {
            waiting.push({ section: entry.section, needs: raw.hiddenUntil });
            return null;
        }

        // A cards block draws one card per Heading 3. With none it would
        // render an empty grid — visibly broken, but only to whoever looked.
        if (entry.cards && !match.blocks.some((b) => b.type === 'heading' && b.level === 3)) {
            throw new ContentError(
                `The website shows "${entry.section}" as a row of cards, one per ` +
                `"Heading 3", but that section of the ${layoutName} document has ` +
                `no Heading 3 in it.\n\n` +
                `Give each card a short "Heading 3" title with its text ` +
                `underneath, or ask a developer to change how that section is ` +
                `laid out in content/${layoutName}.layout.json\n\n` +
                `The website has not been changed. It is still showing the previous version.`
            );
        }

        return { ...entry, heading: match.heading, content: match.blocks };
    };

    // Which layout entry, if any, speaks for each document heading.
    const claimant = new Map();
    for (const raw of layout.blocks) {
        for (const name of [raw.section, ...(raw.sections ?? [])].filter(Boolean)) {
            if (!claimant.has(name.trim())) claimant.set(name.trim(), raw);
        }
    }

    // Walk the DOCUMENT, not the layout. Entries that name no section float:
    // they are emitted just before the next claimed section they precede, which
    // keeps the photo carousel and the sheet tables where their layout puts
    // them without the layout having to drive the order.
    const blocks = [];
    const emitted = new Set();
    const auto = [];

    const claims = (b) => b.lead || b.section || b.sections;

    const emitEntry = (raw) => {
        if (emitted.has(raw)) return;
        emitted.add(raw);
        const block = resolve(raw);
        if (block) blocks.push(block);
    };

    const floatsBefore = (raw) => {
        for (const candidate of layout.blocks) {
            if (candidate === raw) return;
            if (emitted.has(candidate)) continue;
            if (!claims(candidate)) emitEntry(candidate);
        }
    };

    // Blocks sitting above every claimed section open the page — three pages
    // start with a title-only block. Without this they would be swept to the
    // end by the final pass once auto sections exist.
    const firstClaim = layout.blocks.findIndex(claims);
    for (const raw of layout.blocks.slice(0, firstClaim === -1 ? undefined : firstClaim)) {
        emitEntry(raw);
    }

    for (const section of parsed.sections) {
        const name = section.heading?.trim();

        if (name === undefined || name === null) {
            // The text above the first Heading 2. Only a `lead` block claims it.
            const leadEntry = layout.blocks.find((b) => b.lead);
            if (leadEntry) { floatsBefore(leadEntry); emitEntry(leadEntry); }
            continue;
        }

        const owner = claimant.get(name);
        if (owner) { floatsBefore(owner); emitEntry(owner); continue; }

        // Unclaimed. A draft, an empty section, or a heading with no text
        // renders nothing; anything else gets one plain default style.
        if (name === '' || name.startsWith(DRAFT_MARKER) || section.blocks.length === 0) continue;

        auto.push(section.heading);
        blocks.push({ type: DEFAULT_TYPE, heading: section.heading, content: section.blocks });
    }

    // Anything the document never reached — a trailing floating block, or a
    // layout entry naming a heading that is gone.
    for (const raw of layout.blocks) emitEntry(raw);

    return { blocks, auto, held, waiting, warnings };
}

/**
 * Lines that look like headings but are styled as ordinary text.
 *
 * This is what broke five pages in August 2026: heading styles are lost when
 * text is pasted into Google Docs and nothing said so. Reported, never acted
 * on — promoting a bold line automatically would split a page in two the first
 * time somebody emphasised a sentence.
 */
export function looksLikeHeadings(parsed) {
    const found = [];
    for (const section of parsed.sections) {
        section.blocks.forEach((block, index) => {
            if (block.type !== 'paragraph' || !block.spans.length) return;
            if (!block.spans.every((s) => s.bold)) return;

            const text = block.spans.map((s) => s.text).join('').trim();
            if (!text || text.length > 80 || /\.$/.test(text)) return;

            const next = section.blocks[index + 1];
            if (!next || next.type !== 'paragraph') return;
            if (next.spans.every((s) => s.bold)) return;

            found.push(text);
        });
    }
    return found;
}
