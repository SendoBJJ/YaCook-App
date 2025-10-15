/**
 * Apple Authentication Hook
 * Handles Sign in with Apple using expo-apple-authentication
 */
import { useState, useEffect } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { router } from 'expo-router';

import { client } from '../api/client';
import { saveToken } from '../utils/tokenStorage';
import { useToast } from '../components/Toast';

export const useApple = () => {
  const [loading, setLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const { showToast } = useToast();

  // Check if Apple Authentication is available (iOS only)
  useEffect(() => {
    const checkAvailability = async () => {
      if (Platform.OS === 'ios') {
        const available = await AppleAuthentication.isAvailableAsync();
        setIsAvailable(available);
      }
    };

    checkAvailability();
  }, []);

  // Generate cryptographic nonce for security
  const generateNonce = async () => {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    const nonce = Array.from(randomBytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
    return nonce;
  };

  // Trigger Apple Sign In
  const signInWithApple = async () => {
    if (!isAvailable) {
      showToast('Connexion Apple non disponible', 'error');
      return;
    }

    setLoading(true);

    try {
      // Generate nonce for security
      const nonce = await generateNonce();

      // Request Apple authentication
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce,
      });

      const { identityToken } = credential;

      if (!identityToken) {
        showToast('Aucun token reçu d\'Apple', 'error');
        return;
      }

      // Send to backend
      const { data } = await client.post('/auth/social-login', {
        provider: 'apple',
        id_token: identityToken,
        nonce,
      });

      // Store token
      await saveToken(data.access_token);

      // Fetch user info to validate token
      await client.get('/whoami');

      showToast('Connexion réussie ✅', 'success');
      router.replace('/');
    } catch (error: any) {
      console.error('Apple login error:', error);

      // Handle user cancellation
      if (error.code === 'ERR_CANCELED') {
        showToast('Connexion Apple annulée', 'info');
        return;
      }

      // Handle API errors
      if (error.response?.status === 401) {
        showToast('Connexion sociale invalide, réessayez.', 'error');
      } else {
        showToast('Service indisponible, réessayez.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    signInWithApple,
    loading,
    isAvailable,
  };
};
