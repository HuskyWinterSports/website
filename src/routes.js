/**
 * Every page on the site, with the metadata search engines and social
 * previews need.
 *
 * Used in three places, which is the point of keeping one list:
 *   - the app, to set <title> and the description as visitors navigate
 *   - scripts/build/prerender.js, to write a real HTML file per route with
 *     these tags baked in (social scrapers do not run JavaScript, so
 *     client-side updates alone are invisible to them)
 *   - scripts/build/prerender.js again, to generate sitemap.xml
 *
 * `description` is what shows under the link in Google results. Aim for
 * roughly 150 characters and write it for a parent searching for lessons.
 */

export const SITE_URL = 'https://www.huskywintersports.org';
export const SITE_NAME = 'Husky Winter Sports';

export const ROUTES = [
    {
        path: '/',
        title: 'Husky Winter Sports | UW Ski & Snowboard School',
        description:
            'Affordable ski and snowboard lessons at The Summit at Snoqualmie, taught by ' +
            'volunteer University of Washington student instructors since 1937.',
    },
    {
        path: '/lesson-info',
        title: 'Lesson Information | Husky Winter Sports',
        description:
            'Dates, prices, ability levels and location for Husky Winter Sports ski and ' +
            'snowboard lessons at The Summit at Snoqualmie. Group, private and family lessons.',
    },
    {
        path: '/lesson-registration',
        title: 'Lesson Registration | Husky Winter Sports',
        description:
            'Register for Husky Winter Sports ski and snowboard lessons, and read our ' +
            'cancellation and refund policy.',
    },
    {
        path: '/join-our-mailing-list',
        title: 'Join Our Mailing List | Husky Winter Sports',
        description:
            'Get notified when Husky Winter Sports lesson registration opens for the ' +
            'coming season.',
    },
    {
        path: '/become-an-instructor',
        title: 'Become an Instructor | Husky Winter Sports',
        description:
            'UW students: teach skiing or snowboarding, earn a free Summit at Snoqualmie ' +
            'season pass, and train toward PSIA/AASI certification.',
    },
    {
        path: '/diversity-and-inclusion',
        title: 'Diversity and Inclusion | Husky Winter Sports',
        description:
            'How Husky Winter Sports works to make winter sports accessible to everyone, ' +
            'and how your donation supports our programs.',
    },
    {
        path: '/faq',
        title: 'FAQ | Husky Winter Sports',
        description:
            'Answers to common questions about Husky Winter Sports lesson registration, ' +
            'lift tickets, ability levels and what to expect on the mountain.',
    },
    {
        path: '/contact-us',
        title: 'Contact Us | Husky Winter Sports',
        description:
            'Get in touch with Husky Winter Sports about ski and snowboard lessons at ' +
            'The Summit at Snoqualmie.',
    },
];

export const NOT_FOUND_META = {
    title: 'Page Not Found | Husky Winter Sports',
    description: 'The page you are looking for could not be found.',
};

export function metaForPath(pathname) {
    return ROUTES.find((route) => route.path === pathname) ?? NOT_FOUND_META;
}
