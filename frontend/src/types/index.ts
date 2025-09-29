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

// Post types
export interface Post {
  id: string;
  type: 'question' | 'recipe';
  title: string;
  body: string;
  tags: string[];
  media: PostMedia[];
  is_public: boolean;
  author_id: string;
  author_name?: string;
  author_avatar?: string;
  likes_count: number;
  saves_count: number;
  comments_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
  is_liked?: boolean;
  is_saved?: boolean;
  is_following_author?: boolean;
}

export interface PostMedia {
  type: 'image' | 'video';
  url: string;
  thumbnail_url?: string;
  caption?: string;
  duration?: number;
}

export interface CreatePost {
  type: 'question' | 'recipe';
  title: string;
  body: string;
  tags?: string[];
  media?: PostMedia[];
  is_public?: boolean;
}

export interface PostList {
  posts: Post[];
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
  has_prev: boolean;
}

// Comment types
export interface Comment {
  id: string;
  body: string;
  post_id: string;
  parent_id?: string;
  author_id: string;
  author_name?: string;
  author_avatar?: string;
  likes_count: number;
  replies_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  is_liked?: boolean;
  replies?: Comment[];
}

export interface CreateComment {
  body: string;
  post_id: string;
  parent_id?: string;
}

export interface CommentList {
  comments: Comment[];
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
  has_prev: boolean;
}

// Shopping List types
export interface ShoppingItem {
  id: string;
  name: string;
  section: string;
  quantity: number;
  unit?: string;
  notes?: string;
  is_checked: boolean;
  user_id: string;
  recipe_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateShoppingItem {
  name: string;
  section: string;
  quantity?: number;
  unit?: string;
  notes?: string;
}

export interface UpdateShoppingItem {
  name?: string;
  section?: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  is_checked?: boolean;
}

export interface ShoppingSection {
  section: string;
  section_name: string;
  items: ShoppingItem[];
  total_items: number;
  checked_items: number;
  is_expanded: boolean;
}

export interface ShoppingList {
  sections: ShoppingSection[];
  total_items: number;
  total_checked: number;
  completion_percentage: number;
  last_updated?: string;
}

// Navigation types
export type RootStackParamList = {
  '(tabs)': undefined;
  'auth/login': undefined;
  'auth/register': undefined;
  'post/[id]': { id: string };
  'community/composer': undefined;
  'profile/settings': undefined;
  'shopping-list': undefined;
};

export type TabsParamList = {
  index: undefined;
  community: undefined;
  scan: undefined;
  messages: undefined;
};