import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/Colors';
import { NotificationBell } from '../../src/components/NotificationBell';

export default function CommunityScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header with title and notification bell */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Communauté</Text>
        <NotificationBell size={24} color={Colors.light.text} />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.message}>Community Screen - En cours de développement</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    fontSize: 16,
    color: Colors.light.text,
    textAlign: 'center',
  },
});