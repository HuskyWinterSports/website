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
 * Drops the `_note` / `_pending` explanations layout files carry.
 *
 * They are for whoever reads the layout, and content/<page>.json is bundled
 * into the JavaScript — so without this every visitor downloads prose about
 * CSS specificity along with the page they came for.
 */
const withoutNotes = (entry) =>
    Object.fromEntries(Object.entries(entry).filter(([key]) => !key.startsWith('_')));

/** Block keys holding something the document cannot supply. */
const PAYLOAD_KEYS = ['map', 'form', 'buttons', 'slider', 'sheet', 'status', 'cards', 'boxes'];

/** A heading an officer has marked as not ready, matching the "-- Planning" tab. */
const DRAFT_MARKER = '--';

/**
 * A heading that names a section for the website without being shown on it.
 *
 * Some headings are addresses, not titles: "Tagline" names the two lines of
 * the home banner, and "About" names the legal paragraph in the footer.
 * Neither is ever printed, so an officer reading the document has no way to
 * know that renaming one moves a piece of the site while renaming the other
 * only changes what a visitor reads.
 *
 * A `~` in front says so. It is a second prefix marker beside `--`, and like
 * `--` it is taken off before anything is matched, so adding or removing one
 * can never orphan a block. The layout decides what is drawn; the marker is
 * how the document admits it.
 */
const LABEL_MARKER = '~';

/** A heading's join key: its text, with any label marker taken off. */
export const sectionKey = (name) => name.replace(/^\s*~+\s*/, '').trim();

/** Whether the document marks this heading as a label rather than a title. */
const isLabel = (name) => name.trimStart().startsWith(LABEL_MARKER);

/** What an unclaimed section looks like until a developer says otherwise. */
const DEFAULT_TYPE = 'white-stripe qa';

export function joinSections(layout, parsed, layoutName) {
    const warnings = [];
    const bySection = new Map(
        parsed.sections.filter((s) => s.heading).map((s) => [sectionKey(s.heading), s])
    );

    // Listed by join key, so a section marked "~ About" is named "About" here
    // — the same name the layout uses and the same one the message below asks
    // the reader to restore. Printing the marker would read as an instruction
    // to take it off again.
    const listSections = () =>
        parsed.sections
            .filter((s) => s.heading)
            .map((s) => `  • ${sectionKey(s.heading)}`)
            .join('\n') || '  (the document has no Heading 2 sections at all)';

    /** Find a section by heading, or fail with the message an editor needs. */
    const requireSection = (name) => {
        const match = bySection.get(sectionKey(name));
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
        // Taken off here rather than where it is used, so it cannot ship to a
        // visitor on one of the branches that returns earlier. It is a note to
        // the renderer about a heading, and every branch either has no heading
        // or draws one unconditionally.
        const { showHeading, ...entry } = withoutNotes(raw);

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
                    return { heading: sectionKey(found.heading), content: found.blocks };
                }),
            };
        }

        // Blocks with no `section` carry their own content (a button, or a
        // block that only renders the page title), so they never need to
        // exist in the document.
        if (!entry.section) return { ...entry };

        const match = bySection.get(sectionKey(entry.section));
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

        // Whether a heading is drawn is a design decision, so the layout is
        // what settles it; the document's marker only says so out loud. When
        // the two disagree the document is the one that misleads a reader, so
        // that is what the warning asks to change.
        const key = sectionKey(match.heading);
        if (showHeading === false && !isLabel(match.heading)) {
            warnings.push(
                `The heading "${key}" is never printed on ${layoutName} — it is ` +
                `only there to name that part of the page. Renaming it ` +
                `"${LABEL_MARKER} ${key}" in the document would say so to whoever ` +
                `edits it next. Nothing on the website changes either way.`
            );
        }
        if (showHeading !== false && isLabel(match.heading)) {
            warnings.push(
                `The heading "${LABEL_MARKER} ${key}" in the ${layoutName} document ` +
                `is marked as a label, but the website does print it — as ` +
                `"${key}", without the ${LABEL_MARKER}. Take the ${LABEL_MARKER} ` +
                `off, or ask a developer.`
            );
        }

        return {
            ...entry,
            ...(showHeading === false ? {} : { heading: key }),
            content: match.blocks,
        };
    };

    // Which layout entry, if any, speaks for each document heading.
    const claimant = new Map();
    for (const raw of layout.blocks) {
        for (const name of [raw.section, ...(raw.sections ?? [])].filter(Boolean)) {
            const key = sectionKey(name);
            if (!claimant.has(key)) claimant.set(key, raw);
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
        const name = section.heading == null ? section.heading : sectionKey(section.heading);

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

        auto.push(name);
        blocks.push({
            type: DEFAULT_TYPE,
            // A marked heading is not printed even here, where no layout has
            // said anything about it. The marker means "this is a label", and
            // a default style is not a reason to publish one.
            ...(isLabel(section.heading) ? {} : { heading: name }),
            content: section.blocks,
        });
    }

    // Anything the document never reached — a trailing floating block, or a
    // layout entry naming a heading that is gone.
    for (const raw of layout.blocks) emitEntry(raw);

    return { blocks, auto, warnings };
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

/**
 * Copyright lines whose year has already been overtaken.
 *
 * A year typed into the document is a fact with an expiry date and nobody
 * whose job it is to notice: the footer read "© 2025" in August 2026, because
 * it was typed once and never looked at again. Writing `{year}` instead is
 * right every year, and this is what tells an officer that.
 *
 * Reported, never corrected. Silently publishing a year the document does not
 * say would leave an editor looking at two different answers with no way to
 * tell which one the website believes.
 */
export function staleYears(blocks, thisYear) {
    const found = [];
    const walk = (value) => {
        if (typeof value === 'string') {
            const match = /©\s*(\d{4})/.exec(value);
            if (match && match[1] !== String(thisYear)) found.push(match[0]);
        } else if (Array.isArray(value)) {
            value.forEach(walk);
        } else if (value && typeof value === 'object') {
            Object.values(value).forEach(walk);
        }
    };
    walk(blocks);
    return found;
}
