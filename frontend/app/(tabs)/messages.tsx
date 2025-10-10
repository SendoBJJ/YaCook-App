import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TextInput,
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

export default function MessagesScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate initial loading
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsLoading(false);
    };
    loadData();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const filteredConversations = conversations.filter(conv =>
    conv.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConversationPress = (conversationId: string) => {
    router.push(`/messages/thread/${conversationId}`);
  };

  const renderConversationItem = (conversation: Conversation) => (
    <SmartButton 
      key={conversation.id} 
      style={styles.conversationItem}
      onPress={() => handleConversationPress(conversation.id)}
      accessibilityLabel={`Conversation avec ${conversation.participantName}`}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {conversation.participantName.charAt(0).toUpperCase()}
          </Text>
        </View>
        {conversation.isOnline && <View style={styles.onlineIndicator} />}
      </View>
      
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.participantName}>{conversation.participantName}</Text>
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
    </SmartButton>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={80} color={Colors.light.muted} />
      <Text style={styles.emptyStateTitle}>Aucune conversation</Text>
      <Text style={styles.emptyStateText}>
        Commencez à discuter avec d'autres cuisiniers en commentant leurs recettes !
      </Text>
      
      <View style={styles.emptyStateCTAs}>
        <SmartButton 
          style={styles.emptyCTAButton}
          onPress={handleNewMessage}
          accessibilityLabel="Créer une nouvelle conversation"
        >
          <Ionicons name="add" size={20} color={Colors.light.background} />
          <Text style={styles.emptyCTAButtonText}>Nouvelle conversation</Text>
        </SmartButton>
        
        <SmartButton 
          style={[styles.emptyCTAButton, styles.secondaryCTAButton]}
          onPress={() => router.push('/community')}
          accessibilityLabel="Découvrir la communauté"
        >
          <Ionicons name="people" size={20} color={Colors.light.primary} />
          <Text style={[styles.emptyCTAButtonText, styles.secondaryCTAButtonText]}>
            Découvrir la communauté
          </Text>
        </SmartButton>
      </View>
    </View>
  );

  const handleNewMessage = () => {
    // For now, navigate to a mock thread
    router.push('/messages/thread/new');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.light.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une conversation..."
            placeholderTextColor={Colors.light.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <SmartButton 
              onPress={() => setSearchQuery('')}
              accessibilityLabel="Effacer la recherche"
            >
              <Ionicons name="close-circle" size={20} color={Colors.light.muted} />
            </SmartButton>
          )}
        </View>
      </View>

      {/* Conversations list */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {isLoading ? (
          <View style={styles.conversationsList}>
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonConversationItem key={index} />
            ))}
          </View>
        ) : filteredConversations.length > 0 ? (
          <View style={styles.conversationsList}>
            {filteredConversations.map(renderConversationItem)}
          </View>
        ) : searchQuery.length > 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={80} color={Colors.light.muted} />
            <Text style={styles.emptyStateTitle}>Aucun résultat</Text>
            <Text style={styles.emptyStateText}>
              Aucune conversation ne correspond à votre recherche "{searchQuery}"
            </Text>
          </View>
        ) : (
          renderEmptyState()
        )}
      </ScrollView>

      {/* New message button */}
      <SmartButton 
        style={styles.newMessageButton} 
        onPress={handleNewMessage}
        accessibilityLabel="Nouvelle conversation"
      >
        <Ionicons name="add" size={24} color={Colors.light.background} />
      </SmartButton>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.light.text,
    marginLeft: Spacing.sm,
    paddingVertical: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  conversationsList: {
    paddingVertical: Spacing.sm,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: Colors.light.background,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.light.success,
    borderWidth: 2,
    borderColor: Colors.light.background,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  participantName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  conversationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageTime: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
  },
  unreadBadge: {
    backgroundColor: Colors.light.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  unreadCount: {
    color: Colors.light.background,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  lastMessage: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    lineHeight: 18,
  },
  unreadMessage: {
    color: Colors.light.text,
    fontWeight: FontWeight.medium,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyStateTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    fontSize: FontSize.md,
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  emptyStateCTAs: {
    width: '100%',
    gap: Spacing.md,
  },
  emptyCTAButton: {
    flexDirection: 'row',
    backgroundColor: Colors.light.primary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.medium,
  },
  secondaryCTAButton: {
    backgroundColor: Colors.light.background,
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  emptyCTAButtonText: {
    color: Colors.light.background,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginLeft: Spacing.sm,
  },
  secondaryCTAButtonText: {
    color: Colors.light.primary,
  },
  newMessageButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.large,
  },
});