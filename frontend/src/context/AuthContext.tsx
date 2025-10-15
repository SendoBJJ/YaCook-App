import React, { createContext, useContext, useEffect, useState } from 'react';
import { resolveApiBase } from '../utils/apiBase';
import { normalizeAuthPayload } from '../utils/emailUtils';
import { tokenStorage } from '../utils/tokenStorage';
import api from '../api/client';
import { useToast } from '../components/Toast';

type User = { 
  id: string; 
  email: string; 
  name?: string;
  plan?: 'free' | 'premium';
  premium_until?: string | null;
};

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
    
    // Listen for auth errors from axios interceptor (401 on protected routes)
    const handleAuthError = async (event: CustomEvent) => {
      console.log('🚨 Auth error event received in AuthContext:', event.detail.message);
      
      // Show French toast
      showToast(event.detail.message, "error");
      
      // Clear user state
      setUser(null);
      
      // Redirect to login screen
      try {
        const { router } = await import('expo-router');
        router.replace('/auth/login');
        console.log('✅ Redirected to login screen');
      } catch (error) {
        console.error('Failed to redirect to login:', error);
      }
    };
    
    // Listen for premium required from axios interceptor (402 responses)
    const handlePremiumRequired = async (event: CustomEvent) => {
      console.log('💎 Premium required event received:', event.detail.message);
      
      // Show info toast
      showToast(event.detail.message, "info");
      
      // Navigate to paywall after a short delay
      setTimeout(async () => {
        try {
          const { router } = await import('expo-router');
          router.push('/paywall');
          console.log('✅ Navigated to paywall screen');
        } catch (error) {
          console.error('Failed to navigate to paywall:', error);
        }
      }, 1000);
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('auth-error', handleAuthError as EventListener);
      window.addEventListener('premium-required', handlePremiumRequired as EventListener);
    }
    
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

        // Try to validate existing token via /api/whoami
        const token = await tokenStorage.get('access_token');
        if (token) {
          try {
            console.log('🔍 Validating existing token via /api/whoami');
            const whoamiResponse = await api.get('/whoami');
            
            if (whoamiResponse.status === 200 && mounted) {
              // Token is valid, get user data (whoami returns instance info, need user data)
              // For now, construct user from token or use a mock user
              const mockUser = {
                id: 'current-user',
                email: 'test@example.com', // TODO: extract from token or make /api/auth/me call
                name: 'Test User'
              };
              
              setUser(mockUser);
              console.log('✅ Token validated, user authenticated');
            }
          } catch (error: any) {
            console.log('🚫 Token validation failed:', error.response?.status);
            if (error.response?.status === 401) {
              console.log('🔄 Invalid token detected on bootstrap - clearing token');
              await tokenStorage.remove('access_token');
              // Stay on login screen (don't redirect if already there)
            }
          }
        } else {
          console.log('🔓 No token found on bootstrap');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    
    initAuth();
    
    return () => {
      mounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth-error', handleAuthError as EventListener);
        window.removeEventListener('premium-required', handlePremiumRequired as EventListener);
      }
    };
  }, []);

  const login = async (rawEmail: any, rawPassword: any) => {
    try {
      // Normalize email to trim and lowercase
      const email = (rawEmail ?? '').toString().trim().toLowerCase();
      const password = (rawPassword ?? '').toString().trim();

      if (!email || !password) {
        showToast("Veuillez saisir un email et un mot de passe.", "error");
        throw new Error("Veuillez saisir un email et un mot de passe.");
      }

      console.log("Login payload", { email, password: "***" });

      // Call login API (no Authorization header will be sent due to isAuthPath)
      const response = await api.post('/auth/login', { email, password });
      
      if (response.status === 200 && response.data.access_token) {
        // Save token
        await tokenStorage.set('access_token', response.data.access_token);
        console.log('🔑 Token saved successfully');
        
        // Call /api/whoami to validate token and get instance info
        try {
          const whoamiResponse = await api.get('/whoami');
          if (whoamiResponse.status === 200) {
            console.log('✅ Token validated via /api/whoami');
            
            // Set authenticated user from login response
            const userInfo = response.data.user;
            setUser({
              id: userInfo.id,
              email: userInfo.email,
              name: `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim() || userInfo.display_name || userInfo.email,
              plan: userInfo.plan || 'free',
              premium_until: userInfo.premium_until || null,
            });

            // Show success toast
            showToast("Connexion réussie !", "success");
            
            console.log('✅ Login successful, redirecting to dashboard');
            
            // Redirect to main app
            const { router } = await import('expo-router');
            router.replace('/');
          }
        } catch (whoamiError: any) {
          console.error('Failed to validate token after login:', whoamiError);
          // Clear invalid token
          await tokenStorage.remove('access_token');
          showToast("Erreur de validation du token", "error");
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
        showToast("Compte créé avec succès, vous pouvez vous connecter.", "success");
        
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
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
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