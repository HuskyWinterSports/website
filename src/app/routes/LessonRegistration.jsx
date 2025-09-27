import '../../assets/Global.css'
import '../../assets/LessonRegistration.css'

export default function LessonRegistration() {
    return (
        <>
            <section className='big-white-box'>
                <h1>LESSON REGISTRATION</h1>
                <div className='centered-text'>
                    <p>Lesson registration for the 2025/26 ski and snowboard season will open <strong>September 15th at 9:00am PST.</strong></p>
                    <p>Click <a href='https://docs.google.com/forms/d/e/1FAIpQLSfjLegq7v2dtmjG_YTOisGHB9gBcoSKPdTvs9VDIEcfnHs-0Q/viewform?usp=header' target='blank'>here</a> to open the form in a new window.</p>
                    <iframe className= 'big-form' src="https://docs.google.com/forms/d/e/1FAIpQLSfjLegq7v2dtmjG_YTOisGHB9gBcoSKPdTvs9VDIEcfnHs-0Q/viewform?embedded=true" width="640" height="500" frameborder="0" marginheight="0" marginwidth="0">Loading…</iframe>
                    <iframe className='small-form' src="https://docs.google.com/forms/d/e/1FAIpQLSfjLegq7v2dtmjG_YTOisGHB9gBcoSKPdTvs9VDIEcfnHs-0Q/viewform?embedded=true" width="250" height="300" frameborder="0" marginheight="0" marginwidth="0">Loading…</iframe>
                    <p>If you have questions, please email <a href='mailto:huskywslessons@gmail.com'>huskywslessons@gmail.com</a>. We will get back to you in 1 to 2 business days.*</p>
                    <p className='footnote'>*During the Spring and Summer months (March - August), email and voice messages are checked less frequently, and it may take up to one week to receive a response.</p>
                    {/* stars? */}
                    <h2>Lesson Availability</h2>
                    <p className='footnote'>In the past, there has been more demand for Husky Winter Sports lessons than we can accommodate. </p>
                    {/* stars? */}
                </div>
            </section>
            <section className='white-stripe'>
                <h2>Cancellation and Refund Eligibility</h2>
                <h3>Cancellation by December 31st - No Questions Asked:</h3>
                <p>Customers can request a full cancellation of their lessons by December 31st, one month before the lessons' scheduled start date, without any questions asked. Full refunds will be provided for cancellations made within this period.</p>
                <h3>Injuries:</h3>
                <p>In the unfortunate event of a student sustaining an injury that prevents their continued participation in lessons, our refund procedure is as follows:</p>
                <ol>
                    <li>In the unfortunate event of a student sustaining an injury that prevents their continued participation in lessons, our refund procedure is as follows:</li>
                    <li>Injury After Lessons Start: If the injury occurs after the lessons have started, we will provide a refund for the missed classes later in the season, subtracting 20% from the total lesson price. This refund will require valid documentation as confirmation.</li>
                </ol>
                <h3>Absence from Lessons:</h3>
                <p>Please note that partial refunds may not be granted on a per-lesson basis for missed sessions. If a child is absent from a scheduled lesson without prior communication or cancellation, partial refunds will not be provided for the missed lesson.</p>
                <p>We strive to provide flexibility and fairness in our refund policies, but it's essential to adhere to the specific guidelines mentioned above for refund eligibility and exceptions. For any further clarification or assistance, please feel free to contact our lesson director, Phish Masteller.</p>
                <h3>Refund Process & Time Frame:</h3>
                <p>Contact <a href='mailto:huskywslessons@gmail.com'>huskywslessons@gmail.com</a> and expect an email back within 5 business days.</p>
                <h3>Inclement Weather:</h3>
                <p>Inclement weather is an inherent risk we all accept when engaging in mountain activities. As such, we understand that adverse weather conditions may impact our operations, and everyone involved will be equally affected. Therefore, refunds or compensation for changes in scheduling due to inclement weather are not guaranteed.</p>
                <h3>No-Show Policy:</h3>
                <p>To ensure the smooth operation of our skiing lessons and fairness to all participants, customers who fail to show up for their scheduled lesson dates without prior communication or cancellation will be considered absent, and will not be given a partial refund.</p>
                <h3>Exceptions & Discretion:</h3>
                <p>At our discretion, we may consider exceptions to our standard refund policies in certain circumstances. While we strive to maintain consistency in our policies for all customers, we understand that unique situations may arise. If you believe you have valid grounds for a refund or require special consideration due to extenuating circumstances, we encourage you to reach out to our lesson director, Phish <a href='mailto:huskywslessons@gmail.com'>(huskywslessons@gmail.com)</a>. Our team will carefully review your request and, where appropriate, exercise our discretion to assess the situation on a case-by-case basis. Please understand that granting an exception is not guaranteed and will be subject to our sole judgment. We are committed to ensuring customer satisfaction and will make every effort to address your concerns in a fair and equitable manner.</p>
                <h3>Policy Updates:</h3>
                <p>Effective from August 2023, this policy supersedes all previous versions and governs all refund requests and related matters. Should the policy change, you will be notified via our mailing list.</p>
            </section>
        </>
    );
}