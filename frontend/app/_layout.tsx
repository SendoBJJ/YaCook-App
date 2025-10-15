import React, { useState, useEffect, useCallback } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '../src/context/AuthContext';
import { LaunchSplash } from '../src/components/LaunchSplash';

// Keep native splash visible while loading
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [showLaunchSplash, setShowLaunchSplash] = useState(true);
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Load fonts, assets, etc. here if needed
        // For now, just a small delay to ensure everything is loaded
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        console.warn('Error during app preparation:', e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // Hide the native splash screen
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  const handleSplashFinish = useCallback(() => {
    setShowLaunchSplash(false);
  }, []);

  if (!appIsReady) {
    return null;
  }

  return (
    <AuthProvider>
      <Stack 
        screenOptions={{ headerShown: false }}
        onLayout={onLayoutRootView}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen 
          name="recipe/[id]" 
          options={{ 
            headerShown: true,
            title: 'Recette',
            headerBackTitle: 'Retour'
          }} 
        />
      </Stack>
      
      {/* Launch Splash Overlay */}
      {showLaunchSplash && <LaunchSplash onFinish={handleSplashFinish} />}
    </AuthProvider>
  );
}