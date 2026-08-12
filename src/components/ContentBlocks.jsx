import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { internalPath } from '../links.js';

/**
 * Renders the content tree produced by scripts/sync/sync-content.js.
 *
 * Block types come from the layout file in the repo, never from the Google
 * Doc, so an editor can change any wording without being able to change the
 * page design. The class names are the existing vocabulary documented in the
 * README — this introduces no new styling.
 */

function Spans({ spans }) {
    return spans.map((span, index) => {
        let node = span.text;
        if (span.bold) node = <strong>{node}</strong>;
        if (span.italic) node = <em>{node}</em>;
        if (span.href) {
            const path = internalPath(span.href);
            if (path) {
                node = <Link to={path}>{node}</Link>;
            } else if (/^https?:/i.test(span.href)) {
                node = <a href={span.href} target="_blank" rel="noopener noreferrer">{node}</a>;
            } else {
                // mailto:, tel: — same tab, no opener to worry about.
                node = <a href={span.href}>{node}</a>;
            }
        }
        return <Fragment key={index}>{node}</Fragment>;
    });
}

function Block({ block }) {
    switch (block.type) {
        case 'paragraph':
            return <p><Spans spans={block.spans} /></p>;

        case 'heading': {
            const Tag = `h${Math.min(Math.max(block.level, 2), 6)}`;
            return <Tag><Spans spans={block.spans} /></Tag>;
        }

        case 'list': {
            const Tag = block.ordered ? 'ol' : 'ul';
            return (
                <Tag>
                    {block.items.map((item, index) => (
                        <li key={index}><Spans spans={item} /></li>
                    ))}
                </Tag>
            );
        }

        default:
            // Unknown block types are skipped rather than crashing the page.
            // The sync step validates structure, so reaching here means the
            // generated file is older than the renderer.
            return null;
    }
}

/**
 * A Google Form, embedded inside its block rather than after it — the pages
 * that have one show it inside the same white panel as the text.
 *
 * The "open in a new window" link is derived from the embed URL rather than
 * configured separately, so the form can be swapped by changing one string.
 * Its wording lives here, not in the layout file and not in the document,
 * because it describes the embed rather than saying anything the club would
 * ever want to change: both pages that have a form say exactly this.
 */
function EmbeddedForm({ form }) {
    const openUrl = form.src.replace(/[?&]embedded=true/, '');
    return (
        <>
            <p>
                Click{' '}
                <a href={openUrl} target="_blank" rel="noopener noreferrer">here</a>
                {' '}to open the form in a new window.
            </p>
            <iframe
                className="embedded-form"
                title={form.title}
                src={form.src}
                loading="lazy"
            >Loading…</iframe>
        </>
    );
}

function BoxItems({ items }) {
    return <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul>;
}

function Section({ block, title }) {
    // Layout-only blocks carry their own content and never touch the document.
    if (block.type === 'button') {
        return (
            <section className="white-stripe centered-text">
                <div className="banner-buttons">
                    <a
                        className="button"
                        href={block.href}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {block.label}
                    </a>
                </div>
            </section>
        );
    }

    return (
        // `type` is written straight out as the class, so a layout may pass
        // more than one — "big-white-box centered-text" is used for the pages
        // whose text is centred. Verified in a browser, not assumed.
        <section className={block.type}>
            {/* The document's Heading 1 becomes the page's <h1>, rendered by
                whichever block opts in. Every page needs exactly one. */}
            {block.showTitle && title && <h1>{title}</h1>}
            {block.heading && <h2>{block.heading}</h2>}
            {block.content?.map((child, index) => <Block key={index} block={child} />)}

            {/* Several of the document's headings gathered into one panel —
                Contact Us and FAQ are each a single box holding two headed
                groups. Rendering them as separate blocks would add boxes the
                page never had. */}
            {block.groups?.map((group, index) => (
                <Fragment key={index}>
                    <h2>{group.heading}</h2>
                    {group.content.map((child, i) => <Block key={i} block={child} />)}
                </Fragment>
            ))}

            {/* Dates and prices, straight from the signup sheet. One shape
                serves both: a row of boxes, each a heading over a list. */}
            {block.boxes && (
                <section className="boxes">
                    {block.boxes.map((box, index) => (
                        <div className="box" key={index}>
                            <h3>{box.heading}</h3>
                            {box.inset
                                ? <div className="little-white-box"><BoxItems items={box.items} /></div>
                                : <BoxItems items={box.items} />}
                        </div>
                    ))}
                </section>
            )}

            {/* Lazy: visitors who never scroll to Location should not pay to
                download a map they will not see. */}
            {block.map && (
                <iframe
                    className="embedded-map"
                    title={block.map.title}
                    src={block.map.src}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                >Loading…</iframe>
            )}

            {block.form && <EmbeddedForm form={block.form} />}
        </section>
    );
}

export default function ContentBlocks({ page }) {
    return (
        <>
            {page.blocks.map((block, index) => (
                <Section key={index} block={block} title={page.title} />
            ))}
        </>
    );
}
