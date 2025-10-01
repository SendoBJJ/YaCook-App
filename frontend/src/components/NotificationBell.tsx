import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { notificationsApi } from '../services/api';
import { Colors } from '../constants/Colors';

interface NotificationBellProps {
  size?: number;
  color?: string;
  onPress?: () => void;
  style?: any;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  size = 24,
  color = Colors.primary,
  onPress,
  style
}) => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const fetchUnreadCount = async () => {
    try {
      setLoading(true);
      const response = await notificationsApi.getUnreadCount();
      setUnreadCount(response.unread_count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
      // Silently fail for unread count - not critical for UX
    } finally {
      setLoading(false);
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/notifications');
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30 seconds
    
    // Listen for app focus events to refresh count
    const handleFocus = () => {
      fetchUnreadCount();
    };

    // Add focus listener if available (web environment)
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
      }
    };
  }, []);

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.container, style]}
      accessibilityLabel={`Notifications. ${unreadCount} notifications non lues`}
      accessibilityRole="button"
      accessibilityHint="Appuyer pour voir les notifications"
    >
      <View style={styles.bellContainer}>
        <Ionicons 
          name={unreadCount > 0 ? "notifications" : "notifications-outline"} 
          size={size} 
          color={color} 
        />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount.toString()}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// Hook for managing notification state globally
export const useNotificationCount = () => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCount = async () => {
    try {
      setLoading(true);
      const response = await notificationsApi.getUnreadCount();
      setUnreadCount(response.unread_count || 0);
      return response.unread_count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = (count = 1) => {
    setUnreadCount(prev => Math.max(0, prev - count));
  };

  const markAllAsRead = () => {
    setUnreadCount(0);
  };

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  return {
    unreadCount,
    loading,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead
  };
};

const styles = StyleSheet.create({
  container: {
    padding: 4,
  },
  bellContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF3B30', // iOS red
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default NotificationBell;