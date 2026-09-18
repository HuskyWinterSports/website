import { useEffect, useRef } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import '../assets/Global.css';
import Home from './routes/Home.jsx';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import LessonInfo from './routes/LessonInfo.jsx';
import LessonRegistration from './routes/LessonRegistration.jsx';
import JoinMailingList from './routes/JoinMailingList.jsx';
import BecomeAnInstructor from './routes/BecomeAnInstructor.jsx';
import DiversityAndInclusion from './routes/DiversityAndInclusion.jsx';
import OurHistory from './routes/OurHistory.jsx';
import SupportUs from './routes/SupportUs.jsx';
import FAQ from './routes/FAQ.jsx';
import ContactUs from './routes/ContactUs.jsx';
import NotFound from './routes/NotFound.jsx';
import { metaForPath } from '../routes.js';

/**
 * Keeps the tab title and description in step as visitors navigate.
 *
 * The build already bakes these into a real HTML file per route for crawlers
 * and social previews; this only covers client-side navigation, where no new
 * document is fetched.
 */
function useDocumentMeta(pathname) {
  useEffect(() => {
    const meta = metaForPath(pathname);
    document.title = meta.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', meta.description);
  }, [pathname]);
}

/**
 focuses content on main instead of the navbar when a new page is loaded, so screen reader users
 can start reading the page content immediately instead of having to tab through the navigation links.
 */
function useLandOnNewPage(pathname, mainRef) {
  const isFirstRender = useRef(true);
  useEffect(() => {
    window.scrollTo(0, 0);
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname, mainRef]);
}

function App() {
  const location = useLocation();
  const mainRef = useRef(null);
  useDocumentMeta(location.pathname);
  useLandOnNewPage(location.pathname, mainRef);

  return (
    <>
      {/* skip to main contnent must be first in DOM for screen readers */}
      <a className="skip-link" href="#main-content">Skip to the main content</a>
      <Navbar />
      <div className="fade-wrapper" key={location.pathname}>
        {/* tabIndex -1 so the skip link actually moves focus here*/}
        <main id="main-content" tabIndex={-1} ref={mainRef}>
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="lesson-info" element={<LessonInfo />} />
            <Route path="lesson-registration" element={<LessonRegistration />} />
            <Route path="join-our-mailing-list" element={<JoinMailingList />} />
            <Route path="become-an-instructor" element={<BecomeAnInstructor />} />
            <Route path="diversity-and-inclusion" element={<DiversityAndInclusion />} />
            <Route path="our-history" element={<OurHistory />} />
            <Route path="support-us" element={<SupportUs />} />
            <Route path="faq" element={<FAQ />} />
            <Route path="contact-us" element={<ContactUs />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
      <Footer />
    </>
  );
}

export default App;
