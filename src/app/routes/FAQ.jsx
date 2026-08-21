import ContentBlocks from '../../components/ContentBlocks.jsx'
import page from '../../../content/faq.json'

/**
 * Words come from the "FAQ" tab of the club's Google Doc. The two topics are
 * its two Heading 2s; the alternating stripes and the left-aligned reading
 * measure come from content/faq.layout.json, so an editor can add, reword or
 * reorder questions without any of the design moving.
 *
 * See docs/content-sync-spec.md.
 */
export default function FAQ() {
    return <ContentBlocks page={page} />;
}
