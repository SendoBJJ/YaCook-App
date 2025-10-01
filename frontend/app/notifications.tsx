import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  FlatList,
  Image,
  Pressable,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { notificationsApi } from '../src/services/api';
import { Colors } from '../src/constants/Colors';
import { AppTexts } from '../src/constants/Texts';
import { SkeletonNotificationItem } from '../src/components/SkeletonLoader';
import { SmartButton } from '../src/components/SmartButton';
import { Notification, NotificationSection } from '../src/types/notification';
import { useToast } from '../src/components/Toast';

type TabType = 'all' | 'mentions' | 'comments';

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onPress: (notification: Notification) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onMarkRead, 
  onPress 
}) => {
  const isUnread = !notification.read_at;
  const timeAgo = getTimeAgo(notification.created_at);

  const handlePress = () => {
    onPress(notification);
    if (isUnread) {
      onMarkRead(notification.id);
    }
  };

  const handleMarkRead = (e: any) => {
    e.stopPropagation();
    onMarkRead(notification.id);
  };

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'comment':
        return 'chatbubble-outline';
      case 'reply':
        return 'return-up-forward-outline';
      case 'mention':
        return 'at-outline';
      case 'like':
        return 'heart-outline';
      default:
        return 'notifications-outline';
    }
  };

  return (
    <Pressable
      style={[styles.notificationItem, isUnread && styles.unreadItem]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Notification de ${notification.from_user_name}: ${notification.message}`}
      accessibilityHint="Appuyer pour voir la publication"
    >
      <View style={styles.avatarContainer}>
        {notification.from_user_avatar ? (
          <Image 
            source={{ uri: notification.from_user_avatar }} 
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={20} color={Colors.textSecondary} />
          </View>
        )}
        <View style={styles.typeIconContainer}>
          <Ionicons 
            name={getNotificationIcon()} 
            size={12} 
            color={Colors.primary} 
          />
        </View>
      </View>

      <View style={styles.notificationContent}>
        <Text style={styles.notificationMessage}>
          <Text style={styles.userName}>{notification.from_user_name}</Text>
          {' '}
          {notification.message.replace(notification.from_user_name, '')}
        </Text>
        <Text style={styles.timeText}>{timeAgo}</Text>
      </View>

      <View style={styles.notificationActions}>
        {isUnread && (
          <>
            <View style={styles.unreadDot} />
            <TouchableOpacity
              onPress={handleMarkRead}
              style={styles.markReadButton}
              accessibilityLabel="Marquer comme lu"
              accessibilityRole="button"
            >
              <Ionicons name="checkmark" size={16} color={Colors.primary} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </Pressable>
  );
};

export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const router = useRouter();
  const { showToast } = useToast();

  const fetchNotifications = async (pageNum = 1, refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
        setPage(1);
      } else if (pageNum === 1) {
        setLoading(true);
      }

      const response = await notificationsApi.getFilteredNotifications(
        activeTab as NotificationSection,
        pageNum,
        20,
        false
      );

      if (refresh || pageNum === 1) {
        setNotifications(response.notifications);
      } else {
        setNotifications(prev => [...prev, ...response.notifications]);
      }

      setUnreadCount(response.unread_count);
      setHasMore(response.has_next);
      setPage(pageNum);

    } catch (error) {
      console.error('Error fetching notifications:', error);
      showToast('Erreur lors du chargement des notifications', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchNotifications(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchNotifications(page + 1);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read_at: new Date().toISOString() }
            : notif
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
      showToast('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await notificationsApi.markAllAsRead();
      
      setNotifications(prev => 
        prev.map(notif => ({
          ...notif,
          read_at: notif.read_at || new Date().toISOString()
        }))
      );
      
      setUnreadCount(0);
      showToast(response.message || 'Toutes les notifications marquées comme lues', 'success');
      
    } catch (error) {
      console.error('Error marking all as read:', error);
      showToast('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    // Deep link to the related post/comment
    try {
      if (notification.type === 'comment' || notification.type === 'reply') {
        router.push(`/post/${notification.entity_id}`);
      }
    } catch (error) {
      console.error('Error navigating to notification target:', error);
      showToast('Impossible d\'ouvrir la publication', 'error');
    }
  };

  const handleTabPress = (tab: TabType) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      setPage(1);
      setNotifications([]);
      setLoading(true);
    }
  };

  useEffect(() => {
    fetchNotifications(1);
  }, [activeTab]);

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <NotificationItem
      notification={item}
      onMarkRead={handleMarkAsRead}
      onPress={handleNotificationPress}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name="notifications-outline" 
        size={64} 
        color={Colors.textSecondary} 
      />
      <Text style={styles.emptyStateTitle}>
        {activeTab === 'all' && 'Aucune notification'}
        {activeTab === 'mentions' && 'Aucune mention'}
        {activeTab === 'comments' && 'Aucun commentaire'}
      </Text>
      <Text style={styles.emptyStateText}>
        {activeTab === 'all' && 'Vous recevrez des notifications ici lorsque d\'autres utilisateurs interagiront avec vos publications.'}
        {activeTab === 'mentions' && 'Vous serez notifié ici lorsque quelqu\'un vous mentionne dans une publication ou un commentaire.'}
        {activeTab === 'comments' && 'Vous recevrez des notifications ici lorsque quelqu\'un commente vos publications.'}
      </Text>
    </View>
  );

  const renderSkeletonLoader = () => (
    <View style={styles.container}>
      {Array.from({ length: 6 }).map((_, index) => (
        <SkeletonNotificationItem key={index} />
      ))}
    </View>
  );

  if (loading && notifications.length === 0) {
    return renderSkeletonLoader();
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Retour"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Notifications</Text>
        
        <SmartButton
          onPress={handleMarkAllAsRead}
          style={styles.markAllButton}
          disabled={unreadCount === 0}
          accessibilityLabel="Marquer toutes comme lues"
        >
          <Text style={[
            styles.markAllText,
            unreadCount === 0 && styles.markAllTextDisabled
          ]}>
            Tout marquer
          </Text>
        </SmartButton>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => handleTabPress('all')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'all' }}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            Toutes
          </Text>
          {activeTab === 'all' && unreadCount > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'mentions' && styles.activeTab]}
          onPress={() => handleTabPress('mentions')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'mentions' }}
        >
          <Text style={[styles.tabText, activeTab === 'mentions' && styles.activeTabText]}>
            Mentions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'comments' && styles.activeTab]}
          onPress={() => handleTabPress('comments')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'comments' }}
        >
          <Text style={[styles.tabText, activeTab === 'comments' && styles.activeTabText]}>
            Commentaires
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        showsVerticalScrollIndicator={false}
        style={styles.list}
      />
    </SafeAreaView>
  );
}

// Utility function to calculate time ago
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'À l\\\'instant';
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}j`;
  
  return date.toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'short' 
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  markAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  markAllTextDisabled: {
    color: Colors.textSecondary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.primary,
  },
  tabBadge: {
    marginLeft: 6,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: Colors.background,
    fontSize: 10,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  unreadItem: {
    backgroundColor: '#F0F9FF', // Light blue tint for unread
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeIconContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.background,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notificationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  notificationMessage: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 2,
  },
  userName: {
    fontWeight: '600',
    color: Colors.text,
  },
  timeText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  notificationActions: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginBottom: 4,
  },
  markReadButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: Colors.backgroundSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

// Utility function to calculate time ago
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'À l\\\'instant';
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}j`;
  
  return date.toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'short' 
  });
}