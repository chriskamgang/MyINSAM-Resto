import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { setOnUnauthorized } from '../services/api';
import { pushNotificationService } from '../services/pushNotificationService';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true);

  // Deconnexion forcee (appelee par l'intercepteur 401)
  const forceLogout = useCallback(() => {
    setUser(null);
    setToken(null);
  }, []);

  // Charger l'utilisateur au demarrage
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

  // Quand l'intercepteur 401 detecte un token expire, deconnecter automatiquement
  useEffect(() => {
    setOnUnauthorized(forceLogout);
    return () => setOnUnauthorized(null);
  }, [forceLogout]);

  // Enregistrer le push token quand l'utilisateur est connecte
  useEffect(() => {
    if (user && token) {
      pushNotificationService.registerForPushNotifications();
    }
  }, [user, token]);

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

  const googleLogin = async (idToken) => {
    const { user: u, token: t } = await authService.googleLogin(idToken);
    setUser(u);
    setToken(t);
    return u;
  };

  const appleLogin = async ({ identityToken, fullName, email }) => {
    const { user: u, token: t } = await authService.appleLogin({ identityToken, fullName, email });
    setUser(u);
    setToken(t);
    return u;
  };

  const logout = async () => {
    await pushNotificationService.removePushToken();
    await authService.logout();
    setUser(null);
    setToken(null);
  };

  const updateUser = (updatedUser) => setUser(updatedUser);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, googleLogin, appleLogin, logout, updateUser, forceLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
