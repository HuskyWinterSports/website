import '../../assets/Global.css'

export default function ContactUs() {
    return (
        <>
            {/* HWS logo */}

            <section className='big-white-box'>
                <div className='centered-text'>
                    <h1>Contact Us</h1>
                    <ul className='address'>
                        <li>Husky Winter Sports</li>
                        <li>207 HUB SAO 130 Box 352238</li>
                        <li>Seattle, WA 98195</li>
                    </ul>
                    <p>For questions about lessons, the best way to contact us is via email at <a href='mailto:huskywslessons@gmail.com'>huskywslessons@gmail.com</a>. Expect a response within three to five business days*. </p>
                    <p className='footnote'>*During the Spring and Summer months (March - August), email and voice messages are checked less frequently, and it may take up to one week to receive a response.</p>
                </div>
            </section>
        </>
    );
}