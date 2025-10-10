import axios from 'axios';
import { resolveApiBase } from '../utils/apiBase';

const client = axios.create({
  baseURL: resolveApiBase(),
  timeout: 20000, // more forgiving
  withCredentials: false, // no cookies in this app
});

client.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Debug log to verify routing
    // eslint-disable-next-line no-console
    console.log('API Base URL:', client.defaults.baseURL);
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