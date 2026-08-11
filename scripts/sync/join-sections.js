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
    if (!tabName) return parsed;

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

export function joinSections(layout, parsed, layoutName) {
    const bySection = new Map(
        parsed.sections.filter((s) => s.heading).map((s) => [s.heading.trim(), s])
    );

    const listSections = () =>
        parsed.sections
            .filter((s) => s.heading)
            .map((s) => `  • ${s.heading}`)
            .join('\n') || '  (the document has no Heading 2 sections at all)';

    const blocks = layout.blocks.map((entry) => {
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

        // Blocks with no `section` carry their own content (a button, or a
        // block that only renders the page title), so they never need to
        // exist in the document.
        if (!entry.section) return { ...entry };

        const match = bySection.get(entry.section.trim());
        if (!match) {
            throw new ContentError(
                `The section "${entry.section}" was not found in the ${layoutName} document.\n\n` +
                `The document currently contains these sections:\n${listSections()}\n\n` +
                `This usually means a heading was renamed, or its style was ` +
                `changed away from "Heading 2". Either:\n` +
                `  1. Rename the heading in the document back to "${entry.section}", or\n` +
                `  2. Ask a developer to update content/${layoutName}.layout.json\n\n` +
                `The website has not been changed. It is still showing the previous version.`
            );
        }

        if (match.blocks.length === 0) {
            throw new ContentError(
                `The section "${entry.section}" in the ${layoutName} document is empty.\n\n` +
                `Add some text underneath that heading, or ask a developer to ` +
                `remove the section from content/${layoutName}.layout.json\n\n` +
                `The website has not been changed. It is still showing the previous version.`
            );
        }

        return { ...entry, heading: match.heading, content: match.blocks };
    });

    // A section the document has but the layout does not is a warning, never
    // an error: an officer drafting ahead of a developer must not be able to
    // take the site down.
    const orphans = parsed.sections
        .filter(
            (s) => s.heading && !layout.blocks.some((b) => b.section?.trim() === s.heading.trim())
        )
        .map((s) => s.heading);

    return { blocks, orphans };
}
