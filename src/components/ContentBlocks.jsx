import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { internalPath } from '../links.js';
import Slider from './Slider.jsx';

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

/**
 * Splits a section's content into whatever comes before the first Heading 3,
 * and then one card per Heading 3.
 *
 * Done here rather than in the sync so that content/<page>.json stays a
 * faithful record of what the document says. Whether a run of headings is a
 * list down the page or a row of cards is a layout decision, and layout lives
 * in the layout file.
 */
function groupIntoCards(content) {
    const lead = [];
    const cards = [];

    for (const block of content) {
        if (block.type === 'heading' && block.level === 3) {
            cards.push({ heading: block, body: [] });
        } else if (cards.length) {
            cards[cards.length - 1].body.push(block);
        } else {
            lead.push(block);
        }
    }

    return { lead, cards };
}

function Cards({ content }) {
    const { lead, cards } = groupIntoCards(content);
    return (
        <>
            {lead.map((child, index) => <Block key={index} block={child} />)}
            <section className="cards">
                {cards.map((card, index) => (
                    <div className="card" key={index}>
                        <h3><Spans spans={card.heading.spans} /></h3>
                        {card.body.map((child, i) => <Block key={i} block={child} />)}
                    </div>
                ))}
            </section>
        </>
    );
}

function BoxItems({ items }) {
    return <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul>;
}

/**
 * Buttons named by the layout, not the document. A link to one of our own
 * pages routes internally; anything else opens in a new tab.
 */
function Buttons({ buttons }) {
    return (
        <div className="banner-buttons">
            {buttons.map((button) => {
                const path = internalPath(button.href);
                return path
                    ? <Link className="button" key={button.href} to={path}>{button.label}</Link>
                    : (
                        <a
                            className="button"
                            key={button.href}
                            href={button.href}
                            target="_blank"
                            rel="noopener noreferrer"
                        >{button.label}</a>
                    );
            })}
        </div>
    );
}

/**
 * Photographs that are not a carousel: the club's two newspaper clippings.
 *
 * Fitted rather than cropped, like the carousel, and linked to the full-size
 * file — a scan of 1996 newsprint is only worth having if it can be read.
 *
 * No visible caption. A file name is a handle, not a caption, and printing it
 * under the photograph produced "Newspaper 1" — worse than nothing. It stays
 * the alt text, where a name that is merely serviceable still does its job.
 */
function Figures({ figures }) {
    return (
        <div className={`figures figures-${Math.min(figures.length, 3)}`}>
            {figures.map((figure) => (
                <a
                    className="figure"
                    key={figure.src}
                    href={figure.src}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <img
                        style={{ maxWidth: `min(100%, ${figure.width}px)` }}
                        src={figure.src}
                        srcSet={figure.srcset}
                        sizes="(max-width: 700px) 92vw, 46vw"
                        alt={figure.alt}
                        loading="lazy"
                        decoding="async"
                    />
                </a>
            ))}
        </div>
    );
}

function Section({ block, title }) {
    // The carousel is the one block that is purely layout: no words at all.
    if (block.slider) {
        return <Slider slides={block.slider.slides} caption={block.slider.caption} />;
    }

    if (block.figures && !block.section && !block.lead) {
        return (
            <section className={block.type}>
                {block.heading && <h2>{block.heading}</h2>}
                <Figures figures={block.figures} />
            </section>
        );
    }

    // The home banner styles its lines rather than stacking paragraphs, so it
    // renders its own way instead of going through Block.
    if (block.banner) {
        return (
            <section className={block.type}>
                <div className="banner-overlay">
                    {title && <h1 className="home-title">{title}</h1>}
                    {block.content?.map((child, index) => (
                        <p className="home-subtitle" key={index}>
                            <Spans spans={child.spans} />
                        </p>
                    ))}
                    {block.buttons && <Buttons buttons={block.buttons} />}
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
            {block.cards
                ? <Cards content={block.content ?? []} />
                : block.content?.map((child, index) => <Block key={index} block={child} />)}

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
                            <BoxItems items={box.items} />
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

            {block.figures && <Figures figures={block.figures} />}

            {block.buttons && <Buttons buttons={block.buttons} />}

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
