import ContentBlocks from '../../components/ContentBlocks.jsx'
import page from '../../../content/contact-us.json'

/**
 * Words come from the "Contact Us" tab of the club's Google Doc.
 * See docs/content-sync-spec.md.
 */
export default function ContactUs() {
    return <ContentBlocks page={page} />;
}
