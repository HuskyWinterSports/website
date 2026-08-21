import { NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

import '../assets/Navbar.css';

// Nav structure lives here so links can be added/reordered in one place.
// A group's first item is also where its parent label would have pointed,
// so making the parent a toggle button loses no destinations.
const NAV_ITEMS = [
    { label: 'Home', to: '/', end: true },
    {
        label: 'Lessons',
        items: [
            { label: 'Lesson Info', to: '/lesson-info' },
            { label: 'Lesson Registration', to: '/lesson-registration' },
            { label: 'Join Our Mailing List', to: '/join-our-mailing-list' },
        ],
    },
    {
        label: 'About Us',
        items: [
            { label: 'Become an Instructor', to: '/become-an-instructor' },
            { label: 'Diversity and Inclusion', to: '/diversity-and-inclusion' },
            { label: 'Our History', to: '/our-history' },
        ],
    },
    {
        label: 'Questions',
        items: [
            { label: 'FAQ', to: '/faq' },
            { label: 'Contact Us', to: '/contact-us' },
        ],
    },
    // Top level rather than inside About Us: donating is something to do, not
    // a fact about the club, and a donation page two menus deep gets very
    // little traffic.
    { label: 'Support Us', to: '/support-us' },
];

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [openGroup, setOpenGroup] = useState(null);
    const location = useLocation();
    const navRef = useRef(null);

    // NOTE: menus open on click/tap at every screen size, deliberately.
    // Mixing hover-to-open with click-to-toggle means a mouse user who hovers
    // (opening the menu) then clicks the toggle immediately closes it again,
    // and a hover rule also outranks Escape while the pointer rests on the
    // menu. One behaviour everywhere is simpler to use and to maintain.

    // Close everything on route change
    useEffect(() => {
        setIsOpen(false);
        setOpenGroup(null);
    }, [location.pathname]);

    // Escape closes; click outside the nav closes
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key !== 'Escape') return;
            setOpenGroup(null);
            setIsOpen(false);
        };
        const onPointerDown = (e) => {
            if (navRef.current?.contains(e.target)) return;
            setOpenGroup(null);
            setIsOpen(false);
        };
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('pointerdown', onPointerDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('pointerdown', onPointerDown);
        };
    }, []);

    return (
        <nav className="navbar" ref={navRef}>
            <button
                className={`navbar-toggle ${isOpen ? 'is-active' : ''}`}
                onClick={() => setIsOpen((open) => !open)}
                aria-expanded={isOpen}
                aria-controls="navbar-menu"
                aria-label={isOpen ? 'Close menu' : 'Open menu'}
            >
                <span className="bar bar-one"></span>
                <span className="bar bar-two"></span>
                <span className="bar bar-three"></span>
            </button>
            <div id="navbar-menu" className={`navbar-menu ${isOpen ? 'is-active' : ''}`}>
                <ul className="navbar-links">
                    {NAV_ITEMS.map((item, index) => (
                        <li className="dom-link" key={item.label}>
                            {item.items ? (
                                <>
                                    <button
                                        className="dropdown-toggle"
                                        onClick={() =>
                                            setOpenGroup((open) => (open === index ? null : index))
                                        }
                                        aria-expanded={openGroup === index}
                                        aria-controls={`dropdown-${index}`}
                                    >
                                        {item.label}
                                        <span className="caret" aria-hidden="true" />
                                    </button>
                                    <ul
                                        id={`dropdown-${index}`}
                                        className={`dropdown ${openGroup === index ? 'is-active' : ''}`}
                                    >
                                        {item.items.map((sub) => (
                                            <li key={sub.to}>
                                                <NavLink to={sub.to}>{sub.label}</NavLink>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            ) : (
                                <NavLink to={item.to} end={item.end}>
                                    {item.label}
                                </NavLink>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </nav>
    );
}
