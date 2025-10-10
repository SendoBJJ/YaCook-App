import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/constants/Colors';
import { AppTexts } from '../../src/constants/Texts';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../src/constants/Layout';
import { SmartButton } from '../../src/components/SmartButton';
import { SkeletonConversationItem } from '../../src/components/SkeletonLoader';

// Types
type Conversation = {
  id: string;
  name: string;
  avatar?: string | null;
  lastMessage: string;
  lastMessageTime: string; // e.g., "Hier"
  unreadCount: number;
  isOnline: boolean;
};

// For now, keep an EMPTY list so the screen renders a real empty state.
// (No fake data)
const mockConversations: Conversation[] = [];

// Feature flag for real API (disabled for now)
const USE_REAL_API = false;

export default function MessagesScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate initial loading
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (USE_REAL_API) {
          // TODO: Call real API when ready
          // const response = await messagesApi.listConversations();
          // setConversations(response);
        } else {
          // Use empty array for true empty state
          setConversations(mockConversations);
        }
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Error loading conversations:', error);
        // Show French toast on error
        // TODO: Add toast notification
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      // TODO: Refresh conversations from API
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error refreshing conversations:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConversationPress = (conversationId: string) => {
    router.push(`/messages/thread/${conversationId}`);
  };

  const handleNewMessage = () => {
    // TODO: Navigate to compose message screen
    router.push('/messages/compose');
  };

  const renderConversationItem = (conversation: Conversation) => (
    <TouchableOpacity
      key={conversation.id}
      style={styles.conversationItem}
      onPress={() => handleConversationPress(conversation.id)}
      accessibilityLabel={`Conversation avec ${conversation.name}`}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {conversation.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        {conversation.isOnline && <View style={styles.onlineIndicator} />}
      </View>
      
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.participantName}>{conversation.name}</Text>
          <View style={styles.conversationMeta}>
            <Text style={styles.messageTime}>{conversation.lastMessageTime}</Text>
            {conversation.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{conversation.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
        
        <Text 
          style={[
            styles.lastMessage, 
            conversation.unreadCount > 0 && styles.unreadMessage
          ]}
          numberOfLines={2}
        >
          {conversation.lastMessage}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Ionicons 
        name="chatbubbles-outline" 
        size={64} 
        color={Colors.light.muted} 
      />
      <Text style={styles.emptyStateTitle}>Aucun message</Text>
      <Text style={styles.emptyStateSubtitle}>
        Vos conversations apparaîtront ici.
      </Text>
      <SmartButton
        style={styles.newMessageButton}
        textStyle={styles.newMessageButtonText}
        onPress={handleNewMessage}
        disabled={true} // Disabled for now
      >
        Nouveau message
      </SmartButton>
    </View>
  );

  const renderSkeletonLoader = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4, 5].map(index => (
        <SkeletonConversationItem key={index} />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.light.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher des conversations..."
          placeholderTextColor={Colors.light.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.light.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          renderSkeletonLoader()
        ) : filteredConversations.length === 0 ? (
          renderEmptyState()
        ) : (
          filteredConversations.map(renderConversationItem)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.light.card,
    margin: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.xs,
    fontSize: FontSize.md,
    color: Colors.light.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  skeletonContainer: {
    paddingHorizontal: Spacing.md,
  },
  conversationItem: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: Spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.light.secondary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.light.success,
    borderWidth: 2,
    borderColor: Colors.light.background,
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  participantName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semiBold,
    color: Colors.light.text,
    flex: 1,
  },
  conversationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageTime: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginRight: Spacing.xs,
  },
  unreadBadge: {
    backgroundColor: Colors.light.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.light.secondary,
  },
  lastMessage: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    lineHeight: 18,
  },
  unreadMessage: {
    fontWeight: FontWeight.semiBold,
    color: Colors.light.text,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  emptyStateTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptyStateSubtitle: {
    fontSize: FontSize.md,
    color: Colors.light.muted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  newMessageButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    opacity: 0.6, // Disabled state
  },
  newMessageButtonText: {
    color: Colors.light.secondary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semiBold,
  },
});