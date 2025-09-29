import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
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
    </AuthProvider>
  );
}