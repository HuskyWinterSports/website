# Husky Winter Sports Website

Source for [huskywintersports.org](https://www.huskywintersports.org).
Built with Vite + React, deployed automatically to GitHub Pages.
The domain is registered through Namecheap.

## Working on the site

You need [Node.js](https://nodejs.org) 22 or newer installed.

```bash
npm install        # once, after cloning
npm run dev        # preview at http://localhost:5173 while you edit
```

`npm run dev` reloads as you save. 
To view on mobile, run
`npm run dev -- --host` and open the Network URL while on the same local net.

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

Open a pull request against `main`. CI lints, tests, and builds it.

Merging to `main` deploys automatically, so anything merged to `main` goes live.
So, please use pull requests rather than pushing to `main` directly.

## Content locations

```
src/app/routes/     one file per page
src/components/     navbar and footer, shared by every page
src/assets/         stylesheets
public/images/      photos and logos (referenced as /images/...)
tests/              automated browser tests
```

## Styling

Applying the appropriate `className` to a `<section>` gets you the whole look with no new CSS:

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

They deliberately never check the wording on the page, so editing site copy will not break the build. 

To add a new page, include to `NAV_ITEMS` in
`src/components/Navbar.jsx` and to the lists in `tests/nav.spec.js` and
`tests/smoke.spec.js`.
