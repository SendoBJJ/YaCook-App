import axios from 'axios';
import { resolveApiBase } from '../utils/apiBase';

const client = axios.create({
  baseURL: resolveApiBase(),
  timeout: 20000, // more forgiving
  withCredentials: false, // no cookies in this app
});

client.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    // Debug log to verify routing
    // eslint-disable-next-line no-console
    console.log('API Base URL:', client.defaults.baseURL);
  }
  
  // Add Authorization header if token exists
  try {
    const { tokenStorage } = await import('../utils/tokenStorage');
    const token = await tokenStorage.get('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn('Failed to get token for request:', error);
  }
  
  return config;
});

// Add retry logic for timeouts
client.interceptors.response.use(undefined, async (error) => {
  const isTimeout = error.code === 'ECONNABORTED';
  if (isTimeout && !error.config.__retried) {
    error.config.__retried = true;
    await new Promise(r => setTimeout(r, 800));
    return client.request(error.config);
  }
  throw error;
});

export default client;