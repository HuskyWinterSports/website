import { Link, Outlet } from 'react-router-dom';

import '../../assets/Global.css'

export default function FAQ() {
    return (
        <>
            <section className='big-white-box'>
                <h1>FAQ</h1>
                <div className='topic'>
                    <h2>REGISTRATION</h2>
                    <h3>Is there an age limit for lessons?</h3>
                    <p>We will be accepting students as young as 5 years old.</p>
                    <h3>I filled out the registration form, but can’t figure out where to pay.</h3>
                    <p>We will send you a confirmation email once we have processed your request. This confirmation will contain a Paypal link and instructions for making payments. Please allow a few days for us to process requests.</p>
                    <h3>When will I receive confirmation of lesson registration?</h3>
                    <p>Please allow 5-7 business days for a confirmation email. This email will be sent to the e-mail address listed on your registration, so please check all relevant accounts and spam folders or add <a href='mailto:huskywslessons@gmail.com'>huskywslessons@gmail.com</a> to your contacts for best results.</p>
                    <h3>Why aren’t lift tickets included in lesson fees?</h3>
                    <p>The Summit at Snoqualmie offers passes for a variety of skill levels for different age groups, and Husky Winter Sports cannot purchase and sell these to our students. Unless you already have a Season’s Pass, please check with your instructor before purchasing daily passes, as special cases exist. For example, never-ever lessons will most likely not ride the lift on their first weekend of instruction and will not need a pass; beginner lessons may wish to purchase a cheaper Beginner pass which allows them to ride on the Holiday and Gallery lifts only. Child tickets (0-6 years) are available for only $15 a day.</p>
                    <p><a target='_blank' href='http://www.summitatsnoqualmie.com/tickets-and-passes/daily-lift-tickets'>http://www.summitatsnoqualmie.com/tickets-and-passes/daily-lift-tickets</a></p>
                    <h3>How do refunds work?</h3>
                    <p>See <Link to="/lesson-registration">Lesson Registration</Link> page for details.</p>
                </div>
                <div className='topic'>
                    <h2>LESSONS</h2>
                    <h3>Why isn’t my child on the lift yet?</h3>
                    <ul>
                        <li>Our instructors are trained to make sure that your child possesses the necessary skills before they are moved onto more challenging terrain. Younger children may need some time to get used to the snow before they can safely navigate the more advanced terrain served by the lifts.</li>
                        <li>Snowboarding is trickier to start than skiing so your child may require some extra time to get used to sliding sideways.</li>
                    </ul>
                    <h3>What should I do while my child is in lessons?</h3>                
                    <p>Enjoy the 1,994 acres and lifts that Snoqualmie has to offer, grab a coffee or snack in the lodge, or take an adult lesson with us! While we know you want to see your children’s progress first hand, it is easier for the instructors to teach when they have their students’ full attention.</p>
                    <h3>What can I work on with my child outside of lessons?</h3>                
                    <p>If you ski or snowboard with your student outside of lessons, you can always ask their instructor for games that you could play to help the students improve. You can also always ask your child to show you the fun things that their instructor has taught them in lessons. Overall, the key is to keep them stoked to come up to the mountains!</p>
                    <h3>Why does my student keep switching lessons? I thought they would be with the same instructor?</h3>                
                    <p>After the first week, we occasionally have to tweak lesson groups based on what we see on the hill. While we try to keep groups as consistent as possible, we think that it will help students get the most out of their lessons when they are learning with students at their same ability level.</p>
                    <h3>Why isn’t my child in the same lesson as their friends?</h3>                
                    <p>We will do our best to group students with their friends if you request it when you sign them up. If we see that certain students have different needs in their lessons, we may separate them so that they can each get the most out of their lessons.</p>
                    <h3>Do I tip my instructor?</h3>                
                    <p>All of our instructors are unpaid volunteers who spend hours training to teach the sports that they love - tips are not required, but greatly appreciated. </p>
                    <h3>Can I reschedule a lesson?</h3>                
                    <p>Get in touch with us! We will do our best to reschedule. But the earlier we know the easier it will be to find an alternative spot.</p>                                                                  
                </div>
            </section>
        </>
    );
}