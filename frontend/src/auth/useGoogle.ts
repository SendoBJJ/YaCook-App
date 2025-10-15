/**
 * Google Authentication Hook
 * Handles Google Sign In using expo-auth-session
 */
import { useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { router } from 'expo-router';
import Constants from 'expo-constants';

import { client } from '../api/client';
import { saveToken } from '../utils/tokenStorage';
import { useToast } from '../components/Toast';

// Needed for web to properly redirect back
WebBrowser.maybeCompleteAuthSession();

export const useGoogle = () => {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  // Get OAuth client IDs from environment
  // Note: For demo/testing without real credentials, these will be empty
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_ID || '';
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_ID || '';
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_ID || '';

  // Create redirect URI
  const redirectUri = makeRedirectUri({
    scheme: 'yacook',
    path: 'auth/callback'
  });

  // Configure Google auth request
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId,
    androidClientId,
    webClientId,
    redirectUri,
    scopes: ['profile', 'email']
  });

  // Handle authentication response
  const handleGoogleResponse = async (responseType: any, params: any) => {
    if (responseType === 'success') {
      const { id_token } = params;
      
      if (!id_token) {
        showToast('Aucun token reçu de Google', 'error');
        return;
      }

      setLoading(true);
      
      try {
        // Send id_token to backend
        const { data } = await client.post('/auth/social-login', {
          provider: 'google',
          id_token
        });

        // Store token
        await saveToken(data.access_token);

        // Fetch user info to validate token
        await client.get('/whoami');

        showToast('Connexion réussie ✅', 'success');
        router.replace('/');
      } catch (error: any) {
        console.error('Google login error:', error);
        
        if (error.response?.status === 401) {
          showToast('Connexion sociale invalide, réessayez.', 'error');
        } else {
          showToast('Service indisponible, réessayez.', 'error');
        }
      } finally {
        setLoading(false);
      }
    } else if (responseType === 'error') {
      showToast('Connexion Google annulée', 'info');
    }
  };

  // Trigger Google Sign In
  const signInWithGoogle = async () => {
    console.log('🔵 Google Sign In clicked');
    console.log('📝 Client IDs configured:', { 
      ios: !!iosClientId, 
      android: !!androidClientId, 
      web: !!webClientId 
    });
    
    // Check if credentials are configured
    if (!iosClientId && !androidClientId && !webClientId) {
      console.warn('⚠️ No Google client IDs configured');
      showToast('Configuration Google manquante. Ajoutez vos OAuth credentials pour activer.', 'error');
      return;
    }

    // Check if request is ready
    if (!request) {
      console.error('❌ Google auth request not initialized');
      showToast('Configuration Google invalide', 'error');
      return;
    }

    try {
      console.log('🚀 Starting Google OAuth flow...');
      const result = await promptAsync();
      console.log('📬 Google OAuth result:', result?.type);
      
      if (result) {
        await handleGoogleResponse(result.type, result.params);
      }
    } catch (error) {
      console.error('❌ Google auth error:', error);
      showToast('Erreur lors de la connexion Google', 'error');
    }
  };

  return {
    signInWithGoogle,
    loading,
    request
  };
};
