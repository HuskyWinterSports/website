import { test, expect } from '@playwright/test';

/**
 * Smoke tests: every page loads, renders, and doesn't 404 its images.
 *
 * Like nav.spec.js, these assert on STRUCTURE, never on wording, so that
 * editing site copy never breaks the build.
 */

const ROUTES = [
    '/',
    '/lesson-info',
    '/lesson-registration',
    '/join-our-mailing-list',
    '/become-an-instructor',
    '/diversity-and-inclusion',
    '/faq',
    '/contact-us',
];

for (const route of ROUTES) {
    test(`${route} renders without errors`, async ({ page }) => {
        const consoleErrors = [];
        const failedRequests = [];

        // Use the configured base URL, NOT page.url(). Events arrive while
        // page.url() is still about:blank, so comparing against it silently
        // matches nothing and the assertions below never fire.
        const ownHost = new URL(test.info().project.use.baseURL).host;

        page.on('console', (msg) => {
            if (msg.type() !== 'error') return;
            // The embedded Google Forms iframes reliably log 404s for Google's
            // own resources. That is not our bug and must not fail our build,
            // so only report errors originating from our own pages.
            const source = msg.location()?.url ?? '';
            if (source && !source.includes(ownHost)) return;
            consoleErrors.push(msg.text());
        });

        page.on('response', (res) => {
            // Google Forms iframes are third-party; only police our own assets.
            if (res.status() >= 400 && new URL(res.url()).host === ownHost) {
                failedRequests.push(`${res.status()} ${res.url()}`);
            }
        });

        await page.goto(`/#${route}`);
        await page.waitForLoadState('load');

        await expect(page.locator('main')).toBeVisible();
        await expect(page.locator('main h1')).toBeVisible();
        await expect(page.locator('nav.navbar')).toBeVisible();
        await expect(page.locator('footer')).toBeVisible();

        // Check images DECODED rather than trusting status codes. `vite
        // preview` falls back to index.html for unknown paths, so a broken
        // image path returns 200-with-HTML locally while really 404-ing on
        // GitHub Pages. naturalWidth catches it either way.
        const brokenImages = await page.evaluate(() =>
            Array.from(document.images)
                .filter((img) => !img.complete || img.naturalWidth === 0)
                .map((img) => img.getAttribute('src'))
        );
        expect(brokenImages, `images that failed to load on ${route}`).toEqual([]);

        expect(consoleErrors, `console errors on ${route}`).toEqual([]);
        expect(failedRequests, `failed requests on ${route}`).toEqual([]);
    });
}

// SCOPE: only checks the home page, which today means the five Footer logos.
// The homepage slider uses CSS background images, not <img>, so it is not
// covered here. If you add <img> tags to other pages, extend this test.
test('every image has meaningful alt text', async ({ page }) => {
    await page.goto('/');
    const images = page.locator('img');
    const count = await images.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
        const alt = await images.nth(i).getAttribute('alt');
        expect(alt, `image ${i} is missing an alt attribute`).not.toBeNull();
        // "image", "footer image", "logo" alone describe nothing to a
        // screen reader. Require something more specific.
        expect(alt.trim().length, `image ${i} has an empty alt`).toBeGreaterThan(0);
        expect(
            ['image', 'footer image', 'logo', 'photo'],
            `image ${i} alt text "${alt}" is not descriptive`
        ).not.toContain(alt.trim().toLowerCase());
    }
});

test('CSS background images resolve to real images', async ({ page, request }) => {
    await page.goto('/');

    // CSS backgrounds are invisible to the <img> checks above, and a wrong
    // path here previously caused a 1.2 MB file to ship twice. Check the
    // content type, not the status: `vite preview` answers unknown paths
    // with 200 + index.html, so a 404 would otherwise look like success.
    const url = await page.evaluate(() => {
        const value = getComputedStyle(document.body).backgroundImage;
        return value.match(/url\(["']?([^"')]+)["']?\)/)?.[1] ?? null;
    });
    expect(url, 'body has no background image').not.toBeNull();

    const response = await request.get(url);
    expect(response.status()).toBe(200);
    expect(
        response.headers()['content-type'],
        `${url} did not return an image`
    ).toMatch(/^image\//);
});

test('the site has a page title and meta description', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/.+/);
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /.+/);
});
