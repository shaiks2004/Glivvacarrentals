import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import type { UserRole } from '../lib/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading, mustChangePassword } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        className="glivva-auth-loading-screen"
        style={{
          minHeight: '60vh',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--color-gold)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: '3px solid rgba(197, 168, 128, 0.2)',
              borderTopColor: 'var(--color-gold)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Verifying credentials...
          </p>
        </div>
      </div>
    );
  }

  // 1. Not logged in -> send to login with return path
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. First login must change password check
  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  // 3. Role restriction check
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div
        className="glivva-forbidden-container"
        style={{
          maxWidth: 600,
          margin: '80px auto',
          padding: '40px 24px',
          textAlign: 'center',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg, 12px)',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            fontSize: '12px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: 'var(--color-gold)',
            marginBottom: '12px',
            fontWeight: 600,
          }}
        >
          403 Forbidden
        </span>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '28px',
            marginBottom: '16px',
            color: 'var(--color-text)',
          }}
        >
          Access Restricted
        </h1>
        <p
          style={{
            color: 'var(--color-text-muted)',
            fontSize: '15px',
            lineHeight: 1.6,
            marginBottom: '32px',
          }}
        >
          Your account ({role}) is not authorized to access this section. If you believe this is an error, please contact your administrator.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to={role === 'admin' ? '/admin' : role === 'employee' ? '/staff' : '/account'}
            className="btn btn-gold"
          >
            Go to Your Dashboard
          </Link>
          <Link to="/" className="btn btn-outline">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
