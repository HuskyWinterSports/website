import '../../assets/Global.css'
import '../../assets/LessonInfo.css'

export default function LessonInfo() {
    return (
        <>
            <section className='lesson-banner'>
                <h1 className='lesson-title'>Lesson Information</h1>
                <h2 className='lesson-subtitle'>Come shred with us! Husky Winter Sports offers both ski and snowboarding lessons for kids and adults alike!</h2>           
            </section>
            <section className='white-stripe'>
                {/* <div className='centered-text'> */}
                <h2>LOGISTICS</h2>
                    <h3>Location and Scheduling</h3>
                    <p>Our lessons run for six total weekends during winter quarter. We offer 3-week (<strong>A or B</strong>) or 6-week lesson packages. Students may choose between our Saturday (<strong>1:30 - 4pm</strong>) or Sunday (<strong>11:30 - 2pm</strong>) session. </p>
                    <h3>Group Lessons</h3>
                    <p>Ages 7+, suitable for all skill levels! Group size is anywhere between 3-5 students per instructor, arranged based on sport type, age, and ability level</p>
                    <h3>Single-Student Lessons</h3>
                    <p>Ages 5+, Privates are 1-on-1 student to instructor for a more personalized experience.</p>
                    <h3>Friends & Family Lessons</h3>
                    <p>Ages 7+, Semi-privates are group lessons where you pick your group of 2-5 kids. Please email <a href='mailto:huskywslessons@gmail.com'>huskywslessons@gmail.com</a> if interested in registering students ages 5 and 6 for semi-private lessons. </p>   
                {/* </div> */}
            </section>

            <section className='purple-stripe'>
                <h2>2025/2026 DATES</h2>
                <section className='boxes'>
                    <div className='box'>
                        <h3>SESSION A</h3>
                        <ul>
                            <li>Lesson1: Jan 31st & Feb 1st</li>
                            <li>Lesson2: Feb 7th & 8th</li>
                            <li>Lesson3: Feb 21st & 22nd</li>
                        </ul>
                    </div>
                    <div className='box'>
                        <h3>SESSION B</h3>
                        <ul>
                            <li>Lesson1: Feb 28th & Mar 1st</li>
                            <li>Lesson2: Mar 7th & 8th</li>
                            <li>Lesson3: Mar 14th & Mar 15th</li>
                        </ul>
                    </div>
                </section>
                <p>*There is a one-week break between lessons 1 & 2 of session A  No lessons will be taught on 2/14-2/15 for President's Day.</p>
            </section>

            <section className='white-stripe'>
                <h2>LEVELS</h2>
                <p>We offer lessons for four levels: Never-ever, Beginner, Intermediate, and Advanced. When registering, please make your best guess as to the most appropriate lesson level and answer every experience question to the best of your ability. The Lesson Director may contact you with more questions while assigning lessons and instructors.</p>
                <section className='cards'>
                    <div className='card'>
                        <h3>NEVER EVER</h3>
                        <p>The student is brand new to their snowsport or is returning after a hiatus of a year or more.</p>
                    </div>
                    <div className='card'>
                        <h3>BEGINNER</h3>
                        <p>The student can make turns on green terrain and is comfortable riding the Magic Carpet. Lift experience may be limited or nonexistent.</p>
                    </div>
                    <div className='card'>
                        <h3>INTERMEDIATE</h3>
                        <p>The student is making linked turns on green terrain and starting to explore blue runs.</p>
                    </div>
                    <div className='card'>
                        <h3>ADVANCED</h3>
                        <p>The student can make controlled, linked turns on most runs.</p>
                    </div>
                </section>
            </section>

            <section className='purple-stripe'>
                <h2>PRICES</h2>
                <section className='boxes'>
                    <div className='box'>
                        <h3>Group Ski or Snowboard Lessons</h3>
                        <div className='little-white-box'>
                            <ul>
                                <li>3 weeks - $240</li>
                                <li>6 weeks - $360</li>
                            </ul>
                        </div>
                    </div>
                    <div className='box'>
                        <h3>Single-Student Ski or Snowboard Lessons</h3>
                        <div className='little-white-box'>
                            <ul>
                                <li>3 weeks - $660</li>
                                <li>6 weeks - $990</li>
                            </ul>
                        </div>
                    </div>
                    <div className='box'>
                        <h3>Friends & Family Ski or Snowboard Lessons</h3>
                        <div className='little-white-box'>
                            <ul>
                                <li>3 weeks - $325</li>
                                <li>6 weeks - $485</li>
                            </ul>
                        </div>
                    </div>
                </section>
            </section>

            <section className='white-stripe'>
                <h2>EQUIPMENT AND LIFT TICKETS</h2>
                <h3>Equipment</h3>
                <p>Before you head up to the mountain, please make sure you have all of the proper gear. This includes boots, bindings, skis or a snowboard, goggles or sunglasses, waterproof jacket, snow pants, and gloves. Be prepared for varying weather conditions and bring plenty of warm layers and a helmet. If you need to buy or rent equipment or clothing, check out some local shops or ski swaps!</p>
                <h3>Lift Tickets</h3>
                <p>The Summit at Snoqualmie offers passes for a variety of skill levels and for different age groups, and Husky Winter Sports cannot purchase and sell these to our students. Unless you already have a Season Pass, please check with your instructor before purchasing daily passes, as special cases exist. For example, never-ever lessons will most likely not ride the lift on their first weekend of instruction and will not need a pass; beginner lessons may wish to purchase a cheaper Beginner pass which allows them to ride on the Holiday and Gallery lifts only. </p>
            </section>

            <section className='big-purple-box'>
                <h2>LOCATION</h2>
                <p>Lessons begin from the Ullr Snow Sports Meeting Area at Snoqualmie’s “Summit Central.” To reach us, take Exit 53 from I-90 East and turn right at the stop sign. At the T-intersection, turn left, drive past the fire station, and turn into the large gravel parking lot on your left.</p>
                <p>From the parking lot, walk up the switchback path towards the lodges. Looking towards the hill from the bonfire area, <a href="https://www.google.com/maps/@47.4097062,-121.413549,3a,90y,240.34h,86.53t/data=!3m6!1e1!3m4!1sEbLzd5xQma3umW7j-uG5TQ!2e0!7i13312!8i6656!6m1!1e1we" target="_blank">are located outside the orange “Ullr” building south of the base of the Triple 60 Lift*</a>.</p>
                <p>*This can be a bit of a long walk for the young ones, so please make sure to arrive early enough to find parking in the Central lot (if full, you will be directed to an auxiliary lot and may need to take a shuttle back) and arrive at Ullr with plenty of time to get stoked and ready to go.</p>

                {/* insert map here */}

            </section>
        </>
    );
}