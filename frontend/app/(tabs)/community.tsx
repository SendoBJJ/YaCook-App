import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/Colors';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../src/constants/Layout';
import { AppTexts } from '../../src/constants/Texts';
import { SmartButton } from '../../src/components/SmartButton';
import { SkeletonCard } from '../../src/components/SkeletonLoader';
import { NotificationBell } from '../../src/components/NotificationBell';
import { postsApi } from '../../src/services/api';

interface Post {
  id: string;
  title: string;
  content: string;
  type: 'recipe' | 'question';
  author_name: string;
  author_avatar?: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  image?: string;
}

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState<'all' | 'recipes' | 'questions'>('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const router = useRouter();

  // Load posts with pagination
  const loadPosts = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
      }

      const currentPage = reset ? 1 : page;
      const response = await postsApi.getPosts(currentPage, 10, activeTab === 'all' ? undefined : activeTab);
      
      if (reset) {
        setPosts(response.posts);
      } else {
        setPosts(prev => [...prev, ...response.posts]);
      }
      
      setHasMore(response.has_next);
      setPage(currentPage + 1);
    } catch (error) {
      console.error('Error loading posts:', error);
      Alert.alert('Erreur', 'Impossible de charger les publications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadPosts(true);
  }, [activeTab]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadPosts(false);
    }
  };

  const handleTabPress = (tab: 'all' | 'recipes' | 'questions') => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      setPage(1);
      setPosts([]);
      setLoading(true);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setIsSearching(true);
      const response = await postsApi.searchPosts(searchQuery, 1, 20);
      setPosts(response.posts);
      setHasMore(response.has_next);
    } catch (error) {
      console.error('Error searching posts:', error);
      Alert.alert('Erreur', 'Erreur lors de la recherche');
    } finally {
      setIsSearching(false);
    }
  };

  const handlePostPress = (post: Post) => {
    router.push(`/post/${post.id}`);
  };

  const handleCreatePost = () => {
    router.push('/community/composer');
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffMs = now.getTime() - postDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Maintenant";
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    return postDate.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case 'recipe': return Colors.light.success;
      case 'question': return Colors.light.primary;
      default: return Colors.light.muted;
    }
  };

  useEffect(() => {
    loadPosts(true);
  }, [activeTab]);

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {[
        { key: 'all', label: 'Tous' },
        { key: 'recipes', label: 'Recettes' },
        { key: 'questions', label: 'Questions' },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.activeTab]}
          onPress={() => handleTabPress(tab.key as any)}
        >
          <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={Colors.light.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher des recettes ou questions..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={Colors.light.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderPostCard = ({ item }: { item: Post }) => (
    <TouchableOpacity style={styles.postCard} onPress={() => handlePostPress(item)}>
      {item.image && (
        <Image source={{ uri: item.image }} style={styles.postImage} />
      )}
      
      <View style={styles.postContent}>
        <View style={styles.postHeader}>
          <View style={styles.authorInfo}>
            {item.author_avatar ? (
              <Image source={{ uri: item.author_avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={16} color={Colors.light.textSecondary} />
              </View>
            )}
            <View>
              <Text style={styles.authorName}>{item.author_name || 'Utilisateur'}</Text>
              <Text style={styles.postTime}>{formatTimeAgo(item.created_at)}</Text>
            </View>
          </View>
          <View style={styles.postTypeIndicator}>
            <View style={[styles.typeTag, { backgroundColor: getPostTypeColor(item.type) }]}>
              <Text style={styles.typeText}>
                {item.type === 'recipe' ? '🍳' : '❓'}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.postTitle}>{item.title}</Text>
        <Text style={styles.postExcerpt} numberOfLines={3}>
          {item.content}
        </Text>

        <View style={styles.postFooter}>
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Ionicons name="heart-outline" size={16} color={Colors.light.textSecondary} />
              <Text style={styles.statText}>{item.likes_count}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="chatbubble-outline" size={16} color={Colors.light.textSecondary} />
              <Text style={styles.statText}>{item.comments_count}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name={activeTab === 'recipes' ? 'restaurant-outline' : activeTab === 'questions' ? 'help-circle-outline' : 'newspaper-outline'} 
        size={64} 
        color={Colors.light.textSecondary} 
      />
      <Text style={styles.emptyStateTitle}>
        {activeTab === 'recipes' && 'Aucune recette'}
        {activeTab === 'questions' && 'Aucune question'}
        {activeTab === 'all' && 'Aucune publication'}
      </Text>
      <Text style={styles.emptyStateText}>
        Soyez le premier à partager quelque chose !
      </Text>
      <SmartButton
        onPress={handleCreatePost}
        style={styles.emptyStateButton}
      >
        <Text style={styles.emptyStateButtonText}>Créer une publication</Text>
      </SmartButton>
    </View>
  );

  if (loading && posts.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Communauté</Text>
          <NotificationBell size={24} color={Colors.light.text} />
        </View>
        {renderTabBar()}
        {renderSearchBar()}
        <View style={styles.loadingContainer}>
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with title and notification bell */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Communauté</Text>
        <NotificationBell size={24} color={Colors.light.text} />
      </View>
      
      {renderTabBar()}
      {renderSearchBar()}

      {isSearching && (
        <View style={styles.searchLoader}>
          <SkeletonCard />
        </View>
      )}

      <FlatList
        data={posts}
        renderItem={renderPostCard}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.light.primary]}
            tintColor={Colors.light.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button */}
      <SmartButton
        onPress={handleCreatePost}
        style={styles.fab}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.light.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.primary,
  },
  tabText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.textSecondary,
  },
  activeTabText: {
    color: Colors.light.primary,
    fontWeight: FontWeight.semibold,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.light.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.light.text,
    paddingVertical: 0,
  },
  searchLoader: {
    paddingHorizontal: Spacing.lg,
  },
  loadingContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  feedContent: {
    paddingBottom: 100, // Space for FAB
  },
  postCard: {
    backgroundColor: Colors.light.background,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Shadow.sm,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.light.border,
  },
  postImage: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  postContent: {
    padding: Spacing.lg,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: Spacing.sm,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
  },
  postTime: {
    fontSize: FontSize.xs,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  postTypeIndicator: {
    marginLeft: Spacing.sm,
  },
  typeTag: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    minWidth: 24,
    alignItems: 'center',
  },
  typeText: {
    fontSize: 12,
  },
  postTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginBottom: Spacing.sm,
    lineHeight: 24,
  },
  postExcerpt: {
    fontSize: FontSize.md,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statText: {
    fontSize: FontSize.sm,
    color: Colors.light.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 80,
  },
  emptyStateTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: FontSize.md,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  emptyStateButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.md,
  },
  emptyStateButtonText: {
    color: Colors.light.background,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.lg,
    ...Platform.select({
      web: {
        position: 'fixed' as any,
      },
    }),
  },
});