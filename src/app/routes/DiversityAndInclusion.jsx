import ContentBlocks from '../../components/ContentBlocks.jsx'
import page from '../../../content/diversity-and-inclusion.json'

/**
 * The words on this page live in the club's Google Doc, in the tab named
 * "Diversity and Inclusion". Editing that document and running the sync
 * regenerates the JSON imported above; the layout (which blocks, in what
 * order) stays here in content/diversity-and-inclusion.layout.json.
 *
 * See docs/content-sync-spec.md.
 */
export default function DiversityAndInclusion() {
    return <ContentBlocks page={page} />;
}
