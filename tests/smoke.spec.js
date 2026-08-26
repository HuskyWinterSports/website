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

/**
 * Scroll the page end to end and wait for every image to finish.
 *
 * WebKit starts a lazy image much later than Chromium does — at an iPhone
 * viewport, three of the four inline photographs on /become-an-instructor had
 * not begun loading when the page fired `load`, and read as broken.
 */
async function settleImages(page) {
    await page.evaluate(async () => {
        const step = window.innerHeight;
        for (let y = 0; y < document.body.scrollHeight; y += step) {
            window.scrollTo(0, y);
            await new Promise((resolve) => setTimeout(resolve, 120));
        }
        window.scrollTo(0, 0);
    });
    // Swallowed on timeout: a genuinely broken image never completes, and the
    // assertion below names it far better than a wait failure would.
    await page
        .waitForFunction(() => Array.from(document.images).every((img) => img.complete), null, { timeout: 15_000 })
        .catch(() => {});
}

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

        await page.goto(route);
        await page.waitForLoadState('load');

        await expect(page.locator('main')).toBeVisible();
        await expect(page.locator('main h1')).toBeVisible();
        await expect(page.locator('nav.navbar')).toBeVisible();
        await expect(page.locator('footer')).toBeVisible();

        // Lazy images below the fold have not been asked for yet, and one that
        // has not been asked for is not a broken one. Scroll the whole page
        // first so every image is requested — which also means this still
        // checks the inline photographs, rather than excusing them.
        await settleImages(page);

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
        const image = images.nth(i);
        const alt = await image.getAttribute('alt');
        expect(alt, `image ${i} is missing an alt attribute`).not.toBeNull();

        // An empty alt is the CORRECT markup for a decorative image, and the
        // carousel has one per slide: a blurred copy of the photo, filling the
        // band either side of it. Describing that to a screen reader would be
        // worse than saying nothing, so the pairing of alt="" with
        // aria-hidden is what exempts it — not the absence of a rule.
        if (alt === '' && await image.getAttribute('aria-hidden') === 'true') continue;

        // "image", "footer image", "logo" alone describe nothing to a
        // screen reader. Require something more specific.
        expect(alt.trim().length, `image ${i} has an empty alt`).toBeGreaterThan(0);
        expect(
            ['image', 'footer image', 'logo', 'photo'],
            `image ${i} alt text "${alt}" is not descriptive`
        ).not.toContain(alt.trim().toLowerCase());
    }
});

test('the home banner offers both a lessons and an instructor route', async ({ page }) => {
    await page.goto('/');

    // Booking lessons is the site's primary purpose, so the home page must
    // always offer a route into the lessons side. Asserted by destination
    // rather than button text, so the wording stays free to change.
    const buttons = page.locator('.banner-buttons a');
    await expect(buttons).toHaveCount(2);
    await expect(buttons.first()).toHaveAttribute('href', /lesson/);
    await expect(page.locator('.banner-buttons a[href*="become-an-instructor"]')).toBeVisible();
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
