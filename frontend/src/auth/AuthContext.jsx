import { createContext, useContext, useReducer, useEffect } from 'react';
import { PLATFORM_TOKEN_KEY, TENANT_TOKEN_KEY } from '@api/axios';

const AuthContext = createContext(null);

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4)) % 4;
  return atob(`${normalized}${'='.repeat(padding)}`);
}

function parseJwt(token) {
  try {
    const payload = token?.split('.')?.[1];
    if (!payload) return null;
    return JSON.parse(decodeBase64Url(payload));
  } catch {
    return null;
  }
}

const initialState = {
  platformUser: null,
  tenantUser: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'PLATFORM_LOGIN':
      return { ...state, platformUser: action.payload };
    case 'TENANT_LOGIN':
      return { ...state, tenantUser: action.payload };
    case 'PLATFORM_LOGOUT':
      return { ...state, platformUser: null };
    case 'TENANT_LOGOUT':
      return { ...state, tenantUser: null };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const pt = localStorage.getItem(PLATFORM_TOKEN_KEY);
    const tt = localStorage.getItem(TENANT_TOKEN_KEY);
    const platformUser = pt ? parseJwt(pt) : null;
    const tenantUser = tt ? parseJwt(tt) : null;

    if (platformUser) dispatch({ type: 'PLATFORM_LOGIN', payload: platformUser });
    if (tenantUser) dispatch({ type: 'TENANT_LOGIN', payload: tenantUser });
  }, []);

  const platformLogin = (token) => {
    const user = parseJwt(token);
    localStorage.setItem(PLATFORM_TOKEN_KEY, token);
    dispatch({ type: 'PLATFORM_LOGIN', payload: user });
  };

  const tenantLogin = (token) => {
    const user = parseJwt(token);
    localStorage.setItem(TENANT_TOKEN_KEY, token);
    dispatch({ type: 'TENANT_LOGIN', payload: user });
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
    <AuthContext.Provider value={{ ...state, platformLogin, tenantLogin, platformLogout, tenantLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
