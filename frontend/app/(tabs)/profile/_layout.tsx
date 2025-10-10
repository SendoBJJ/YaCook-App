import { Stack } from 'expo-router';
import { Colors } from '../../../src/constants/Colors';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.light.background,
          borderBottomWidth: 1,
          borderBottomColor: Colors.light.border,
        },
        headerTitleStyle: {
          color: Colors.light.text,
          fontSize: 18,
          fontWeight: '600',
        },
        headerTintColor: Colors.light.primary,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerTitle: 'Profil',
          headerShown: false, // We'll handle the header in the tab bar
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          headerTitle: 'Paramètres',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="edit-profile"
        options={{
          headerTitle: 'Modifier le profil',
          presentation: 'card',
        }}
      />
    </Stack>
  );
}