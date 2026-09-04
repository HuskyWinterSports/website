import { ContentError } from './join-sections.js';
import { seasonEndYear, lessonWeekends, refundDeadline, lessonRange } from './lesson-dates.js';

/**
 * Turns the signup sheet into content blocks, and fills the small number of
 * places where a layout wants a value from it inside a piece of text.
 *
 * The dividing line, as everywhere else: the sheet supplies facts, the layout
 * supplies structure. An officer changes a price or a date; nobody has to
 * think about what a box is.
 */

/**
 * `{season_year}` and friends, usable in any string a layout file sets.
 *
 * `{year}` is the odd one out: it comes from the clock rather than the sheet,
 * so it works on every page whether or not one is attached. See §5.4c.
 */
const TOKENS = {
    year: 'year',
    registration_form: 'registrationForm',
    season_year: 'seasonYear',
    lesson_director: 'lessonDirector',
    refund_deadline: 'refundDeadline',
    lesson_start: 'lessonStart',
    lesson_end: 'lessonEnd',
};

/**
 * The sheet's own values, plus everything derivable from them.
 *
 * Dates are computed rather than typed so no date is maintained in two places.
 */
export function derive(settings, layoutName) {
    if (!settings.seasonYear) return settings;
    const year = seasonEndYear(settings.seasonYear, layoutName);
    const range = lessonRange(year);
    return {
        ...settings,
        refundDeadline: refundDeadline(year),
        lessonStart: range.start,
        lessonEnd: range.end,
    };
}

export function fillTokens(value, settings, layoutName) {
    return value.replace(/\{([a-z_]+)\}/g, (whole, token) => {
        const key = TOKENS[token];
        if (!key) {
            throw new ContentError(
                `content/${layoutName}.layout.json uses ${whole}, which is not ` +
                `something the sheet provides.\n\n` +
                `Available: ${Object.keys(TOKENS).map((t) => `{${t}}`).join(', ')}\n\n` +
                `The website has not been changed. It is still showing the previous version.`
            );
        }

        const filled = settings[key];
        if (!filled) {
            throw new ContentError(
                `The website needs ${whole} to build ${layoutName}, but the sheet ` +
                `does not have a value for it.\n\n` +
                `Add a "${token.replace(/_/g, ' ')}" row to the first column of the ` +
                `sheet, with its value in the cell underneath.\n\n` +
                `The website has not been changed. It is still showing the previous version.`
            );
        }
        return filled;
    });
}

/**
 * Lesson dates, one box per session, worked out from the season year.
 *
 * There is deliberately no "the table is empty" failure here any more: the
 * dates are computed, so the only way to get them wrong is a Season Year cell
 * that cannot be read, which seasonEndYear refuses. See lesson-dates.js.
 */
function dateBoxes(seasonYear, layoutName) {
    const year = seasonEndYear(seasonYear, layoutName);

    const bySession = new Map();
    for (const weekend of lessonWeekends(year)) {
        if (!bySession.has(weekend.session)) bySession.set(weekend.session, []);
        bySession.get(weekend.session).push(`Lesson ${weekend.lesson}: ${weekend.label}`);
    }

    return [...bySession].map(([name, items]) => ({
        heading: `Session ${name}`,
        items,
    }));
}

/**
 * Prices, one box per lesson type. The sheet's own wording is used as the
 * label — repeating "Ski or Snowboard Lessons" on all three, as the hand-built
 * page did, says nothing the page has not already said.
 */
function priceBoxes(prices, layoutName) {
    if (prices.length === 0) {
        throw new ContentError(
            `The sheet lists no prices, so ${layoutName} cannot be built.\n\n` +
            `Fill in the Lesson Type, 3 Week Price and 6 Week Price columns.\n\n` +
            `The website has not been changed. It is still showing the previous version.`
        );
    }

    return prices.map((row) => ({
        heading: row.type,
        items: [`3 weeks - $${row.threeWeek}`, `6 weeks - $${row.sixWeek}`],
    }));
}

/**
 * @param {object} entry  a layout block naming a sheet table
 * @param {object} sheet  output of parseSheet
 */
export function sheetBlock(entry, sheet, layoutName) {
    const boxes = entry.sheet === 'dates'
        ? dateBoxes(sheet.settings.seasonYear, layoutName)
        : entry.sheet === 'prices'
            ? priceBoxes(sheet.prices, layoutName)
            : null;

    if (!boxes) {
        throw new ContentError(
            `content/${layoutName}.layout.json asks for sheet table ` +
            `"${entry.sheet}", which does not exist. Known tables: dates, prices.`
        );
    }

    const { sheet: _table, note, ...rest } = entry;

    // An optional sentence introducing the table. It lives in the layout
    // because it describes the rule the dates follow, not the dates themselves.
    return {
        ...rest,
        ...(note ? { content: [{ type: 'paragraph', spans: linkedSpans(note) }] } : {}),
        boxes,
    };
}

/**
 * Turns `[label](/path)` in a layout's own sentence into a link.
 *
 * A registration message that says "join our mailing list" without linking to
 * it asks a parent to go and find the page themselves, at the exact moment
 * they were told they cannot do the thing they came for.
 */
export function linkedSpans(text) {
    const spans = [];
    const pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    let at = 0;

    for (const match of text.matchAll(pattern)) {
        if (match.index > at) {
            spans.push({ text: text.slice(at, match.index), bold: false, italic: false, href: null });
        }
        spans.push({ text: match[1], bold: false, italic: false, href: match[2] });
        at = match.index + match[0].length;
    }

    if (at < text.length) {
        spans.push({ text: text.slice(at), bold: false, italic: false, href: null });
    }
    return spans;
}

/**
 * Chooses the sentence that matches the sheet's registration state.
 *
 * The sheet picks the state; the site picks the words. Officers should not
 * have to phrase "we are full" consistently with whether a signup form is on
 * screen below it — that pairing is the thing the hand-written page got wrong,
 * saying lessons were full in one paragraph and open for snowboarders two
 * paragraphs later.
 */
/** The same address, asking Google to leave the page furniture off. */
const embedded = (src) => (src.includes('embedded=true') ? src : `${src}?embedded=true`);

export function applyStatus(entry, settings, layoutName) {
    const { status, form, ...rest } = entry;

    const sports = status.sports.map((sport) => {
        const state = settings[sport.state];

        // The common case by far, and the one an officer can fix alone: the
        // row was renamed, moved or never added. Say that, rather than
        // reporting the absence as an unknown value.
        if (!state) {
            throw new ContentError(
                `The website needs to know whether ${sport.label.toLowerCase()} are open, ` +
                `but the sheet does not say.\n\n` +
                `Add a "${sport.sheetLabel}" row to the first column of the sheet, ` +
                `with one of these in the cell underneath:\n` +
                `  • not yet open\n  • open\n  • waitlist\n  • full\n\n` +
                `The website has not been changed. It is still showing the previous version.`
            );
        }

        const wording = status.states[state];
        if (wording && 'form' in wording) {
            // The three-treatment rule is gone: the form is always embedded,
            // so a leftover setting here does nothing. Said out loud rather
            // than ignored, because a key that quietly stopped mattering is
            // exactly what misleads whoever reads this file next.
            throw new ContentError(
                `content/${layoutName}.layout.json still gives the "${state}" ` +
                `state a "form" setting, which no longer does anything — the ` +
                `registration form is now always on the page.\n\n` +
                `Remove that line from the "status" block.\n\n` +
                `The website has not been changed. It is still showing the previous version.`
            );
        }
        if (!wording) {
            throw new ContentError(
                `The sheet says ${sport.label.toLowerCase()} are "${state.replace(/_/g, ' ')}", ` +
                `but content/${layoutName}.layout.json has no wording for that.\n\n` +
                `It has wording for: ${Object.keys(status.states).join(', ')}\n\n` +
                `Ask a developer to add it.\n\n` +
                `The website has not been changed. It is still showing the previous version.`
            );
        }
        return { ...sport, state, wording };
    });

    // Two sports across four states is sixteen combinations, so the sentence is
    // composed rather than enumerated. When both agree they are said once:
    // "Ski lessons are full. Snowboard lessons are full." reads like a mistake.
    const allSame = sports.every((s) => s.state === sports[0].state);
    const sentence = allSame
        ? `${status.bothLabel} ${sports[0].wording.says}.`
        : sports.map((s) => `${s.label} ${s.wording.says}.`).join(' ');

    // One closing line, the same in every state. It says nothing about the
    // form, deliberately: the form is always on the page now, and a sentence
    // pointing at it would contradict the status sentence above whenever
    // lessons are full.
    //
    // The mailing list is offered whatever the state, because somebody who has
    // already signed up for lessons may still want to hear what happens next.
    const then = status.then;

    // Nothing may reach a reader still looking like a placeholder. The club
    // once published a literal "{}" this way, and it sat on the live site.
    const unresolved = `${sentence} ${then}`.match(/\{[a-z_]+\}/);
    if (unresolved) {
        throw new ContentError(
            `content/${layoutName}.layout.json still contains ${unresolved[0]} ` +
            `after filling in the sheet's values, so it would have been printed ` +
            `on the page exactly as written.\n\n` +
            `Ask a developer to look at the "status" block.\n\n` +
            `The website has not been changed. It is still showing the previous version.`
        );
    }

    return {
        ...rest,
        // Prose the site owns, shaped like the document's own paragraphs so the
        // renderer needs no special case.
        content: [
            { type: 'paragraph', spans: linkedSpans(sentence) },
            { type: 'paragraph', spans: linkedSpans(then) },
        ],
        // Always, whatever the sheet says. Google Forms is the authority on
        // whether it will take an answer, and it is more specific than
        // anything this file could say — a form scheduled to open announces
        // the date and time in its own words, and a closed one says so.
        //
        // `embedded=true` is added here rather than stored in the sheet's
        // value, so {registration_form} stays an address a person can be sent
        // to. It strips the form's chrome, which is right inside the frame and
        // wrong in a link somebody follows.
        ...(form ? { form: { ...form, src: embedded(form.src) } } : {}),
    };
}

/**
 * Fills tokens in text that came from the DOCUMENT.
 *
 * Deliberately more forgiving than fillTokens: an unknown token in a layout is
 * a developer's typo worth failing on, but an officer typing "{warm} jacket"
 * must not freeze the site. Unresolvable tokens pass through untouched.
 */
export function fillContentTokens(blocks, settings) {
    const fill = (text) => text.replace(/\{([a-z_]+)\}/g, (whole, token) => {
        const key = TOKENS[token];
        return key && settings[key] ? settings[key] : whole;
    });

    // Every string, not just spans: a section heading is a bare string, and a
    // token in one would otherwise publish as literal braces.
    const walk = (value) => {
        if (typeof value === 'string') return fill(value);
        if (Array.isArray(value)) return value.map(walk);
        if (value && typeof value === 'object') {
            return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v)]));
        }
        return value;
    };

    return blocks.map(walk);
}

/** Fill every {token} in the layout's own strings, leaving document prose alone. */
export function fillLayoutTokens(layout, settings, layoutName) {
    const walk = (value) => {
        if (typeof value === 'string') return fillTokens(value, settings, layoutName);
        if (Array.isArray(value)) return value.map(walk);
        if (value && typeof value === 'object') {
            return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v)]));
        }
        return value;
    };
    return walk(layout);
}
