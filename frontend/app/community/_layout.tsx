import React from 'react';
import { Stack } from 'expo-router';

export default function CommunityLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="composer" options={{
        presentation: 'modal',
        headerShown: true,
        title: 'Créer un post',
        headerBackTitle: 'Annuler'
      }} />
    </Stack>
  );
}