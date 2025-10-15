import React, { createContext, useContext, useEffect, useState } from 'react';
import { resolveApiBase } from '../utils/apiBase';
import { normalizeAuthPayload } from '../utils/emailUtils';
import { tokenStorage } from '../utils/tokenStorage';
import api from '../utils/api';
import { useToast } from '../components/Toast';

type User = { id: string; email: string; name?: string };
type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: any, password: any) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      try {
        setLoading(true);
        
        // Log API Base URL at startup
        console.log('API Base URL:', resolveApiBase());
        
        // Background ping to /api/health
        try {
          const healthResponse = await api.get('/health');
          if (healthResponse.status === 200) {
            console.log('✅ Health check passed');
          }
        } catch (error) {
          console.error('❌ Health check failed - Serveur indisponible');
        }

        // Try to get stored token and validate user
        const token = await tokenStorage.get('access_token');
        if (token) {
          try {
            // Call /api/whoami to get current user
            const whoamiResponse = await api.get('/whoami');
            if (whoamiResponse.status === 200 && mounted) {
              // Set user from token payload or make another call to get user details
              const userData = await api.get('/auth/me');
              if (userData.status === 200 && mounted) {
                const userInfo = userData.data;
                setUser({
                  id: userInfo.id,
                  email: userInfo.email,
                  name: `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim() || userInfo.display_name || userInfo.email,
                });
              }
            }
          } catch (error) {
            console.log('Token invalid, clearing storage');
            await tokenStorage.remove('access_token');
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    
    initAuth();
    
    return () => { mounted = false; };
  }, []);

  const login = async (rawEmail: any, rawPassword: any) => {
    try {
      const payload = normalizeAuthPayload(
        (rawEmail ?? '').toString(), 
        (rawPassword ?? '').toString()
      );
      const { email, password } = payload;

      if (!email || !password) {
        showToast("Veuillez saisir un email et un mot de passe.", "error");
        throw new Error("Veuillez saisir un email et un mot de passe.");
      }

      console.log("Login payload", { email, password: "***" });

      const response = await api.post('/auth/login', { email, password });

      // Store tokens and user data
      await tokenManager.setTokens(response.access_token, response.refresh_token);
      await tokenManager.setUserData(response.user);

      // Set simplified user state
      setUser({
        id: response.user.id,
        name: response.user.first_name && response.user.last_name 
          ? `${response.user.first_name} ${response.user.last_name}` 
          : response.user.first_name || response.user.display_name,
        email: response.user.email
      });
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Provide French error messages based on error type
      let message = 'Erreur de connexion. Réessayez.';
      const status = error.response?.status;
      const detail = error.response?.data?.detail;
      
      if (status === 401) {
        message = 'Email ou mot de passe incorrect.';
      } else if (status === 404) {
        message = 'Service indisponible. Réessayez plus tard.';
      } else if (status === 422) {
        message = 'Données invalides. Vérifiez votre email et mot de passe.';
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        message = 'Erreur de connexion. Réessayez.';
      } else if (detail) {
        message = detail;
      }
      
      throw new Error(message);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      // Always clear local state
      setUser(null);
      await tokenManager.clearTokens();
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>.');
  }
  return ctx;
};