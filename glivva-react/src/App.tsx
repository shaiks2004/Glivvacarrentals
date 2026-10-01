import { lazy, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Splash from './components/Splash';
import { shouldSplash } from './lib/splash';
import Home from './pages/Home'; // eager: fastest first paint on the landing page

// every other page is its own lazy-loaded chunk
const Cars = lazy(() => import('./pages/Cars'));
const CarDetail = lazy(() => import('./pages/CarDetail'));
const City = lazy(() => import('./pages/City'));
const Offers = lazy(() => import('./pages/Offers'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const Login = lazy(() => import('./pages/Login'));
const Booking = lazy(() => import('./pages/Booking'));
const About = lazy(() => import('./pages/About'));
const Faq = lazy(() => import('./pages/Faq'));
const Contact = lazy(() => import('./pages/Contact'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Refund = lazy(() => import('./pages/Refund'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  const { pathname } = useLocation();
  const [splash, setSplash] = useState(() => pathname === '/' && shouldSplash());
  return (
    <>
      {splash && <Splash onDone={() => setSplash(false)} />}
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="cars" element={<Cars />} />
          <Route path="car/:slug" element={<CarDetail />} />
          <Route path="fleet" element={<Navigate to="/cars" replace />} />
          <Route path="city/:slug" element={<City />} />
          <Route path="offers" element={<Offers />} />
          <Route path="blog" element={<Blog />} />
          <Route path="blog/:slug" element={<BlogPost />} />
          <Route path="login" element={<Login />} />
          <Route path="booking" element={<Booking />} />
          <Route path="about" element={<About />} />
          <Route path="faq" element={<Faq />} />
          <Route path="contact" element={<Contact />} />
          <Route path="terms" element={<Terms />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="refund-cancellation" element={<Refund />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
