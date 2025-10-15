// In-memory fallback for Safari iOS, iframe restrictions
const memoryStorage: { [key: string]: string } = {};

export const tokenStorage = {
  async get(key: string): Promise<string | null> {
    try {
      // Try localStorage first (web)
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(key);
        if (stored) return stored;
      }
    } catch (error) {
      console.warn(`localStorage unavailable for ${key}, using memory fallback:`, error);
    }

    try {
      // Try SecureStore (native)
      if (typeof window === 'undefined') {
        const SecureStore = await import('expo-secure-store');
        return await SecureStore.getItemAsync(key);
      }
    } catch (error) {
      console.warn(`SecureStore unavailable for ${key}:`, error);
    }

    // Fallback to in-memory storage
    const memValue = memoryStorage[key];
    if (memValue) {
      console.log(`Using memory fallback for ${key}`);
      return memValue;
    }

    return null;
  },

  async set(key: string, value: string): Promise<void> {
    try {
      // Try localStorage first (web)
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
        return;
      }
    } catch (error) {
      console.warn(`localStorage unavailable for ${key}, using memory fallback:`, error);
    }

    try {
      // Try SecureStore (native)
      if (typeof window === 'undefined') {
        const SecureStore = await import('expo-secure-store');
        await SecureStore.setItemAsync(key, value);
        return;
      }
    } catch (error) {
      console.warn(`SecureStore unavailable for ${key}:`, error);
    }

    // Fallback to in-memory storage
    memoryStorage[key] = value;
    console.log(`Stored ${key} in memory fallback`);
  },

  async remove(key: string): Promise<void> {
    try {
      // Try localStorage first (web)
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`localStorage removal failed for ${key}:`, error);
    }

    try {
      // Try SecureStore (native)
      if (typeof window === 'undefined') {
        const SecureStore = await import('expo-secure-store');
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.warn(`SecureStore removal failed for ${key}:`, error);
    }

    // Remove from memory fallback
    delete memoryStorage[key];
    console.log(`Removed ${key} from memory fallback`);
  },
};