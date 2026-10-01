import { lazy, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Splash from './components/Splash';
import { shouldSplash } from './lib/splash';
import { AuthProvider } from './lib/auth';
import { ProtectedRoute } from './components/ProtectedRoute';
import Home from './pages/Home'; // eager: fastest first paint on the landing page

// Public pages as lazy-loaded chunks
const Cars = lazy(() => import('./pages/Cars'));
const CarDetail = lazy(() => import('./pages/CarDetail'));
const City = lazy(() => import('./pages/City'));
const Offers = lazy(() => import('./pages/Offers'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const Login = lazy(() => import('./pages/Login'));
const SignUp = lazy(() => import('./pages/SignUp'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const Booking = lazy(() => import('./pages/Booking'));
const About = lazy(() => import('./pages/About'));
const Faq = lazy(() => import('./pages/Faq'));
const Contact = lazy(() => import('./pages/Contact'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Refund = lazy(() => import('./pages/Refund'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Role Portals
const AccountHome = lazy(() => import('./pages/account/AccountHome'));
const StaffHome = lazy(() => import('./pages/staff/StaffHome'));
const AdminHome = lazy(() => import('./pages/admin/AdminHome'));

export default function App() {
  const { pathname } = useLocation();
  const [splash, setSplash] = useState(() => pathname === '/' && shouldSplash());

  return (
    <AuthProvider>
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

          {/* Auth Suite */}
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<SignUp />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route
            path="change-password"
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            }
          />

          {/* Protected Role Portals */}
          <Route
            path="account/*"
            element={
              <ProtectedRoute allowedRoles={['user', 'employee', 'admin']}>
                <AccountHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="staff/*"
            element={
              <ProtectedRoute allowedRoles={['employee', 'admin']}>
                <StaffHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/*"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminHome />
              </ProtectedRoute>
            }
          />

          {/* Static / Informational Pages */}
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
    </AuthProvider>
  );
}
