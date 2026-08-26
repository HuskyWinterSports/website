import '../assets/Footer.css';
import content from '../../content/footer.json';
import { Blocks } from './ContentBlocks.jsx';

/**
 * The footer, on every page.
 *
 * Its words come from the "Footer" tab of the club's document, like every
 * other page's do — the address, the email, the Instagram handle, the Forest
 * Service permit wording and the non-discrimination clause. An officer changes
 * any of them by editing the document, which is the whole point: the previous
 * version of this file had them typed into JavaScript, where the only way to
 * fix a wrong address was a pull request.
 *
 * What stays here is what is not words: which piece goes in which column, and
 * the partner logos, which are files in this repository rather than anything
 * the document could name.
 */
export default function Footer() {
    return (
        <>
            <div className='footer-img'>
                <img src="/images/HWS_logo.avif" alt="Husky Winter Sports"/>
            </div>
            <footer>
                <div className='footer-info'>
                    {content.blocks.map((block, index) => (
                        <div className={block.type} key={index}>
                            {/* "Contact Us" is drawn; "About" is a label for
                                the legal paragraph and is not. The layout file
                                is what decides, and the ~ in the document says
                                so to whoever is reading it there. */}
                            {block.heading && <h3>{block.heading}</h3>}
                            <Blocks content={block.content} />
                        </div>
                    ))}
                </div>
                <ul>
                    <li><img src='/images/summit.avif' alt="The Summit at Snoqualmie"/></li>
                    <li><img src='/images/forest_service.avif' alt="United States Forest Service"/></li>
                    <li><img src='/images/PSIA.avif' alt="Professional Ski Instructors of America"/></li>
                    <li><img src='/images/AASI.gif' alt="American Association of Snowboard Instructors"/></li>
                </ul>
            </footer>
        </>
    )
}
