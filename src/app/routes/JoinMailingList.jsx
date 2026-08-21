import ContentBlocks from '../../components/ContentBlocks.jsx'
import page from '../../../content/join-our-mailing-list.json'

/**
 * Words come from the "Email List" tab of the club's Google Doc; the signup
 * form itself is a layout detail in content/join-our-mailing-list.layout.json.
 * See docs/content-sync-spec.md.
 */
export default function JoinMailingList() {
    return <ContentBlocks page={page} />;
}
