import { ContentError } from './join-sections.js';

/**
 * Reads the club's published signup sheet.
 *
 * The sheet is ONE grid holding three unrelated tables side by side, of
 * different lengths, with no row-to-row relationship. Row 3 says "session A
 * lesson 2" AND "Single-Student prices" AND "the season is 2026/27" — three
 * facts that have nothing to do with each other. So this reads column groups,
 * never rows. See docs/content-sync-spec.md §5.4a.
 */

const REGISTRATION_STATES = ['open', 'waitlist', 'full', 'not_yet_open'];

/** Labels understood in the first column. Anything else is a warning. */
const SETTINGS = {
    'lesson director': 'lessonDirector',
    'season year': 'seasonYear',
    'registration state': 'registrationState',
    'refund deadline': 'refundDeadline',
};

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

        const key = SETTINGS[label];
        if (!key) {
            // Could be a value belonging to the label above it, or a note an
            // officer added. Either way, never fatal.
            continue;
        }

        const value = cells.slice(i + 1).find((c) => c !== '');
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

function normaliseState(value) {
    if (!value) return null;
    const state = value.toLowerCase().replace(/[\s-]+/g, '_');
    if (REGISTRATION_STATES.includes(state)) return state;

    // Never guess. This is the value that tells a parent whether they can book.
    throw new ContentError(
        `The sheet says the registration state is "${value}", which is not one ` +
        `of the values the website knows.\n\n` +
        `It must be one of:\n` +
        REGISTRATION_STATES.map((s) => `  • ${s.replace(/_/g, ' ')}`).join('\n') + `\n\n` +
        `Correct the "Registration State" cell in the sheet.\n\n` +
        `The website has not been changed. It is still showing the previous version.`
    );
}

/**
 * @param {string} csv Raw body from /spreadsheets/d/e/<pubId>/pub?output=csv
 * @returns {{settings: object, sessions: Array, prices: Array, warnings: string[]}}
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
    settings.registrationState = normaliseState(settings.registrationState);

    const session = at('session');
    const lesson = at('lesson');
    const date = at('date');
    const sessions = body
        .filter((r) => (r[session] ?? '') !== '')
        .map((r) => ({ session: r[session], lesson: r[lesson], date: r[date] }));

    const type = at('lesson type');
    const three = at('3 week price');
    const six = at('6 week price');
    const prices = body
        .filter((r) => (r[type] ?? '') !== '')
        .map((r) => ({ type: r[type], threeWeek: r[three], sixWeek: r[six] }));

    if (sessions.length === 0) warnings.push('The sheet lists no lesson dates.');
    if (prices.length === 0) warnings.push('The sheet lists no prices.');

    return { settings, sessions, prices, warnings };
}
