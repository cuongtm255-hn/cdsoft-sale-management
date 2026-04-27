import { createContext, useContext, useReducer, useEffect } from 'react';
import { PLATFORM_TOKEN_KEY, TENANT_TOKEN_KEY } from '@api/axios';

const AuthContext = createContext(null);

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

const initialState = {
  platformUser: null,
  tenantUser: null,
  tenantPermissions: new Set(),
};

function authReducer(state, action) {
  switch (action.type) {
    case 'PLATFORM_LOGIN':
      return { ...state, platformUser: action.payload };
    case 'TENANT_LOGIN':
      return { ...state, tenantUser: action.payload };
    case 'TENANT_PERMISSIONS':
      return { ...state, tenantPermissions: new Set(action.payload) };
    case 'PLATFORM_LOGOUT':
      return { ...state, platformUser: null };
    case 'TENANT_LOGOUT':
      return { ...state, tenantUser: null, tenantPermissions: new Set() };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const pt = localStorage.getItem(PLATFORM_TOKEN_KEY);
    const tt = localStorage.getItem(TENANT_TOKEN_KEY);
    if (pt) dispatch({ type: 'PLATFORM_LOGIN', payload: parseJwt(pt) });
    if (tt) dispatch({ type: 'TENANT_LOGIN', payload: parseJwt(tt) });
  }, []);

  const platformLogin = (token) => {
    localStorage.setItem(PLATFORM_TOKEN_KEY, token);
    dispatch({ type: 'PLATFORM_LOGIN', payload: parseJwt(token) });
  };

  const tenantLogin = (token) => {
    localStorage.setItem(TENANT_TOKEN_KEY, token);
    dispatch({ type: 'TENANT_LOGIN', payload: parseJwt(token) });
  };

  const setTenantPermissions = (permissions) => {
    dispatch({ type: 'TENANT_PERMISSIONS', payload: permissions });
  };

  const platformLogout = () => {
    localStorage.removeItem(PLATFORM_TOKEN_KEY);
    dispatch({ type: 'PLATFORM_LOGOUT' });
  };

  const tenantLogout = () => {
    localStorage.removeItem(TENANT_TOKEN_KEY);
    dispatch({ type: 'TENANT_LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{ ...state, platformLogin, tenantLogin, platformLogout, tenantLogout, setTenantPermissions }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
