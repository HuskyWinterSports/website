import { ContentError } from './join-sections.js';

/**
 * Reads the club's published signup sheet.
 *
 * The sheet is ONE grid holding two unrelated tables side by side, of
 * different lengths, with no row-to-row relationship. Row 3 says
 * "Single-Student prices" AND "the season is 2026/27" — two facts that have
 * nothing to do with each other. So this reads column groups, never rows. See
 * docs/content-sync-spec.md §5.4a.
 *
 * It used to hold a third: a hand-typed Session/Lesson/Date calendar. Those
 * columns were deleted in August 2026 once the season became computable from
 * the "Season Year" cell. See scripts/sync/lesson-dates.js.
 */

const REGISTRATION_STATES = ['open', 'waitlist', 'full', 'not_yet_open'];

/**
 * Labels understood in the first column. Anything else is a warning.
 *
 * Ski and snowboard have separate states because they fill at different
 * rates — ski lessons usually go first while snowboard places remain. One
 * combined state made the page claim both were full, which cost the club
 * snowboard signups it could have taken.
 */
const SETTINGS = {
    'Lesson Director': 'lessonDirector',
    'Season Year': 'seasonYear',
    'Ski Registration State': 'skiState',
    'Snowboard Registration State': 'snowboardState',
    'Registration Form': 'registrationForm',
};

/**
 * Labels the sheet may still carry that the website no longer reads.
 *
 * "Refund Deadline" was a hand-maintained date until the season became
 * computable from "Season Year". The leftover row is harmless — but it must
 * still STOP the value search below. Without this, a "Season Year" cell left
 * empty would look down the column, find the words "Refund Deadline", and
 * publish them as the season.
 *
 * Officers can delete the row whenever they like. This is here so that not
 * deleting it is also safe.
 */
const RETIRED_LABELS = ['refund deadline'];

// Matching is case-insensitive; messages quote the label as the sheet writes
// it, so an officer reading an error can find the row by eye.
const KEY_BY_LABEL = new Map(
    Object.entries(SETTINGS).map(([label, key]) => [label.toLowerCase(), key])
);
const LABEL_BY_KEY = new Map(
    Object.entries(SETTINGS).map(([label, key]) => [key, label])
);

/** Settings whose value must be one of the registration states. */
const STATE_KEYS = ['skiState', 'snowboardState'];

/**
 * Minimal RFC-4180 reader. Google quotes any field containing a comma, so a
 * naive split would silently cut "Seattle, WA" in half — and produce a
 * plausible wrong answer rather than an error.
 */
export function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;

    for (let i = 0; i < text.length; i++) {
        const c = text[i];

        if (quoted) {
            if (c !== '"') { field += c; continue; }
            if (text[i + 1] === '"') { field += '"'; i++; continue; }
            quoted = false;
            continue;
        }

        if (c === '"') { quoted = true; continue; }
        if (c === ',') { row.push(field); field = ''; continue; }
        if (c === '\r') continue;
        if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
        field += c;
    }

    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.map((r) => r.map((cell) => cell.trim()));
}

const columnOf = (rows, index) => rows.map((r) => r[index] ?? '');

/**
 * The first column is a label followed by its value, stacked. Read it by
 * LABEL, never by position: alternating pairs are position-dependent, so one
 * inserted row would shift every value onto the wrong key — a plausible wrong
 * answer, which is worse than a failure.
 */
function readSettings(column, warnings) {
    const settings = {};
    const cells = column.map((c) => c.trim());

    for (let i = 0; i < cells.length; i++) {
        const label = cells[i].toLowerCase();
        if (!label) continue;

        const key = KEY_BY_LABEL.get(label);
        if (!key) {
            // Could be a value belonging to the label above it, or a note an
            // officer added. Either way, never fatal.
            continue;
        }

        // The value is the next non-blank cell — and the search STOPS at the
        // next label rather than skipping past it. Two ways that matters:
        // sorting the sheet by Date shuffles this column against itself, and a
        // label whose own cell was emptied would otherwise adopt the value
        // belonging to the label below it. Both would publish a confident
        // wrong answer instead of asking someone to look.
        const next = cells.slice(i + 1).find((c) => c !== '');
        const isLabel = (cell) =>
            KEY_BY_LABEL.has(cell.toLowerCase()) || RETIRED_LABELS.includes(cell.toLowerCase());
        const value = next && !isLabel(next) ? next : null;

        if (!value) {
            warnings.push(`"${cells[i]}" in the sheet has no value under it. It has been ignored.`);
            continue;
        }
        settings[key] = value;
    }

    for (const [label, key] of Object.entries(SETTINGS)) {
        if (!(key in settings)) {
            warnings.push(
                `The sheet has no "${label}" row. ` +
                `Add it in the first column, with the value in the cell underneath.`
            );
        }
    }

    return settings;
}

function normaliseState(value, label) {
    if (!value) return null;
    const state = value.toLowerCase().replace(/[\s-]+/g, '_');
    if (REGISTRATION_STATES.includes(state)) return state;

    // Never guess. This is the value that tells a parent whether they can book.
    throw new ContentError(
        `The sheet says "${label}" is "${value}", which is not one ` +
        `of the values the website knows.\n\n` +
        `It must be one of:\n` +
        REGISTRATION_STATES.map((s) => `  • ${s.replace(/_/g, ' ')}`).join('\n') + `\n\n` +
        `Correct the "${label}" cell in the sheet.\n\n` +
        `The website has not been changed. It is still showing the previous version.`
    );
}

/**
 * Turns whatever address an officer pasted into the published form's own.
 *
 * Google Forms has several addresses for the same form, and which one you get
 * depends on when you copy it. Measured 2026-09-04, while the club's form was
 * scheduled to open: /viewform answered 302 to /closedform, so copying the
 * address out of the browser bar hands you today's state. Frozen into the
 * sheet, that leaves a closed form still showing after it opens. /viewform is
 * the address Google redirects FROM in every state, so it is the one that keeps
 * working — everything after the form's id is discarded and rebuilt.
 *
 * Only the PUBLISHED address, /forms/d/e/<id>, is accepted. /forms/d/<id> is
 * the form file, and it serves the form only if link sharing happens to be set
 * to anyone; otherwise it answers with a sign-in page, which inside an iframe
 * is indistinguishable from a blank box. The two cannot be told apart without
 * fetching, so the one that can fail silently is refused.
 */
export function normaliseFormUrl(value, label) {
    if (!value) return null;

    const refuse = (what, how) => {
        throw new ContentError(
            `The sheet's "${label}" cell ${what}\n\n  ${value}\n\n${how}\n\n` +
            `The website has not been changed. It is still showing the previous version.`
        );
    };

    const paste = `To get the right address: open the form, press Send, choose ` +
        `the link tab, turn OFF "Shorten URL", and copy what it shows.`;

    const written = value.trim();

    if (/^https?:\/\/forms\.gle\//i.test(written)) {
        // Resolvable with one more request, deliberately not resolved: a short
        // link is an indirection somebody can re-point without touching the
        // sheet, which is the opposite of what a sheet cell is for.
        refuse('holds a shortened link, which the website does not follow.', paste);
    }
    if (/\/edit\b/i.test(written)) {
        refuse(
            'holds the address for EDITING the form, not for filling it in.',
            `Anyone sent there would be asked to sign in.\n\n${paste}`
        );
    }

    const published =
        /^https?:\/\/docs\.google\.com\/forms\/d\/e\/([A-Za-z0-9_-]+)(\/|$)/i.exec(written);
    if (!published) {
        const isFile =
            /^https?:\/\/docs\.google\.com\/forms\/d\/([A-Za-z0-9_-]+)(\/|$)/i.test(written);
        refuse(
            isFile
                ? 'holds the address of the form FILE rather than the published form.'
                : 'does not look like a Google Forms address.',
            isFile
                ? `That address only works for people the form is already shared ` +
                  `with. Everybody else gets a sign-in page, which on the website ` +
                  `looks like an empty box rather than an error.\n\n${paste}`
                : paste
        );
    }

    return `https://docs.google.com/forms/d/e/${published[1]}/viewform`;
}

/**
 * @param {string} csv Raw body from /spreadsheets/d/e/<pubId>/pub?output=csv
 * @returns {{settings: object, prices: Array, warnings: string[]}}
 */
export function parseSheet(csv) {
    const rows = parseCsv(csv);
    if (rows.length < 2) {
        throw new ContentError(
            `The signup sheet appears to be empty.\n\n` +
            `This usually means it is no longer published to the web. Open the ` +
            `sheet and choose File > Share > Publish to the web, then press Publish.\n\n` +
            `The website has not been changed. It is still showing the previous version.`
        );
    }

    const warnings = [];
    const header = rows[0].map((h) => h.toLowerCase());
    const body = rows.slice(1);

    const at = (name) => {
        const index = header.indexOf(name);
        if (index === -1) {
            throw new ContentError(
                `The signup sheet is missing its "${name}" column.\n\n` +
                `The first row of the sheet names the columns, and the website ` +
                `looks them up by name. It currently reads:\n` +
                header.map((h) => `  • ${h || '(blank)'}`).join('\n') + `\n\n` +
                `Restore that column heading, or ask a developer to update the ` +
                `sheet reader.\n\n` +
                `The website has not been changed. It is still showing the previous version.`
            );
        }
        return index;
    };

    // Column A is settings; its header cell is itself the first label.
    const settings = readSettings(columnOf(rows, 0), warnings);
    for (const key of STATE_KEYS) {
        settings[key] = normaliseState(settings[key], LABEL_BY_KEY.get(key));
    }
    settings.registrationForm = normaliseFormUrl(
        settings.registrationForm, LABEL_BY_KEY.get('registrationForm')
    );

    const type = at('lesson type');
    const three = at('3 week price');
    const six = at('6 week price');
    const prices = body
        .filter((r) => (r[type] ?? '') !== '')
        .map((r) => ({ type: r[type], threeWeek: r[three], sixWeek: r[six] }));

    if (prices.length === 0) warnings.push('The sheet lists no prices.');

    return { settings, prices, warnings };
}
