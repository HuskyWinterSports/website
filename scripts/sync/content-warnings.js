/**
 * Accessibility problems in wording. See WCAG 2.1, especially 2.4.4 and 2.4.9.
 *
 * See docs/accessibility-manual-audit.md for the checks that still need eyes.
 */

/**
 * Link text that means nothing read on its own.
 */
const VAGUE = new Set([
    'here', 'click here', 'this', 'this link', 'link', 'read more', 'more',
    'learn more', 'see more', 'details', 'click', 'go', 'download',
]);

/** Walk every styled text run in a page's blocks, wherever they are nested. */
function eachSpan(value, visit) {
    if (Array.isArray(value)) {
        value.forEach((item) => eachSpan(item, visit));
    } else if (value && typeof value === 'object') {
        if (typeof value.text === 'string' && 'href' in value) visit(value);
        Object.values(value).forEach((child) => eachSpan(child, visit));
    }
}

export function vagueLinks(blocks) {
    const found = [];
    const seen = new Set();
    eachSpan(blocks, (span) => {
        if (!span.href) return;
        const text = span.text.trim();
        const key = text.toLowerCase().replace(/[.,:;!?]+$/, '');
        if (!VAGUE.has(key) || seen.has(key + span.href)) return;
        seen.add(key + span.href);
        found.push({ text, href: span.href });
    });
    return found;
}

/** A link whose visible text is the address itself. */
export function bareUrlLinks(blocks) {
    const found = [];
    eachSpan(blocks, (span) => {
        if (!span.href) return;
        const text = span.text.trim();
        if (!/^https?:\/\//i.test(text)) return;
        if (text.length <= 30) return;
        found.push({ text, href: span.href });
    });
    return found;
}

/**
 * The heading levels a visitor's screen reader will actually announce, in
 * order, mirroring how ContentBlocks.jsx renders each kind of block.
 */
export function headingOutline(page) {
    const levels = [];
    const fromContent = (content) => {
        for (const block of content ?? []) {
            if (block.type === 'heading') {
                levels.push(Math.min(Math.max(block.level, 2), 6));
            }
        }
    };

    for (const block of page.blocks ?? []) {
        if (block.showTitle && page.title) levels.push(1);
        if (block.slider?.caption) levels.push(2);
        if (block.heading) levels.push(2);
        fromContent(block.content);
        for (const group of block.groups ?? []) {
            if (group.heading) levels.push(2);
            fromContent(group.content);
        }
        for (const box of block.boxes ?? []) {
            if (box.heading) levels.push(3);
        }
    }
    return levels;
}

/**
 * Headings that skip a level — an h2 followed by an h4, say.
 */
export function headingJumps(page) {
    const levels = headingOutline(page);
    const jumps = [];
    for (let i = 1; i < levels.length; i++) {
        if (levels[i] > levels[i - 1] + 1) {
            jumps.push({ from: levels[i - 1], to: levels[i], at: i });
        }
    }
    return jumps;
}

/** Photographs still carrying the name the camera gave them. */
const CAMERA_NAME = /^(img|dsc|dscn|pxl|p|gopr|dji|screenshot|photo|image|untitled|video)[\s_-]*\d*$/i;

export function cameraNames(photos) {
    return (photos ?? [])
        .filter((photo) => CAMERA_NAME.test((photo.name ?? '').trim()))
        .map((photo) => photo.name);
}
