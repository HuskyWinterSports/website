import { useEffect } from 'react';
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

/** Land at the top of the page on navigation, not wherever the last page was. */
function useScrollToTop(pathname) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
}

function App() {
  const location = useLocation();
  useDocumentMeta(location.pathname);
  useScrollToTop(location.pathname);

  return (
    <>
      <Navbar />
      <div className="fade-wrapper" key={location.pathname}>
        <main>
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="lesson-info" element={<LessonInfo />} />
            <Route path="lesson-registration" element={<LessonRegistration />} />
            <Route path="join-our-mailing-list" element={<JoinMailingList />} />
            <Route path="become-an-instructor" element={<BecomeAnInstructor />} />
            <Route path="diversity-and-inclusion" element={<DiversityAndInclusion />} />
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
