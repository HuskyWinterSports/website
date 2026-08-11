import { test, expect } from '@playwright/test';
import { ROUTES, SITE_URL } from '../src/routes.js';

/**
 * SEO and shareability.
 *
 * The site used to run on HashRouter, so every URL was /#/faq. Search engines
 * index fragments poorly and every shared link showed the same generic
 * preview. These tests guard the fix.
 *
 * The important subtlety: social scrapers (Facebook, Slack, iMessage) do NOT
 * run JavaScript. A <title> set by React is invisible to them. That is why the
 * build writes a real HTML file per route, and why these tests check the
 * served HTML rather than only what the browser ends up displaying.
 */

test.describe('per-route metadata is baked into the HTML', () => {
    for (const route of ROUTES) {
        test(`${route.path} serves its own title and canonical`, async ({ request }) => {
            // request.get() does not execute JavaScript, so this sees exactly
            // what a crawler or a link preview would see.
            const response = await request.get(route.path);
            expect(response.status()).toBe(200);
            const html = await response.text();

            expect(html).toContain(`<title>${route.title.replace(/&/g, '&amp;')}</title>`);
            expect(html).toContain(`<link rel="canonical" href="${SITE_URL}${route.path}">`);
            expect(html).toContain('property="og:title"');
            expect(html).toContain('property="og:image"');
            expect(html).toContain('name="twitter:card"');

            // Duplicated tags confuse crawlers; Vite's template ships its own
            // title and description that the prerender step must replace.
            expect(html.match(/<title>/g)).toHaveLength(1);
            expect(html.match(/name="description"/g)).toHaveLength(1);
        });
    }

    test('every route has a distinct title and description', () => {
        const titles = ROUTES.map((r) => r.title);
        const descriptions = ROUTES.map((r) => r.description);
        expect(new Set(titles).size, 'duplicate <title> across routes').toBe(titles.length);
        expect(new Set(descriptions).size, 'duplicate descriptions').toBe(descriptions.length);
    });

    test('descriptions are a sensible length for search results', () => {
        for (const route of ROUTES) {
            expect(route.description.length, `${route.path} description too short`).toBeGreaterThan(50);
            expect(route.description.length, `${route.path} description too long`).toBeLessThan(200);
        }
    });
});

test.describe('URLs are clean and shareable', () => {
    test('no hash fragment appears in the URL', async ({ page }) => {
        await page.goto('/faq');
        expect(page.url()).not.toContain('#');
        expect(page.url()).toMatch(/\/faq$/);
    });

    test('navigating in the app produces a real path', async ({ page }) => {
        await page.goto('/');
        const toggle = page.getByRole('button', { name: /open menu/i });
        if (await toggle.isVisible()) await toggle.click();
        await page.getByRole('button', { name: 'Questions' }).click();
        await page.getByRole('link', { name: 'FAQ', exact: true }).click();

        await expect(page).toHaveURL(/\/faq$/);
        expect(page.url()).not.toContain('#');
    });

    test('old hash links still reach the right page', async ({ page }) => {
        // The site used hash routing for years, so /#/faq is sitting in old
        // emails and social posts. Without the shim in main.jsx these land
        // silently on the home page, which looks like the link is broken.
        await page.goto('/#/faq');
        await expect(page).toHaveURL(/\/faq$/);
        await expect(page).toHaveTitle(/FAQ/);
    });

    test('a deep link loads directly, not just via the home page', async ({ page }) => {
        // This is what GitHub Pages needs 404.html for. If it regresses, a link
        // emailed to the mailing list lands on an error page.
        await page.goto('/lesson-registration');
        await expect(page.locator('main h1')).toBeVisible();
        await expect(page).toHaveTitle(/Lesson Registration/);
    });
});

test.describe('crawler files', () => {
    test('sitemap.xml lists every route', async ({ request }) => {
        const response = await request.get('/sitemap.xml');
        expect(response.status()).toBe(200);
        const xml = await response.text();
        for (const route of ROUTES) {
            expect(xml, `sitemap missing ${route.path}`).toContain(`${SITE_URL}${route.path}`);
        }
    });

    test('robots.txt allows crawling and points at the sitemap', async ({ request }) => {
        const response = await request.get('/robots.txt');
        expect(response.status()).toBe(200);
        const text = await response.text();
        expect(text).toContain('Allow: /');
        expect(text).toContain(`${SITE_URL}/sitemap.xml`);
        expect(text).not.toContain('Disallow: /\n');
    });
});

test.describe('unknown pages', () => {
    test('an unknown path renders the not-found page, not a blank screen', async ({ page }) => {
        await page.goto('/this-page-does-not-exist');
        await expect(page.locator('main h1')).toBeVisible();
        await expect(page.getByRole('link', { name: /lesson information/i })).toBeVisible();
    });
});
