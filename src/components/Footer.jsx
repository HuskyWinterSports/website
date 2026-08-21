import '../assets/Footer.css';

export default function Footer() {
    return (
        <>
            <div className='footer-img'>
                <img src="/images/HWS_logo.avif" alt="Husky Winter Sports"/>
            </div>
            <footer>
                <div className='footer-info'>
                    <div className='contact-info'> 
                        <h3>Contact Us</h3>
                        <ul>
                            <li>Address: 207 HUB SAO 130 Box 352238, Seattle, WA 98195</li>
                            <li>Email: <a href="mailto:huskywslessons@gmail.com">huskywslessons@gmail.com</a></li>
                            {/* Facebook was dropped in August 2026: the handle
                                the footer advertised does not resolve, and the
                                club's only presence there is a private group. */}
                            <li>
                                Instagram:{' '}
                                <a
                                    href="https://www.instagram.com/huskywintersports/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >@huskywintersports</a>
                            </li>
                        </ul>
                    </div>
                    <div className='copyright'>  
                        <p>HWS operates under Ullr Inc. as a concessionaire under US Forest Service Permits issued to Ski Lifts Inc. partially operating within the Mt. Baker, Snoqualmie, and Wenatchee National Forests. Partners in Winter Recreation. This program provides employment, services, and privileges regardless of race, color, creed, sex, religion, age, or national origin.</p>
                        {/* Computed, not typed. It read "© 2025" in August 2026,
                            because a hardcoded year is a fact with an expiry
                            date and nobody whose job it is to notice. */}
                        <p>© {new Date().getFullYear()} HWS. All rights reserved.</p>
                    </div>
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