import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

/**
 * The watcher runs on the club's Google account, unattended, for years, and
 * nobody will notice if it quietly stops deciding correctly — a watcher that
 * never emails looks exactly like a website that never breaks.
 *
 * So it is exercised here against stubbed Apps Script services. The API shapes
 * below were captured from the real unauthenticated api.github.com responses.
 */

const SOURCE = readFileSync(
    new URL('../scripts/watcher/sync-watcher.gs', import.meta.url),
    'utf8'
);

const HOUR = 36e5;
const DAY = 864e5;
const ago = (ms) => new Date(Date.now() - ms).toISOString();

function load({ workflowState = 'active', pushedAt = ago(DAY), runs = null, offline = false } = {}) {
    const sent = [];
    const properties = new Map();

    const defaultRuns = [
        { id: 1, status: 'completed', conclusion: 'success', created_at: ago(HOUR), html_url: 'https://example/1' },
    ];

    const responses = {
        workflow: { state: workflowState },
        repo: { pushed_at: pushedAt },
        runs: { workflow_runs: runs ?? defaultRuns },
    };

    const context = createContext({
        Date,
        JSON,
        Math,
        Number,
        String,
        UrlFetchApp: {
            fetch(url) {
                if (offline) return { getResponseCode: () => 403, getContentText: () => '' };
                let body = responses.repo;
                if (url.includes('/runs?')) body = responses.runs;
                else if (url.includes('/actions/workflows/')) body = responses.workflow;
                return { getResponseCode: () => 200, getContentText: () => JSON.stringify(body) };
            },
        },
        PropertiesService: {
            getScriptProperties: () => ({
                getProperty: (k) => (properties.has(k) ? properties.get(k) : null),
                setProperty: (k, v) => properties.set(k, v),
                deleteProperty: (k) => properties.delete(k),
                getProperties: () => Object.fromEntries(properties),
            }),
        },
        MailApp: {
            sendEmail(to, subject, body) { sent.push({ to, subject, body }); },
        },
    });

    runInContext(SOURCE, context);
    return { context, sent, properties, run: () => runInContext('checkWebsiteUpdates()', context) };
}

describe('a healthy site', () => {
    test('sends nothing at all', () => {
        const w = load();
        w.run();
        assert.deepEqual(w.sent, []);
    });
});

describe('GitHub switched the schedule off', () => {
    // The failure this whole script exists for: no error anywhere, edits
    // silently stop reaching the site, and the site itself looks fine.
    let w;
    beforeEach(() => { w = load({ workflowState: 'disabled_inactivity' }); w.run(); });

    test('emails the club', () => {
        assert.equal(w.sent.length, 1);
        assert.equal(w.sent[0].to, 'huskywslessons@gmail.com');
    });

    test('says the site is not broken, because it is not', () => {
        assert.match(w.sent[0].body, /Nothing is broken/);
    });

    test('gives the steps to switch it back on, with the link', () => {
        assert.match(w.sent[0].body, /github\.com\/HuskyWinterSports\/website\/actions/);
        assert.match(w.sent[0].body, /Sync content from Google/);
    });

    test('explains why it happened, including the trap', () => {
        // Editing the Doc does NOT count as repository activity. Someone who
        // assumes it does will conclude the warning is spurious.
        assert.match(w.sent[0].body, /Editing the Google Doc does not count/);
    });
});

describe('drifting towards the cutoff', () => {
    test('warns before it happens, not after', () => {
        const w = load({ pushedAt: ago(50 * DAY) });
        w.run();
        assert.match(w.sent[0].body, /no changes for 50 days/);
        assert.match(w.sent[0].body, /warning, not a fault/);
    });

    test('stays quiet while there is plenty of time', () => {
        const w = load({ pushedAt: ago(30 * DAY) });
        w.run();
        assert.deepEqual(w.sent, []);
    });

    test('does not nag about inactivity once the schedule is already off', () => {
        // Two emails about the same underlying situation is how people learn
        // to filter these.
        const w = load({ workflowState: 'disabled_inactivity', pushedAt: ago(90 * DAY) });
        w.run();
        assert.equal(w.sent.length, 1);
        assert.doesNotMatch(w.sent[0].body, /no changes for 90 days/);
    });
});

describe('the sync failed', () => {
    test('reassures, points at the run, and names the likely cause', () => {
        const w = load({
            runs: [
                { id: 9, status: 'completed', conclusion: 'failure', created_at: ago(HOUR), html_url: 'https://example/9' },
                { id: 8, status: 'completed', conclusion: 'success', created_at: ago(2 * HOUR), html_url: 'https://example/8' },
            ],
        });
        w.run();
        assert.equal(w.sent.length, 1);
        assert.match(w.sent[0].body, /still showing the previous version/);
        assert.match(w.sent[0].body, /renamed/);
        assert.match(w.sent[0].body, /https:\/\/example\/9/);
    });

    test('an in-progress run is not mistaken for a failed one', () => {
        const w = load({
            runs: [
                { id: 10, status: 'in_progress', conclusion: null, created_at: ago(60000), html_url: 'https://example/10' },
                { id: 9, status: 'completed', conclusion: 'success', created_at: ago(HOUR), html_url: 'https://example/9' },
            ],
        });
        w.run();
        assert.deepEqual(w.sent, []);
    });
});

describe('nothing has run for days', () => {
    test('is reported even though no individual run failed', () => {
        const w = load({
            runs: [{ id: 1, status: 'completed', conclusion: 'success', created_at: ago(5 * DAY), html_url: 'https://example/1' }],
        });
        w.run();
        assert.match(w.sent[0].body, /has not checked the Google Doc/);
    });

    test('an empty history counts as stale, not as healthy', () => {
        const w = load({ runs: [] });
        w.run();
        assert.match(w.sent[0].body, /has not checked the Google Doc/);
    });
});

describe('not shouting', () => {
    test('the same problem is not emailed every day', () => {
        const w = load({ workflowState: 'disabled_inactivity' });
        w.run();
        w.run();
        w.run();
        assert.equal(w.sent.length, 1);
    });

    test('but it does say when things recover', () => {
        // Silence after a problem email is indistinguishable from the watcher
        // itself having died.
        const w = load({ workflowState: 'disabled_inactivity' });
        w.run();
        assert.equal(w.sent.length, 1);

        w.context.UrlFetchApp.fetch = (url) => ({
            getResponseCode: () => 200,
            getContentText: () => JSON.stringify(
                url.includes('/runs?')
                    ? { workflow_runs: [{ id: 1, status: 'completed', conclusion: 'success', created_at: ago(HOUR), html_url: 'x' }] }
                    : url.includes('/actions/workflows/')
                        ? { state: 'active' }
                        : { pushed_at: ago(DAY) }
            ),
        });
        w.run();
        assert.equal(w.sent.length, 2);
        assert.match(w.sent[1].subject, /working again/);
    });
});

describe('when GitHub cannot be reached', () => {
    // Apps Script shares outbound addresses, so the unauthenticated rate limit
    // can be exhausted by an unrelated script. Treating that as a site failure
    // would train the club to ignore these emails.
    test('a single blind day is silent', () => {
        const w = load({ offline: true });
        w.run();
        assert.deepEqual(w.sent, []);
    });

    test('but persistent blindness is itself reported', () => {
        const w = load({ offline: true });
        for (let i = 0; i < 5; i++) w.run();
        assert.equal(w.sent.length, 1);
        assert.match(w.sent[0].subject, /cannot check/);
        assert.match(w.sent[0].body, /website is probably fine/);
    });

    test('and a blind day never claims the site recovered', () => {
        const w = load({ workflowState: 'disabled_inactivity' });
        w.run();
        w.context.UrlFetchApp.fetch = () => ({ getResponseCode: () => 403, getContentText: () => '' });
        w.run();
        assert.equal(w.sent.length, 1, 'losing contact must not read as "all clear"');
    });
});
