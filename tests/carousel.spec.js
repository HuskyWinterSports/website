import { test, expect } from '@playwright/test';

/**
 * The photo carousel, which is a scroll-snapping track: the arrows, the dots,
 * a swipe and a trackpad all move the same scroll, so there is one notion of
 * where you are rather than two that can disagree.
 *
 * Asserted through scroll position rather than through React state, because
 * scroll position is what a visitor actually sees.
 */

/** Which slide the track is showing, by its own scroll offset. */
const at = (page) =>
    page.locator('.slide-track').first().evaluate((el) =>
        el.clientWidth ? Math.round(el.scrollLeft / el.clientWidth) : 0);

const slideCount = (page) => page.locator('.image-slider').first().locator('.slide').count();

test.describe('the history carousel', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/our-history');
        await expect(page.locator('.slide-track').first()).toBeVisible();
    });

    test('the arrows move it one photo at a time', async ({ page }) => {
        expect(await at(page)).toBe(0);
        await page.locator('.right-arrow').first().click();
        await expect.poll(() => at(page)).toBe(1);
        await page.locator('.left-arrow').first().click();
        await expect.poll(() => at(page)).toBe(0);
    });

    test('past the last photo is the first one again', async ({ page }) => {
        const count = await slideCount(page);
        expect(count).toBeGreaterThan(1);

        const right = page.locator('.right-arrow').first();
        for (let i = 1; i < count; i++) {
            await right.click();
            await expect.poll(() => at(page)).toBe(i);
        }
        await right.click();
        await expect.poll(() => at(page)).toBe(0);
    });

    test('and before the first is the last', async ({ page }) => {
        const count = await slideCount(page);
        await page.locator('.left-arrow').first().click();
        await expect.poll(() => at(page)).toBe(count - 1);
    });

    test('a dot goes straight to its photo', async ({ page }) => {
        const dots = page.locator('.slide-dot');
        const count = await dots.count();
        expect(count).toBeGreaterThan(2);
        await dots.nth(count - 1).click();
        await expect.poll(() => at(page)).toBe(count - 1);
        // The dots follow the track rather than keeping a count of their own.
        await expect(dots.nth(count - 1)).toHaveAttribute('aria-current', 'true');
    });

    test('the photographs are on the page before the article, not after it', async ({ page }) => {
        // The page is the longest run of prose on the site and the group
        // photos are why most people open it.
        const order = await page.evaluate(() => {
            const nodes = Array.from(document.querySelectorAll('main h1, main .image-slider, main p'));
            return nodes.map((node) =>
                node.tagName === 'H1' ? 'title' : node.classList.contains('image-slider') ? 'photos' : 'prose');
        });
        expect(order.indexOf('title')).toBeLessThan(order.indexOf('photos'));
        expect(order.indexOf('photos')).toBeLessThan(order.indexOf('prose'));
    });
});
