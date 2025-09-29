// User types
export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  language: string;
  timezone?: string;
  daily_calorie_goal?: number;
  dietary_restrictions: string[];
  allergens: string[];
  profile_public: boolean;
  analytics_consent: boolean;
  notifications_enabled: boolean;
  auth_provider: 'email' | 'google' | 'apple';
  email_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

// Auth types
export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  auth_provider?: 'email' | 'google' | 'apple';
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

// Product types
export interface Product {
  barcode: string;
  product_name?: string;
  product_name_fr?: string;
  generic_name?: string;
  generic_name_fr?: string;
  brands?: string;
  brands_tags: string[];
  manufacturing_places?: string;
  categories?: string;
  categories_tags: string[];
  nutriments?: Nutriments;
  nutrition_grades?: 'a' | 'b' | 'c' | 'd' | 'e' | 'unknown';
  nova_group?: 1 | 2 | 3 | 4;
  ingredients_text?: string;
  ingredients_text_fr?: string;
  allergens?: string;
  allergens_tags: string[];
  labels?: string;
  labels_tags: string[];
  image_front_url?: string;
  image_ingredients_url?: string;
  image_nutrition_url?: string;
  last_modified_t?: number;
  completeness?: number;
}

export interface Nutriments {
  energy_kj?: number;
  energy_kcal?: number;
  fat?: number;
  saturated_fat?: number;
  carbohydrates?: number;
  sugars?: number;
  fiber?: number;
  proteins?: number;
  salt?: number;
  sodium?: number;
}

export interface ProductResponse {
  success: boolean;
  product?: Product;
  message?: string;
  cached: boolean;
  cache_age?: number;
}

// Recipe types
export interface Ingredient {
  name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  optional: boolean;
}

export interface CookingStep {
  step_number: number;
  instruction: string;
  duration_minutes?: number;
  temperature?: number;
  image_url?: string;
}

export interface NutritionalInfo {
  calories_per_serving?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
}

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  servings: number;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  total_time_minutes?: number;
  difficulty: 'facile' | 'moyen' | 'difficile';
  meal_types: string[];
  cooking_methods: string[];
  ingredients: Ingredient[];
  steps: CookingStep[];
  tips?: string;
  storage_instructions?: string;
  tags: string[];
  cuisine_type?: string;
  dietary_labels: string[];
  nutrition?: NutritionalInfo;
  author_id: string;
  author_name?: string;
  author_avatar?: string;
  is_public: boolean;
  featured: boolean;
  likes_count: number;
  saves_count: number;
  views_count: number;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
  published_at?: string;
  is_liked?: boolean;
  is_saved?: boolean;
}

// Message types
export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  sent_at: string;
  read_at?: string;
  conversation_id: string;
}

export interface Conversation {
  id: string;
  participants: User[];
  last_message?: Message;
  unread_count: number;
  updated_at: string;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Navigation types
export type RootStackParamList = {
  '(tabs)': undefined;
  'auth/login': undefined;
  'auth/register': undefined;
  'recipe/[id]': { id: string };
  'profile/settings': undefined;
};

export type TabsParamList = {
  index: undefined;
  community: undefined;
  scan: undefined;
  messages: undefined;
};