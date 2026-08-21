import '../../assets/Global.css'
import ContentBlocks from '../../components/ContentBlocks.jsx'
import page from '../../../content/support-us.json'

/**
 * Words come from the "Support Us" tab of the club's Google Doc.
 * See docs/content-sync-spec.md.
 */
export default function SupportUs() {
    return <ContentBlocks page={page} />;
}
