import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function PlatformProtectedRoute({ children, roles = [] }) {
  const { platformUser } = useAuth();
  const location = useLocation();

  if (!platformUser) return <Navigate to="/platform/login" state={{ from: location }} replace />;
  if (roles.length && !roles.includes(platformUser.role)) return <Navigate to="/platform/dashboard" replace />;

  return children;
}

export function TenantProtectedRoute({ children, roles = [] }) {
  const { tenantUser } = useAuth();
  const location = useLocation();

  if (!tenantUser) return <Navigate to="/tenant/login" state={{ from: location }} replace />;
  if (roles.length && !roles.includes(tenantUser.role)) return <Navigate to="/tenant/dashboard" replace />;

  return children;
}
