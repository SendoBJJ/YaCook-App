import axios from 'axios';
import { apiBase } from './apiBase';
import { tokenStorage } from './tokenStorage';

// Create centralized axios instance
const httpClient = axios.create({
  baseURL: apiBase(),
  timeout: 15000,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add Authorization header if token present
httpClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await tokenStorage.get('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to get token for request:', error);
    }
    
    // Log request for debugging
    console.log(`🌐 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and logging
httpClient.interceptors.response.use(
  (response) => {
    // Log successful responses
    console.log(`✅ ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  (error) => {
    // Log error responses
    console.error(`❌ ${error.response?.status || 'Network Error'} ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
    console.error('Error details:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default httpClient;