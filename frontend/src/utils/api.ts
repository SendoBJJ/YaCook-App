import axios from 'axios';
import { tokenStorage } from './tokenStorage';

// Helper to detect auth paths that should not include Authorization header
const isAuthPath = (url: string): boolean => {
  const authPaths = [
    '/auth/login',
    '/auth/register', 
    '/auth/refresh',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/health',
    '/whoami'
  ];
  
  return authPaths.some(path => url.includes(path));
};

// Helper to clear token and redirect to login
const clearTokenAndRedirect = async (message: string = 'Session expirée, veuillez vous reconnecter.') => {
  try {
    await tokenStorage.remove('access_token');
    
    // Show toast if available
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth-error', {
        detail: { message }
      }));
    }
    
    // Redirect to login
    const { router } = await import('expo-router');
    router.replace('/auth/login');
    
    console.log('🔄 Token cleared and redirected to login');
  } catch (error) {
    console.error('Error clearing token and redirecting:', error);
  }
};

// Create centralized axios client
const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add Authorization header only for non-auth paths
api.interceptors.request.use(
  async (config) => {
    const url = config.url || '';
    const isAuth = isAuthPath(url);
    
    if (!isAuth) {
      try {
        const token = await tokenStorage.get('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log(`🔐 Adding Bearer token to ${config.method?.toUpperCase()} ${config.url}`);
        } else {
          console.log(`🔓 No token found for ${config.method?.toUpperCase()} ${config.url}`);
        }
      } catch (error) {
        console.warn('Failed to get token for request:', error);
      }
    } else {
      console.log(`🔓 Auth path - no token needed for ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    console.log(`🌐 ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor: Handle 401 unauthorized responses
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    const method = error.config?.method?.toUpperCase();
    const url = error.config?.url;
    
    if (status === 401) {
      console.warn(`🚫 401 Unauthorized: ${method} ${url}`);
      
      // Only clear token and redirect if it's not an auth path
      if (!isAuthPath(url)) {
        console.log('🔄 401 on protected route - clearing token and redirecting');
        await clearTokenAndRedirect();
      }
    } else {
      console.error(`❌ ${status || 'Network Error'} ${method} ${url}:`, error.response?.data || error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;
export { clearTokenAndRedirect };