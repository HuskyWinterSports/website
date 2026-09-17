import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ROUTES } from '../src/routes.js';

/**
 * The automated half of the accessibility checks.
 *
 * WHAT THIS CATCHES, AND WHAT IT DOES NOT
 * ---------------------------------------
 * axe finds roughly a third of the WCAG AA criteria: missing labels, broken
 * landmark structure, skipped heading levels, colour contrast it can compute,
 * form controls with no accessible name. It cannot tell you whether the alt
 * text is ACCURATE, whether the tab order makes sense, or whether a link
 * called "here" means anything. Those need a person, and
 * docs/accessibility-manual-audit.md is the script for that.
 *
 * So: a green run here is a floor, not a pass. It is still worth having,
 * because it runs on every content commit the Google Doc sync makes, which
 * means an officer's edit cannot quietly reintroduce something this can see.
 *
 * WCAG 2.2 AA is the target, so the tag list below includes wcag22aa. Do not
 * add `best-practice` — it mixes opinions in with the legal standard, and a
 * failing build has to mean something specific.
 */

const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * axe's raw output is a wall of JSON. A failure here has to be readable by
 * whoever opens the run, so this reduces each violation to the rule, the
 * criterion it breaks, how many elements are affected, and the first one.
 */
function readable(violations) {
    return violations.map((v) => ({
        rule: v.id,
        impact: v.impact,
        problem: v.help,
        criteria: v.tags.filter((t) => t.startsWith('wcag')).join(', '),
        elements: v.nodes.length,
        firstExample: v.nodes[0]?.html?.slice(0, 160),
        // The measured numbers, not just the rule name. For a contrast failure
        // this is the line that says 1.79:1, and which two colours produced it
        // — without it you cannot tell a real failure from a scan that ran
        // while the page was still fading in.
        measured: v.nodes[0]?.any?.[0]?.message ?? v.nodes[0]?.all?.[0]?.message,
        howToFix: v.helpUrl,
    }));
}

/**
 * Wait until the page has stopped moving.
 *
 * `toBeVisible()` does NOT wait for opacity, and every route fades in over
 * 500ms — `.fade-wrapper` in Global.css. axe measuring mid-fade sees the white
 * panels as semi-transparent, finds the mountain photograph behind them, and
 * reports a contrast failure on essentially every element on the page: 57 of
 * them on Lesson Info, the first time this ran.
 *
 * The symptom is a suite that fails DIFFERENTLY on every run — a fast project
 * finishes the fade before the scan, a slow one does not — which is worse than
 * failing outright, because it reads as a real and intermittent site fault.
 *
 * So: drain the browser's own animation registry rather than sleeping for a
 * guessed number of milliseconds. Short timeout, because anything still
 * running after two seconds is a bug in the page, not slowness.
 */
async function settled(page) {
    await page.waitForFunction(
        () => document.getAnimations().every(
            (a) => a.playState === 'finished' || a.playState === 'idle'
        ),
        null,
        { timeout: 2000 },
    );
}

const scan = (page) => new AxeBuilder({ page }).withTags(WCAG_AA).analyze();

test.describe('every page passes the automated sweep', () => {
    for (const route of ROUTES) {
        test(`${route.path} has no WCAG AA violations`, async ({ page }) => {
            await page.goto(route.path);
            // Wait for the content to render rather than scanning an empty
            // shell, which would pass trivially.
            await expect(page.locator('main h1')).toBeVisible();
            await settled(page);

            const { violations } = await scan(page);
            expect(readable(violations)).toEqual([]);
        });
    }
});

test.describe('the parts axe only sees when they are open', () => {
    /**
     * A closed menu is correctly invisible to axe, which means the nav's own
     * markup — the one piece of this site with real ARIA in it — would never
     * be scanned at all without this.
     */
    test('the navigation menu, opened', async ({ page }) => {
        await page.goto('/');

        const hamburger = page.getByRole('button', { name: /open menu/i });
        if (await hamburger.isVisible()) await hamburger.click();
        await page.getByRole('button', { name: 'Lessons' }).click();
        await expect(page.getByRole('link', { name: 'Lesson Registration' })).toBeVisible();
        // Both the page fade and the menu's own 400ms slide.
        await settled(page);

        const { violations } = await scan(page);
        expect(readable(violations)).toEqual([]);
    });

    /**
     * The carousel carries the most ARIA on the site — roledescription, per
     * slide labels, aria-current on the dots — and the slide that is showing
     * changes what is in the accessibility tree.
     */
    test('the carousel, after moving to the second photo', async ({ page }) => {
        await page.goto('/');
        const next = page.getByRole('button', { name: 'Next photo' });
        test.skip(!(await next.count()), 'this page has no carousel');

        await next.click();
        await settled(page);
        const { violations } = await scan(page);
        expect(readable(violations)).toEqual([]);
    });
});

test.describe('targets are big enough to hit', () => {
    /**
     * WCAG 2.2 added 2.5.8: a target is at least 24x24 CSS pixels, unless a
     * 24px circle centred on it clears its neighbours. axe does not check this
     * rule, so it is measured here.
     *
     * The carousel dots were 9px squares 9px apart, which fails both halves.
     */
    test('the carousel controls clear 24px', async ({ page }) => {
        await page.goto('/');
        const controls = page.locator(
            '.image-slider .slide-dot, .image-slider .left-arrow, .image-slider .right-arrow'
        );
        const count = await controls.count();
        expect(count, 'expected the home carousel to have controls').toBeGreaterThan(0);

        for (let i = 0; i < count; i++) {
            const box = await controls.nth(i).boundingBox();
            const name = await controls.nth(i).getAttribute('aria-label');
            expect(Math.round(box.width), `${name} is too narrow`).toBeGreaterThanOrEqual(24);
            expect(Math.round(box.height), `${name} is too short`).toBeGreaterThanOrEqual(24);
        }
    });

    test('neighbouring dots do not overlap', async ({ page }) => {
        await page.goto('/');
        const dots = page.locator('.image-slider .slide-dot');
        const count = await dots.count();
        test.skip(count < 2, 'needs at least two dots to compare');

        for (let i = 1; i < count; i++) {
            const left = await dots.nth(i - 1).boundingBox();
            const right = await dots.nth(i).boundingBox();
            expect(right.x, 'dot targets overlap').toBeGreaterThanOrEqual(left.x + left.width - 1);
        }
    });
});
