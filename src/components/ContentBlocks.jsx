import { Fragment } from 'react';

/**
 * Renders the content tree produced by scripts/sync/sync-content.js.
 *
 * Block types come from the layout file in the repo, never from the Google
 * Doc, so an editor can change any wording without being able to change the
 * page design. The class names are the existing vocabulary documented in the
 * README — this introduces no new styling.
 */

function isExternal(href) {
    return /^https?:/i.test(href);
}

function Spans({ spans }) {
    return spans.map((span, index) => {
        let node = span.text;
        if (span.bold) node = <strong>{node}</strong>;
        if (span.italic) node = <em>{node}</em>;
        if (span.href) {
            node = isExternal(span.href)
                ? <a href={span.href} target="_blank" rel="noopener noreferrer">{node}</a>
                : <a href={span.href}>{node}</a>;
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

function Section({ block }) {
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
        <section className={block.type}>
            {block.heading && <h2>{block.heading}</h2>}
            {block.content?.map((child, index) => <Block key={index} block={child} />)}
        </section>
    );
}

export default function ContentBlocks({ page }) {
    return (
        <>
            {page.blocks.map((block, index) => <Section key={index} block={block} />)}
        </>
    );
}
