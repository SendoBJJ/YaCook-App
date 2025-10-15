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
  register: (userData: { email: string; password: string; first_name: string; last_name?: string }) => Promise<void>;
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
      
      if (response.status === 200 && response.data.access_token) {
        // Save token
        await tokenStorage.set('access_token', response.data.access_token);
        
        // Get user details via whoami
        try {
          const userResponse = await api.get('/whoami');
          if (userResponse.status === 200) {
            // Set authenticated user
            const userInfo = response.data.user;
            setUser({
              id: userInfo.id,
              email: userInfo.email,
              name: `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim() || userInfo.display_name || userInfo.email,
            });

            // Show success toast
            showToast("Connexion réussie ✅", "success");
            
            console.log('✅ Login successful');
            
            // Redirect to main app
            const { router } = await import('expo-router');
            router.replace('/');
          }
        } catch (whoamiError) {
          console.error('Failed to get user info after login:', whoamiError);
          showToast("Erreur de connexion", "error");
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Provide French error messages based on error type
      let message = 'Erreur de connexion. Réessayez.';
      const status = error.response?.status;
      const detail = error.response?.data?.detail;
      
      if (status === 401) {
        message = 'Email ou mot de passe incorrect';
        showToast(message, "error");
      } else if (status === 404) {
        message = 'Service indisponible';
        showToast(message, "error");
      } else if (status === 422) {
        message = 'Saisie invalide';
        showToast(message, "error");
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        message = 'Erreur de connexion. Réessayez.';
        showToast(message, "error");
      } else if (detail) {
        message = detail;
        showToast(message, "error");
      } else {
        showToast(message, "error");
      }
      
      throw new Error(message);
    }
  };

  const register = async (userData: { email: string; password: string; first_name: string; last_name?: string }) => {
    try {
      const payload = {
        email: userData.email.trim().toLowerCase(),
        password: userData.password.trim(),
        first_name: userData.first_name.trim(),
        last_name: userData.last_name?.trim() || '',
      };

      console.log("Register payload", { email: payload.email, firstName: payload.first_name });

      const response = await api.post('/auth/register', payload);
      
      if (response.status === 200 || response.status === 201) {
        // Show success toast
        showToast("Compte créé 🎉", "success");
        
        console.log('✅ Registration successful');
        
        // Redirect to login with email pre-filled
        const { router } = await import('expo-router');
        router.replace(`/auth/login?email=${encodeURIComponent(payload.email)}`);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Provide French error messages
      let message = 'Erreur lors de la création du compte';
      const status = error.response?.status;
      const detail = error.response?.data?.detail;
      
      if (status === 409 || detail?.includes('existe déjà')) {
        message = 'Cet email existe déjà';
        showToast(message, "error");
      } else if (status === 422) {
        message = 'Données invalides. Vérifiez vos informations.';
        showToast(message, "error");
      } else if (detail) {
        message = detail;
        showToast(message, "error");
      } else {
        showToast(message, "error");
      }
      
      throw new Error(message);
    }
  };

  const logout = async () => {
    try {
      await tokenStorage.remove('access_token');
      setUser(null);
      
      // Redirect to login
      const { router } = await import('expo-router');
      router.replace('/auth/login');
      
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      showToast("Erreur lors de la déconnexion", "error");
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