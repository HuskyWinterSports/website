import '../../assets/Global.css'
import '../../assets/Home.css'
import { useState } from "react";
import { Link } from 'react-router-dom';

export default function Home() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const slides = [
        { url: '/images/2025group.jpeg' },
        { url: '/images/2025-2026.jpg' },
        { url: '/images/2022-2023.jpg' }
    ];

    return (
        <>
            <section className='home-banner'>
                <div className='banner-overlay'>
                    <h1 className='home-title'>HUSKY WINTER SPORTS</h1>
                    <h2 className='home-subtitle'>SKI AND SNOWBOARD SCHOOL</h2>
                    <div className='banner-buttons'>
                        {/* <Link to="/lesson-registration" className='button register-button'>REGISTRATION WAITLIST</Link> */}
                        <Link to="/become-an-instructor" className='button'>BECOME AN INSTRUCTOR</Link>
                    </div>             
                </div>   
            </section>


            <section className='image-slider'>
                {slides.map((slide, index) => (
                    <div
                        key={index}
                        className={`slide ${index === currentIndex ? 'active' : ''}`}
                        style={{ backgroundImage: `url(${slide.url})` }}
                        aria-hidden={index === currentIndex ? 'false' : 'true'}
                    />
                ))}

                <button className='left-arrow' onClick={() => {
                    const isFirstSlide = currentIndex === 0;
                    const newIndex = isFirstSlide ? slides.length - 1 : currentIndex - 1;
                    setCurrentIndex(newIndex);
                }}>&#10094;</button>

                <button className='right-arrow' onClick={() => {
                    const isLastSlide = currentIndex === slides.length - 1;
                    const newIndex = isLastSlide ? 0 : currentIndex + 1;
                    setCurrentIndex(newIndex);
                }}>&#10095;</button>

                <div className='caption-text'>
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