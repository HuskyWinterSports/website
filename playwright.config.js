import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

    use: {
        baseURL: `http://localhost:${PORT}`,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },

    projects: [
        // Desktop: wide enough for the horizontal nav (>=768px breakpoint).
        { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },

        // Touch devices. These are the ones that matter most: the nav bug that
        // made four pages unreachable only showed up with touch + no hover.
        { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
        { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
    ],

    // Test the BUILT site, not the dev server. Dev mode resolves asset paths
    // differently and has hidden production-only bugs before.
    webServer: {
        command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        // Always rebuild. Reusing a running preview server makes tests pass
        // against a STALE build, which silently reports green for code that
        // was never actually run. The rebuild costs under a second.
        reuseExistingServer: false,
        timeout: 120_000,
    },
});
