import { ContentError } from './join-sections.js';

/**
 * Turns the signup sheet into content blocks, and fills the small number of
 * places where a layout wants a value from it inside a piece of text.
 *
 * The dividing line, as everywhere else: the sheet supplies facts, the layout
 * supplies structure. An officer changes a price or a date; nobody has to
 * think about what a box is.
 */

/** `{season_year}` and friends, usable in any string a layout file sets. */
const TOKENS = {
    season_year: 'seasonYear',
    lesson_director: 'lessonDirector',
    refund_deadline: 'refundDeadline',
};

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

/** Lesson dates, one box per session, in the order the sheet lists them. */
function dateBoxes(sessions, layoutName) {
    if (sessions.length === 0) {
        throw new ContentError(
            `The sheet lists no lesson dates, so ${layoutName} cannot be built.\n\n` +
            `Fill in the Session, Lesson and Date columns.\n\n` +
            `The website has not been changed. It is still showing the previous version.`
        );
    }

    const bySession = new Map();
    for (const row of sessions) {
        if (!bySession.has(row.session)) bySession.set(row.session, []);
        bySession.get(row.session).push(`Lesson ${row.lesson}: ${row.date}`);
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
        inset: true,
        items: [`3 weeks - $${row.threeWeek}`, `6 weeks - $${row.sixWeek}`],
    }));
}

/**
 * @param {object} entry  a layout block naming a sheet table
 * @param {object} sheet  output of parseSheet
 */
export function sheetBlock(entry, sheet, layoutName) {
    const boxes = entry.sheet === 'dates'
        ? dateBoxes(sheet.sessions, layoutName)
        : entry.sheet === 'prices'
            ? priceBoxes(sheet.prices, layoutName)
            : null;

    if (!boxes) {
        throw new ContentError(
            `content/${layoutName}.layout.json asks for sheet table ` +
            `"${entry.sheet}", which does not exist. Known tables: dates, prices.`
        );
    }

    const { sheet: _table, ...rest } = entry;
    return { ...rest, boxes };
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
