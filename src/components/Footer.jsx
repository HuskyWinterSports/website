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
                            {/* Instagram is the club's active channel — verified
                                in a browser, not by status code: instagram.com
                                returns 200 for accounts that do not exist.

                                Facebook was removed in August 2026. The footer
                                had advertised @HuskyWinterSports for years and
                                it does not resolve; every handle variant returns
                                "This content isn't available right now". The only
                                Facebook presence is a private group, which sends
                                a prospective parent to a join request rather than
                                to anything they can read. */}
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