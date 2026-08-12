# Content Sync Spec — editing the website from Google Workspace

**Status: phase 1 is built and running**, as of 2026-08-11. Transport verified
(§4), tabs verified (§4.2b), parser and validation written, the hourly sync
running (§6), and `/diversity-and-inclusion` served from a document tab. Proven
end to end: an edit to the document reached the live site with nobody touching
GitHub.

**Waiting on the club, not on a developer:** install the watcher (§7.2), and
paste the remaining tabs from
[`doc-tabs-blockout.md`](doc-tabs-blockout.md).

**Next for a developer:** phase 2 — the Sheet (§5.4), then a page at a time as
its tab is filled in.

---

## 1. Why

Officers turn over annually and are not assumed to be technical. Today, changing
a lesson date means editing JSX, so every content edit is a code edit. The site
currently advertises the 2025/26 season, five months after it ended — the
problem is not hypothetical.

The club already runs on Google Workspace, and signup data (dates, prices,
capacity) already originates in spreadsheets during normal club operations.
Sourcing the site from there removes a re-typing step rather than adding a
system.

## 2. Principles

These are the tests any design decision gets judged against.

1. **The credential is optional, never load-bearing.** The club passes down a
   shared Google org account and a GitHub org account, so credentials do not
   die with a graduating student. Even so, no token may sit on the critical
   path. If a token lapses, the failure mode must degrade to *"edits go live
   within a few hours instead of instantly"* — never *"the site silently
   stopped updating."*
2. **Fail loudly, in words the person who broke it can act on.** The worst
   outcome is not a broken build. It is an officer editing a doc, seeing
   nothing happen, having no error to read and nobody to ask — which lands
   them back at "go find a CS major."
3. **Editors control words. Code controls layout.** Editors never choose block
   types, colours, or ordering. This is what stops a well-meaning officer from
   destroying the page design, and it is why the content lives in a doc but the
   *structure* stays in the repo.
4. **Every piece degrades to a plain file in the repo.** If Google, or this
   pipeline, or its author disappears, the content is still checked-in text
   that anyone can edit by hand.

## 3. Architecture

```
   ┌──────────────────────┐         ┌───────────────────────┐
   │  Google Doc          │         │  Google Sheet         │
   │  prose, per page     │         │  signup data          │
   └──────────┬───────────┘         └───────────┬───────────┘
              │  published, NO credential       │
              └────────────────┬────────────────┘
                               ▼
        ┌──────────────────────────────────────────┐
        │  GitHub Action                           │
        │    schedule:  (cron)                     │
        │    workflow_dispatch:  (manual button)   │
        │    repository_dispatch:  (optional)  ◄───┼──── Apps Script
        │                                          │     "Publish now"
        │  fetch → parse → VALIDATE → commit       │     (PAT, optional
        │                          → build → deploy│      accelerator)
        └──────────────────────────────────────────┘
                               │
                               ▼  on failure
        ┌──────────────────────────────────────────┐
        │  Apps Script polls the public Actions    │
        │  API (no credential) and emails the club │
        └──────────────────────────────────────────┘
```

The only path that requires a token is the optional "Publish now" accelerator.
Remove it entirely and the system still works, just on cron latency.

## 4. Transport — ✅ VERIFIED 2026-08-10

**Result: only "Publish to the web" URLs work unauthenticated. Every
`export?format=*` endpoint returns a Google sign-in page.**

| # | URL | Result |
|---|---|---|
| 1 | `/document/d/<id>/export?format=md` | ❌ sign-in page |
| 1b | `/document/d/<id>/export?format=txt` | ❌ sign-in page |
| 1c | `/document/d/<id>/export?format=html` | ❌ sign-in page |
| 3 | `/document/d/e/<pubId>/pub` | ✅ **HTML, 143 KB** |
| 4 | `/spreadsheets/d/<id>/gviz/tq?tqx=out:csv` | ❌ sign-in page |
| 4b | `/spreadsheets/d/<id>/export?format=csv` | ❌ sign-in page |
| 6 | `/spreadsheets/d/e/<pubId>/pub?output=csv` | ✅ **clean CSV** |

The three failing doc endpoints returned byte-identical 8.9 KB bodies
containing `accounts.google`, `Sign in` and `Error` — the false positive this
script exists to catch, and one a logged-in browser would have hidden.

**Consequences:**

- **Sheets are solved.** `/pub?output=csv` returns exactly what we want:
  `cell a1,cell b1` / `"cell a2, should export as csv?",` — correct quoting of
  embedded commas included.
- **Docs take the HTML path**, i.e. the middle option below, not the easy one.
  Google's published HTML is semantic at the *tag* level (`h1`–`h6`, `p`, `ul`,
  `ol`, `a`) but styles via generated class names (`c0`, `c2`) defined in an
  inline `<style>` block. **Those class names regenerate on every republish, so
  the parser must map by tag and never by class.** The 143 KB is mostly
  Google's `publish_binary_core` JS bundle wrapped around the content, so the
  parser must locate the content container rather than treating the document as
  a whole.
- Bold and italic are the one real complication: they are `<span class="cN">`
  where `cN` resolves to `font-weight:700` in the `<style>` block. Supporting
  them means resolving that mapping per fetch. The site does use bold in body
  copy, so this is required, not optional.

### 4.1 Observed markup contract — verified 2026-08-10

Measured against a real doc containing every construct we need. **The parser is
now unblocked.**

| Construct | Google emits | Parser rule |
|---|---|---|
| Content region | `<div id="contents">` | Parse **only** inside this. Everything outside is Google's banner and JS bundle. |
| Heading 1/2/3 | `<h1 class="c5">`, `<h2 class="c6">`, `<h3 class="c13">` | Real semantic tags. **Match on tag, ignore the class.** |
| Paragraph | `<p class="c1">` | → block body paragraph |
| Bulleted list | `<ul class="c0 lst-kix_… start">` + `<li class="c3 c4 li-bullet-0">` | → `ul` / `li` |
| Numbered list | `<ol class="c0 lst-kix_… start" start="1">` | → `ol` / `li` |
| Link | `<a class="c11" href="…">` | See §4.2 — **must unwrap** |
| **Bold** | `<span class="c7">`, where `.c7{font-weight:700}` | Resolve from `<style>`, see below |
| *Italic* | `<span class="c10">`, where `.c10{font-style:italic}` | Resolve from `<style>` |

**Class numbers are arbitrary and regenerate on republish.** `c7` meaning bold
is true of *this* fetch only. The parser must read the inline `<style>` block,
build a map of `className → {bold, italic}` by looking for `font-weight:700`
and `font-style:italic`, and apply that map per fetch. Hard-coding `c7` would
work in testing and break silently the first time an officer edits the doc.

### 4.2 ⚠️ Links are wrapped, and this matters more than it looks

Google rewrites every hyperlink through a redirector:

```
https://www.google.com/url?q=https://google.com/&sa=D&source=editors
       &ust=1786416850508734&usg=AOvVaw39JV…
```

The parser **must** extract the `q` parameter and discard the wrapper. Two
independent reasons, the second of which is easy to miss:

1. Site links would otherwise bounce visitors through Google, which is slower,
   leaks referrer data, and looks untrustworthy in a status bar.
2. **`ust` is a timestamp and `usg` is a signature — both change on every
   republish.** Left in, the generated content would differ on *every single
   sync* even when nobody edited anything. That silently defeats the "diff, and
   exit without committing if unchanged" step in §6, producing a junk commit
   every cron run and burying real content changes in noise.

Reason 2 is a good argument for a broader rule: **the parser must be
deterministic given identical document content.** Anything Google varies per
request has to be stripped, or the no-op detection is worthless.

### 4.2b Document tabs — ✅ VERIFIED 2026-08-11

Google Docs tabs let one document hold one tab per page, which is a real win
for turnover: **one publish-to-web registration to keep alive instead of one
per page.** A future officer who recreates a document and forgets to publish it
breaks one thing, not eight.

Two measured facts govern how they are read:

| Question | Answer |
|---|---|
| Can a single tab be fetched? | **No.** `/pub?tab=t.0` and `?tab=t.1` return the identical, complete document. The parameter is ignored. |
| How is a tab boundary marked? | A Title-styled paragraph carrying the tab's name: `<p class="c10 title">Lessons</p>`, immediately before that tab's content. |

So every tab always arrives in one flat stream and splitting them is entirely
our problem. `title` is a *semantic* class, unlike the regenerated `cN`
numbers — the parser keys on it and only on it, and
`tests/tabs.test.js` proves that by renaming every `cN` class in a captured
three-tab response and asserting the output is unchanged.

**A tab name is not page content.** It is the label in the Docs sidebar. It is
consumed as the boundary and never rendered, or the page title would appear
twice.

**Scoping matters for more than tidiness.** Heading 2 names are the join key
(§5.3). Without tab scoping, a `How to Donate` section on two different pages
would collide. With it, each page's layout names its `tab`, and the join only
ever sees that tab's sections.

> ⚠️ **The Title paragraph style is reserved for tab names.** It is an ordinary
> paragraph style, so applying it inside a tab's body would forge a boundary —
> splitting the tab in two and silently dropping everything after it. Nothing
> in the markup distinguishes the two cases, so the sync prints the tab names
> it found on **every run**. A tab nobody created appearing in that list is the
> symptom. Use Heading 1 for a page title and Heading 2 for its sections;
> never Title.

A layout with no `tab` reads the whole document, which is what a document
without tabs looks like. Existing single-page documents keep working unchanged.

**Unused tabs cost nothing, deliberately.** Only the tab a layout names is
read; the rest are never parsed for content at all. So officers can keep draft,
planning and next-season tabs in the same document without any risk of warning
noise, a broken build, or a heading leaking into another page. That is a
promise made to the club, so `tests/tabs.test.js` asserts it rather than leaving
it as a property of the current implementation. Note the contrast with an
unused **section inside a tab that is in use**, which logs a NOTE — harmless,
but it does appear.

### 4.3 `output=` is ignored for Docs

Tested at the club's suggestion: `/pub?output=md`, `?output=txt` and
`?output=html` all return `text/html` at ~149 KB, byte-differing only in
nonces inside the JS bundle. Sheets honour `output=csv`; **Docs do not honour
`output=` at all.** There is no Markdown escape hatch on the published path.

**If HTML parsing proves too fragile**, the documented fallback is an Apps
Script Web App returning clean JSON (see the original decision rule below). It
needs one-time setup but eliminates the span-soup entirely. Recommendation:
attempt HTML first, since it needs no extra setup, and fall back only if bold
and italic resolution proves unmaintainable.

<details>
<summary>Original (pre-verification) decision rule, kept for context</summary>

### Original section — UNVERIFIED, BLOCKED IMPLEMENTATION

Everything else in this spec is stable regardless of how bytes get out of
Google. This section is not, and it must be settled empirically before code is
written.

**"Publish to the web" and "Share with link" are different mechanisms with
different URL shapes, and export endpoints behave differently between them.**
Do not assume; measure.

### Test matrix

Create one throwaway Doc and one throwaway Sheet in the shared org account.
Apply *both* sharing modes to each, then record the result of every row:

| # | URL | Sharing mode | Want |
|---|---|---|---|
| 1 | `/document/d/<id>/export?format=md` | link-shared | 200, `text/markdown` |
| 2 | `/document/d/<id>/export?format=md` | published | 200, `text/markdown` |
| 3 | `/document/d/e/<pubId>/pub` | published | 200, what HTML shape? |
| 4 | `/spreadsheets/d/<id>/gviz/tq?tqx=out:csv&sheet=<name>` | link-shared | 200, `text/csv` |
| 5 | `/spreadsheets/d/<id>/gviz/tq?tqx=out:csv&sheet=<name>` | published | 200, `text/csv` |
| 6 | `/spreadsheets/d/e/<pubId>/pub?output=csv` | published | 200, `text/csv` |

Record **status, final URL after redirects, `content-type`, and the first 40
lines of body** for each. Crucially, test from a context with **no Google
session** (`curl` from CI, not a logged-in browser) — a browser that is signed
into the org account will happily return 200 for URLs that are closed to the
public.

Verification script: `scripts/verify-transport.sh` (to be written alongside).

### Decision rule

- **If row 1 or 2 returns real Markdown unauthenticated** → use it. Markdown
  maps cleanly onto headings, bold, links and lists, and needs no sanitizer.
  This is by far the best outcome and makes §5 trivial.
- **Else if row 3 works** → parse the published HTML. Google's export HTML is
  `<span>`-soup with inline styles and regenerated class names, so this
  requires a sanitizer that maps a small allowlist (h2/h3/p/ul/ol/a/strong/em)
  and *drops everything else*. More code, more fragility, still workable.
- **Else** → fall back to an **Apps Script Web App** deployed from the org
  account as "execute as me, anyone with the link", returning clean JSON via
  `DocumentApp`. No token, clean structure. Two footguns to spec if we go here:
  - Web Apps **302 to `googleusercontent.com`**; the fetcher must follow
    redirects.
  - **Deployments are versioned.** Editing the script does *not* change what
    the URL serves until it is redeployed. That is a silent-staleness trap and
    directly violates principle 2, so it would need the script to return its
    own deployment timestamp and the build to warn when that goes stale.

Sheets are expected to be the easy half; Docs are where this can actually fail.

</details>

## 5. Content model

### 5.1 Layout lives in the repo

One file per page. Editors never touch these.

```jsonc
// content/diversity-and-inclusion.layout.json
{
  "route": "/diversity-and-inclusion",
  "source": { "kind": "google-doc", "id": "<doc id>" },
  "blocks": [
    { "section": "Diversity and Inclusion",  "type": "big-white-box" },
    { "section": "Support Our Instructors",  "type": "white-stripe"  },
    { "section": "Donate",                   "type": "white-stripe"  },
    { "type": "button", "label": "DONATE VIA BENEVITY", "href": "https://..." }
  ]
}
```

`type` is drawn from the existing CSS vocabulary already documented in the
README — `white-stripe`, `purple-stripe`, `big-white-box`, `big-purple-box`,
`cards`, `boxes`, `button`. No new design language is introduced.

A block with no `section` (like `button`) takes its content from the layout
file itself, not the doc. That is how the Benevity button gets added without
an editor needing to express "a button" inside a Google Doc.

### 5.2 The doc convention

Deliberately minimal, because every rule is a rule an officer can get wrong:

| In the doc | Means |
|---|---|
| **A tab** | One page. Its name is the join key for the page. See §4.2b. |
| **Heading 1** | Page title. One per tab. |
| **Heading 2** | Starts a new block. **Its text is the join key.** |
| **Heading 3** | A subheading inside the current block. |
| Paragraphs, **bold**, *italic*, links, bulleted and numbered lists | Rendered as-is. |
| **Title** style | ⚠️ Reserved — Google uses it to mark tabs. Never apply it by hand. |
| Anything else — colours, fonts, sizes, images, tables | **Silently dropped.** |

That last row is a feature: it is what stops pasted-in formatting from wrecking
the site design.

### 5.3 The join key is the known weak point

Heading text is both the join key *and* prose, so editors will eventually
rename one and silently orphan a block. **We are not solving this with a
cleverer key** (hidden IDs, bookmarks, comments) — every such scheme adds a
rule that an officer can violate without noticing, and makes the doc look
alarming to a newcomer.

We solve it by failing loudly with an actionable message. See §7.

### 5.4 Sheets schema

Three tabs, one concern each. Column headers are the contract.

**`status`** — key/value, the things that change most often:

| key | value |
|---|---|
| `season_label` | `2026/27` |
| `registration_state` | `open` \| `waitlist` \| `full` \| `not_yet_open` |
| `ski_state` | `full` |
| `snowboard_state` | `open` |
| `lesson_start_date` | `2027-01-16` — the first teaching day |
| `refund_deadline` | `2026-12-16` — see below |
| `lesson_director` | the role holder's first name, or blank |

**`lesson_director` exists because a name in body text is a fact with an expiry
date.** The previous director's name was still published in three places after
they left the role, alongside a sentence saying they were studying abroad.
Nobody's job included noticing. Officers turn over every year, so any personal
name on the site has to be a value someone updates in one place — or absent.
Blank must be legal, and the page must read correctly without it: "contact our
lesson director" is a complete sentence.

**`refund_deadline` is derived, then overridable.** The published policy defines
it as *one month before the lessons' scheduled start date*, so the sync computes
`lesson_start_date` minus one month and uses that unless `refund_deadline` is
filled in. Two reasons not to make it purely computed:

- A policy deadline is a commitment to parents. An officer must be able to state
  it outright rather than trust arithmetic they cannot see.
- Clubs round. "December 31st" is a deadline a family remembers; "December 16th"
  is what the arithmetic gives for a mid-January start.

✅ **Settled 2026-08-11: lessons start the LAST weekend in January.** An earlier
"third weekend" was a slip. That reconciles everything — the Lesson Info page's
Jan 31 start was right, and Dec 31 really is one month before it.

It also demonstrates why the deadline is derived rather than typed. For 2026/27
the last weekend of January is **Jan 30–31, 2027**, so one month before is
Dec 30 — and the club will want to publish **Dec 31**, because that is the date
a family remembers. Arithmetic gets it within a day; a human picks the day.
Hence: compute from `lesson_start_date`, let `refund_deadline` override.

This is exactly the class of error one cell fixes. Three places stated this
date, two of them implicitly, and nobody could see they disagreed.

**`dates`**:

| session | lesson | dates |
|---|---|---|
| A | 1 | Jan 31st & Feb 1st |

**`prices`**:

| lesson_type | weeks | price |
|---|---|---|
| Group | 3 | 240 |

`registration_state` is the single source of truth for the "lessons are full /
join the waitlist" copy that currently contradicts itself between two paragraphs
of the same page. The site picks the sentence; the sheet picks the state.

### 5.5 Explicitly out of scope for now

Template slots — `"Registration opens on {LESSON_START_DATE}"` — are
**deferred**, per the club's call to keep the first version simple. Nothing here
precludes them: prose already comes from Docs and values already come from
Sheets, so slots are a later substitution pass over block text, not a
re-architecture.

## 6. Pipeline — ✅ IMPLEMENTED 2026-08-11

`.github/workflows/sync-content.yml`, triggered three ways:

```yaml
on:
  schedule:    [{ cron: '17 * * * *' }]   # hourly; see cadence note
  workflow_dispatch:                       # manual "update now" button
  repository_dispatch:                     # optional Apps Script accelerator
    types: [content-updated]
```

Steps:

1. **Fetch** each source. Any non-200, wrong content-type, or empty body →
   **fail**, do not proceed.
2. **Parse** into the block structure of §5.
3. **Validate** against a JSON Schema: every `section` named in a layout file
   exists in its doc; every sheet has its required columns; `registration_state`
   is one of the permitted values; no block body is empty.
4. **Diff.** If nothing changed, exit successfully without committing. This
   keeps history readable and avoids an empty commit every hour.
5. **Commit** the generated `content/*.json` to `main` with a message naming
   what changed.
6. Existing build/test/deploy runs as it already does — including the browser
   test suite, so a content change that breaks the site is caught before deploy.

### 6.1 ⚠️ Step 6 does not happen by itself

Step 5 pushes with `GITHUB_TOKEN`, and **a commit pushed with `GITHUB_TOKEN`
does not trigger further workflows.** GitHub blocks that deliberately, to stop
workflows looping. So the obvious implementation — "commit to main and let the
existing deploy pick it up" — produces a repository whose content is current
and a website that never changes. Every run reports success.

That is the §7.3 failure exactly, arrived at from a direction the spec did not
anticipate: not a pipeline that stopped running, but one that runs perfectly
and deploys nothing.

The fix is that `deploy.yml` gained a `workflow_call:` trigger, and the sync
calls it explicitly with `ref: main` once the content commit is pushed. Two
details that are easy to get wrong:

- **`ref: main` is load-bearing.** A scheduled run's default checkout SHA is
  main *as it was when the run started* — before the content commit. Building
  that would deploy the old content and pass.
- **`github.event_name` inside a called workflow is the caller's event**, so
  deploy's "only deploy real pushes to main" guard could no longer test for
  `push`. It now excludes `pull_request` instead, which is what it always meant.

`deploy.yml` also gained a `concurrency` group per ref. Two overlapping deploys
publish whichever finishes last, so a slower older build can overwrite a newer
one — and since the sync only deploys when content *changed*, the next hourly
run would find nothing to do and never correct it. Stale forever, silently.

**Cadence:** hourly is a starting point. The real question is the acceptable
staleness window during registration season, when a "we just filled up" edit is
time-sensitive. If hourly proves too slow, that is precisely what the optional
"Publish now" accelerator is for — and note it can be added later without
changing anything else.

**Content is committed, not fetched at runtime.** The site stays a static build
with no dependency on Google being reachable when a visitor loads the page, and
every content change is an ordinary reviewable commit that can be reverted.

## 7. Failure handling

This section is the whole point. Design it first, not last.

### 7.1 The messages

Every validation failure must name the file, the thing that is wrong, and the
two ways to fix it. The target reader is an officer with no technical
background.

> **The section "LOGISTICS" was not found in the Lesson Info document.**
>
> The document currently contains these sections:
>   • Welcome
>   • Logistics and Scheduling
>   • Group Lessons
>
> This usually means a heading was renamed. Either:
>   1. Rename the heading in the document back to "LOGISTICS", or
>   2. Ask a developer to update `content/lesson-info.layout.json`.
>
> The website has not been changed. It is still showing the previous version.

That last line matters as much as the rest: it tells a worried officer that
nothing is broken in public.

### 7.2 Getting the message to a human who doesn't use GitHub

GitHub notifies on failed workflows — but only people who watch the repo, which
is exactly the population we are designing *around*.

**Mechanism: an Apps Script in the org account polls the public Actions API and
emails the club.** Because the repository is public, `api.github.com/repos/
HuskyWinterSports/website/actions/runs` is readable **with no credential at
all**. A time-driven trigger checks for a failed run and emails
`huskyws@gmail.com` with the message from §7.1.

This satisfies principle 1: no token anywhere, and it works even if the sync
itself is completely broken, because it is an independent watcher.

#### ✅ Written 2026-08-11 — `scripts/watcher/sync-watcher.gs`

Verified against the real unauthenticated API: `/actions/workflows/<file>`
exposes `state`, `/repos/<repo>` exposes `pushed_at`, and
`/actions/workflows/<file>/runs` exposes `status`, `conclusion`, `created_at`
and `html_url`. All readable with no token.

It reports four things, and stays quiet otherwise:

| Condition | Why it is not obvious | What the email says |
|---|---|---|
| Workflow `state` is not `active` | §7.3 route 3 — no error exists anywhere | Nothing is broken; here are the three clicks to switch it back on |
| Last completed run failed | Officers do not watch the repo | The site still shows the previous version; here is the run to read |
| Nothing succeeded in 48h | A dead cron looks like a quiet week | Edits are probably not reaching the site |
| Cannot reach GitHub for 5 days | Being blind is itself a fault | The site is probably fine; the check is not |

**There is no heartbeat, no digest, and nothing on a healthy day.** At the
club's request (2026-08-11), it sends mail only when a person is needed. An
inbox that receives routine mail from a robot stops being read, and then the one
message that mattered is invisible too.

A 45-day "GitHub is about to switch this off" pre-warning is implemented but
**off by default** (`WARN_BEFORE_CUTOFF`), because it fires while everything is
working. The cost of leaving it off is small: if the schedule is switched off,
the first check above catches it, and in the quiet months when that can happen
nobody is editing anyway.

Three properties that matter more than the checks themselves:

- **It says when things recover.** Silence after a problem email is
  indistinguishable from the watcher having died.
- **It re-nags at most weekly per problem.** A daily email about a known
  problem gets filtered, and then the next real one is invisible too.
- **Losing contact with GitHub is not a fault.** Apps Script shares outbound
  addresses, so the unauthenticated rate limit can be exhausted by an unrelated
  script. It stays silent for four days, then reports *being blind* as the
  problem — and never reads a blind day as "all clear".

The decision logic is tested in `tests/sync-watcher.test.js` against stubbed
Apps Script services. A watcher that never emails looks exactly like a website
that never breaks, so "it seems fine" is not evidence about this file.

**Install (once, on the shared Google account — about two minutes):**

1. Go to <https://script.google.com> signed in as the club account.
2. **New project**. Name it `Website update watcher`.
3. Replace the contents of `Code.gs` with `scripts/watcher/sync-watcher.gs`
   from this repository. Save.
4. Choose `testWatcherNow` from the function dropdown and press **Run**.
   Approve the permission prompt — it asks to send mail as the club account and
   to fetch a web page, which is all it does. **Check the email arrived.**
5. Left sidebar → **Triggers** (clock icon) → **Add Trigger**:
   function `checkWebsiteUpdates`, event source **Time-driven**, type **Day
   timer**, any hour. Save.

If the club account's address ever changes, `NOTIFY` at the top of the script
is the only thing to edit.

### 7.3 Staleness is a failure too

A pipeline that stops running looks identical to a pipeline with nothing to do.
The same watcher must alert if no successful run has occurred in 48 hours.
Without this, "silently stopped updating" is still reachable.

Three concrete routes into that state, all found while implementing §6. Two are
now closed in code; the third cannot be:

1. **Committed but never deployed** — `GITHUB_TOKEN` pushes do not trigger
   workflows. Closed by the explicit `workflow_call` (§6.1).
2. **Deployed once, failed, never retried** — a transient deploy failure leaves
   the content commit on `main`, so every later run regenerates identical JSON,
   diffs clean, skips the deploy and reports success. Closed by making
   `workflow_dispatch` deploy unconditionally, so "update now" is also the
   recovery lever §9.3 otherwise lacked.
3. **⚠️ GitHub disables the schedule.** Scheduled workflows in a public repo
   are switched off automatically after **60 days with no repository
   activity**. A quiet off-season — nobody edits the doc, so the sync makes no
   commits, so there is no activity — disables the cron. In September an
   officer edits the doc and nothing happens, permanently, with no error
   anywhere. GitHub emails repository admins beforehand with a re-enable link,
   which is worth exactly as much as whether a graduating student's
   notifications are still being read.

Route 3 cannot be fixed from inside the repository: any workflow that commits
to keep the repo "active" defeats the point of the diff-and-skip step and
buries real changes. **It is the strongest argument for the §7.2 watcher**,
which lives on the club's Google account and does not care whether GitHub is
still running anything.

**Detection is the right goal here, not prevention.** A schedule that switches
itself off after two months of a genuinely dormant site is not misbehaving; the
only real failure is nobody noticing. The watcher reads workflow `state`
directly, so it reports route 3 as a fact rather than inferring it, and warns
at 45 days so the club can act before the cutoff rather than after.

Note that the sync's own commits reset the inactivity clock, so an active
season never approaches it — verified: the bot's content commit updated the
repository's `pushed_at`. The exposure is exactly the quiet off-season.

## 8. Phasing

### Phase 1 — Proof of concept: one page, end-to-end, from a Doc

**Page: Diversity and Inclusion.** Chosen because it is the smallest page, it
already needs rewriting, and it is where the Benevity donation button is going —
so the PoC delivers something the club actually wants rather than a throwaway.

Deliverables: transport verified (§4), one layout file, the doc parser, schema
validation, the failure messages, the Action, and the officer runbook.

> **Note on ordering:** this deliberately tackles **Docs before Sheets**, which
> is the reverse of easiest-first. Sheets→CSV is well-understood and low-risk;
> Docs→structured-blocks is where this design can actually fail — the parse, the
> heading convention, and whether a non-technical officer can operate it. A PoC
> that proved the easy half would teach us nothing about the hard half.

**Success criterion:** an officer who has never seen the repo edits the doc,
and the change is live within the cron window without anyone touching GitHub.
Test this with a real officer, not by assuming.

**Status 2026-08-11: complete, pending one real-officer test.**
`/diversity-and-inclusion` is served from `content/diversity-and-inclusion.json`,
generated from the `Diversity and Inclusion` tab, and the pull runs hourly
without anyone touching GitHub (§6). The page reproduces the previous one
exactly, minus the "Under Construction" line.

The success criterion above says to test this with a real officer rather than
by assuming. **That has not been done, and it is the only thing left in
phase 1.** Hand the runbook (§9.2) to someone who has never seen the repo,
have them change a word, and watch whether it appears without help.

Not yet built, and the remaining gap in "never silently stale": the **email
watcher** of §7.2 and §7.3. A failed sync currently shows a red X in the Actions
tab and a plain-language explanation on the run summary — which nobody who
does not use GitHub will ever look at.

### Phase 1b — Flesh out the source document

**Owner: the club, not the developer.** The document now has one tab per page.
The Diversity and Inclusion tab is at parity with the old hand-written page and
needs real content; the other tabs are scaffolding.

What each tab needs:

1. **One Heading 1** — the page title.
2. **A Heading 2 per section.** These are the join keys, so prefer stable
   structural names over ones that read like prose; renaming one later breaks
   the sync until someone renames it back or edits the layout. Suggested:
   `Support Our Instructors`, `Where Your Donation Goes`, `How to Donate`.
3. Body text under each, using only Heading 3, paragraphs, bold, italic, links,
   and lists. Everything else is dropped by design (§5.2).

Housekeeping: **delete the `Tab 3` draft.** It carries an unresolved question
(`[CONFIRM: huskyws@gmail.com or huskywslessons@gmail.com]`) that will be lost
once nobody reads that tab — it is listed below instead.

Content decisions the club still owes:

- Whether "Under Construction" goes away entirely. The page currently asks for
  donations directly beneath that banner, which undercuts the ask.
- The 501(c)(3) tax-deductibility wording.
- Confirmation of the Zelle address (`huskyws@gmail.com` on this page vs
  `huskywslessons@gmail.com` everywhere else).
- Whether the Benevity URL should be officer-editable. **As specced it is a
  `button` block in the layout file, so changing it needs a developer.** If the
  club would rather control it themselves, it belongs in the Sheet instead —
  worth deciding before phase 2, not after.

### Phase 2 — Sheets, and the rest of the pages

Signup data (dates, prices, status), then Lesson Info, Lesson Registration, FAQ,
Become an Instructor, Contact Us. Lesson Info and Lesson Registration mix prose
and tabular data, so they interleave doc-sourced and sheet-sourced blocks in one
layout file — which the per-block `source` design already allows.

**[`doc-tabs-blockout.md`](doc-tabs-blockout.md) is the paste-ready text** for
every remaining tab, drawn verbatim from the live pages, with the split against
Sheets already drawn and the known content bugs flagged inline rather than
copied across.

**Layout files are added one page at a time, as each tab is filled in.** Not
up front: `npm run sync` runs hourly against a live site, so a layout naming a
tab that does not exist yet would fail every hour, and a watcher that cries
wolf every hour is a watcher nobody reads. A tab with no layout is free; a
layout with no tab is not.

The one renderer gap is a **card-grid block type**, needed by Home's "Why Us",
Lesson Info's "Levels" and the never-written events grid on Become an
Instructor. One block type covers all three.

### Phase 3 — Deferred

Template slots (§5.5). The "Publish now" accelerator, if cron latency proves
annoying.

## 9. Runbooks

### 9.1 One-time setup (current admin)

1. Create the Docs and Sheet in the **shared org account**, never a personal one.
2. Apply the sharing mode determined by §4.
3. Record every document ID in the layout files.
4. Deploy the failure-watcher Apps Script from the org account.
5. **Write the IDs and the Apps Script location into the club's handover
   document.** A pipeline whose inputs nobody can find is a pipeline that gets
   abandoned.

### 9.2 Annual (incoming officers)

**To change words on the website:**

1. Open the club's Google Doc on the shared Drive account.
2. Pick the tab for the page you want to change. Edit the words.
3. Wait up to an hour. The site updates itself.

**Press Publish when you are finished editing.** Under **File → Share →
Publish to the web → Published content & settings**, **untick "Automatically
republish when changes are made"**. See §9.2c for why — this reverses the
advice given earlier the same day.

**You may keep extra tabs** for drafts, planning or next season. Only the tabs
the website is built from are read; anything else is ignored completely and
cannot break a page (§4.2b).

**To skip the wait**, on github.com: **Actions → Sync content from Google →
Run workflow**. This needs a GitHub account with access to the repository, and
is the only step in normal operation that touches GitHub at all.

**The rules, all of them:**

- **Heading 1** is a page title, **Heading 2** starts a section. Never apply
  the **Title** style yourself — Google uses it to mark where each tab starts.
- **Renaming a Heading 2, or renaming a tab, breaks that page's update** until
  someone renames it back or a developer updates the layout file. The site
  keeps showing the previous version in the meantime; nothing breaks in public.
- Colours, fonts, sizes, images and tables are ignored on purpose. You cannot
  wreck the page design by editing.

### 9.2c ⚠️ Auto-republish OFF — the Publish button is the deploy button

**This reverses the advice in the first version of §9.2**, which said to leave
auto-republish ticked. The club asked the question that changes the answer:
*what happens if the cron fires while someone is halfway through an edit?*

With auto-republish on, it publishes the half-finished state. Two outcomes,
and the second is the bad one:

- The intermediate state is **structurally broken** — a heading not yet
  retyped. The sync refuses, the site is untouched, an email goes out. Noisy
  but safe.
- The intermediate state is **structurally valid and half-written** — a
  sentence stopping mid-clause, a paragraph deleted but not yet replaced. The
  sync sees nothing wrong, because nothing *is* wrong structurally. **It goes
  live.** No validation can catch this; "is this prose finished?" is not a
  property of the text.

Turning auto-republish off makes **Publish an explicit act of intent**. Editing
freely has no effect on the site. Pressing Publish says "this version is
ready." That is exactly the button the club asked for, it already exists, and
it is in the document they are already looking at — no new mechanism, no
credential, nothing to maintain.

**The trade-off, stated honestly.** Auto-republish on risks publishing
half-edits; off risks someone forgetting to press Publish and wondering why
nothing happened. Publishing half-edits is public and cannot be un-seen.
Forgetting to publish is invisible, harmless, and self-correcting the moment
someone looks at the site. Take the second risk.

This also disposes of the cron-versus-button question. **The cron is not the
trigger; it is the delivery.** The trigger is Publish. The cron is how a
published change reaches the site without anyone touching GitHub, and it can
fire at any moment safely, because what it fetches is always a snapshot
somebody deliberately released.

If an hour is too long a wait, that is what the optional Apps Script
accelerator is for (§3) — and note it stays *optional*, because the
credential it needs is not on the critical path.

Checked 2026-08-12, because "get the assistant to edit the doc directly" is an
obvious thing to reach for. The connector exposes `search_files`,
`read_file_content`, `download_file_content`, `get_file_metadata`,
`get_file_permissions`, `list_recent_files`, `create_file` and `copy_file`.

**There is no update or edit tool.** Existing documents cannot be modified.
`create_file` makes a new file, which cannot carry tabs and would mean a new
published URL — trading a chore for a worse architecture. Pasting into tabs is
a human job.

Worth knowing what it *is* good for: reading the document as the club account
sees it, including **unpublished** edits. That is the one thing the public
`/pub` URL cannot show, so it can answer "did the publish actually go
through?" — a question that otherwise looks identical to "nothing changed".

### 9.3 When it breaks

0. **If the site is stale but nothing looks wrong**, press **Actions → Sync
   content from Google → Run workflow**. That rebuilds and republishes whether
   or not the document changed, which recovers from a failed deploy. If the
   Actions tab says scheduled workflows have been disabled for inactivity,
   re-enable them there — see §7.3, route 3.
1. Read the email. It names the file and the fix.
2. If the fix is "rename a heading back", do that.
3. If not, everything is a plain file: `content/*.json` in the repo can be
   edited directly through github.com and the site will deploy from it. **The
   sync being broken never blocks updating the website** — it only removes the
   convenience.

Point 3 is the escape hatch that makes the whole thing safe to adopt.

## 10. Open questions

1. ~~**§4 transport**~~ — ✅ **FULLY RESOLVED 2026-08-10.** Published-to-web
   only; Docs via HTML, Sheets via CSV; markup contract recorded in §4.1–4.3.
   Nothing blocks the parser.
2. What is the acceptable staleness window during registration season?
3. Who is the human that receives failure emails — the shared inbox, or a
   named role? A shared inbox survives turnover; a person does not.
4. Should FAQ entries be a Sheet rather than a Doc? They are highly repetitive
   question/answer pairs, which is more tabular than prose. Worth revisiting
   after the PoC.
