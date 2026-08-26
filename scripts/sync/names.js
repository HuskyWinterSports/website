/**
 * How a name typed by a person becomes something the sync can match on.
 *
 * Used for two different joins — a Drive folder name to a page, and a photo's
 * file name to a layout that asks for it — so it lives on its own rather than
 * in either. It is deliberately forgiving: "STS 3", "sts-3" and "sts 3" are
 * the same file to everybody except a string comparison.
 *
 * No dependencies, on purpose. The hourly content sync matches photo names and
 * has no other reason to load an image library.
 */
export const slugify = (name) =>
    name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
