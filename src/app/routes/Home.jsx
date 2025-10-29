import '../../assets/Global.css'
import '../../assets/Home.css'

import { Link, Outlet } from 'react-router-dom';

export default function Home() {
    return (
        <>
            <section className='home-banner'>
                <div className='banner-overlay'>
                    <h1 className='home-title'>HUSKY WINTER SPORTS</h1>
                    <h2 className='home-subtitle'>SKI AND SNOWBOARD SCHOOL</h2>
                    <div className='banner-buttons'>
                        <Link to="/lesson-registration" className='button register-button'>REGISTRATION</Link>
                        <Link to="/become-an-instructor" className='button'>BECOME AN INSTRUCTOR</Link>
                    </div>             
                </div>   
            </section>

            <section className='text-on-picture'>
                <div className='text'>
                    <h2>"HELPING STUDENTS SKI FOR FREE SINCE 1937!"</h2>
                    </div>
            </section>

            <section className='purple-stripe'>
                <h2>WHY US?</h2>
                <section className='cards'>
                    <div className='card'>
                        <h3>UW Students</h3>
                        <p>Unpaid, we're here because we want to spread the love of our favorite sport! This also means money saved on your end!</p>
                    </div>
                    <div className='card'>
                        <h3>Our Members are the Best!</h3>
                        <p>We do have a hiring process to make sure we only provide the best instruction.</p>
                    </div>
                    <div className='card'>
                        <h3>Enthusiastic and Safe</h3>
                        <p>We all love to have fun on the mountain but we know safety comes first.</p>
                    </div>
                    <div className='card'>
                        <h3>PSIA/AASI Certified</h3>
                        <p>Instrutors are PSIA/AASI trained or are working towards it.</p>
                    </div>
                </section>
            </section>
        </>
    )
}