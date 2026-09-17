# Website Changes — Plain-Language Log

A running record of changes people will actually *notice* on
huskywintersports.org. Written for club officers, not developers.

Newest entries at the top. Purely internal changes (build tooling, tests) are
listed at the bottom of each entry under "Behind the scenes" and can be skipped.

---

## 2026-09-17 — Accessibility overhaul

**Status:** ready to review, not yet live.

The site was audited against WCAG 2.2 AA — the accessibility standard most
public bodies and universities are held to. Everything below is either a fix
for something that failed, or a change that makes a failure harder to
reintroduce. Most of it is small and visible; one part is a thing officers can
now do themselves.

### 12. Links in body text are underlined now

**What was wrong:** Links were marked only by being purple. That is not enough
on its own — the standard asks that a link be distinguishable from the words
around it by something other than colour, unless the two colours are far enough
apart. Ours were not: the club purple against black body text measures 2.0,
where 3.0 is the minimum.

**Why this mattered:** Roughly one man in twelve has some form of colour vision
deficiency. For them, several of our links were simply not visibly links.

**What you'll notice:** Links inside paragraphs, in the FAQ and in the footer
are now underlined. Buttons are not — a button already looks like a button.
This is the most visible change in this batch and it does change the look of
text-heavy pages.

### 13. The keyboard outline is now visible everywhere

**What was wrong:** People who navigate with the Tab key rather than a mouse
need to see which item they are on. Ours was a thin purple or white line
depending on where you were, and over a photograph it disappeared entirely —
the carousel was the worst case.

**What you'll notice:** A blue outline with a thin white edge on each side,
the same everywhere on the site. The white edges are the point: they mean the
blue never sits directly against the page, so it stays visible on a white
panel, a purple stripe or a snowy photo alike. It only appears when navigating
by keyboard, so mouse users will not see it.

### 14. A "Skip to the main content" link

**What was wrong:** Ten navigation links sit between the top of every page and
its content. Anyone using a keyboard or a screen reader had to step through all
ten, on every single page.

**What you'll notice:** Nothing, unless you press Tab as a page loads — a
purple box appears at the top left. Press Enter and it jumps past the menu.
Press Tab again and it disappears.

### 15. The menu now pushes the page down instead of covering it

**What was wrong:** On a phone the menu appeared *over* the page. If the window
was short — a phone held sideways, or a visitor using large text — the bottom
of the menu ran off the screen and there was no way to scroll to it. Those
links could not be reached at all.

**What you'll notice:** Opening the menu pushes the page content down rather
than covering it, and you scroll the page normally to see the rest of the menu.

### 16. The carousel dots and arrows are easier to hit

**What was wrong:** The dots under the home page photos were 9 pixels across
and 9 pixels apart — well under the 24-pixel minimum the standard now sets, and
genuinely fiddly with a thumb.

**What you'll notice:** The dots look the same size but the area around each one
that responds to a tap is much larger, so you are far less likely to hit the
wrong photo.

### 17. Smaller things

- The **hover colour on buttons** was so pale that white text on it was
  unreadable. It is now a darker purple.
- The link above each **registration form** said "Click *here* to open the form
  in a new window." It now reads "**Open the form in a new window**" as one
  link. A screen reader user can call up a list of every link on a page; in that
  list, "here" told them nothing.
- Following a link now puts the keyboard cursor **at the start of the new
  page's content** rather than back at the top of the menu.

### 18. Two things an officer can now fix without a developer

The hourly sync now checks the words as well as the structure, and writes a
plain note in its log when it finds either of these:

- **A photograph still named the way the camera named it** — `IMG_4821.jpg` and
  the like. The file name in Drive *is* what a screen reader reads out in place
  of the picture, so that photo currently announces itself as "Img 4821".
  **Renaming the file in Drive to describe what is in it fixes it completely.**
- **A link whose words are "here", "click here" or "read more".** Rewriting it
  to name its destination — "read the refund policy" — is the whole fix, and it
  is done in the document.

Neither ever stops the site updating. They are notes, not errors.

### Behind the scenes

- An automated accessibility check now runs over every page on every change,
  including the hourly content updates, so a document edit cannot quietly
  reintroduce a problem this can see.
- The colours are defined once in one place rather than scattered across four
  stylesheets, with the measured contrast of each recorded beside it.
- `docs/accessibility-manual-audit.md` is a step-by-step script for the checks
  a machine cannot do — keyboard, zoom, screen reader — with a pass criterion
  for each. Worth re-running before any release that touches the menu, the
  carousel or the stylesheets.
- Fixed a bug where the navigation bar was 40 pixels wider than the window,
  which let the whole page scroll sideways.

### Still outstanding

- **The screen reader pass has not been completed.** Parts 1 to 4 and 6 of the
  audit passed; Part 5 was deferred. The carousel and the two embedded Google
  Forms are the most likely places for something to still be wrong.
- The keyboard checks were run in Chrome and in Safari **with "Press Tab to
  highlight each item on a webpage" switched on** — Safari ships with that off,
  and skips links entirely when it is.

---

## 2026-08-10 — Menu fixes

**Status:** ready to review, not yet live.

### 1. Four pages were impossible to reach on a phone. Now they work.

Review: phones do have a hover ability, the webpage was reachable on mobile.

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

**3. The refund policy named a lesson director who had already left the role**,
and told parents that person was "currently studying abroad".

**Fixed 11 August.** The page now says *"contact our lesson director"* and gives
the shared inbox. No name.

This is worth explaining, because it will come up again: a person's name in
body text is a fact with an expiry date, and nobody's job includes noticing when
it expires. Officers turn over every year. So any name on the site should either
be somewhere it can be updated in one place — which is where the next stage of
this work puts it — or not be there at all. *"Contact our lesson director"* is a
complete sentence and never goes stale.

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
2. Wait an hour or two.

That's genuinely it. Nobody touches GitHub, and there's nothing to press.

**You can't accidentally publish a half-finished edit.** The site checks the
document regularly, so in principle it could look while you were still
mid-sentence. It doesn't, because **a change has to still be there an hour
later before it goes live.** Type, delete, rewrite, walk away and come back
tomorrow — none of that reaches visitors. Only text you've left alone does.

This is why an edit takes an hour or two to appear rather than being instant.
If you need it sooner, there's a manual "update now" button on GitHub
(Actions → Sync content from Google → Run workflow), which skips the wait —
pressing it *is* you saying the text is ready.

**Don't change the "Automatically republish when changes are made" setting**
in the Publish dialog. It's on by default, and on is correct.

**You can keep extra tabs in the document** — drafts, planning, next season.
Only the tabs the website is built from are read. Anything else is ignored
completely and can't break a page.

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

### 11. Something now watches the website and emails us if it stops updating

**The problem it solves:** every failure in this system is *quiet*. The website
keeps working and keeps showing the last good version, which is the right
behaviour — but it means a broken update looks exactly like a week when nobody
edited anything. The worst case is the off-season: **GitHub switches off
automatic jobs after 60 days of nothing happening**, so a quiet summer can turn
the updates off, and in September someone edits the document and nothing
happens, forever, with no error anywhere.

**What's been written:** a small script that runs on the club's Google account,
once a day, and emails `huskyws@gmail.com` if:

- the automatic updates have been switched off — with the three clicks to turn
  them back on;
- an update failed — with a link to the plain-English explanation;
- nothing has run at all for two days;
- it has been unable to check for five days running.

**On a normal day it sends nothing at all.** No weekly summary, no "everything
is fine" — an inbox that gets routine mail from a robot stops being read, and
then the one message that mattered is invisible too. It won't repeat the same
complaint more than once a week either.

The one exception is that it says so when a problem clears, because silence
after a problem email is indistinguishable from the watcher itself having died.
That's the closing half of a message you already got, not a new one, and it can
be switched off.

**It needs about two minutes of setup on the club Google account** and is not
installed yet. Instructions are in `docs/content-sync-spec.md` §7.2. Nothing
about it involves a password or account key, same as the rest of this system.

**A calendar reminder is worth having as well**, independent of any of this:
one recurring event each September — *"Check the website is still updating
itself"* — on the club calendar. It costs nothing and doesn't depend on a
script anyone has to maintain.

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
