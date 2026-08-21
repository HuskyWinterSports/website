import { ContentError } from './join-sections.js';

/**
 * The season's lesson dates, computed rather than typed.
 *
 * The rule, from the club:
 *
 *     Six lesson weekends, starting on the last Saturday in January, skipping
 *     Presidents' Day weekend.
 *
 * These dates have to keep being right long after everyone who wrote this has
 * graduated, so:
 *
 *   - The only input is the sheet's "Season Year" cell. Nothing here asks what
 *     today is, so the same sheet gives the same dates on any machine, in any
 *     timezone, in any year — and the tests can cover a century without
 *     mocking a clock.
 *   - All arithmetic is UTC, where a week is exactly 7 * 86400000 ms. Local
 *     time drifts by a day across the March daylight-saving change, which is
 *     precisely where these dates land.
 *   - Presidents' Day has been the third Monday in February since the Uniform
 *     Monday Holiday Act took effect in 1971. It is not a moving target.
 *
 * "Lessons end on the second weekend in March" is a CONSEQUENCE of the rule
 * above rather than part of it, and it is not universal — see
 * endsOnSecondSaturdayOfMarch.
 */

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY = 86400000;
const WEEK = 7 * DAY;
const WEEKENDS = 6;

const utc = (year, month, day) => new Date(Date.UTC(year, month, day));
const plus = (date, ms) => new Date(date.getTime() + ms);
const short = (d) => `${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCDate()}`;
const long = (d) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;

/** '2026/27' -> 2027, the year the lessons actually happen in. */
export function seasonEndYear(value, layoutName) {
    const shown = (value ?? '').trim() || '(empty)';
    const bad = (why) => new ContentError(
        `The sheet's "Season Year" cell says "${shown}", ${why}\n\n` +
        `It should read like "2026/27" — the two calendar years the season ` +
        `spans, in order. Every lesson date on ${layoutName} is worked out ` +
        `from it.\n\n` +
        `Correct the "Season Year" cell in the sheet.\n\n` +
        `The website has not been changed. It is still showing the previous version.`
    );

    const match = /^(\d{4})\s*[/-]\s*(\d{2}|\d{4})$/.exec((value ?? '').trim());
    if (!match) throw bad('which is not a season the website can read.');

    const start = Number(match[1]);
    const tail = match[2];
    // "27" means 2027, not the year 27. The century comes from the first year,
    // so this keeps working in 2100 without anyone revisiting it.
    const end = tail.length === 4
        ? Number(tail)
        : Math.floor(start / 100) * 100 + Number(tail);

    if (end !== start + 1) {
        throw bad(
            `but those are not consecutive years. A season spans one winter, ` +
            `so the second year is always the first plus one.`
        );
    }
    return end;
}

/** The last Saturday in January of the given year. */
export function lastSaturdayOfJanuary(year) {
    const last = utc(year, 0, 31);
    // getUTCDay: 0 = Sunday ... 6 = Saturday. Step back to the Saturday.
    return plus(last, -(((last.getUTCDay() + 1) % 7) * DAY));
}

/** The Saturday of Presidents' Day weekend — two days before the third Monday. */
export function presidentsDaySaturday(year) {
    const first = utc(year, 1, 1);
    const firstMonday = 1 + ((8 - first.getUTCDay()) % 7);
    return utc(year, 1, firstMonday + 14 - 2);
}

/**
 * The six lesson weekends, in order.
 *
 * Session A is the first three, B the last three, matching the document's own
 * sentence: "We offer 3-week (A or B) or 6-week lesson packages." That split
 * used to live in the sheet; if the club ever changes the shape of a package,
 * this is the line that changes with it.
 */
export function lessonWeekends(year) {
    const start = lastSaturdayOfJanuary(year);
    const skip = presidentsDaySaturday(year).getTime();

    // Seven candidates so that removing one still leaves six. Presidents' Day
    // weekend is always among them: the last Saturday in January falls on the
    // 25th-31st, and its own Saturday on February 13th-19th.
    const candidates = Array.from({ length: WEEKENDS + 1 }, (_, i) => plus(start, i * WEEK));
    const kept = candidates.filter((d) => d.getTime() !== skip);

    if (kept.length !== WEEKENDS) {
        throw new Error(
            `Presidents' Day weekend was not among the ${WEEKENDS + 1} candidate ` +
            `weekends for ${year}. This is a bug in scripts/sync/lesson-dates.js, ` +
            `not something anyone can fix in the sheet or the document.`
        );
    }

    return kept.map((saturday, index) => ({
        session: index < 3 ? 'A' : 'B',
        lesson: (index % 3) + 1,
        label: `${short(saturday)} - ${short(plus(saturday, DAY))}`,
    }));
}

/**
 * Whether the season ends on the second weekend in March, which is how the
 * club describes it.
 *
 * True for every season from 2025 to 2047, then false for 2048 and 2076: leap
 * years whose last January Saturday is the 25th, where February 29 absorbs a
 * weekend and the run ends a week earlier than the phrase promises.
 *
 * The sync warns when this is false rather than letting the page's wording
 * quietly stop matching the table printed directly above it.
 */
export function endsOnSecondSaturdayOfMarch(year) {
    const first = utc(year, 2, 1);
    const firstSaturday = 1 + ((6 - first.getUTCDay()) % 7);
    const second = utc(year, 2, firstSaturday + 7);

    const weekends = lessonWeekends(year);
    return weekends[weekends.length - 1].label.startsWith(short(second));
}

/** December 31 of the calendar year before the season. See the spec, §5. */
export function refundDeadline(year) {
    return long(utc(year - 1, 11, 31));
}

/**
 * The first Saturday and the last Sunday, written out for prose.
 *
 * Derived from lessonWeekends rather than recomputed, so a sentence saying
 * when the season runs cannot disagree with the table listing the weekends.
 */
export function lessonRange(year) {
    const weekends = lessonWeekends(year);
    const start = lastSaturdayOfJanuary(year);
    // One weekend is skipped, so the six kept weekends span seven: the last
    // Saturday is start + 6 weeks.
    const lastSaturday = plus(start, weekends.length * WEEK);
    return { start: long(start), end: long(plus(lastSaturday, DAY)) };
}
