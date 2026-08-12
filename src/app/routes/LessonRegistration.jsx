import '../../assets/Global.css'
import ContentBlocks from '../../components/ContentBlocks.jsx'
import page from '../../../content/lesson-registration.json'

/**
 * The refund policy comes from the "Lesson Registration" tab of the club's
 * Google Doc. Whether registration is open, waitlisted or closed comes from
 * the signup sheet — and it decides both the sentence at the top of the page
 * and whether the signup form appears at all.
 *
 * See docs/content-sync-spec.md.
 */
export default function LessonRegistration() {
    return <ContentBlocks page={page} />;
}
