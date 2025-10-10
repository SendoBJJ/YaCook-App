import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/Colors';
import { AppTexts } from '../../src/constants/Texts';
import { CommunityTabIcon } from '../../src/components/CommunityTabIcon';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.primary,
        tabBarInactiveTintColor: Colors.light.muted,
        tabBarStyle: {
          backgroundColor: Colors.light.background,
          borderTopWidth: 1,
          borderTopColor: Colors.light.border,
          paddingTop: 8,
          height: 84,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          paddingBottom: 4,
        },
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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: AppTexts.tabs.dashboard,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          headerTitle: AppTexts.dashboard.title,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: AppTexts.tabs.community,
          tabBarIcon: ({ color, size }) => (
            <CommunityTabIcon color={color} size={size} />
          ),
          headerTitle: AppTexts.community.title,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: AppTexts.tabs.scan,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="qr-code-outline" size={size} color={color} />
          ),
          headerTitle: AppTexts.scan.title,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: AppTexts.tabs.messages,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
          headerTitle: AppTexts.messages.title,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: AppTexts.tabs.profile,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle" size={size} color={color} />
          ),
          headerShown: false, // We handle the header in the profile screen
        }}
      />
    </Tabs>
  );
}