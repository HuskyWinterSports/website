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
- **The refund policy has a hole in it.** On the Lesson Registration page, the
  section on injuries lists the same sentence twice, and as a result the case
  for *"injury before lessons start"* is missing entirely. **Someone needs to
  tell us what that policy actually is** so it can be written in.
- **Two different donation email addresses appear on the site.** The Diversity
  and Inclusion page says to Zelle `huskyws@gmail.com`; everywhere else uses
  `huskywslessons@gmail.com`. **Please confirm which is correct** — a wrong
  address here means donations go nowhere.
- **The site is slow to load**, especially on phones over mountain wifi. About
  half the download is two oversized photos, and a couple of files are
  accidentally sent twice.
- **Page links look like `huskywintersports.org/#/faq`.** The `#` makes it
  harder for Google to index our pages, so we lose search traffic from parents
  searching for ski lessons.
- **The Diversity and Inclusion page** still says "Under Construction" directly
  above a request for donations.
- A few typos: "Instrutors", "forrest service", a run-on sentence in the
  footer, and a broken Google Maps link on the Lesson Info page. One of our
  image files is also misspelled (`forrest_service.avif`). A dedicated typo
  pass covering both page text and file names is scheduled.
