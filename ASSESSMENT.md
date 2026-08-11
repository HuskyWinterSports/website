# HWS Website — Content-Editing Feasibility & Codebase Audit

Prepared 2026-08-10. Repo: `HuskyWinterSports/website` @ `5ba5bb2`.
Nothing in this document has been implemented. It is analysis only.

---

## Part 0 — The problem, demonstrated by the current site

As of today the live site says:

- `LessonInfo.jsx:26` — "2025/2026 DATES", with session dates in Jan–Mar 2026
- `LessonRegistration.jsx:10` — "lessons for the 2025/26 season are now full"
- `Footer.jsx:22` — "© 2025 HWS"

The 2025/26 season ended five months ago. The content is stale *right now*, which is
the exact failure mode the whole exercise is meant to prevent. This is evidence the
problem is real and worth solving — not a criticism of anyone.

**Verified continuity facts (good news):**

- Repo is owned by the **org** account `HuskyWinterSports`, not a personal account. ✅
- DNS is healthy: apex `huskywintersports.org` → 301 → `www.` → 200 from GitHub Pages. ✅
  (The `public/CNAME` = `www.…` vs `package.json` `homepage` = apex mismatch is
  cosmetic only; `homepage` is unused by Vite. Not a bug.)

So the two biggest handover risks are already handled. The remaining one is the
Namecheap registrar login and the Google Workspace account — confirm those are on
club-owned credentials, not a graduated student's.

---

## Part 1 — Can Google Docs drive site content?

### Mechanically: yes.

Google Docs has **no native webhook**. The real mechanism is:

```
Doc edited → Apps Script installable trigger (onChange)
           → POST github.com/repos/HuskyWinterSports/website/dispatches
             with a Personal Access Token
           → repository_dispatch fires deploy.yml
           → Action fetches doc via Docs API / export?format=html
           → parses → writes data files → builds → deploys
```

Every step works. I am not telling you it can't be built.

### But it fails the requirement you actually stated.

Your premise is *annual turnover with no guaranteed technical successor*. Measured
against that, this design has four failure modes, and they are all silent:

1. **The PAT lives in one student's Apps Script project.** Apps Script triggers run
   as the installing user, even for a doc in a Shared Drive. When UW deprovisions
   that account, the trigger stops. Nobody is told.
2. **PATs expire.** Fine-grained tokens cap at 1 year. So this breaks annually, on a
   schedule, by design.
3. **The failure is invisible to the person who hits it.** A future admin edits the
   doc, sees no change on the site, and has no error message, no logs they know how
   to read, and no one to ask. They will conclude the website is broken and go back
   to asking a CS major for help — which is the status quo you're trying to escape.
4. **Docs HTML export is span-soup.** `export?format=html` emits nested `<span>`s with
   inline styles and class names regenerated on every export. Mapping that onto your
   `.purple-stripe` / `.card` / `.box` design system requires a parser that someone
   has to maintain. And an editor pasting styled text from elsewhere can silently
   wreck the layout.

### The version of your idea that survives turnover

Your instinct — *"the club already lives in Google Drive, let them edit there"* — is
sound. It just needs the credential removed from the loop:

**Google Sheets + "Publish to web" + scheduled pull.**

| | Docs + Apps Script + PAT | Sheets + publish-to-web |
|---|---|---|
| Secrets to expire | PAT, annually | **none** |
| Tied to a personal account | yes | no |
| Content shape | prose (span-soup) | tabular → JSON, cleanly |
| Trigger | instant (push) | cron + manual "Deploy now" button |
| Silent-failure risk | high | low (Action can fail loudly) |

A published Sheet exposes a stable CSV/JSON URL requiring no auth. A GitHub Action on
`schedule:` + `workflow_dispatch:` fetches it at build time. Zero credentials, zero
personal-account dependency.

**Where this genuinely shines:** the volatile *structured* content — session dates,
prices, "registration open / full / waitlist" status. That data is tabular, it changes
every single year, and it maps to a spreadsheet perfectly.

**Where it doesn't:** prose. Multi-paragraph body copy in a spreadsheet cell is
miserable to edit and easy to break.

### Recommendation on this question

Hybrid, and note that your latest message already describes the right split:

> *"for the most part, I think that we will have fairly static blocks of content
> (whose content might change)"*

Exactly. **The block structure is stable; the text inside blocks changes.** That is
precisely the case where a schema'd data file beats free-form document sync — because
the schema is what stops a future editor from accidentally destroying the layout.

---

## Part 2 — Recommended architecture

### Step 1 is not a decision — it's a prerequisite

**Extract content out of JSX into data files.** Every option above (including your
Google Docs one) requires this. Right now a date change means editing JSX, so any
content edit is a code edit. This step is required regardless of what you pick next,
and it is independently valuable, so it should happen first.

Shape — one data file per page, an ordered list of typed blocks:

```jsonc
// content/lesson-info.json
{
  "title": "Lesson Information",
  "blocks": [
    { "type": "purple-stripe", "heading": "2026/2027 DATES",
      "boxes": [
        { "heading": "SESSION A",
          "items": ["Lesson 1: Jan 30th & 31st", "..."] }
      ],
      "footnote": "*There is a one-week break between..." },
    { "type": "button", "label": "DONATE VIA BENEVITY",
      "href": "https://..." }
  ]
}
```

The JSX becomes a small set of block renderers (~6 types cover the entire current
site: `prose-stripe`, `cards`, `boxes`, `big-box`, `button`, `embed`). This maps 1:1
onto the CSS classes the README already says are the styling system — so it formalizes
a convention that exists, rather than inventing a new one.

Two things you asked for fall out of this for free:
- **The Benevity donation button** becomes a `button` block someone adds to the D&I
  page's JSON. No JSX, no React, no developer.
- **The D&I page's "Under Construction! ദ്ദി（• ˕ •マ.ᐟ"** becomes deletable by anyone.

### Step 2 is the reversible choice — the editing surface

Once content is in data files, *who edits them and how* is a separable decision you
can change later without redoing step 1. Three candidates:

**A. GitHub's web editor.** Zero infrastructure, zero secrets. `deploy.yml` already
fires on push to `main`. Editors need GitHub accounts in the org. Cost: they see JSON
syntax, and a stray comma breaks the build (mitigable — see "fail loudly" below).

**B. Git-backed CMS — Pages CMS or Sveltia CMS.** A real WYSIWYG at a URL. Editors log
in with GitHub; the CMS commits to the repo; the existing Action deploys. Both are
free and need no server you host. The key property: **if the CMS vendor disappears
tomorrow, your content is still plain files in your repo that anyone can hand-edit.**
That graceful degradation is what makes this safe for a 4-year handover horizon.

**C. Google Sheets pull** for the volatile tabular subset (dates/prices/status),
layered on top of A or B. Not an alternative to them — a supplement.

My recommendation: **B for prose, C for dates/prices**, with A always available as the
manual fallback. But this is the decision I'd like your input on, since it depends on
whether future admins can reliably be given GitHub org accounts.

### Fail loudly, always

Whatever is chosen, the deploy must **fail visibly** rather than silently serve stale
content. Concretely: validate the data files against a JSON schema in CI, and have the
Action email `huskywslessons@gmail.com` on failure. A future admin who gets an email
saying "the website build failed, line 14 of lesson-info.json" is in a completely
different position from one who sees nothing happen.

---

## Part 3 — Codebase audit

Ranked by impact on the business, not by category. Every claim below was verified by
reading the source, building, or querying DNS — not inferred.

### ✅ FIXED — Four pages were effectively unreachable on phones

**Resolved 2026-08-10 in PR #1.** Menus now open on click/tap at every size,
with Escape, outside-click and keyboard support; the desktop nav bar is
restored. Locked in by `tests/nav.spec.js`, which taps through every route on
emulated Pixel 5 and iPhone 13. Original analysis below.

`Navbar.jsx:36-57` opens dropdowns **only** via `onMouseEnter`/`onMouseLeave`.
`Navbar.css:78-80` has `.dropdown { display: none }` with `.is-active` as the only
reveal. There is no click/tap handler and no focus handler.

Worse, the desktop media query at `Navbar.css:105-153` is **entirely commented out**,
so the site is hamburger-only at *every* width, on every device.

I inventoried every internal link in the codebase. Outside the hover-only dropdown:

| Page | Other way in? |
|---|---|
| `/lesson-registration` | one link, buried in `FAQ.jsx:22` |
| `/join-our-mailing-list` | **none** |
| `/diversity-and-inclusion` | **none** |
| `/contact-us` | **none** |

Tapping the parent (`Lessons`, `About Us`, `Questions`) is a `NavLink`, so it navigates
away and `App.jsx`'s route-change effect closes the menu. Mobile browsers do sometimes
synthesize a hover event on tap, so this may be *flaky* rather than *totally* dead —
worth confirming on a real phone. Either way, **the registration and mailing-list
pages are the site's two conversion goals, and they are the hardest to reach on the
device most parents will use.**

Fix: make the dropdown toggle on click/tap and on keyboard focus, and un-comment (and
finish) the desktop nav. Also worth adding real links in the footer, which currently
lists Instagram and Facebook as **plain text, not links** (`Footer.jsx:16-17`).

### ✅ FIXED — `HashRouter` was costing search traffic

**Resolved 2026-08-10.** Now `BrowserRouter`, with a build step that writes a
real HTML file per route carrying that page's title, description, canonical URL
and Open Graph tags, plus `404.html`, `sitemap.xml` and `robots.txt`. Flat
`faq.html` rather than `faq/index.html`, so GitHub Pages serves `/faq` with no
redirect and the canonical tag matches the served URL. A `NotFound` route was
added so unknown paths render a helpful page instead of a blank screen.
Original analysis below.

`main.jsx:7` uses `HashRouter`, so every URL is `huskywintersports.org/#/faq`. Google
does not index content behind a fragment well, there are no Open Graph tags, and no
sitemap. For a business that parents find by searching "UW ski lessons for kids," and
for linking a specific page in a mailing-list blast, this is a direct cost.

This was almost certainly done because GitHub Pages 404s on deep links to an SPA. The
standard fix is the `404.html` copy trick: add `cp dist/index.html dist/404.html` to
the build, then switch to `BrowserRouter`. `main.jsx:3` still imports `BrowserRouter`
unused, suggesting this was already considered.

### ✅ FIXED — 4.7 MB deploy; ~2.5 MB of it was pure waste

**Resolved 2026-08-10. `dist/` is now 1.1 MB.** Original analysis below.

Verified by building. `dist/` is 4.7 MB, and **two files are shipped twice**:

```
dist/images/background_mountain.jpeg      1.2M   ← from public/
dist/assets/background_mountain-*.jpeg    1.2M   ← bundled by Vite
dist/favicon.ico                           24K   ← from public/
dist/assets/favicon-*.ico                  24K   ← bundled by Vite
```

Cause: `Global.css:12` uses `url("../../public/images/background_mountain.jpeg")` and
`index.html:5` uses `href="/public/favicon.ico"`. Both reach *into* `public/`, so Vite
resolves and re-bundles them **in addition to** copying the originals.

Fix: reference them as `/images/background_mountain.jpeg` and `/favicon.ico`. Files in
`public/` are served at the root and must never be imported by path.

**Open item — source resolution, not compression.** `2025group.jpeg` is
1701×1088. The slider is full-viewport-width, so on a 1920px display the photo
is upscaled ~13% and on a 2560px display ~50%, which reads as slightly soft.
This was equally true before the 2026-08-10 re-compression (dimensions were
never changed, only quality), so restoring the larger file would not sharpen
it. **The fix is a higher-resolution original from the club photo archive**,
ideally ≥2560px wide. Same applies to `background_mountain.jpeg` (1662×1097).

Separately, the images themselves are heavy: `2025group.jpeg` is 1.7 MB and
`background_mountain.jpeg` is 1.2 MB — ~2.9 MB of the original 3.2 MB. Converting to
AVIF/WebP (as was already done for the logos) would cut this by roughly 10×. The
slider uses CSS `background-image`, so those images can't be lazy-loaded; using `<img
loading="lazy">` would let the two off-screen slides defer entirely.

Note `index.html:5` also declares `type="image/svg+xml"` for a `.ico` file — harmless
but wrong.

### ✅ FIXED — Both Google Form iframes loaded on every visit

**Resolved 2026-08-10.** Each page now renders one `<iframe>`, sized by CSS,
with a `title` for screen readers and `loading="lazy"`. Original analysis below.

`LessonRegistration.jsx:12-13` and `JoinMailingList.jsx:12-13` each render the *same*
form twice — a `.big-form` and a `.small-form` — and hide one with `display: none`
(`Global.css:223`, `247-254`). **`display: none` does not stop an iframe from
fetching.** Every visitor downloads a full Google Forms bundle twice.

Fix: render one iframe and size it with CSS.

### ✅ FIXED — `npm run lint` failed, and CI never ran it

**Resolved 2026-08-10.** Lint is clean and now runs in CI, together with the
browser tests, as a required check on every pull request. Original analysis
below.

```
src/app/App.jsx    1:10  'useState' is defined but never used
src/app/App.jsx    1:20  'useEffect' is defined but never used
src/components/Footer.jsx  3:32  'props' is defined but never used
✖ 3 problems
```

`deploy.yml` runs only `npm run build`, so this has been broken without consequence.
Adding a lint step is the cheap part; the valuable part is that CI becomes the thing
that catches a future admin's mistake *before* it reaches the public site.

### ✅ FIXED — Workflow would have broken silently on a future runner

**Resolved 2026-08-10.** Node pinned to 22, actions bumped to current majors,
and pull requests are now built and tested without deploying. Original analysis
below.

`deploy.yml:18` uses `actions/setup-node@v3` **with no `node-version`**, so the build
pins to whatever Node the runner happens to ship. That will change without warning,
and it will break for exactly the admin least able to diagnose it. Pin
`node-version: 22`. Also bump `checkout@v3` → `v5` and `setup-node@v3` → `v5`.

### 🟢 P4 — Content bugs (cheap, user-visible, fix during the content pass)

You mentioned wanting a content pass — here's what I found while reading:

- ✅ **FIXED 2026-08-10 — `LessonRegistration.jsx`, refund policy.** The
  authoritative policy text was supplied by the club and the page now matches
  it. Three separate defects were corrected:
  1. The first `<li>` repeated the intro paragraph verbatim, so **"Injury
     Before Lessons Start" was missing entirely**. It is an **80% refund**
     when the injury falls within one month of the start date.
  2. The page stated the no-questions-asked cancellation deadline as
     **December 31st; the real deadline is December 27th**. Four days in which
     a parent could have relied on the published date and been refused. This
     was the highest-stakes error on the site.
  3. The named lesson director was out of date.

  Note the two refund figures are not in conflict: cancelling **before** the
  one-month window is a full refund under the December 27th clause; an
  **injury inside** that window is 80%.

  Standing recommendation (not yet applied, needs a club decision): the policy
  names an individual and states that person is "currently studying abroad".
  Both go stale with turnover. Prefer the role plus the shared inbox.
- **`LessonRegistration.jsx:34,42`** and the site generally name a specific lesson
  director. Given annual turnover, use the role and the shared inbox, not a name.
- **`LessonRegistration.jsx:10` vs `:18`** contradict each other: "lessons are now
  full, join the waitlist" vs "Ski lessons are currently full, but we are continuing
  to accept snowboard lessons."
- **`Footer.jsx:21`** — "Partners in Winter RecreationThis program provides…" (missing
  sentence break). Also `© 2025`.
- **`Home.jsx:73`** — "Instrutors" → "Instructors".
- **`LessonInfo.jsx:115`** — the Google Maps URL ends in a stray `we`, and the
  sentence has no subject: "…from the bonfire area, *[we]* are located outside…".
- **`Footer.jsx:27`** — `alt="forrest service logo"` → "Forest Service".
- **`DiversityAndInclusion.jsx:8`** — "Under Construction! ദ്ദി（• ˕ •マ.ᐟ" — the
  kaomoji you flagged. Note the page also solicits donations directly below a
  "Under Construction" banner, which undercuts the ask.
- **`DiversityAndInclusion.jsx:14`** says Zelle `huskyws@gmail.com`; everywhere else
  the address is `huskywslessons@gmail.com`. **Verify which is correct** — a wrong
  address on a donation instruction sends money into the void.

**Tone:** the site currently mixes registers freely — "Come shred with us!" and "a rad
community" alongside formal refund-policy legalese. That's not necessarily wrong for a
student-run club, but it's currently *unintentional*. Worth deciding deliberately:
warm and casual on Home / Become an Instructor / D&I, precise and plain on
Registration / FAQ / refund policy. Encoding that split per-block in the content files
makes it self-documenting for future editors.

### 🟢 P4 — Accessibility

- Slider arrows (`Home.jsx:38,44`) are icon-only buttons with no `aria-label`.
- The slider auto-changes nothing but has no `prefers-reduced-motion` guard on its
  800 ms transitions; same for the route fade (`Global.css:2-9`).
- `.navbar { width: 100vw }` (`Navbar.css:5`) — `100vw` includes the scrollbar,
  causing horizontal overflow on desktop. Use `width: 100%`.
- `Footer.jsx:7` — `alt="footer image"` is not a description; the logo should say
  "Husky Winter Sports".
- No visible focus styles anywhere; keyboard users can't see where they are.
- `Home.jsx:34` sets `aria-hidden` on slides but the inactive ones are still in the
  tab order via their container.

---

### 🟢 P4 — Typos pass (content **and** filenames)

Run as its own pass alongside the tone/formality pass. Verified findings:

**Filenames** — every asset is referenced from exactly one place, so renames
are safe mechanical changes:

| Current | Should be | Referenced from |
|---|---|---|
| `forrest_service.avif` | `forest_service.avif` | `Footer.jsx:27` |

While in there, the image folder has three inconsistent naming conventions —
`2025group.jpeg`, `2025-2026.jpg`, `background_mountain.jpeg` — mixing
`.jpg`/`.jpeg`, hyphens/underscores/run-together words. Worth standardizing on
one convention (suggest lowercase-with-hyphens, `.jpg`) so future officers
adding a photo have an obvious pattern to copy. Do this at the same time as the
image compression work in P2, since both touch every file in that folder.

**Content typos** (machine-scanned plus manual read):

| File | Found | Fix |
|---|---|---|
| `Home.jsx:73` | "Instrutors" | "Instructors" |
| `Footer.jsx:21` | "RecreationThis" | missing sentence break |
| `Footer.jsx:27` | "forrest" (in `src` path) | "forest" |
| `LessonInfo.jsx:115` | Maps URL ends in stray `we` | remove; sentence also has no subject |
| `FAQ.jsx:19` | "Season's Pass" | inconsistent with "Season Pass" in `LessonInfo.jsx:109` |

Note the automated scan only catches typos on a known list. A human read of
every page is still needed, which is why this belongs *with* the tone pass
rather than as a separate mechanical step.

## Suggested sequencing

1. **Content pass** — three passes over the same material, done together since
   they all require reading every page anyway:
   a. **Correctness** — stale season dates, the refund-policy hole, the
      conflicting Zelle address, the contradictory "full vs. accepting" copy.
   b. **Tone/formality** — decide the register per page and apply it.
   c. **Typos** — content *and* asset filenames (see P4 above).

   No code architecture needed, immediate value, and it produces the inventory
   of "what text actually exists" that the extraction step needs.
2. **P1 mobile nav** — highest business impact, self-contained, ~1 file.
3. **P2/P3 quick wins** — asset duplication, double iframes, workflow pinning, lint
   in CI. All small and independent.
4. **Content extraction into data files** — the prerequisite for everything else.
5. **Pick and wire the editing surface** — the reversible decision.
6. **`BrowserRouter` + `404.html` + OG tags + sitemap** — do this after 4, since the
   content files make per-page meta tags trivial to generate.

---

## Docket: Google Workspace sync

➡️ **The full spec now lives in [`docs/content-sync-spec.md`](docs/content-sync-spec.md).**
Written 2026-08-10. One section (transport) is unverified and blocks
implementation; `scripts/verify-transport.sh` resolves it.

The notes below are the original framing, kept for context.

Revised premise (confirmed 2026-08-10): the club passes down **both** a
GitHub org account and a **single shared Google Drive org account**. That
invalidates the strongest objection to the original Google Docs idea — the
credential does *not* die when a student graduates. The stated preference is
still to avoid needing to touch GitHub at all.

The design to spec out, in one line: **make the credential optional rather
than load-bearing.**

```
  Google Sheet/Doc  ──published to web (NO credential)──┐
                                                        ▼
  GitHub Action on `schedule:` + `workflow_dispatch:` ──> fetch, validate,
                                                          commit, deploy
                    ▲
  Apps Script "Publish now" button ──repository_dispatch (PAT)──┘
                                     OPTIONAL ACCELERATOR ONLY
```

If the PAT lapses, the failure mode degrades to *"edits go live within a few
hours instead of instantly"* — never *"the site silently stopped updating."*
That property is the whole point, and it's what the naive design lacks.

The spec needs to answer:

1. ~~**Split.**~~ **SETTLED 2026-08-10.** Anything pertaining to **signups**
   comes from Sheets — session dates, prices, registration open/full/waitlist
   status — which is a natural fit because that data already originates in
   spreadsheets during club operations. Prose stays in the repo. The remaining
   design work is drawing the exact boundary on the Lesson Info and Lesson
   Registration pages, which mix both.
2. **Schema.** What does the Sheet look like, and how is it validated so a bad
   edit fails the build *loudly* rather than publishing a broken page? What
   does the failure email say, and who does it go to?
3. **Doc-to-HTML.** If prose *does* come from Docs, what sanitizes the
   span-soup export, and which formatting is supported vs. silently dropped?
4. **Cadence.** How often does the cron run, and is the staleness window
   acceptable during registration season?
5. **Onboarding.** The one-page instruction sheet the next officer reads. This
   is the actual deliverable — the automation is worthless if nobody knows the
   doc exists.
6. **Recovery.** What a future admin does when it breaks and no one technical
   is around. Every design decision above should be judged against this.
