import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, loading, isAdmin, isSuperAdmin, userRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/sign-in" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Limited role guard: tenant admin/manager can ONLY access deposit/withdrawal pages
  const roleLower = (userRole || '').toLowerCase();
  const limitedRole = !isSuperAdmin && roleLower !== 'owner' && (roleLower === 'admin' || roleLower === 'manager');
  if (limitedRole) {
    const allowedPrefixes = ["/deposit-list", "/withdrawal-list"]; // strictly allowed
    const isAllowed = allowedPrefixes.some((p) => location.pathname.startsWith(p));
    if (!isAllowed) {
      console.debug("ProtectedRoute redirecting limited role", { userRole, isSuperAdmin, path: location.pathname });
      return <Navigate to="/deposit-list" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
