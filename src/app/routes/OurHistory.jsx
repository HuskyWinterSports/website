import '../../assets/Global.css'
import ContentBlocks from '../../components/ContentBlocks.jsx'
import page from '../../../content/our-history.json'

/**
 * Words come from the "Our History" tab of the club's Google Doc.
 * See docs/content-sync-spec.md.
 */
export default function OurHistory() {
    return <ContentBlocks page={page} />;
}
