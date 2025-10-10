import { saveToken, loadToken } from './webSafeStorage';

export const tokenStorage = {
  async get(key: string): Promise<string | null> {
    try {
      return await loadToken(key);
    } catch (error) {
      console.warn(`Failed to get ${key} from storage:`, error);
      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    try {
      await saveToken(key, value);
    } catch (error) {
      console.warn(`Failed to set ${key} in storage:`, error);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await saveToken(key, null);
    } catch (error) {
      console.warn(`Failed to remove ${key} from storage:`, error);
    }
  },
};