/**
 * Husky Winter Sports — website update watcher
 *
 * Runs on the club's Google account, once a day, and emails the club if the
 * website has stopped updating itself. Installation instructions are in
 * docs/content-sync-spec.md 7.2.
 *
 * WHY THIS EXISTS, and why it is not a GitHub Action:
 *
 * GitHub already reports failures — to people who watch the repository, which
 * is exactly the population this whole system is designed around. A watcher
 * that lives inside GitHub also cannot see the failure that matters most: the
 * one where GitHub itself stops running the schedule.
 *
 * This script deliberately uses NO credential. The repository is public, so
 * api.github.com answers without a token. Nothing here expires when a student
 * graduates — which is the entire point, and is worth preserving if anyone
 * ever edits this file.
 */

var REPO = 'HuskyWinterSports/website';
var WORKFLOW = 'sync-content.yml';
var NOTIFY = 'huskywslessons@gmail.com';

// How long the website may go without a successful check before that is
// itself treated as a fault. The sync runs hourly, so 48h is ~48 misses.
var STALE_HOURS = 48;

// GitHub switches off scheduled workflows in a public repository after 60 days
// with no repository activity. Warn with time to spare rather than reporting
// it after the fact.
var INACTIVITY_LIMIT_DAYS = 60;
var INACTIVITY_WARN_DAYS = 45;

// Do not send the same complaint every single day; a daily email about a known
// problem gets filtered, and then the next real one is invisible too.
var RENAG_DAYS = 7;

/** The function to attach a daily time-driven trigger to. */
function checkWebsiteUpdates() {
    var problems = [];

    var workflow = getJson('https://api.github.com/repos/' + REPO +
        '/actions/workflows/' + WORKFLOW);

    // A rate limit or an outage is not evidence of anything. Say so, and only
    // escalate if it persists — see noteCheckFailure.
    if (workflow === null) {
        noteCheckFailure();
        return;
    }
    clearCheckFailures();

    // 1. Has GitHub switched the schedule off?
    if (workflow.state !== 'active') {
        problems.push({
            key: 'workflow-' + workflow.state,
            text: 'The automatic website updates have been switched off.\n\n' +
                'GitHub turns off scheduled jobs in a public repository after ' +
                INACTIVITY_LIMIT_DAYS + ' days with no activity. Editing the ' +
                'Google Doc does not count — only changes to the website code ' +
                'or content do — so a quiet off-season is enough to trigger it.\n\n' +
                'Nothing is broken and no work is lost. To switch it back on:\n' +
                '  1. Go to https://github.com/' + REPO + '/actions\n' +
                '  2. Choose "Sync content from Google" on the left.\n' +
                '  3. Press the button to enable the workflow.\n\n' +
                'Until then, edits to the Google Doc will not reach the website.',
        });
    }

    // 2. Is the repository drifting towards that cutoff?
    var repo = getJson('https://api.github.com/repos/' + REPO);
    if (repo && workflow.state === 'active') {
        var quietDays = daysSince(repo.pushed_at);
        if (quietDays >= INACTIVITY_WARN_DAYS) {
            problems.push({
                key: 'inactivity-warning',
                text: 'The website has had no changes for ' + quietDays + ' days.\n\n' +
                    'After ' + INACTIVITY_LIMIT_DAYS + ' days GitHub switches off the ' +
                    'automatic updates until someone turns them back on. This is a ' +
                    'warning, not a fault — everything is working.\n\n' +
                    'The simplest way to reset the clock is to make any real edit ' +
                    'to the Google Doc and let it publish.',
            });
        }
    }

    // 3. Did the most recent attempt fail, and has anything worked lately?
    var runs = getJson('https://api.github.com/repos/' + REPO +
        '/actions/workflows/' + WORKFLOW + '/runs?per_page=20');
    var list = runs && runs.workflow_runs ? runs.workflow_runs : [];
    var finished = list.filter(function (r) { return r.status === 'completed'; });

    if (finished.length && finished[0].conclusion !== 'success') {
        problems.push({
            key: 'failed-' + finished[0].id,
            text: 'The website could not be updated from the Google Doc.\n\n' +
                'The website itself is fine. It is still showing the previous ' +
                'version, and visitors see nothing wrong.\n\n' +
                'The most likely cause is a heading or a tab in the document ' +
                'having been renamed. Open the link below and read the summary ' +
                'at the top — it says in plain English what it was looking for ' +
                'and what the document actually contains:\n\n' +
                finished[0].html_url,
        });
    }

    var lastGood = finished.filter(function (r) { return r.conclusion === 'success'; })[0];
    if (!lastGood || hoursSince(lastGood.created_at) > STALE_HOURS) {
        problems.push({
            key: 'stale',
            text: 'The website has not checked the Google Doc for at least ' +
                STALE_HOURS + ' hours.\n\n' +
                'It normally checks every hour. This means edits to the document ' +
                'are probably not reaching the site.\n\n' +
                'Have a look at https://github.com/' + REPO + '/actions',
        });
    }

    deliver(problems);
}

/* ---------------------------------------------------------------------- */

function deliver(problems) {
    var store = PropertiesService.getScriptProperties();
    var sending = [];

    for (var i = 0; i < problems.length; i++) {
        var last = Number(store.getProperty('sent:' + problems[i].key) || 0);
        if (daysBetween(last, Date.now()) >= RENAG_DAYS) {
            sending.push(problems[i]);
            store.setProperty('sent:' + problems[i].key, String(Date.now()));
        }
    }

    // Tell them when it recovers. Silence after a problem email is otherwise
    // indistinguishable from the watcher itself having died.
    var wasBroken = store.getProperty('state') === 'broken';
    if (problems.length === 0) {
        store.setProperty('state', 'ok');
        clearSentKeys(store);
        if (wasBroken) {
            send('Husky Winter Sports website: updates are working again',
                'The website is updating itself from the Google Doc again. ' +
                'No action needed.');
        }
        return;
    }

    store.setProperty('state', 'broken');
    if (!sending.length) return;

    var body = sending.map(function (p) { return p.text; }).join('\n\n' +
        '----------------------------------------------------------------\n\n');
    send('Husky Winter Sports website needs attention', body +
        '\n\n----------------------------------------------------------------\n\n' +
        'This is an automatic check that runs on the club Google account. ' +
        'It repeats at most once every ' + RENAG_DAYS + ' days per problem.');
}

function send(subject, body) {
    MailApp.sendEmail(NOTIFY, subject, body);
}

function clearSentKeys(store) {
    var all = store.getProperties();
    for (var key in all) {
        if (key.indexOf('sent:') === 0) store.deleteProperty(key);
    }
}

/**
 * Being unable to reach GitHub is normal and transient — Apps Script shares
 * outbound addresses, so the unauthenticated rate limit can be exhausted by
 * somebody else entirely. Only complain once it has persisted long enough that
 * "the watcher is blind" is itself the problem.
 */
function noteCheckFailure() {
    var store = PropertiesService.getScriptProperties();
    var count = Number(store.getProperty('checkFailures') || 0) + 1;
    store.setProperty('checkFailures', String(count));

    if (count === 5) {
        send('Husky Winter Sports website: cannot check whether it is updating',
            'This automatic check has been unable to reach GitHub for ' + count +
            ' days running.\n\nThe website is probably fine — this says nothing ' +
            'about the site itself, only that the check cannot see it. If it ' +
            'keeps happening, ask whoever set this up to look at it.');
    }
}

function clearCheckFailures() {
    PropertiesService.getScriptProperties().deleteProperty('checkFailures');
}

function getJson(url) {
    try {
        var response = UrlFetchApp.fetch(url, {
            muteHttpExceptions: true,
            headers: { Accept: 'application/vnd.github+json' },
        });
        if (response.getResponseCode() !== 200) return null;
        return JSON.parse(response.getContentText());
    } catch (error) {
        return null;
    }
}

function hoursSince(iso) {
    return (Date.now() - new Date(iso).getTime()) / 36e5;
}

function daysSince(iso) {
    return Math.floor(hoursSince(iso) / 24);
}

function daysBetween(a, b) {
    return Math.abs(b - a) / 864e5;
}

/**
 * Run this once by hand after installing, to check the wiring. It emails a
 * summary of what it can see whether or not anything is wrong.
 */
function testWatcherNow() {
    var workflow = getJson('https://api.github.com/repos/' + REPO +
        '/actions/workflows/' + WORKFLOW);
    var runs = getJson('https://api.github.com/repos/' + REPO +
        '/actions/workflows/' + WORKFLOW + '/runs?per_page=5');

    if (!workflow) {
        send('Website watcher test: could not reach GitHub',
            'The test could not read the repository. Check the REPO and ' +
            'WORKFLOW settings at the top of the script.');
        return;
    }

    var lines = ['Automatic updates: ' + workflow.state, '', 'Recent checks:'];
    var list = runs && runs.workflow_runs ? runs.workflow_runs : [];
    for (var i = 0; i < list.length; i++) {
        lines.push('  ' + list[i].created_at + '  ' +
            (list[i].conclusion || list[i].status));
    }
    lines.push('', 'If this email arrived, the watcher is installed correctly.');
    send('Website watcher test: it works', lines.join('\n'));
}
