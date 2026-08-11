import { test, expect } from '@playwright/test';

/**
 * Navigation tests.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The site once shipped a nav whose dropdowns opened only on mouse hover.
 * On phones there is no hover, which left four pages — including Lesson
 * Registration and the mailing list signup — unreachable from the menu.
 * It linted clean and built clean the whole time.
 *
 * These tests exist so that can never silently happen again.
 *
 * A NOTE FOR FUTURE MAINTAINERS
 * -----------------------------
 * These tests deliberately check URLs and roles, NOT the words on the page.
 * Website copy is meant to be edited freely by club officers; a test that
 * asserted on wording would turn every routine content edit into a broken
 * build. If you add a page, add it to NAV below and the tests cover it.
 */

// Mirrors NAV_ITEMS in src/components/Navbar.jsx.
const NAV = [
    {
        group: 'Lessons',
        links: [
            { label: 'Lesson Info', path: '/lesson-info' },
            { label: 'Lesson Registration', path: '/lesson-registration' },
            { label: 'Join Our Mailing List', path: '/join-our-mailing-list' },
        ],
    },
    {
        group: 'About Us',
        links: [
            { label: 'Become an Instructor', path: '/become-an-instructor' },
            { label: 'Diversity and Inclusion', path: '/diversity-and-inclusion' },
        ],
    },
    {
        group: 'Questions',
        links: [
            { label: 'FAQ', path: '/faq' },
            { label: 'Contact Us', path: '/contact-us' },
        ],
    },
];

/** True when the current project emulates a touchscreen. */
function isTouch() {
    return test.info().project.use.hasTouch === true;
}

/**
 * Activate an element the way this device would.
 * On touch projects this dispatches real touch events and NEVER synthesizes
 * hover — which is exactly what makes it catch hover-only regressions.
 */
async function activate(locator) {
    if (isTouch()) await locator.tap();
    else await locator.click();
}

/** Open the hamburger menu if this viewport uses one. */
async function openMenu(page) {
    const toggle = page.getByRole('button', { name: /open menu/i });
    if (await toggle.isVisible()) await activate(toggle);
}

/**
 * Assert we landed on `path`, tolerating either routing style.
 * The site currently uses HashRouter (/#/faq); if it moves to BrowserRouter
 * (/faq) these assertions keep passing.
 */
async function expectPath(page, path) {
    await expect(page).toHaveURL(new RegExp(`(#)?${path}$`));
}

test.describe('every page is reachable from the nav', () => {
    for (const { group, links } of NAV) {
        for (const { label, path } of links) {
            test(`${group} → ${label}`, async ({ page }) => {
                await page.goto('/');
                await openMenu(page);

                // The group parent is a toggle button, not a link, so that it
                // works identically with and without a pointer.
                await activate(page.getByRole('button', { name: group }));

                const link = page.getByRole('link', { name: label, exact: true });
                await expect(link).toBeVisible();
                await activate(link);

                await expectPath(page, path);
                await expect(page.locator('main h1')).toBeVisible();
            });
        }
    }

    test('Home is reachable', async ({ page }) => {
        await page.goto('/#/faq');
        await openMenu(page);
        await activate(page.getByRole('link', { name: 'Home', exact: true }));
        await expect(page.locator('main h1')).toBeVisible();
    });
});

test.describe('dropdown behaviour', () => {
    test('submenu starts closed and opens on activation', async ({ page }) => {
        await page.goto('/');
        await openMenu(page);

        const toggle = page.getByRole('button', { name: 'Lessons' });
        const submenuLink = page.getByRole('link', { name: 'Lesson Registration' });

        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(submenuLink).toBeHidden();

        await activate(toggle);

        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await expect(submenuLink).toBeVisible();
    });

    test('activating the group toggle does not navigate away', async ({ page }) => {
        await page.goto('/');
        const before = page.url();
        await openMenu(page);
        await activate(page.getByRole('button', { name: 'Lessons' }));
        expect(page.url()).toBe(before);
    });

    test('only one submenu is open at a time', async ({ page }) => {
        await page.goto('/');
        await openMenu(page);

        await activate(page.getByRole('button', { name: 'Lessons' }));
        await expect(page.getByRole('link', { name: 'Lesson Registration' })).toBeVisible();

        await activate(page.getByRole('button', { name: 'Questions' }));
        await expect(page.getByRole('link', { name: 'Lesson Registration' })).toBeHidden();
        await expect(page.getByRole('link', { name: 'Contact Us' })).toBeVisible();
    });

    test('Escape closes an open submenu', async ({ page }) => {
        await page.goto('/');
        await openMenu(page);
        await activate(page.getByRole('button', { name: 'Lessons' }));
        await expect(page.getByRole('link', { name: 'Lesson Registration' })).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(page.getByRole('link', { name: 'Lesson Registration' })).toBeHidden();
    });
});

test.describe('keyboard access', () => {
    test('a submenu can be opened without a mouse', async ({ page }) => {
        await page.goto('/');
        await openMenu(page);

        const toggle = page.getByRole('button', { name: 'Lessons' });
        await toggle.focus();
        await page.keyboard.press('Enter');

        await expect(page.getByRole('link', { name: 'Lesson Registration' })).toBeVisible();
    });
});

test.describe('layout', () => {
    test('the hamburger is hidden on desktop and shown on phones', async ({ page }) => {
        await page.goto('/');
        const toggle = page.getByRole('button', { name: /open menu/i });

        // 768px is the breakpoint in Navbar.css.
        const width = page.viewportSize().width;
        if (width >= 768) await expect(toggle).toBeHidden();
        else await expect(toggle).toBeVisible();
    });

    test('the page does not scroll sideways', async ({ page }) => {
        await page.goto('/');
        // A fixed-position bar sized with 100vw overflows once a scrollbar
        // exists. This guards that regression.
        const overflows = await page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        );
        expect(overflows).toBe(false);
    });
});
