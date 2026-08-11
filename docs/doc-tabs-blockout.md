# Blocking out the rest of the site as document tabs

Everything below is ready to paste into the club's Google Doc, one tab per
page. The wording is **taken verbatim from the live site** — this is a
structural move, not a rewrite. Fixing the wording is the content pass, and it
gets much easier once the words live here.

## How to paste this

1. **Turn on Markdown in Docs first:** Tools → Preferences → tick
   **"Enable Markdown"**. Then pasting the blocks below applies the heading
   styles automatically instead of arriving as a wall of plain text.
2. New tab in the left sidebar. **Rename the tab** to the exact name given for
   each page — the name is a join key, like the Heading 2s.
3. Paste that page's block.

> ⚠️ Rename the tab in the sidebar. **Never type a title and style it "Title"** —
> Google uses that style to mark where a tab begins, so a hand-applied Title
> splits the page in half and silently drops the rest.

Tab names and Heading 2 names are both join keys, so renaming either one stops
that page updating until it is renamed back or a developer adjusts the layout
file. Everything else — wording, links, bold, lists — is free to change.

## What is deliberately *not* here

| Not in the doc | Why | Where it goes instead |
|---|---|---|
| Session dates, prices, "lessons are full" | Changes every season, and is tabular | A Google **Sheet** — phase 2 |
| The two Google Form embeds | Not words. Swapping a form is a layout change | Layout file |
| Photo slider, nav, footer | Not words | Code |
| The "WHY US?" and "LEVELS" card grids | `ContentBlocks` has no card renderer yet | Blocked out below anyway, for planning |

A tab can exist before the website uses it. Unused tabs are never read at all,
so drafting ahead is free and cannot break a page.

## Status of each tab

| Tab | Route | Can be wired now? |
|---|---|---|
| Diversity and Inclusion | `/diversity-and-inclusion` | ✅ live already |
| Contact Us | `/contact-us` | ✅ yes |
| Email List | `/join-our-mailing-list` | ✅ yes, prose only — form stays in code |
| Become an Instructor | `/become-an-instructor` | ✅ yes |
| FAQ | `/faq` | ✅ yes, with one small visual change (see note) |
| Lesson Registration | `/lesson-registration` | ✅ refund policy yes; intro prose yes; form stays in code |
| Lesson Info | `/lesson-info` | ⚠️ prose yes; dates and prices wait for the Sheet |
| Home | `/` | ❌ needs a card renderer first |

---

# Tab: `Contact Us`

Route `/contact-us`. Paste everything below.

```markdown
# Contact Us

## Where to Find Us

Husky Winter Sports
207 HUB SAO 130 Box 352238
Seattle, WA 98195

## Getting in Touch

For questions about lessons, the best way to contact us is via email at
huskywslessons@gmail.com. Expect a response within three to five business days.

During the Spring and Summer months (March - August), email and voice messages
are checked less frequently, and it may take up to one week to receive a
response.
```

**Note:** the live page has no headings — it is a title and two paragraphs. The
two Heading 2s above are added because a page needs at least one section for
the sync to attach content to. If you would rather the headings not appear on
the page, say so and the layout can hide them.

---

# Tab: `Email List`

Route `/join-our-mailing-list`. The signup form itself stays in the code and
appears below this text.

```markdown
# Email List

## Why Join

There's snow on the ground and it's snowing in the mountains! We hope you're
just as excited about skiing as we are. Join our emailing list to be notified
of lesson registration openings and updates.
```

**Dropped on purpose:** *"Click here to open the form in a new window."* That
sentence describes the form, so it belongs with the form in the layout file,
not in prose an editor might reorder away from it.

---

# Tab: `Become an Instructor`

Route `/become-an-instructor`. Paste everything below.

```markdown
# Become an Instructor

## Who We Are and What We Do

Husky Winter Sports is a student-run organization at the University of
Washington that provides ski and snowboard lessons to students and the greater
Seattle community. Our mission is to make winter sports accessible to everyone,
regardless of their skill level or background.

*"Provide fun, safe, high quality and affordable mountain experiences to skiers
and snowboarders of all ability levels, and to foster friendships among
like-minded winter sports enthusiasts."*

As a club, we shred all winter long and try to take advantage of every snow
related opportunity we can. As a ski school, we teach lessons each Saturday and
Sunday of winter quarter. This boils down to 6 total weekends, with 2.5 hour
lessons on both Saturday and Sunday. When we're not teaching lessons, we're
shredding the slopes of Summit together as a club.

## Opportunity

Husky Winter Sports offers a unique opportunity for UW students who are excited
about snow sports and interested in sharing them with children and adults of
all levels from the Northwest community. All members are trained as ski or
snowboard instructors and receive a season's pass to the Summit at Snoqualmie
in exchange for attending a minimum of two weekend-long training sessions and
teaching for all our six lesson weekends. Other benefits include lodging and a
meal on Saturday nights, as well as travel compensation for instructor
carpools.

## The Process

So how do you join Husky Winter Sports? During fall quarter and the beginning
of winter quarter we hold many events to give you information about the club,
show you how we teach, and opportunities to meet club members and officers.

## The Perks

- Free Summit at Snoqualmie season pass
- Arranged carpools to the mountain
- Organized trips to Whistler and other PNW resorts
- Training for PSIA/AASI certification
- Guaranteed riding improvement
- A rad community of snowsports and outdoor enthusiasts
```

**Note:** the mission-statement line is italic above because the live page
styles it as a quote — but that class has no CSS at all, so it currently
renders as an ordinary paragraph. Italic is the closest honest equivalent.

There is a comment in the code reading `{/* cards about each event */}` under
"The Process" — a section someone intended and never wrote. Worth writing now
that it is easy to.

---

# Tab: `FAQ`

Route `/faq`. Paste everything below.

```markdown
# FAQ

## Registration

### Is there an age limit for lessons?

We will be accepting students as young as 5 years old.

### I filled out the registration form, but can't figure out where to pay.

We will send you a confirmation email once we have processed your request. This
confirmation will contain a Paypal link and instructions for making payments.
Please allow a few days for us to process requests.

### When will I receive confirmation of lesson registration?

Please allow 5-7 business days for a confirmation email. This email will be
sent to the e-mail address listed on your registration, so please check all
relevant accounts and spam folders or add huskywslessons@gmail.com to your
contacts for best results.

### Why aren't lift tickets included in lesson fees?

The Summit at Snoqualmie offers passes for a variety of skill levels for
different age groups, and Husky Winter Sports cannot purchase and sell these to
our students. Unless you already have a Season Pass, please check with your
instructor before purchasing daily passes, as special cases exist. For example,
never-ever lessons will most likely not ride the lift on their first weekend of
instruction and will not need a pass; beginner lessons may wish to purchase a
cheaper Beginner pass which allows them to ride on the Holiday and Gallery
lifts only. Child tickets (0-6 years) are available for only $15 a day.
[CONFIRM: is the child ticket still $15?]

Daily lift tickets: http://www.summitatsnoqualmie.com/tickets-and-passes/daily-lift-tickets

### How do refunds work?

See the Lesson Registration page for details.

## Lessons

### Why isn't my child on the lift yet?

- Our instructors are trained to make sure that your child possesses the
  necessary skills before they are moved onto more challenging terrain. Younger
  children may need some time to get used to the snow before they can safely
  navigate the more advanced terrain served by the lifts.
- Snowboarding is trickier to start than skiing so your child may require some
  extra time to get used to sliding sideways.

### What should I do while my child is in lessons?

Enjoy the 1,994 acres and lifts that Snoqualmie has to offer, grab a coffee or
snack in the lodge, or take an adult lesson with us! While we know you want to
see your children's progress first hand, it is easier for the instructors to
teach when they have their students' full attention.

### What can I work on with my child outside of lessons?

If you ski or snowboard with your student outside of lessons, you can always
ask their instructor for games that you could play to help the students
improve. You can also always ask your child to show you the fun things that
their instructor has taught them in lessons. Overall, the key is to keep them
stoked to come up to the mountains!

### Why does my student keep switching lessons? I thought they would be with the same instructor?

After the first week, we occasionally have to tweak lesson groups based on what
we see on the hill. While we try to keep groups as consistent as possible, we
think that it will help students get the most out of their lessons when they
are learning with students at their same ability level.

### Why isn't my child in the same lesson as their friends?

We will do our best to group students with their friends if you request it when
you sign them up. If we see that certain students have different needs in their
lessons, we may separate them so that they can each get the most out of their
lessons.

### Do I tip my instructor?

All of our instructors are unpaid volunteers who spend hours training to teach
the sports that they love - tips are not required, but greatly appreciated.

### Can I reschedule a lesson?

Get in touch with us! We will do our best to reschedule. But the earlier we
know the easier it will be to find an alternative spot.
```

**Two changes from the live page, both deliberate:**

- **"Season's Pass" → "Season Pass"**, matching the Lesson Info page. The two
  pages currently disagree.
- **Visual:** Registration and Lessons are two groups inside one white box
  today. As doc sections they become **two white boxes**, one per group. Easy
  to change either way — say which you prefer.

The FAQ answer *"See Lesson Registration page for details"* is a link on the
live site. Links inside the document work; make it a normal Google Docs link to
`https://www.huskywintersports.org/lesson-registration`.

---

# Tab: `Lesson Registration`

Route `/lesson-registration`. **The waitlist form stays in the code.** The
"lessons are full / open / waitlist" line is *not* here either — it changes
with the season and belongs in the Sheet, phase 2.

```markdown
# Lesson Registration

## Questions

If you have questions, please email huskywslessons@gmail.com. We will get back
to you in 1 to 2 business days.

During the Spring and Summer months (March - August), email and voice messages
are checked less frequently, and it may take up to one week to receive a
response.

## Cancellation and Refund Eligibility

### Cancellation by December 31st - No Questions Asked

Customers can request a full cancellation of their lessons by December 31st,
one month before the lessons' scheduled start date, without any questions
asked. Full refunds will be provided for cancellations made within this period.
[CONFIRM: the club policy document says December 27th. The site says the 31st
deliberately, because publishing a stricter deadline than the real one would
deter a parent from asking for a refund they are entitled to. Settle which is
correct and delete this note.]

### Injuries

In the unfortunate event of a student sustaining an injury that prevents their
continued participation in lessons, our refund procedure is as follows:

1. Injury Before Lessons Start (within one month): If the injury occurs within
   one month before the lessons begin, we will issue an 80% refund. This refund
   will require valid documentation.
2. Injury After Lessons Start: If the injury occurs after the lessons have
   started, we will provide a refund for the missed classes later in the
   season, subtracting 20% from the total lesson price. This refund will
   require valid documentation as confirmation.

### Absence from Lessons

Please note that partial refunds may not be granted on a per-lesson basis for
missed sessions. If a child is absent from a scheduled lesson without prior
communication or cancellation, partial refunds will not be provided for the
missed lesson.

We strive to provide flexibility and fairness in our refund policies, but it's
essential to adhere to the specific guidelines mentioned above for refund
eligibility and exceptions. For any further clarification or assistance, please
feel free to contact our lesson director, Daphanie.
[CONFIRM: is Daphanie still the lesson director? This name is on the public
site in three places and goes stale the moment the role changes.]

### Refund Process and Time Frame

Contact huskywslessons@gmail.com and expect an email back within 5 business
days. Please note that our lesson director is a student and currently studying
abroad.
[CONFIRM: still true? This is the kind of sentence that quietly stops being
accurate.]

### Inclement Weather

Inclement weather is an inherent risk we all accept when engaging in mountain
activities. As such, we understand that adverse weather conditions may impact
our operations, and everyone involved will be equally affected. Therefore,
refunds or compensation for changes in scheduling due to inclement weather are
not guaranteed.

### No-Show Policy

To ensure the smooth operation of our skiing lessons and fairness to all
participants, customers who fail to show up for their scheduled lesson dates
without prior communication or cancellation will be considered absent, and will
not be given a partial refund.

### Exceptions and Discretion

At our discretion, we may consider exceptions to our standard refund policies
in certain circumstances. While we strive to maintain consistency in our
policies for all customers, we understand that unique situations may arise. If
you believe you have valid grounds for a refund or require special
consideration due to extenuating circumstances, we encourage you to reach out
to our lesson director, Daphanie (huskywslessons@gmail.com). Our team will
carefully review your request and, where appropriate, exercise our discretion
to assess the situation on a case-by-case basis. Please understand that
granting an exception is not guaranteed and will be subject to our sole
judgment. We are committed to ensuring customer satisfaction and will make
every effort to address your concerns in a fair and equitable manner.

### Policy Updates

Effective from August 2023, this policy supersedes all previous versions and
governs all refund requests and related matters. Should the policy change, you
will be notified via our mailing list.
[CONFIRM: August 2023 is three seasons ago. If the deadline really did move
from the 27th to the 31st, this date needs to move with it.]
```

---

# Tab: `Lesson Info`

Route `/lesson-info`. **Dates and prices are not here** — they belong in the
Sheet, because they change every season and are the single most important thing
to get right. Paste the prose below; the dates and prices sections will be
slotted back in between them.

```markdown
# Lesson Information

## Come Shred With Us

Husky Winter Sports offers both ski and snowboarding lessons for kids and
adults alike!

## Logistics

### Location and Scheduling

Our lessons run for six total weekends during winter quarter. We offer 3-week
(**A or B**) or 6-week lesson packages. Students may choose between our
Saturday (**1:30 - 4pm**) or Sunday (**11:30 - 2pm**) session.

### Group Lessons

Ages 7+, suitable for all skill levels! Group size is anywhere between 3-5
students per instructor, arranged based on sport type, age, and ability level.

### Single-Student Lessons

Ages 5+. Privates are 1-on-1 student to instructor for a more personalized
experience.

### Friends and Family Lessons

Ages 7+. Semi-privates are group lessons where you pick your group of 2-5 kids.
Please email huskywslessons@gmail.com if interested in registering students
ages 5 and 6 for semi-private lessons.

## Levels

We offer lessons for four levels: Never-ever, Beginner, Intermediate, and
Advanced. When registering, please make your best guess as to the most
appropriate lesson level and answer every experience question to the best of
your ability. The Lesson Director may contact you with more questions while
assigning lessons and instructors.

### Never-Ever

The student is brand new to their snowsport or is returning after a hiatus of a
year or more.

### Beginner

The student can make turns on green terrain and is comfortable riding the Magic
Carpet. Lift experience may be limited or nonexistent.

### Intermediate

The student is making linked turns on green terrain and starting to explore
blue runs.

### Advanced

The student can make controlled, linked turns on most runs.

## Equipment and Lift Tickets

### Equipment

Before you head up to the mountain, please make sure you have all of the proper
gear. This includes boots, bindings, skis or a snowboard, goggles or
sunglasses, waterproof jacket, snow pants, and gloves. Be prepared for varying
weather conditions and bring plenty of warm layers and a helmet. If you need to
buy or rent equipment or clothing, check out some local shops or ski swaps!

### Lift Tickets

The Summit at Snoqualmie offers passes for a variety of skill levels and for
different age groups, and Husky Winter Sports cannot purchase and sell these to
our students. Unless you already have a Season Pass, please check with your
instructor before purchasing daily passes, as special cases exist. For example,
never-ever lessons will most likely not ride the lift on their first weekend of
instruction and will not need a pass; beginner lessons may wish to purchase a
cheaper Beginner pass which allows them to ride on the Holiday and Gallery
lifts only.

## Location

Lessons begin from the Ullr Snow Sports Meeting Area at Snoqualmie's "Summit
Central." To reach us, take Exit 53 from I-90 East and turn right at the stop
sign. At the T-intersection, turn left, drive past the fire station, and turn
into the large gravel parking lot on your left.

From the parking lot, walk up the switchback path towards the lodges. Looking
towards the hill from the bonfire area, we are located outside the orange
"Ullr" building south of the base of the Triple 60 Lift.

This can be a bit of a long walk for the young ones, so please make sure to
arrive early enough to find parking in the Central lot (if full, you will be
directed to an auxiliary lot and may need to take a shuttle back) and arrive at
Ullr with plenty of time to get stoked and ready to go.
```

**Three fixes already applied above, so you don't paste the bugs across:**

- **The Maps link is broken on the live site.** Its URL ends in a stray `we`,
  and the sentence has no subject — it reads *"Looking towards the hill from
  the bonfire area, are located outside…"*. The `we` was the start of the
  sentence, accidentally pasted into the end of the URL. Fixed to *"we are
  located"*, and the link removed. **Add the link back** in the doc if you want
  it, using a fresh Google Maps URL.
- **"Season's Pass" → "Season Pass"**, matching the FAQ.
- The **Levels** descriptions are cards on the live page. As Heading 3s they
  become an ordinary list down the page. If you want the card grid back, that
  needs a small addition to the renderer — worth doing if you like the look.

---

# Tab: `Home` — planning only

Route `/`. **Not wireable yet.** Almost everything on the home page is either
an image, a button, or a card grid, and none of those are words. Blocked out
here so the tab can exist for planning.

```markdown
# Husky Winter Sports

## Tagline

Ski and Snowboard School

"Helping students ski for free since 1937!"
[CONFIRM: 1937 appears only here. Worth checking against the club's own
history before it goes on more materials.]

## Why Us

### UW Students

Unpaid, we're here because we want to spread the love of our favorite sport!
This also means money saved on your end!

### Our Members are the Best

We do have a hiring process to make sure we only provide the best instruction.

### Enthusiastic and Safe

We all love to have fun on the mountain but we know safety comes first.

### PSIA/AASI Certified

Instructors are PSIA/AASI trained or are working towards it.
```

Note **"Instrutors" → "Instructors"** — a typo currently live on the home page.

To render "Why Us" as the four-card grid it is today, the renderer needs a
card block type. That is a small, self-contained piece of work and it would
also cover the Levels grid on Lesson Info and the missing events grid on
Become an Instructor.

---

## What this needs from the renderer, if you want full parity

Nothing below blocks any of the tabs above from being written. Listed so the
gap is visible rather than discovered later.

| Missing | Affects | Notes |
|---|---|---|
| Card grid block | Home "Why Us", Lesson Info "Levels", Become an Instructor "The Process" | The only real gap. One block type covers all three |
| Sheet-sourced blocks | Lesson Info dates and prices, Lesson Registration status | Phase 2, already specced |

Things that look missing and are not: `centered-text` works today by writing
the layout's type as `"big-white-box centered-text"`, and `footnote`, `quote`,
`address` and `little-white-box` carry **no CSS at all** on the live site, so
losing them changes nothing a visitor can see.
