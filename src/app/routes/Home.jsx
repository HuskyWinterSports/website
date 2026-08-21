import '../../assets/Home.css'
import ContentBlocks from '../../components/ContentBlocks.jsx'
import page from '../../../content/home.json'

/**
 * Words come from the "Home" tab of the club's Google Doc. The photos, the
 * two banner buttons and the order of the sections are layout, and live in
 * content/home.layout.json.
 *
 * See docs/content-sync-spec.md.
 */
export default function Home() {
    return <ContentBlocks page={page} />;
}
