import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { UserRoleType } from '@/integrations/supabase/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRoleType[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect clients to their portal
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
