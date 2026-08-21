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

export function joinSections(layout, parsed, layoutName) {
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

    const blocks = layout.blocks.map((raw) => {
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

        const match = requireSection(entry.section);

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
    });

    // A section the document has but the layout does not is a warning, never
    // an error: an officer drafting ahead of a developer must not be able to
    // take the site down.
    const used = new Set(
        layout.blocks.flatMap((b) => [b.section, ...(b.sections ?? [])])
            .filter(Boolean)
            .map((name) => name.trim())
    );
    const orphans = parsed.sections
        .filter((s) => s.heading && !used.has(s.heading.trim()))
        .map((s) => s.heading);

    return { blocks, orphans };
}
