import { Link, NavLink } from 'react-router-dom';
import React, { useState } from 'react';

import '../assets/Navbar.css';

import { useLocation } from 'react-router-dom';

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [hoveredQuestions, setHoveredQuestions] = useState(false);
    const [hoveredLessons, setHoveredLessons] = useState(false);
    const [hoveredClub, setHoveredClub] = useState(false);
    const location = useLocation();

    // Close menu on route change
    React.useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    return (
        <nav className="navbar">
            <button className={`navbar-toggle ${isOpen ? 'is-active' : ''}`} onClick={toggleMenu}>
                <span className="bar bar-one"></span>
                <span className="bar bar-two"></span>
                <span className="bar bar-three"></span>
            </button>
            <div className={`navbar-menu ${isOpen ? 'is-active' : ''}`}>
                <ul className="navbar-links">
                    <li className='dom-link'>
                        <NavLink to="/" end>Home</NavLink>
                    </li>
                    <li className='dom-link' onMouseEnter={() => setHoveredLessons(true)} onMouseLeave={() => setHoveredLessons(false)}>
                        <NavLink to="/lesson-info">Lessons</NavLink>
                        <ul className={`dropdown ${hoveredLessons ? 'is-active' : ''}`}>
                            <li><NavLink to="/lesson-info">Lesson Info</NavLink></li>
                            <li><NavLink to="/lesson-registration">Lesson Registration</NavLink></li>
                            <li><NavLink to="/join-our-mailing-list">Join Our Mailing List</NavLink></li>
                        </ul>
                    </li>
                    <li className='dom-link' onMouseEnter={() => setHoveredClub(true)} onMouseLeave={() => setHoveredClub(false)}>
                        <NavLink to="/become-an-instructor">About Us</NavLink>
                        <ul className={`dropdown ${hoveredClub ? 'is-active' : ''}`}>
                            <li><NavLink to="/become-an-instructor">Become an Instructor</NavLink></li>
                            <li><NavLink to="/diversity-and-inclusion">Diversity and Inclusion</NavLink></li>
                        </ul>
                    </li>
                    <li className='dom-link' onMouseEnter={() => setHoveredQuestions(true)} onMouseLeave={() => setHoveredQuestions(false)}>
                        <NavLink to="/faq">Questions</NavLink>
                        <ul className={`dropdown ${hoveredQuestions ? 'is-active' : ''}`}>
                            <li><NavLink to="/faq">FAQ</NavLink></li>
                            <li><NavLink to="/contact-us">Contact Us</NavLink></li>
                        </ul>
                    </li>
                </ul>
            </div>
        </nav>
    );
}