import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true);

  // Charger l'utilisateur au démarrage
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { user: storedUser, token: storedToken } = await authService.getStoredUser();
        if (storedUser && storedToken) {
          setUser(storedUser);
          setToken(storedToken);
        }
      } catch (_) {}
      finally { setLoading(false); }
    };
    loadUser();
  }, []);

  const login = async (email, password) => {
    const { user: u, token: t } = await authService.login(email, password);
    setUser(u);
    setToken(t);
    return u;
  };

  const register = async (name, email, phone, password) => {
    const { user: u, token: t } = await authService.register(name, email, phone, password);
    setUser(u);
    setToken(t);
    return u;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setToken(null);
  };

  const updateUser = (updatedUser) => setUser(updatedUser);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
