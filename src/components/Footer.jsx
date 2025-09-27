import '../assets/Footer.css';

export default function Footer(props) {
    return (
        <footer>
            <div className='footer-info'>
                <div className='contact-info'> 
                    <h3>Contact Us</h3>
                    <ul>
                        <li>Address: 207 HUB SAO 130 Box 352238, Seattle, WA 98195</li>
                        <li>Email: <a href="mailto:huskywslessons@gmail.com">huskywslessons@gmail.com</a></li>
                        <li>Instagram: @huskywintersports</li>
                        <li>Facebook: @HuskyWinterSports</li>
                    </ul>
                </div>
                <div className='copyright'>  
                    <p>HWS operates under Ullr Inc. as a concessionaire under US Forest Service Permits issued to Ski Lifts Inc. partially operating within the Mt. Baker, Snoqualmie, and Wenatchee National Forests. Partners in Winter RecreationThis program provides employment, services, and privileges regardless of race, color, creed, sex, religion, age, or national origin.</p>
                    <p>© 2025 HWS. All rights reserved.</p>
                </div>
            </div>
            <ul>
                <li><img src='/images/summit.avif' alt="summit logo"/></li>
                <li><img src='/images/forrest_service.avif' alt="forrest service logo"/></li>
                <li><img src='/images/PSIA.avif' alt="PSIA logo"/></li>
                <li><img src='/images/AASI.gif' alt="AASI logo"/></li>
            </ul>
        </footer>
    )
}