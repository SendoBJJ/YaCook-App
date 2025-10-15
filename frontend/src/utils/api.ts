import axios from 'axios';
import { tokenStorage } from './tokenStorage';

// Create centralized axios client
const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add Authorization header
api.interceptors.request.use(
  async (config) => {
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
    
    console.log(`🌐 ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor: Log 401 for debugging
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const method = error.config?.method?.toUpperCase();
    const url = error.config?.url;
    
    if (status === 401) {
      console.warn(`🚫 401 Unauthorized: ${method} ${url} - Token expired or invalid`);
    } else {
      console.error(`❌ ${status || 'Network Error'} ${method} ${url}:`, error.response?.data || error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;