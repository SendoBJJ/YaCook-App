import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi, tokenManager } from '../services/api';

type User = { id: string; email: string; name?: string };
type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; name?: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setLoading(true);
      
      // Check if user data exists in storage
      const storedUser = await tokenManager.getUserData();
      if (storedUser) {
        // Transform to our simplified user type
        setUser({
          id: storedUser.id,
          name: storedUser.first_name && storedUser.last_name 
            ? `${storedUser.first_name} ${storedUser.last_name}` 
            : storedUser.first_name || storedUser.display_name,
          email: storedUser.email
        });
        
        // Try to refresh user data if we have a token
        try {
          const currentUser = await authApi.getCurrentUser();
          setUser({
            id: currentUser.id,
            name: currentUser.first_name && currentUser.last_name 
              ? `${currentUser.first_name} ${currentUser.last_name}` 
              : currentUser.first_name || currentUser.display_name,
            email: currentUser.email
          });
          await tokenManager.setUserData(currentUser);
        } catch (error) {
          // If refresh fails, clear stored data
          console.warn('Failed to refresh user data on init:', error);
          await tokenManager.clearTokens();
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });

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
      const message = error.response?.data?.detail || 'Erreur de connexion';
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

  const value: AuthContextValue = {
    user,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};