import axios from 'axios';
import { resolveApiBase } from '../utils/apiBase';

const client = axios.create({
  baseURL: resolveApiBase(),
  timeout: 20000, // more forgiving
  withCredentials: false, // no cookies in this app
});

/**
 * Helper to check if a URL path is an auth-related endpoint
 * Auth endpoints should NOT receive Authorization headers
 */
function isAuthPath(url: string | undefined): boolean {
  if (!url) return false;
  const authPaths = ['/auth/login', '/auth/register', '/auth/refresh'];
  return authPaths.some(path => url.includes(path));
}

// REQUEST INTERCEPTOR: Add Authorization header (except for auth paths)
client.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    // Debug log to verify routing
    // eslint-disable-next-line no-console
    console.log('API Base URL:', client.defaults.baseURL);
  }
  
  // Skip Authorization header for auth endpoints
  if (isAuthPath(config.url)) {
    console.log('🔓 Auth endpoint detected, skipping Authorization header:', config.url);
    return config;
  }
  
  // Add Authorization header if token exists
  try {
    const { tokenStorage } = await import('../utils/tokenStorage');
    const token = await tokenStorage.get('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 Authorization header added to request:', config.url);
    } else {
      console.log('🔓 No token available for request:', config.url);
    }
  } catch (error) {
    console.warn('Failed to get token for request:', error);
  }
  
  return config;
});

// RESPONSE INTERCEPTOR: Handle 401 errors and timeouts
client.interceptors.response.use(
  // Success handler
  (response) => response,
  // Error handler
  async (error) => {
    const originalRequest = error.config;
    
    // Handle timeout with retry
    const isTimeout = error.code === 'ECONNABORTED';
    if (isTimeout && !originalRequest.__retried) {
      originalRequest.__retried = true;
      await new Promise(r => setTimeout(r, 800));
      return client.request(originalRequest);
    }
    
    // Handle 401 Unauthorized (expired/invalid token)
    if (error.response?.status === 401) {
      // Skip 401 handling for auth endpoints (they're supposed to return 401 on bad credentials)
      if (isAuthPath(originalRequest.url)) {
        console.log('🔓 401 on auth endpoint (expected for bad credentials):', originalRequest.url);
        return Promise.reject(error);
      }
      
      console.log('🚫 401 Unauthorized on protected route:', originalRequest.url);
      console.log('🔄 Clearing token and dispatching auth error event');
      
      // Clear the invalid token
      try {
        const { tokenStorage } = await import('../utils/tokenStorage');
        await tokenStorage.remove('access_token');
        console.log('✅ Token cleared');
      } catch (clearError) {
        console.error('Failed to clear token:', clearError);
      }
      
      // Dispatch custom event for AuthContext to handle
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth-error', {
          detail: { message: 'Session expirée, veuillez vous reconnecter.' }
        }));
        console.log('📢 Auth error event dispatched');
      }
      
      // Do NOT redirect here - let AuthContext handle it via the event listener
    }
    
    return Promise.reject(error);
  }
);

export default client;