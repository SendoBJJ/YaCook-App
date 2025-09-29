import axios from 'axios';
import Constants from 'expo-constants';
import { AuthResponse, LoginData, RegisterData, User } from '../types';
import { tokenStorage } from '../utils/tokenStorage';

// Clean and build API base URL to prevent /api/api issues
const getApiBaseUrl = (): string => {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8001/api';
  return baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
};

const API_BASE_URL = getApiBaseUrl();

console.log('🔗 API Base URL:', API_BASE_URL);

// Token storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_DATA_KEY = 'user_data';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Enhanced token manager using universal storage
export const tokenManager = {
  async getAccessToken(): Promise<string | null> {
    try {
      return await tokenStorage.get(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await tokenStorage.get(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  },

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      await tokenStorage.set(ACCESS_TOKEN_KEY, accessToken);
      await tokenStorage.set(REFRESH_TOKEN_KEY, refreshToken);
      console.log('✅ Tokens stored successfully');
    } catch (error) {
      console.error('Error setting tokens:', error);
      throw error;
    }
  },

  async clearTokens(): Promise<void> {
    try {
      await tokenStorage.del(ACCESS_TOKEN_KEY);
      await tokenStorage.del(REFRESH_TOKEN_KEY);
      await tokenStorage.del(USER_DATA_KEY);
      console.log('✅ Tokens cleared successfully');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  },

  async getUserData(): Promise<User | null> {
    try {
      const userData = await tokenStorage.get(USER_DATA_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  },

  async setUserData(user: User): Promise<void> {
    try {
      await tokenStorage.set(USER_DATA_KEY, JSON.stringify(user));
      console.log('✅ User data stored successfully');
    } catch (error) {
      console.error('Error setting user data:', error);
      throw error;
    }
  },
};

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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

// Response interceptor to handle token refresh and errors
api.interceptors.response.use(
  (response) => {
    // Log successful responses
    console.log(`✅ ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Log error responses
    console.error(`❌ ${error.response?.status || 'Network Error'} ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`);
    console.error('Error details:', error.response?.data || error.message);

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await tokenManager.getRefreshToken();
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token: newRefreshToken } = response.data;
          await tokenManager.setTokens(access_token, newRefreshToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Refresh failed, clear tokens and redirect to login with French toast
        await tokenManager.clearTokens();
        
        // Show French error toast
        if (typeof window !== 'undefined') {
          // Create and dispatch custom event for auth error
          window.dispatchEvent(new CustomEvent('authError', {
            detail: { message: 'Session expirée. Veuillez vous reconnecter.' }
          }));
          
          // Redirect to login
          if (window.location.pathname !== '/auth/login') {
            window.location.href = '/auth/login';
          }
        }
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  async login(data: LoginData): Promise<AuthResponse> {
    try {
      console.log('🔑 Attempting login for:', data.email);
      const response = await api.post('/auth/login', data);
      console.log('✅ Login successful');
      return response.data;
    } catch (error: any) {
      console.error('❌ Login failed:', error.response?.data || error.message);
      throw error;
    }
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      console.log('📝 Attempting registration for:', data.email);
      const response = await api.post('/auth/register', data);
      console.log('✅ Registration successful');
      return response.data;
    } catch (error: any) {
      console.error('❌ Registration failed:', error.response?.data || error.message);
      throw error;
    }
  },

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await api.post('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
      console.log('✅ Server logout successful');
    } catch (error) {
      // Continue with logout even if server request fails
      console.warn('Server logout request failed:', error);
    } finally {
      // Clear ALL storage locations
      await tokenManager.clearTokens();
      
      // Clear any additional storage if needed
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.clear(); // Clear all localStorage
          window.sessionStorage.clear(); // Clear all sessionStorage
        } catch (e) {
          console.warn('Failed to clear web storage:', e);
        }
      }
      
      console.log('✅ All tokens and storage cleared');
    }
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get('/users/me');
    return response.data;
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await api.put('/users/me', data);
    return response.data;
  },
};

// Products API
export const productsApi = {
  async getProductByBarcode(barcode: string, language: string = 'fr') {
    const response = await api.get(`/products/${barcode}?language=${language}`);
    return response.data;
  },

  async searchProducts(query: string, language: string = 'fr', page: number = 1) {
    const response = await api.get('/products/search', {
      params: { query, language, page },
    });
    return response.data;
  },
};

// AI API
export const aiApi = {
  async generateRecipe(params: {
    ingredients?: string[];
    cuisine_type?: string;
    difficulty?: string;
    prep_time?: number;
    dietary_restrictions?: string[];
  }) {
    const response = await api.post('/ai/generate-recipe', params);
    return response.data;
  },

  async generateMealPlan(params: {
    days?: number;
    daily_calories?: number;
    dietary_restrictions?: string[];
  }) {
    const response = await api.post('/ai/generate-meal-plan', params);
    return response.data;
  },
};

// Health check
export const healthApi = {
  async check() {
    const response = await api.get('/health');
    return response.data;
  },
};

// Posts API
export const postsApi = {
  async getPosts(page = 1, per_page = 20, post_type?: string) {
    const params: { page: number; per_page: number; post_type?: string } = { page, per_page };
    if (post_type) params.post_type = post_type;
    const response = await api.get('/posts', { params });
    return response.data;
  },

  async createPost(postData: {
    type: 'question' | 'recipe';
    title: string;
    body: string;
    tags?: string[];
    media?: any[];
    is_public?: boolean;
  }) {
    const response = await api.post('/posts', postData);
    return response.data;
  },

  async getPost(postId: string) {
    const response = await api.get(`/posts/${postId}`);
    return response.data;
  },
};

// Comments API
export const commentsApi = {
  async getComments(postId: string, page = 1, per_page = 20) {
    const response = await api.get(`/posts/${postId}/comments`, {
      params: { page, per_page }
    });
    return response.data;
  },

  async createComment(postId: string, body: string, parentId?: string) {
    const response = await api.post(`/posts/${postId}/comments`, {
      body,
      post_id: postId,
      parent_id: parentId
    });
    return response.data;
  },
};

// Shopping List API
export const shoppingListApi = {
  async getShoppingList() {
    const response = await api.get('/shopping-list');
    return response.data;
  },

  async addItem(item: {
    name: string;
    section: string;
    quantity?: number;
    unit?: string;
    notes?: string;
  }) {
    const response = await api.post('/shopping-list/items', item);
    return response.data;
  },

  async updateItem(itemId: string, updates: {
    name?: string;
    section?: string;
    quantity?: number;
    unit?: string;
    notes?: string;
    is_checked?: boolean;
  }) {
    const response = await api.put(`/shopping-list/items/${itemId}`, updates);
    return response.data;
  },

  async deleteItem(itemId: string) {
    const response = await api.delete(`/shopping-list/items/${itemId}`);
    return response.data;
  },

  async addRecipeIngredients(recipeId: string, ingredients: any[]) {
    const response = await api.post('/shopping-list/add-ingredients', {
      recipe_id: recipeId,
      ingredients
    });
    return response.data;
  },
};

export default api;