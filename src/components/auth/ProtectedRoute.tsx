import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface Props {
  children: ReactNode;
  requireRole?: string | string[]; // single or any of array
  redirectTo?: string;
  loadingFallback?: ReactNode;
}

export function ProtectedRoute({ children, requireRole, redirectTo = '/login/user', loadingFallback = null }: Props) {
  const { session, profile, loading, profileLoading } = useAuth();

  if (loading) return <>{loadingFallback}</>;
  if (!session) return <Navigate to={redirectTo} replace />;
  if (requireRole && profileLoading) return <>{loadingFallback}</>;

  if (requireRole) {
    const roles = Array.isArray(requireRole) ? requireRole : [requireRole];
    if (!profile || !roles.includes(profile.role)) {
      // If vendor role required and user lacks it, send to vendor setup
      if (roles.includes('vendor')) return <Navigate to="/vendor/setup" replace />;
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

export default ProtectedRoute;