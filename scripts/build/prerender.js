import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROUTES, SITE_URL, SITE_NAME, NOT_FOUND_META } from '../../src/routes.js';

/**
 * Post-build step. Turns the single-page bundle into something search engines
 * and social previews can actually read.
 *
 * For each route it writes a real HTML file with that page's title,
 * description, canonical URL and Open Graph tags baked in. This matters
 * because social scrapers (Facebook, Slack, iMessage) do NOT run JavaScript,
 * so a title set by React is invisible to them — every shared link would
 * otherwise show the same generic card.
 *
 * It also writes 404.html, which is how GitHub Pages supports deep links into
 * a single-page app: Pages serves it for any unmatched path, the app boots,
 * and the router renders the right page.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = join(ROOT, 'dist');
const OG_IMAGE = `${SITE_URL}/images/2025group.jpeg`;

const escape = (value) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function headFor({ title, description, path }) {
    const canonical = path === undefined ? null : `${SITE_URL}${path === '/' ? '/' : path}`;
    return [
        `<title>${escape(title)}</title>`,
        `<meta name="description" content="${escape(description)}">`,
        canonical && `<link rel="canonical" href="${canonical}">`,
        `<meta property="og:type" content="website">`,
        `<meta property="og:site_name" content="${escape(SITE_NAME)}">`,
        `<meta property="og:title" content="${escape(title)}">`,
        `<meta property="og:description" content="${escape(description)}">`,
        `<meta property="og:image" content="${OG_IMAGE}">`,
        canonical && `<meta property="og:url" content="${canonical}">`,
        `<meta name="twitter:card" content="summary_large_image">`,
        `<meta name="twitter:title" content="${escape(title)}">`,
        `<meta name="twitter:description" content="${escape(description)}">`,
        `<meta name="twitter:image" content="${OG_IMAGE}">`,
    ].filter(Boolean).join('\n    ');
}

function render(template, meta) {
    // Vite's index.html already has a <title> and a description; replace both
    // rather than emitting duplicates, which confuses some crawlers.
    return template
        .replace(/<title>.*?<\/title>\s*/s, '')
        .replace(/<meta\s+name="description"[^>]*>\s*/i, '')
        .replace('</head>', `  ${headFor(meta)}\n  </head>`);
}

const template = readFileSync(join(DIST, 'index.html'), 'utf8');
let written = 0;

for (const route of ROUTES) {
    const html = render(template, route);
    if (route.path === '/') {
        writeFileSync(join(DIST, 'index.html'), html);
    } else {
        // Flat faq.html, NOT faq/index.html. GitHub Pages serves /faq straight
        // from faq.html with no redirect, so the URL a visitor sees matches the
        // canonical tag exactly. The directory form would redirect /faq to
        // /faq/ and leave the two disagreeing.
        const file = join(DIST, `${route.path.replace(/^\//, '')}.html`);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, html);
    }
    written++;
}

// GitHub Pages serves this for any path it does not recognise. Without it,
// deep links like /faq would 404 before the app ever loads.
writeFileSync(join(DIST, '404.html'), render(template, NOT_FOUND_META));

const sitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    ROUTES.map((route) =>
        `  <url><loc>${SITE_URL}${route.path}</loc></url>`
    ).join('\n') +
    `\n</urlset>\n`;
writeFileSync(join(DIST, 'sitemap.xml'), sitemap);

writeFileSync(
    join(DIST, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
);

// Keep CNAME, which lives in public/ and is copied by Vite already.
try { copyFileSync(join(ROOT, 'public', 'CNAME'), join(DIST, 'CNAME')); } catch { /* optional */ }

console.log(`prerendered ${written} routes, plus 404.html, sitemap.xml and robots.txt`);
