import ContentBlocks from '../../components/ContentBlocks.jsx'
import page from '../../../content/become-an-instructor.json'

/**
 * Words come from the "Become an Instructor" tab of the club's Google Doc.
 * See docs/content-sync-spec.md.
 */
export default function BecomeAnInstructor() {
    return <ContentBlocks page={page} />;
}
