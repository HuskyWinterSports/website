# Husky Winter Sports Website

Source for [huskywintersports.org](https://www.huskywintersports.org).
Built with Vite + React, deployed automatically to GitHub Pages.
The domain is registered through Namecheap.

Read `UX-CHANGES.md` for a plain-language history of what's changed, and `ASSESSMENT.md` for the current list of known issues and the plan for making the site editable without writing code.

## Working on the site

You need [Node.js](https://nodejs.org) 22 or newer installed.

```bash
npm install        # once, after cloning
npm run dev        # preview at http://localhost:5173 while you edit
```

`npm run dev` reloads as you save. To view it on your phone, run
`npm run dev -- --host` and open the "Network" URL it prints, on the same wifi.

## Before you push

```bash
npm run lint       # catches code mistakes
npm test           # opens the real site in simulated phone + desktop browsers
npm run preview    # serves the built site, closer to production than `dev`
```

`npm test` runs Chromium only, which works on any machine. `npm run test:all`
adds a simulated iPhone/Safari — that one needs system libraries that some
Linux distributions don't provide, so it may not run locally. **It always runs
in CI**, so pushing a branch and opening a pull request gets you that coverage
regardless.

If a test fails, `npm run test:report` opens a report with screenshots.

## Deploying

Open a pull request against `main`. CI lints, tests, and builds it — you'll see
a green check or a red X before anything is public.

Merging to `main` deploys automatically. **Anything merged to `main` goes live**,
so use pull requests rather than pushing to `main` directly.

## Content locations

```
src/app/routes/     one file per page
src/components/     Navbar and Footer, shared by every page
src/assets/         stylesheets
public/images/      photos and logos (referenced as /images/...)
tests/              automated browser tests
```

## Styling

Styling mirrors the old Wix site: pages are built from stacked blocks. Applying
the right `className` to a `<section>` gets you the whole look with no new CSS:

| Class | Look |
|---|---|
| `white-stripe` | full-width white band |
| `purple-stripe` | full-width purple band |
| `big-white-box` | rounded white card over the mountain background |
| `big-purple-box` | rounded purple card |
| `cards` / `card` | row of small captioned cards |
| `boxes` / `box` | row of larger white boxes (used inside `purple-stripe`) |

## Tests

The tests check that every page is reachable by tapping through the menu, that
pages render, and that images have proper descriptions for screen readers.

They deliberately **never check the wording on the page**, so editing site copy
will not break the build. If you add a new page, add it to `NAV_ITEMS` in
`src/components/Navbar.jsx` and to the lists in `tests/nav.spec.js` and
`tests/smoke.spec.js`.
