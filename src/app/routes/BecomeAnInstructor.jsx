import '../../assets/Global.css'

export default function BecomeAnInstructor() {
    return (
        <>
            <section className='white-stripe'>
                <div className='centered-text'>
                    <h1>ABOUT US</h1>
                    <h2>WHO WE ARE AND WHAT WE DO</h2>
                    <p>Husky Winter Sports is a student-run organization at the University of Washington that provides ski and snowboard lessons to students and the greater Seattle community. Our mission is to make winter sports accessible to everyone, regardless of their skill level or background.</p>
                    <p className='quote'>“Provide fun, safe, high quality and affordable mountain experiences to skiers and snowboarders of all ability levels, and to foster friendships among like-minded winter sports enthusiasts.”</p>
                    <p>As a club, we shred all winter long and try to take advantage of every snow related opportunity we can. As a ski school, we teach lessons each Saturday and Sunday of winter quarter. This boils down to 6 total weekends, with 2.5 hour lessons on both Saturday and Sunday. When we're not teaching lessons, we're shredding the slopes of Summit together as a club.</p>
                </div>
            </section>

            <section className='purple-stripe'>
                <h2> Support our Stoked Volunteer Instructors</h2>
                <p>Help us keep the slopes alive! Our dedicated instructors volunteer their time to teach skiing and snowboarding to enthusiasts of all ages. With your donation, we can provide them with the resources they need to continue sharing their passion for the sport.</p>
                <p>Be a part of our mission and donate now to hit the slopes together!</p>
                {/* add donation button */}
            </section>

            <section className='big-white-box'>
                <h2>BECOME AN INSTRUCTOR</h2>
                <div className='centered-text'>
                    <p>Husky Winter Sports offers a unique opportunity for UW students who are excited about snow sports and interested in sharing them with children and adults of all levels from the Northwest community. All members are trained as ski or snowboard instructors and receive a season’s pass to the Summit at Snoqualmie in exchange for attending a minimum of two weekend-long training sessions and teaching for all our six lesson weekends. Other benefits include lodging and a meal on Saturday nights, as well as travel compensation for instructor carpools.</p>
                </div>
            </section>

            <section className='purple-stripe'>
                <h2>THE PROCESS</h2>
                <p>So how do you join Husky Winter Sports? During fall quarter and the beginning of winter quarter we hold many events to give you information about the club, show you how we teach, and opportunities to meet club members and officers. </p>

                {/* cards about each event */}
            </section>

            <section className='big-white-box'>
                <h2>THE PERKS</h2> {/* center later? */}
                <ul>
                    <li>Free Summit at Snoqualmie season pass</li>
                    <li>Arranged carpools to the mountain</li>
                    <li>Organized trips to Whistler and other PNW resorts</li>
                    <li>Training for PSIA/AASI certification</li>
                    <li>Guaranteed riding improvement</li>
                    <li>A rad community of snowsports and outdoor enthusiasts</li>
                </ul>
            </section>

            {/* other section for snow sports at UW */}
        </>
    );
}