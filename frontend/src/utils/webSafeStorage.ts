const isWeb = typeof window !== 'undefined';

export async function saveToken(key: string, token: string | null): Promise<void> {
  if (isWeb) {
    if (token) {
      localStorage.setItem(key, token);
    } else {
      localStorage.removeItem(key);
    }
  } else {
    const SecureStore = await import('expo-secure-store');
    if (token) {
      await SecureStore.setItemAsync(key, token);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  }
}

export async function loadToken(key: string): Promise<string | null> {
  if (isWeb) {
    return localStorage.getItem(key);
  } else {
    const SecureStore = await import('expo-secure-store');
    return await SecureStore.getItemAsync(key);
  }
}

export async function saveUserData(key: string, userData: any): Promise<void> {
  const dataString = userData ? JSON.stringify(userData) : null;
  await saveToken(key, dataString);
}

export async function loadUserData(key: string): Promise<any | null> {
  const dataString = await loadToken(key);
  return dataString ? JSON.parse(dataString) : null;
}