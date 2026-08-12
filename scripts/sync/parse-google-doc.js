import { parse } from 'node-html-parser';

/**
 * Turns a published Google Doc's HTML into a deterministic content tree.
 *
 * Implements the markup contract measured in docs/content-sync-spec.md §4.1.
 * The rules that matter, all of them learned the hard way:
 *
 *   - Parse ONLY inside <div id="contents">. The rest of the ~149 KB response
 *     is Google's banner and JS bundle.
 *   - Match on TAG, never on class. Class numbers are regenerated on every
 *     republish: `c7` was observed meaning bold in one publish and being the
 *     link class in the very next one.
 *   - Bold and italic are spans whose class resolves through the inline
 *     <style> block, so that map is rebuilt on every parse.
 *   - Links are wrapped in google.com/url?q=… and MUST be unwrapped. The
 *     wrapper carries `ust`/`usg` values that change on republish, so leaving
 *     them in would make the output differ when nothing was edited.
 *   - Document tabs are flattened into one stream. `?tab=t.N` is ignored by
 *     publish-to-web (measured), so every tab always arrives together. Google
 *     marks each one with a Title-styled paragraph carrying the tab's name:
 *     <p class="cN title">Lessons</p>. `title` is a semantic class, not a
 *     regenerated `cN`, so it survives republish — but it is the ordinary
 *     Title paragraph style, so using that style inside a tab body would forge
 *     a boundary. Every sync logs the tabs it found so that shows up.
 *
 * The output must be a pure function of the document's visible content.
 * Anything Google varies per request or per republish has to be dropped, or
 * the "skip the commit when nothing changed" step is worthless.
 */

const BLOCK_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'P', 'UL', 'OL']);

/** Build { className -> {bold, italic} } from the document's own stylesheet. */
function readStyleMap(root) {
    const map = new Map();
    for (const style of root.querySelectorAll('style')) {
        const css = style.textContent ?? '';
        for (const [, name, body] of css.matchAll(/\.([A-Za-z0-9_-]+)\{([^}]*)\}/g)) {
            map.set(name, {
                bold: /font-weight:\s*(?:700|bold)/.test(body),
                italic: /font-style:\s*italic/.test(body),
            });
        }
    }
    return map;
}

/** google.com/url?q=REAL -> REAL. Anything else passes through untouched. */
export function unwrapHref(href) {
    if (!href) return href;
    let url;
    try {
        url = new URL(href, 'https://docs.google.com');
    } catch {
        return href;
    }
    if (!/(^|\.)google\.com$/.test(url.hostname) || url.pathname !== '/url') return href;
    return url.searchParams.get('q') ?? href;
}

/**
 * Read the class attribute directly rather than through the parser's
 * classList, so this does not depend on a helper API that may not exist.
 */
function hasClass(node, name) {
    return (node.getAttribute?.('class') ?? '').split(/\s+/).includes(name);
}

function styleOf(node, styleMap) {
    let bold = false;
    let italic = false;
    for (const name of node.classList?.values() ?? []) {
        const style = styleMap.get(name);
        if (style?.bold) bold = true;
        if (style?.italic) italic = true;
    }
    return { bold, italic };
}

/**
 * Flatten an element's children into a list of styled text runs.
 * Adjacent runs sharing formatting are merged so that Google's arbitrary
 * span splitting does not leak into the output.
 */
function readSpans(element, styleMap, inherited = { bold: false, italic: false, href: null }) {
    const spans = [];

    const walk = (node, state) => {
        for (const child of node.childNodes) {
            // nodeType 3 is a text node.
            if (child.nodeType === 3) {
                const text = child.text;
                if (text) spans.push({ ...state, text });
                continue;
            }
            if (child.nodeType !== 1) continue;

            const own = styleOf(child, styleMap);
            const next = {
                bold: state.bold || own.bold,
                italic: state.italic || own.italic,
                href: child.tagName === 'A'
                    ? unwrapHref(child.getAttribute('href'))
                    : state.href,
            };
            walk(child, next);
        }
    };

    walk(element, inherited);

    // Merge neighbours with identical formatting.
    const merged = [];
    for (const span of spans) {
        const prev = merged[merged.length - 1];
        if (prev && prev.bold === span.bold && prev.italic === span.italic && prev.href === span.href) {
            prev.text += span.text;
        } else {
            merged.push({ ...span });
        }
    }

    // Google emits stray whitespace-only spans; drop runs that carry nothing.
    return merged.filter((span) => span.text.trim() !== '' || span.href);
}

function readList(element, styleMap) {
    return {
        type: 'list',
        ordered: element.tagName === 'OL',
        items: element
            .querySelectorAll('li')
            .map((li) => readSpans(li, styleMap))
            .filter((spans) => spans.length > 0),
    };
}

/**
 * @param {string} html Raw response body from /document/d/e/<pubId>/pub
 * @returns {{title: string|null, sections: Array, tabs: Array}}
 *   `title`/`sections` describe the whole document; `tabs` is empty for a
 *   document with no tabs, so a caller that ignores it behaves as before.
 */
export function parseGoogleDoc(html) {
    const root = parse(html, { blockTextElements: { style: true, script: false } });
    const styleMap = readStyleMap(root);

    const contents = root.querySelector('#contents');
    if (!contents) {
        throw new Error(
            'Could not find <div id="contents"> in the published document.\n' +
            'This usually means the document is no longer published to the web, ' +
            'or the URL returned a Google sign-in page instead of the document.'
        );
    }

    let title = null;
    const sections = [];
    const tabs = [];
    let currentTab = null;
    let current = null;

    // Sections are shared by reference between the flat document view and the
    // tab they belong to, so the two can never disagree.
    const openSection = (heading) => {
        current = { heading, blocks: [] };
        sections.push(current);
        currentTab?.sections.push(current);
    };

    const visit = (node) => {
        for (const child of node.childNodes) {
            if (child.nodeType !== 1) continue;
            const tag = child.tagName;

            if (!BLOCK_TAGS.has(tag)) {
                visit(child); // Google wraps content in layout divs.
                continue;
            }

            // A Title-styled paragraph is the start of a tab. Its text is the
            // tab's name in the Docs sidebar, not page content.
            if (tag === 'P' && hasClass(child, 'title')) {
                const name = readSpans(child, styleMap).map((s) => s.text).join('').trim();
                currentTab = { name, title: null, sections: [] };
                tabs.push(currentTab);
                current = null;
                continue;
            }

            if (tag === 'H1') {
                const text = readSpans(child, styleMap).map((s) => s.text).join('').trim();
                // The first H1 is the title — of its tab, or of the document
                // when there are none. Later ones start sections, so an editor
                // adding one does not silently vanish.
                if (currentTab && currentTab.title === null) {
                    currentTab.title = text;
                    if (title === null) title = text;
                } else if (title === null) {
                    title = text;
                } else {
                    openSection(text);
                }
                continue;
            }

            if (tag === 'H2') {
                openSection(readSpans(child, styleMap).map((s) => s.text).join('').trim());
                continue;
            }

            // Content before the first H2 has nowhere to live. Rather than
            // dropping it silently, park it in an unnamed leading section so
            // validation can report it.
            if (!current) openSection(null);

            if (tag === 'UL' || tag === 'OL') {
                const list = readList(child, styleMap);
                if (!list.items.length) continue;

                // Google splits one bulleted list into several <ul> elements
                // depending on how it was typed — re-indenting a single bullet
                // is enough. Back-to-back lists of the same kind are one list
                // to a reader, so they are one list here; otherwise the page
                // gains a paragraph gap between bullets for a reason nobody
                // can see in the document.
                const previous = current.blocks[current.blocks.length - 1];
                if (previous?.type === 'list' && previous.ordered === list.ordered) {
                    previous.items.push(...list.items);
                } else {
                    current.blocks.push(list);
                }
                continue;
            }

            const spans = readSpans(child, styleMap);
            if (!spans.length) continue;

            current.blocks.push(
                tag === 'P'
                    ? { type: 'paragraph', spans }
                    : { type: 'heading', level: Number(tag[1]), spans }
            );
        }
    };

    visit(contents);
    return { title, sections, tabs };
}
