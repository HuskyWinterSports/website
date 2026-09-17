# The accessibility audit

This file is written by claude and double checked by Jules.

Automated tools find about a third of WCAG AA. The rest needs a person with a
keyboard, a zoom level and a screen reader. This is the script for that person.

Work through it in order: the automated pass is free and narrows what you have
to look at by hand. Budget about 45 minutes for a full run, and do one before
any release that touched the navigation, the carousel, or the stylesheets.

Every check below says what to do, what counts as a pass, and what a failure
looks like. If a check fails, note it and keep going — finish the sweep before
fixing anything, or you will fix one thing three times.

## Manual Audit log

09/17/2026: Jules
  - all reviewed sections passing after some edits. See commit "manual audit changes" on date.
  - issues with screen readerand changing text spacing. 


---

## Part 0 — Get the site running locally

You have three ways to look at the site, and they are not interchangeable.

```bash
npm run dev        # http://localhost:5173 — fast, reloads as you edit
npm run preview    # http://localhost:4173 — the BUILT site, after npm run build
npm run test:a11y  # builds, serves, runs axe over every page, tears down
```

**Do the manual checks against `npm run preview`, not `npm run dev`.** The dev
server resolves asset paths differently and skips the prerender step, so the
`<title>`, the canonical tags and the per-route HTML files only exist in the
built output. Build first:

```bash
npm run build && npm run preview
```

One-time setup, if you have not run the browser tests on this machine before:

```bash
npx playwright install chromium webkit
```

---

## Part 1 — The automated pass

09/17/2026: all passing

### 1.1 Run axe over every page

```bash
npm run test:a11y
```

This builds the site, serves it on port 4173, loads all ten routes plus the
open navigation menu and the carousel mid-slide, and runs axe-core against
WCAG 2.0/2.1/2.2 at levels A and AA. It also measures every carousel control
against the 24px minimum target size, which axe does not check.

**Pass:** every test green.

**Fail:** the output names the rule, the criterion, how many elements are
affected, the first offending element, and a link to the fix. Fix and re-run.

If it fails on something you believe is a false positive, do not add the rule
to an ignore list without writing down why in a comment next to it. An
exclusion nobody can explain is how a suite stops meaning anything.

### 1.2 Lighthouse, as a second opinion

Chrome DevTools → **Lighthouse** tab → check only **Accessibility** → **Analyze
page load**. Do this on the home page and on Lesson Registration, which is the
page with the most going on.

**Pass:** score 100, and the "Additional items to manually check" list contains
nothing you have not already covered below.

**Fail:** anything in the red "Failing elements" section. Note that Lighthouse
and axe share an engine, so a Lighthouse failure that axe missed usually means
you scanned a different state of the page.

### 1.3 Read the last content sync log

GitHub → **Actions** → **Sync content from Google** → the most recent run.

The sync reports content-level accessibility problems that no browser test can
see: links whose words say nothing out of context, headings that skip a level,
and photographs still carrying the name the camera gave them.

**Pass:** no `NOTE:` lines about links, headings or photo names.

**Fail:** each note names the page, quotes the problem, and says what to change
in the Google Doc or the Drive folder. These are fixed by an officer, not a
developer — send them the note as written.

---

## Part 2 — Keyboard only

Put the mouse away. Genuinely — move it off the desk. Every check in this part
is invalid if you touch it.

Do this part on the built site at `localhost:4173`, in Chrome, on the home page
unless a check says otherwise.

### 2.1 The skip link is first, and it works

**Do:** click once on the browser's address bar, then press `Tab` once to move
into the page.

**Pass:** a purple "Skip to the main content" box appears at the top left. Press
`Enter`; the page jumps past the navigation and the next `Tab` lands on
something inside the page content, not on a nav item.

**Fail:** nothing appears, or the first `Tab` lands on a navigation link.

*WCAG 2.4.1 Bypass Blocks (A)*

### 2.2 Focus is visible at every single stop

09/17/2026: Fail, change to blue and white contrast ring
09/17/2026 round 2: Pass

**Do:** from the top of the page, press `Tab` about twenty times, slowly.
Watch every stop.

**Pass:** at every stop you can see exactly what is focused — an outline, a
ring, something. Including over the nav bar, over photographs, and inside the
white panels.

**Fail:** any stop where you cannot tell what is focused, or where focus
visibly disappears off the screen.

*WCAG 2.4.7 Focus Visible (AA), 2.4.11 Focus Not Obscured (AA)*

### 2.3 A closed menu holds no tab stops

09/17/2026: Pass

**Do:** narrow the window to phone width (under 768px — DevTools responsive
mode at 390px is fine). Leave the menu closed. `Tab` from the address bar five
times.

**Pass:** you reach the skip link, then the hamburger, then something in the page
content. Focus never vanishes.

**Fail:** focus disappears for several presses before reappearing. That is the
menu panel, hidden off the top of the screen but still in the tab order — the
exact bug this site had before September 2026.

*WCAG 2.4.3 Focus Order (A)*

### 2.4 Every page is reachable without a mouse

09/17/2026: Pass

**Do:** at phone width, `Tab` to the hamburger, press `Enter`. `Tab` to
"Lessons", press `Enter`. `Tab` to "Lesson Registration", press `Enter`.
Repeat for one item in each of the other groups.

**Pass:** each submenu opens on `Enter`, each link navigates.

**Fail:** a submenu that only opens on hover, or a group label that navigates
somewhere instead of opening.

*WCAG 2.1.1 Keyboard (A)*

### 2.5 Escape closes, and focus comes back

09/17/2026: Pass

**Do:** open the menu, open the "Lessons" group, `Tab` down to a link inside
it, then press `Escape`.

**Pass:** the menu closes and focus lands on a visible button — the hamburger
at phone width, the "Lessons" toggle at desktop width. Pressing `Tab` continues
sensibly from there.

**Fail:** focus is nowhere. Test this by pressing `Tab` straight after `Escape`:
if it jumps back to the very top of the page, focus was dropped to the document
body.

*WCAG 2.4.3 Focus Order (A)*

### 2.6 Navigating moves focus into the new page

09/17/2026: Pass

**Do:** follow any nav link with the keyboard. Once the new page loads, press
`Tab` once.

**Pass:** focus continues from the top of the new page's content, not from the
top of the navigation.

**Fail:** `Tab` puts you back on the skip link, meaning focus was dropped on
navigation and you have to walk through the whole menu again on every page.

*WCAG 2.4.3 Focus Order (A)*

### 2.7 Nothing traps the keyboard

09/17/2026: Pass

**Do:** `Tab` all the way through the home page, then Lesson Registration, then
Contact Us, until focus leaves the page and reaches the browser chrome. Pay
attention at the carousel, the embedded Google Form, and the embedded map.

**Pass:** you can always `Tab` forward out of every component, and
`Shift+Tab` back out of it.

**Fail:** focus cycles inside the carousel, the form or the map and cannot
escape. This is the most serious failure in this document — a keyboard user who
hits a trap cannot leave the page at all.

*WCAG 2.1.2 No Keyboard Trap (A)*

### 2.8 The carousel works from the keyboard

09/17/2026: Pass

**Do:** `Tab` to the carousel, then press `→` and `←`. Then `Tab` on to the
arrow buttons and the dots and press `Enter` on each.

**Pass:** the arrow keys move between photographs one at a time, landing
squarely on each. The buttons and dots do the same thing.

**Fail:** arrow keys scroll by an arbitrary amount and leave the track between
two photos, or the dots cannot be reached.

*WCAG 2.1.1 Keyboard (A)*

---

## Part 3 — Zoom, reflow and text spacing

### 3.1 200% zoom

09/17/2026: Pass

**Do:** at a normal desktop window size, press `Cmd +` until the browser reads
200%. Visit the home page, Lesson Info and the FAQ.

**Pass:** all text is still readable, nothing is clipped or overlapping, and the
purple bar does not sit on top of the page's first heading.

**Fail:** the navigation overflows its bar, or the first heading disappears
underneath it.

*WCAG 1.4.4 Resize Text (AA)*

### 3.2 400% zoom — one column, no sideways scrolling

09/17/2026: Fail, no scroll navbar
09/17/2026: round 2: Pass, navbar now part of main flow. had to sacrifice transition animation, can be added later with keyframes if desired.

**Do:** set the window to 1280px wide, then zoom to 400%. This is the standard
reflow test and is equivalent to a 320px-wide screen.

**Pass:** content reflows to a single column. You scroll **down** only.

**Fail:** a horizontal scrollbar appears, or you have to scroll sideways to read
a sentence. Tables, the embedded map and the embedded form are allowed their own
sideways scrollbar; the page body is not.

*WCAG 1.4.10 Reflow (AA)*

### 3.3 Text spacing

**Do:** open DevTools → Console, and paste this in on the home page:

09/17/2026: Issue testing, browser controls prohibited paste action

```js
document.head.insertAdjacentHTML('beforeend', `<style>
  * { line-height: 1.5 !important; letter-spacing: 0.12em !important;
      word-spacing: 0.16em !important; }
  p { margin-bottom: 2em !important; }
</style>`);
```

**Pass:** nothing is cut off, overlapped, or pushed out of its box. Text may
wrap differently and the page may get longer; that is expected.

**Fail:** text escaping a purple box, a button label clipped, or two elements
sitting on top of each other.

*WCAG 1.4.12 Text Spacing (AA)*

### 3.4 Tap targets on a real phone

**Do:** open the site on an actual phone, on the home page. Try to tap each
carousel dot, and each arrow, with a thumb.

**Pass:** each one responds, and you do not repeatedly hit the neighbouring dot.

**Fail:** you have to aim, or you keep hitting the wrong one. The automated
suite measures these at 24px, but the automated suite does not have thumbs.

*WCAG 2.5.8 Target Size Minimum (AA)*

---

## Part 4 — Colour, seen rather than computed

axe computes contrast where it can read both colours off the page. It cannot do
it where text sits on a photograph, because it does not know what the photograph
looks like. These are the gaps.

### 4.1 Links are not marked by colour alone

**Do:** DevTools → Console:

```js
document.head.insertAdjacentHTML('beforeend',
  '<style>*{filter:grayscale(1) !important}</style>');
```

Now read the FAQ, Lesson Registration and the footer.

**Pass:** you can still tell every link from the text around it, because it is
underlined.

**Fail:** any link that becomes invisible in greyscale.

*WCAG 1.4.1 Use of Colour (A)*

### 4.2 Text over photographs

**Do:** on the home page and Our History, step the carousel through **every**
photograph. Watch the caption, the arrows and the dots against each one. The
snowy, bright photographs are the ones to watch.

**Pass:** the caption text and the arrow glyphs stay clearly readable on every
photo.

**Fail:** any photo where the white text starts to disappear into the image.

*WCAG 1.4.3 Contrast Minimum (AA)*

### 4.3 Focus rings on every background

**Do:** repeat check 2.2, but this time note the *colour* of the focus ring
against what is behind it: the purple bar, the white panels, the purple panels,
and the photographs.

**Pass:** the ring is clearly visible in all four places.

**Fail:** a white ring on a near-white photograph, or a purple ring on the
purple stripe.

*WCAG 1.4.11 Non-text Contrast (AA)*

---

## Part 5 — Screen reader

09/17/2026: Kind of?? I'm probably using voice over wrong and I couldn't get it to list links. Most seems fine. 

Use **Safari with VoiceOver** on macOS: it is the best-supported pairing, and
it is already installed. `Cmd + F5` toggles VoiceOver on and off. The VoiceOver
keys — written `VO` below — are `Control + Option` held together.

If you have never used it, spend five minutes with `VO + →` to move through a
page before starting. The goal here is not to become fluent; it is to hear what
the site sounds like.

### 5.1 The page says which page it is

**Do:** load each page fresh (type the URL, press `Enter`).

**Pass:** VoiceOver announces the page title, and it is the right page.

**Fail:** every page announces the same title, or announces nothing.

*WCAG 2.4.2 Page Titled (A)*

### 5.2 The heading outline makes sense on its own

**Do:** press `VO + U` to open the rotor, then `←`/`→` to reach **Headings**.
Read the list on the home page, Lesson Info and the FAQ.

**Pass:** exactly one level-1 heading per page; the list reads as a sensible
table of contents; no level is skipped.

**Fail:** no h1, two h1s, or a jump from level 2 straight to level 4.

*WCAG 1.3.1 Info and Relationships (A)*

### 5.3 The link list is usable on its own

**Do:** rotor → **Links**. Read the list without looking at the page.

**Pass:** every entry tells you where it goes.

**Fail:** entries reading "here", "click here", "read more", or a web address
spelled out letter by letter. This is a content fix — the words come from the
Google Doc.

*WCAG 2.4.4 Link Purpose (A)*

### 5.4 Photographs describe themselves

**Do:** rotor → **Images**, on the home page, Our History and Become an
Instructor.

**Pass:** each description tells you what is in the photograph. The blurred
backdrop copies behind the carousel photos should be silent — they are
decoration and are correctly hidden.

**Fail:** a description reading "Img 4821" or "DSC 0001". The file name in Drive
*is* the alt text, so the fix is renaming the file — no developer needed.

*WCAG 1.1.1 Non-text Content (A)*

### 5.5 The carousel says where you are

**Do:** navigate into the carousel and move between photographs.

**Pass:** it announces itself as a carousel, and each photograph as "N of M".

**Fail:** silence, or all seven photographs read out as one run.

*WCAG 4.1.2 Name, Role, Value (A)*

### 5.6 The registration form is usable

**Do:** on Lesson Registration, navigate into the embedded Google Form. Move
through its fields.

**Pass:** you can reach the form, every field announces a label, and you can get
back out again.

**Fail:** unlabelled fields, or a trap. The form is Google's markup, not ours —
if it fails, the fix is the "open the form in a new window" link above it,
which is already there. Confirm that link works.

*WCAG 1.3.1 (A), 3.3.2 Labels or Instructions (A)*

---

## Part 6 — Motion

### 6.1 Reduced motion is respected

09/17/2026: Pass

**Do:** macOS → System Settings → Accessibility → Display → turn on **Reduce
motion**. Reload the site. Navigate between pages, and step the carousel.

**Pass:** pages appear without fading in, the carousel jumps rather than
sliding, and the menu opens without animating.

**Fail:** any animation still running.

*WCAG 2.3.3 Animation from Interactions (AAA — not required, but cheap and we
already do it)*

### 6.2 Nothing moves on its own

09/17/2026: Pass

**Do:** load the home page and leave it alone for a minute.

**Pass:** the carousel stays on the first photograph. Nothing auto-advances,
blinks or scrolls by itself.

**Fail:** anything that moves without being asked. If a future change adds
auto-advance, it needs a pause control to stay conformant.

*WCAG 2.2.2 Pause, Stop, Hide (A)*

---

## Recording the result

Copy this into the pull request, or into an issue if you are auditing `main`.

| Part | Checks | Result | Notes |
|---|---|---|---|
| 1 — Automated | 1.1 – 1.3 | | |
| 2 — Keyboard | 2.1 – 2.8 | | |
| 3 — Zoom & reflow | 3.1 – 3.4 | | |
| 4 — Colour | 4.1 – 4.3 | | |
| 5 — Screen reader | 5.1 – 5.6 | | |
| 6 — Motion | 6.1 – 6.2 | | |

Audited by: ______________  Date: ____________  Commit: ____________

A run with failures is a successful audit. A run with no failures and no notes
usually means a check was skipped — say which, rather than leaving it implied.

---

## If you only have ten minutes

The four checks that have historically caught real breakage here:

1. **2.3** — closed menu holds no tab stops
2. **2.7** — nothing traps the keyboard
3. **3.2** — 400% zoom reflows to one column
4. **5.3** — the link list is usable on its own

Run `npm run test:a11y` alongside them and you have covered most of the risk.
