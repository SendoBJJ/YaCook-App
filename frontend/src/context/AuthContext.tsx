import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, tokenManager } from '../services/api';

type AuthContextValue = {
  user: { id: string; name?: string; email: string } | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Initialize auth state on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);

      // Check if we have stored tokens
      const accessToken = await tokenManager.getAccessToken();
      const storedUser = await tokenManager.getUserData();

      if (accessToken && storedUser) {
        // Try to refresh user data from server
        try {
          const currentUser = await authApi.getCurrentUser();
          setUser(currentUser);
          await tokenManager.setUserData(currentUser);
        } catch (error) {
          // If server request fails, use stored user data
          console.warn('Failed to refresh user data from server:', error);
          setUser(storedUser);
        }
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      // Clear potentially corrupted data
      await tokenManager.clearTokens();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (data: LoginData) => {
    try {
      const response: AuthResponse = await authApi.login(data);

      // Store tokens and user data
      await tokenManager.setTokens(response.access_token, response.refresh_token);
      await tokenManager.setUserData(response.user);

      setUser(response.user);
    } catch (error: any) {
      console.error('Login error:', error);
      const message = error.response?.data?.detail || 'Erreur de connexion';
      throw new Error(message);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response: AuthResponse = await authApi.register(data);

      // Store tokens and user data
      await tokenManager.setTokens(response.access_token, response.refresh_token);
      await tokenManager.setUserData(response.user);

      setUser(response.user);
    } catch (error: any) {
      console.error('Registration error:', error);
      const message = error.response?.data?.detail || 'Erreur d\'inscription';
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

  const updateUser = async (userData: Partial<User>) => {
    if (!user) return;

    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    await tokenManager.setUserData(updatedUser);
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      await tokenManager.setUserData(currentUser);
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};