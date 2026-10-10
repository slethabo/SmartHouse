/** Compatibility context for catalogue components in the login-free prototype. */
import { createContext, useContext } from 'react';

const workspace = {
  user: { full_name: 'Prototype Workspace', role: 'admin' },
  ready: true,
  prototypeMode: true,
  isAdmin: true,
};
const AuthContext = createContext(workspace);
export function AuthProvider({ children }) {
  return <AuthContext.Provider value={workspace}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  return useContext(AuthContext);
}
