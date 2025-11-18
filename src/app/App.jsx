import { useState, useEffect } from 'react';
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


function App() {
  const location = useLocation();
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
          </Routes>
        </main>
      </div>
      <Footer />
    </>
  );
}

export default App;
