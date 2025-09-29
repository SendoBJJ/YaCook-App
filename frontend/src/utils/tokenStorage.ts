import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

async function secureAvailable(): Promise<boolean> {
  try {
    return Platform.OS !== "web" && (await SecureStore.isAvailableAsync());
  } catch {
    return false;
  }
}

export const tokenStorage = {
  async get(key: string): Promise<string | null> {
    try {
      if (await secureAvailable()) {
        return await SecureStore.getItemAsync(key);
      }
      // Web fallback to localStorage
      return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    } catch (error) {
      console.warn(`Failed to get ${key} from storage:`, error);
      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    try {
      if (await secureAvailable()) {
        await SecureStore.setItemAsync(key, value);
        return;
      }
      // Web fallback to localStorage
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.warn(`Failed to set ${key} in storage:`, error);
      throw error;
    }
  },

  async del(key: string): Promise<void> {
    try {
      if (await secureAvailable()) {
        await SecureStore.deleteItemAsync(key);
        return;
      }
      // Web fallback to localStorage
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`Failed to delete ${key} from storage:`, error);
      throw error;
    }
  },

  async clear(): Promise<void> {
    try {
      const keys = ['access_token', 'refresh_token', 'user_data'];
      await Promise.all(keys.map(key => this.del(key)));
    } catch (error) {
      console.warn('Failed to clear storage:', error);
      throw error;
    }
  }
};