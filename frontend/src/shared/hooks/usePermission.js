import { useAuth } from '@auth/AuthContext';

export function usePermission() {
  const { tenantPermissions } = useAuth();

  return {
    can:    (code)      => tenantPermissions.has(code),
    canAny: (...codes)  => codes.some((c) => tenantPermissions.has(c)),
    canAll: (...codes)  => codes.every((c) => tenantPermissions.has(c)),
  };
}
