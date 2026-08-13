import { chromium } from 'playwright';

/**
 * Counts stranded last words across every page at nine widths.
 *
 * Kept as a tool rather than run once and thrown away: officers turn over, the
 * words on this site change without a developer involved, and "does it still
 * typeset well" is a question somebody should be able to answer with a number
 * instead of an opinion.
 *
 *   npm run preview        # in one terminal
 *   npm run audit:widows   # in another
 *
 * Measured 2026-08-13: 142 before the fixes in Global.css, 17 after, and none
 * of the remaining ones persist across widths.
 */

const ROUTES = ['/', '/lesson-info', '/lesson-registration', '/join-our-mailing-list',
    '/become-an-instructor', '/diversity-and-inclusion', '/faq', '/contact-us'];
const WIDTHS = [1440, 1280, 1024, 900, 768, 600, 430, 390, 360];
const base = process.argv[2] ?? 'http://localhost:4173';

/**
 * A widow is a last line carrying a single word. Detected by wrapping every
 * word in a span, grouping by vertical position, and looking at the last row —
 * measurement rather than eyeballing, so the before/after is a number.
 */
const DETECT = () => {
    const found = [];
    const sel = 'p, h1, h2, h3, h4, li';
    for (const el of document.querySelectorAll(sel)) {
        if (el.querySelector(sel)) continue;
        const text = el.textContent.trim();
        const words = text.split(/\s+/);
        if (words.length < 4) continue;

        const original = el.innerHTML;
        el.innerHTML = words.map((w) => `<span data-w>${w}</span>`).join(' ');
        const rows = new Map();
        for (const span of el.querySelectorAll('[data-w]')) {
            const top = Math.round(span.getBoundingClientRect().top);
            rows.set(top, (rows.get(top) ?? 0) + 1);
        }
        el.innerHTML = original;

        const tops = [...rows.keys()].sort((a, b) => a - b);
        if (tops.length > 1 && rows.get(tops[tops.length - 1]) === 1) {
            found.push({
                tag: el.tagName.toLowerCase(),
                lines: tops.length,
                text: text.slice(0, 52),
                last: words[words.length - 1],
            });
        }
    }
    return found;
};

const browser = await chromium.launch();
const all = [];
for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    for (const route of ROUTES) {
        await page.goto(base + route, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(350);
        for (const w of await page.evaluate(DETECT)) all.push({ width, route, ...w });
    }
    await page.close();
}
await browser.close();

console.log(`total widows: ${all.length}`);
const byRoute = {};
for (const w of all) byRoute[w.route] = (byRoute[w.route] ?? 0) + 1;
console.log('by page:', byRoute);

// The ones the club will notice: a widow present at most widths is not a
// quirk of one window size, it is how that sentence always looks.
const persistent = {};
for (const w of all) {
    const key = `${w.route} ${w.tag} "${w.text}…"`;
    (persistent[key] ??= []).push(w.width);
}
const stubborn = Object.entries(persistent)
    .filter(([, widths]) => widths.length >= 5)
    .sort((a, b) => b[1].length - a[1].length);
console.log(`\npersistent (5+ of ${WIDTHS.length} widths):`);
for (const [key, widths] of stubborn) console.log(`  ${widths.length}x  ${key}`);
