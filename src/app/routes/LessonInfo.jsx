import '../../assets/Global.css'
import '../../assets/LessonInfo.css'
import ContentBlocks from '../../components/ContentBlocks.jsx'
import page from '../../../content/lesson-info.json'

/**
 * Prose comes from the "Lesson Info" tab of the club's Google Doc; the dates
 * and prices come from the signup sheet, because they change every season and
 * are the single most important thing on this site to get right.
 *
 * See docs/content-sync-spec.md.
 */
export default function LessonInfo() {
    return <ContentBlocks page={page} />;
}
