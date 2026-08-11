# Website Changes — Plain-Language Log

A running record of changes people will actually *notice* on
huskywintersports.org. Written for club officers, not developers.

Newest entries at the top. Purely internal changes (build tooling, tests) are
listed at the bottom of each entry under "Behind the scenes" and can be skipped.

---

## 2026-08-10 — Menu fixes

**Status:** ready to review, not yet live.

### 1. Four pages were impossible to reach on a phone. Now they work.

**What was wrong:** The menu's sub-items only appeared when you *hovered a
mouse over* them. Phones and tablets have no hover. So on a phone, tapping
"Lessons" jumped straight to the Lesson Info page and the sub-items never
appeared at all.

That meant these four pages could not be reached from the menu on a phone:

- **Lesson Registration**
- **Join Our Mailing List**
- **Diversity and Inclusion**
- **Contact Us**

Lesson Registration could still be found through one link buried in the FAQ.
The other three had no other way in at all — a visitor on a phone simply could
not get to them.

**Why this mattered:** Registration and the mailing list are the two things we
most want visitors to do, and most parents browse on their phone.

**What you'll notice:** On a phone, tap ☰, then tap "Lessons" (or "About Us" or
"Questions") and the sub-items now slide open.

### 2. The menu looks like a proper menu bar on computers

**What was wrong:** The site showed the ☰ hamburger button at every screen
size, including on a full desktop monitor. The code for a normal horizontal
menu bar existed but had been switched off.

**What you'll notice:** On a laptop or desktop, the menu is now a horizontal
bar across the top. On phones and small windows it stays as the ☰ button.

### 3. ⚠️ One deliberate change worth knowing about

Clicking the top-level words — **Lessons**, **About Us**, **Questions** — now
*opens the sub-menu* instead of jumping to a page.

Nothing became harder to reach: each of those pages was already the first item
in its own sub-menu (e.g. "Lessons" opens to reveal "Lesson Info" first).

We did it this way because mixing "hover to open" with "click to open" causes
the menu to flicker open and shut for mouse users, and it prevents the Esc key
from closing the menu. One consistent behaviour on every device is easier for
visitors and easier for whoever maintains this next year.

A side effect worth naming: on a computer, the sub-menus no longer open just by
resting the mouse over them — you click. This was reviewed and chosen
deliberately (2026-08-10) rather than happening by accident. It can be changed
back if the club prefers; it's a preference, not a technical limit.

### 4. Smaller improvements

- The menu now closes when you press **Esc** or tap anywhere outside it.
- The menu can be operated entirely by keyboard (Tab to move, Enter to open),
  which matters for visitors using screen readers or who can't use a mouse.
- **Image descriptions fixed.** Our partner logos in the footer were labelled
  "summit logo", "forrest service logo", and the HWS logo was labelled just
  "footer image". Screen readers read these aloud, so a blind visitor heard
  "footer image" instead of "Husky Winter Sports". They now read out properly
  as "The Summit at Snoqualmie", "United States Forest Service", and so on.
- **No more sideways scrolling** on desktop, caused by the menu bar being
  very slightly wider than the window.

### 5. The site is about four times smaller to load

**What was wrong:** Loading the site downloaded **4.7 MB**. Three separate
problems stacked up:

- Two large photos were saved at far higher quality than a screen can show —
  the group photo alone was 1.7 MB.
- Two files (the mountain background and the site icon) were accidentally
  being sent to visitors **twice**, because of how they were referenced.
- Both pages with a Google Form embedded the form **twice** — once sized for
  phones, once for computers — and hid one with a rule that hides it visually
  but does *not* stop it downloading. Every visitor fetched the whole form
  twice.

**What you'll notice:** The site now loads about **1.1 MB instead of 4.7 MB**,
roughly a quarter of what it was. This matters most on a phone on mountain
wifi, which is exactly where parents check lesson details.

The photos were re-compressed and measured to confirm no visible quality loss
(39 and 41 decibels PSNR — above about 38 is indistinguishable to the eye).

### 6. The home page now points at lessons, not just instructor recruiting

**What was wrong:** The only button on the home page said "BECOME AN
INSTRUCTOR". Most people arriving at the site are parents and adults looking
to book lessons, not UW students looking to join the club — so the one thing
we asked visitors to do was aimed at the smaller audience.

**What you'll notice:** Two buttons now, with **LESSON INFO** first, followed by
BECOME AN INSTRUCTOR. Both look the same; the ordering carries the priority.

When registration opens for a season, that first button should be repointed at
the registration page. There's a note in the code saying so.

### 7. ⚠️ The published refund policy was wrong in three places

The club supplied the authoritative refund policy, and the website did not
match it. All three are now corrected.

**1. The cancellation deadline was wrong by four days.** The page said
customers could cancel with no questions asked **by December 31st**. The actual
policy says **December 27th**. Any parent who cancelled on the 28th, 29th, 30th
or 31st would have been relying on our published date and then refused a full
refund. This is the most serious error found anywhere on the site.

**2. An entire refund case was missing.** The injuries section listed the same
sentence twice, and the effect was that **"Injury Before Lessons Start" never
appeared at all**. The real policy is an **80% refund** if the injury happens
within one month of the start date.

For clarity, since these two can look contradictory: cancelling *before* that
one-month window is a **full** refund under the December 27th clause. An injury
*inside* the window is **80%**. Different situations, different figures.

**3. The named lesson director was out of date**, and has been updated along
with the note that the director is currently studying abroad.

**Worth a club discussion:** the policy names a specific person and mentions
that person is studying abroad. Both facts expire with turnover, and this is a
document that ought to stay accurate for years. Using the role and the shared
inbox instead would mean one less thing for next year's officers to remember.

### 8. Page links are now normal web addresses

**What was wrong:** every page on the site had a `#` in its address —
`huskywintersports.org/#/faq` instead of `huskywintersports.org/faq`. Google
handles those poorly, so our pages were much harder to find by searching. And
every link shared to Facebook, Instagram or a group chat showed the same
generic preview no matter which page it pointed to.

**What you'll notice:**

- Addresses are now clean: **`huskywintersports.org/lesson-info`**.
- Sharing a link shows that page's own title, description and a photo, rather
  than one identical preview for the whole site.
- Each page now has its own description written for a parent searching
  something like "UW ski lessons for kids" — that's the grey text under a
  Google result.
- We now publish a sitemap, which is the standard way of telling search
  engines every page we have.
- Mistyped or outdated addresses show a friendly "Page Not Found" page with
  links onward, instead of a blank screen.

**Old links still work.** Any `#` link already sitting in an old mailing-list
email or Instagram post now redirects to the right page automatically. Without
that, they would have quietly dumped visitors on the home page — which looks
exactly like a broken link.

This was the last planned change to page addresses, so links shared from now on
are safe to put in print or on social media.

---

## 2026-08-11 — The Diversity and Inclusion page is now edited in Google Docs

### 9. "Under Construction" is gone, and that page's words now live in a Doc

**What was wrong:** the page said *"Under Construction! ദ്ദി（• ˕ •マ.ᐟ"* directly
above a request for donations, which undercuts the ask. More importantly,
changing a single word on it required a developer.

**What you'll notice:**

- The "Under Construction" line is gone. Everything else on the page reads
  exactly as it did before — same words, same order, same layout.
- The heading now reads **Diversity and Inclusion** rather than
  **DIVERSITY AND INCLUSION**. That matches the FAQ, Contact Us and Email List
  pages, which were already in ordinary capitals. **Say the word if you'd
  rather it stayed in capitals** — but then it's worth putting the other pages
  in capitals too, so the site is consistent either way.

**What changed underneath — this is the part that matters for the club:**

The words on that page are no longer typed into the code. They come from a tab
in the club's Google Doc on the shared Drive account. An officer edits the
document, presses **Publish**, and the site picks the change up.

- **You cannot break the page design by editing.** The document supplies words;
  the code supplies the layout. Colours, fonts and pasted-in formatting are
  ignored on purpose.
- **A mistake stops the update rather than publishing a broken page.** If a
  heading gets renamed or a section emptied, the site keeps showing the previous
  version and the error says, in plain English, which heading it couldn't find
  and what the document actually contains.
- **One document, one tab per page.** Adding a page later means adding a tab,
  not registering another document to keep track of.

> ⚠️ **One rule when editing the document:** use **Heading 1** for a page title
> and **Heading 2** for its sections. Do **not** apply the **Title** style
> yourself — Google uses that style to mark where each tab begins, so using it
> inside a page would cut that page in half.

### 10. Editing that page no longer needs a developer at all

The update now runs by itself, **every hour**. The whole procedure for changing
words on the Diversity and Inclusion page is:

1. Open the club's Google Doc, go to the **Diversity and Inclusion** tab, edit.
2. **File → Share → Publish to the web → Publish.** Saving alone does nothing —
   this button is what makes the change public.
3. Wait up to an hour.

That's it. Nobody touches GitHub.

**If you don't want to wait an hour**, there's an "update now" button — on
github.com, **Actions → Sync content from Google → Run workflow**. That's the
one step that needs a GitHub login, and it's optional.

**What happens if someone makes a mistake:** the update stops and the site keeps
showing the previous version. It does not publish a half-broken page. The most
likely mistake is renaming a heading, because heading names are how the site
knows which paragraph goes where — if that happens, the error says which
heading it was looking for and lists the ones the document actually has.

**No password or account key is involved anywhere in this.** That's deliberate:
anything that had to be renewed would eventually stop being renewed, and the
site would quietly stop updating with nobody knowing why.

**One gap worth naming:** if an update does fail, nothing emails anybody yet.
The failure is visible on GitHub, which is exactly where the people this is
designed for don't look. A small script on the club's Google account can watch
for that and email `huskywslessons@gmail.com`; it isn't built yet.

### Behind the scenes

- Added an automated test suite that opens the real site in simulated phone and
  desktop browsers and checks every page is reachable by tapping. This runs
  automatically on every proposed change. **It already caught two bugs in the
  menu fix above before anyone saw them.**
- Proposed changes are now checked automatically *before* they can go live.
  Previously any change went straight to the public site with nothing checking
  it first.
- Fixed three code warnings that had been failing quietly for some time.

---

## Known issues not yet addressed

Tracked in `ASSESSMENT.md` with full detail. The ones a non-technical reader
would care about:

- **The site still shows last season's information** — "2025/2026 dates",
  "lessons are now full", and "© 2025". Needs a content update for 2026/27.
- ~~The refund policy has a hole in it.~~ **Fixed — see below.**
- **Two different donation email addresses appear on the site.** The Diversity
  and Inclusion page says to Zelle `huskyws@gmail.com`; everywhere else uses
  `huskywslessons@gmail.com`. Believed correct as-is, but **worth one explicit
  confirmation** — a wrong address here means donations go nowhere.
- **The home page photo looks slightly soft on large monitors.** The photo is
  1701 pixels wide and gets stretched across the full width of the screen. This
  is a limit of the original photo, not of how we save it, and it was equally
  true before recent changes. **The fix is a higher-resolution original from
  the club photo archive** — ideally 2560 pixels wide or more.
- ~~Page links look like `huskywintersports.org/#/faq`.~~ **Fixed — see item 8.**
- ~~The Diversity and Inclusion page says "Under Construction" directly above a
  request for donations.~~ **Fixed — see item 9.**
- A few typos: "Instrutors", "forrest service", a run-on sentence in the
  footer, and a broken Google Maps link on the Lesson Info page. One of our
  image files is also misspelled (`forrest_service.avif`). A dedicated typo
  pass covering both page text and file names is scheduled.
