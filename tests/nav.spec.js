import { test, expect } from '@playwright/test';

/**
 * Navigation tests.
 *
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
            { label: 'Our History', path: '/our-history' },
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

// Links that sit directly in the bar rather than inside a dropdown. They are
// reached differently — no group toggle to open first — so a page moved out of
// a menu could otherwise lose its coverage silently.
const TOP_LEVEL = [
    { label: 'Home', path: '/' },
    { label: 'Support Us', path: '/support-us' },
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
 * Assert we landed on `path`. The optional `#` is tolerated only so this
 * keeps working if the site is ever moved back to hash routing; as of the
 * BrowserRouter switch, URLs are plain paths like /faq.
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

    for (const { label, path } of TOP_LEVEL) {
        test(`top level → ${label}`, async ({ page }) => {
            await page.goto('/faq');
            await openMenu(page);
            await activate(page.getByRole('link', { name: label, exact: true }));
            await expect(page).toHaveURL(new RegExp(`${path.replace('/', '\\/')}$`));
            await expect(page.locator('main h1')).toBeVisible();
        });
    }
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

test.describe('skipping the navigation', () => {
    const skipLink = (page) =>
        page.getByRole('link', { name: /skip to the main content/i });

    test('the skip link is the first thing focus reaches', async ({ page }) => {
        await page.goto('/');
        await page.keyboard.press('Tab');
        await expect(skipLink(page)).toBeFocused();
    });

    test('it is off the top of the window until it is focused', async ({ page }) => {
        await page.goto('/');
        const skip = skipLink(page);

        // Deliberately NOT toBeHidden(): Playwright counts an element parked
        // off-screen as visible, which is the whole reason the closed-menu bug
        // below went unnoticed. Assert the position instead.
        const atRest = await skip.boundingBox();
        expect(atRest.y + atRest.height).toBeLessThanOrEqual(0);

        await skip.focus();

        // Polled, not read once: `.skip-link` has `transition: top 0.15s`, so
        // immediately after focus it is still somewhere above the window and a
        // single boundingBox() catches it mid-slide.
        await expect
            .poll(async () => (await skip.boundingBox()).y)
            .toBeGreaterThanOrEqual(0);
    });

    test('following it puts focus past the menu, in the content', async ({ page }) => {
        await page.goto('/');
        await skipLink(page).focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('main#main-content')).toBeFocused();
    });
});

test.describe('a closed menu is really closed', () => {
    /**
     * The regression this guards is invisible by every other measure: the
     * panel was hidden with `transform: translateY(-100%)`, which moves it out
     * of sight but leaves every link in the tab order. On a phone that meant
     * tabbing off the hamburger into five stops nobody could see.
     */
    test('it holds no tab stops', async ({ page }) => {
        test.skip(page.viewportSize().width >= 768, 'no closed state at this width');
        await page.goto('/');

        await expect(page.locator('#navbar-menu')).toBeHidden();

        for (let i = 1; i <= 5; i++) {
            await page.keyboard.press('Tab');
            const inMenu = await page.evaluate(() =>
                !!document.getElementById('navbar-menu')?.contains(document.activeElement)
            );
            expect(inMenu, `tab stop ${i} landed inside the closed menu`).toBe(false);
        }
    });
});

test.describe('focus is never dropped', () => {
    test('Escape hands focus back to the button that opened the menu', async ({ page }) => {
        await page.goto('/');
        const hamburger = page.getByRole('button', { name: /open menu/i });
        const onPhone = await hamburger.isVisible();
        if (onPhone) await activate(hamburger);

        const group = page.getByRole('button', { name: 'Lessons' });
        await activate(group);
        await page.getByRole('link', { name: 'Lesson Registration' }).focus();

        await page.keyboard.press('Escape');

        // On a phone the whole panel closes, so the group toggle goes with it
        // and the hamburger is what is left to return to. On desktop the bar
        // never closes and the group toggle is still there.
        await expect(
            onPhone ? page.getByRole('button', { name: /open menu/i }) : group
        ).toBeFocused();
    });

    test('following a nav link moves focus into the new page', async ({ page }) => {
        await page.goto('/');
        await openMenu(page);
        await activate(page.getByRole('button', { name: 'Questions' }));
        await activate(page.getByRole('link', { name: 'FAQ', exact: true }));

        await expectPath(page, '/faq');
        // Without this the menu closes around the link that had focus, focus
        // falls back to <body>, and the next Tab starts from the top of the
        // page — the exact problem the skip link exists to avoid.
        await expect(page.locator('main#main-content')).toBeFocused();
    });

    test('a fresh page load does not steal focus into the content', async ({ page }) => {
        // Only navigation within the app moves focus. On a first load it has
        // to stay at the top of the document, where the page title is, or a
        // screen reader is talked over as it announces which page this is.
        await page.goto('/faq');
        await expect(page.locator('main#main-content')).not.toBeFocused();
    });

    test('Escape elsewhere on the page leaves focus alone', async ({ page }) => {
        await page.goto('/faq');
        await page.locator('main#main-content').focus();
        await page.keyboard.press('Escape');
        await expect(page.locator('main#main-content')).toBeFocused();
    });
});

test.describe('the bar and the content do not overlap', () => {
    const clears = async (page) => {
        const bar = await page.locator('nav.navbar').boundingBox();
        const content = await page.locator('main').boundingBox();
        return { top: content.y, barBottom: bar.y + bar.height };
    };

    test('content starts below the bar', async ({ page }) => {
        await page.goto('/');
        const { top, barBottom } = await clears(page);
        expect(top).toBeGreaterThanOrEqual(barBottom - 1);
    });

    test('and still does when the bar grows with larger text', async ({ page }) => {
        // At phone width the bar holds nothing in normal flow — the hamburger
        // is absolutely positioned and the menu is a fixed overlay — so it
        // cannot grow with text and there is nothing here to measure.
        test.skip(page.viewportSize().width < 768, 'the bar has no in-flow content at this width');

        await page.goto('/');
        const before = await clears(page);

        // 60px, because the bar has `min-height: 60px`: at 30px the line box is
        // only about 36px and the bar does not move at all, which made the
        // first version of this test fail on a page that was behaving.
        await page.addStyleTag({ content: '.navbar, .navbar * { font-size: 60px !important; }' });
        const after = await clears(page);

        // Both halves matter. The bar used to be a fixed 60px with
        // `main { margin-top: 60px }` hardcoded to match, so anything that made
        // it taller landed on the page's first heading.
        expect(after.barBottom, 'the bar did not grow, so this proves nothing')
            .toBeGreaterThan(before.barBottom);
        expect(after.top).toBeGreaterThanOrEqual(after.barBottom - 1);
    });
});
