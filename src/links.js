import { SITE_URL } from './routes.js';

/**
 * A link an editor writes to one of our own pages arrives as a full URL,
 * because that is what pasting an address into Google Docs produces. Left as
 * an ordinary link it would open in a new tab and reload the whole site to
 * reach a page that is already loaded. Recognising our own address and routing
 * it internally means the editor never has to know the difference.
 *
 * @returns {string|null} the internal path, or null if it points elsewhere.
 */
export function internalPath(href) {
    if (!href) return null;
    if (href.startsWith('/')) return href;

    let url;
    try {
        url = new URL(href);
    } catch {
        return null;
    }
    if (!/^https?:$/.test(url.protocol)) return null;

    // Both hosts serve the site; the apex redirects to www. Compare the whole
    // hostname — a "contains" check would accept huskywintersports.org.evil.
    const site = new URL(SITE_URL).hostname.replace(/^www\./, '');
    if (url.hostname.replace(/^www\./, '') !== site) return null;

    return (url.pathname || '/') + url.search + url.hash;
}
