import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  FlatList,
  Animated,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { aiApi, postsApi } from '../../src/services/api';
import { Colors } from '../../src/constants/Colors';
import { AppTexts } from '../../src/constants/Texts';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../src/constants/Layout';
import { Post } from '../../src/types';
import { SmartButton } from '../../src/components/SmartButton';
import { SkeletonCard } from '../../src/components/SkeletonLoader';
import { NotificationBell } from '../../src/components/NotificationBell';

const POSTS_PER_PAGE = 20;

export default function CommunityScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'all' | 'recipe' | 'question'>('all');
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [animatedValue] = useState(new Animated.Value(1));
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Load initial posts
  useEffect(() => {
    loadPosts(true);
  }, [activeTab]);

  const loadPosts = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
      }

      const currentPage = reset ? 1 : page;
      const postType = activeTab === 'all' ? undefined : activeTab;
      
      console.log(`🔄 Loading posts: page=${currentPage}, type=${postType}`);
      
      const response = await postsApi.getPosts(currentPage, POSTS_PER_PAGE, postType);
      
      if (reset) {
        setPosts(response.posts || []);
      } else {
        setPosts(prev => [...prev, ...(response.posts || [])]);
      }
      
      setHasMore(response.has_next || false);
      setPage(currentPage + 1);
      
      console.log(`✅ Loaded ${response.posts?.length || 0} posts`);
      
    } catch (error) {
      console.error('❌ Error loading posts:', error);
      Alert.alert('Erreur', 'Impossible de charger les posts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPosts(true);
  }, [activeTab]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      setLoadingMore(true);
      loadPosts(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      setShowSearchResults(true);
      
      const response = await postsApi.searchPosts(query.trim(), {
        type: activeTab === 'all' ? undefined : activeTab
      });
      
      if (response.success) {
        setSearchResults(response.posts);
      }
    } catch (error) {
      console.error('Error searching posts:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };
  const handleCreatePost = (type: 'recipe' | 'question') => {
    router.push({
      pathname: '/community/composer',
      params: { type }
    });
  };

  const handlePostPress = (post: Post) => {
    router.push({
      pathname: '/post/[id]',
      params: { id: post.id }
    });
  };

  const generateAIRecipe = async () => {
    try {
      setIsGeneratingRecipe(true);
      
      // Animate the button
      Animated.sequence([
        Animated.timing(animatedValue, { duration: 150, toValue: 0.95, useNativeDriver: true }),
        Animated.timing(animatedValue, { duration: 150, toValue: 1, useNativeDriver: true }),
      ]).start();
      
      const response = await aiApi.generateRecipe({
        cuisine_type: 'française',
        difficulty: 'moyen',
        prep_time: 30,
      });
      
      if (response.success && response.recipe) {
        // Create a post from the generated recipe
        const postData = {
          type: 'recipe' as const,
          title: response.recipe.title,
          body: `${response.recipe.description || ''}

**Ingrédients:**
${response.recipe.ingredients.map((ing: any) => 
  `• ${ing.quantity || ''} ${ing.unit || ''} ${ing.name}`.trim()
).join('\n')}

**Instructions:**
${response.recipe.steps.map((step: any, index: number) => 
  `${index + 1}. ${step.instruction}`
).join('\n\n')}

${response.recipe.tips ? `\n**Conseils:** ${response.recipe.tips}` : ''}`,
          tags: response.recipe.tags || [],
          is_public: true
        };
        
        const newPost = await postsApi.createPost(postData);
        
        // Optimistic update - add to top of feed
        setPosts(prev => [newPost, ...prev]);
        
        Alert.alert(
          'Recette générée ! 🎉',
          `\"${response.recipe.title}\" a été créée et ajoutée au fil d'actualité.`,
          [
            { text: 'Voir la recette', onPress: () => handlePostPress(newPost) },
            { text: 'Continuer', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert('Erreur', 'Impossible de générer une recette');
      }
    } catch (error) {
      console.error('Error generating recipe:', error);
      Alert.alert('Erreur', 'Erreur lors de la génération de la recette');
    } finally {
      setIsGeneratingRecipe(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'facile': return Colors.light.success;
      case 'moyen': return Colors.light.warning;
      case 'difficile': return Colors.light.error;
      default: return Colors.light.muted;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffMs = now.getTime() - postDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "À l\\\'instant";
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return postDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {[
        { key: 'all', label: 'Tout' },
        { key: 'recipe', label: 'Recettes' },
        { key: 'question', label: 'Questions' },
      ].map((tab) => (
        <SmartButton
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.activeTab]}
          onPress={() => setActiveTab(tab.key as any)}
          accessibilityLabel={`Filtrer par ${tab.label}`}
        >
          <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
            {tab.label}
          </Text>
        </SmartButton>
      ))}
    </View>
  );

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[...Array(3)].map((_, index) => (
        <View key={index} style={styles.skeletonCard}>
          <View style={styles.skeletonHeader}>
            <View style={styles.skeletonAvatar} />
            <View style={styles.skeletonAuthor}>
              <View style={styles.skeletonAuthorName} />
              <View style={styles.skeletonAuthorTime} />
            </View>
          </View>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonDescription} />
          <View style={styles.skeletonTags}>
            <View style={styles.skeletonTag} />
            <View style={styles.skeletonTag} />
          </View>
        </View>
      ))}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="restaurant-outline" size={80} color={Colors.light.muted} />
      <Text style={styles.emptyStateTitle}>
        {activeTab === 'recipe' 
          ? 'Aucune recette pour le moment'
          : activeTab === 'question'
          ? 'Aucune question pour le moment'
          : 'Aucun post pour le moment'
        }
      </Text>
      <Text style={styles.emptyStateText}>
        {activeTab === 'recipe'
          ? 'Soyez le premier à partager une délicieuse recette !'
          : activeTab === 'question'
          ? 'Posez la première question culinaire !'
          : 'Commencez la conversation en créant le premier post !'
        }
      </Text>
      
      <View style={styles.emptyStateCTAs}>
        <SmartButton 
          style={styles.emptyCTAButton}
          onPress={() => handleCreatePost('recipe')}
          accessibilityLabel="Créer une nouvelle recette"
        >
          <Ionicons name="add" size={20} color={Colors.light.background} />
          <Text style={styles.emptyCTAButtonText}>Créer une recette</Text>
        </SmartButton>
        
        <SmartButton 
          style={[styles.emptyCTAButton, styles.secondaryCTAButton]}
          onPress={() => handleCreatePost('question')}
          accessibilityLabel="Poser une nouvelle question"
        >
          <Ionicons name="help-circle" size={20} color={Colors.light.primary} />
          <Text style={[styles.emptyCTAButtonText, styles.secondaryCTAButtonText]}>
            Poser une question
          </Text>
        </SmartButton>
      </View>
    </View>
  );

  const renderPost = ({ item: post }: { item: Post }) => (
    <SmartButton 
      style={styles.postCard} 
      onPress={() => handlePostPress(post)}
      accessibilityLabel={`Voir le post: ${post.title}`}
    >
      {/* Post Header */}
      <View style={styles.postHeader}>
        <View style={styles.authorInfo}>
          <View style={styles.authorAvatar}>
            <Text style={styles.authorInitial}>
              {post.author_name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View>
            <Text style={styles.authorName}>{post.author_name || 'Utilisateur'}</Text>
            <Text style={styles.postTime}>{formatTimeAgo(post.created_at)}</Text>
          </View>
        </View>
        <View style={styles.postTypeIndicator}>
          <Ionicons
            name={post.type === 'recipe' ? 'restaurant' : 'help-circle'}
            size={16}
            color={Colors.light.primary}
          />
        </View>
      </View>

      {/* Post Content */}
      <Text style={styles.postTitle}>{post.title}</Text>
      <Text style={styles.postDescription} numberOfLines={3}>
        {post.body}
      </Text>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <View style={styles.postTags}>
          {post.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.postTag}>
              <Text style={styles.postTagText}>{tag}</Text>
            </View>
          ))}
          {post.tags.length > 3 && (
            <Text style={styles.moreTagsText}>+{post.tags.length - 3}</Text>
          )}
        </View>
      )}

      {/* Post Engagement */}
      <View style={styles.postEngagement}>
        <View style={styles.engagementItem}>
          <Ionicons name="heart-outline" size={16} color={Colors.light.muted} />
          <Text style={styles.engagementText}>{post.likes_count}</Text>
        </View>
        <View style={styles.engagementItem}>
          <Ionicons name="chatbubble-outline" size={16} color={Colors.light.muted} />
          <Text style={styles.engagementText}>{post.comments_count}</Text>
        </View>
        <View style={styles.engagementItem}>
          <Ionicons name="eye-outline" size={16} color={Colors.light.muted} />
          <Text style={styles.engagementText}>{post.views_count}</Text>
        </View>
      </View>
    </SmartButton>
  );

  const renderAIPrompt = () => (
    <Animated.View style={[styles.aiPromptCard, { transform: [{ scale: animatedValue }] }]}>
      <View style={styles.aiPromptHeader}>
        <Ionicons name="sparkles" size={24} color={Colors.light.primary} />
        <Text style={styles.aiPromptTitle}>Générateur de recette IA</Text>
      </View>
      <Text style={styles.aiPromptDescription}>
        Laissez l'intelligence artificielle créer une recette personnalisée
      </Text>
      <SmartButton 
        style={styles.aiPromptButton}
        onPress={generateAIRecipe}
        disabled={isGeneratingRecipe}
        loading={isGeneratingRecipe}
        textStyle={styles.aiPromptButtonText}
        accessibilityLabel="Générer une recette avec l'IA"
      >
        Générer une recette
      </SmartButton>
    </Animated.View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.light.primary} />
        <Text style={styles.footerLoaderText}>Chargement...</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with title and notification bell */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Communauté</Text>
        <NotificationBell size={24} color={Colors.light.text} />
      </View>
      
      {renderTabBar()}
      
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={Colors.light.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Rechercher ${activeTab === 'recipe' ? 'des recettes' : activeTab === 'question' ? 'des questions' : 'dans la communauté'}...`}
            placeholderTextColor={Colors.light.muted}
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
            onSubmitEditing={() => handleSearch(searchQuery)}
          />
          {searchQuery.length > 0 && (
            <SmartButton
              style={styles.clearSearchButton}
              onPress={clearSearch}
              accessibilityLabel="Effacer la recherche"
            >
              <Ionicons name="close-circle" size={20} color={Colors.light.muted} />
            </SmartButton>
          )}
        </View>
        
        {isSearching && (
          <View style={styles.searchLoader}>
            <ActivityIndicator size="small" color={Colors.light.primary} />
          </View>
        )}
      </View>
      
      {loading ? (
        renderSkeleton()
      ) : showSearchResults ? (
        /* Search Results */
        <FlatList
          data={searchResults}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={80} color={Colors.light.muted} />
              <Text style={styles.emptyStateTitle}>Aucun résultat</Text>
              <Text style={styles.emptyStateText}>
                Aucun résultat trouvé pour "{searchQuery}"
              </Text>
            </View>
          )}
        />
      ) : posts.length === 0 ? (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {renderEmptyState()}
        </ScrollView>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.feedContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={renderAIPrompt}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        <SmartButton 
          style={[styles.fab, styles.secondaryFab]}
          onPress={() => handleCreatePost('question')}
          accessibilityLabel="Poser une question"
        >
          <Ionicons name="help-circle" size={24} color={Colors.light.primary} />
        </SmartButton>
        
        <SmartButton 
          style={styles.fab}
          onPress={() => handleCreatePost('recipe')}
          accessibilityLabel="Créer une recette"
        >
          <Ionicons name="add" size={28} color={Colors.light.background} />
        </SmartButton>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    paddingHorizontal: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.light.primary,
  },
  tabText: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    fontWeight: FontWeight.medium,
  },
  activeTabText: {
    color: Colors.light.primary,
    fontWeight: FontWeight.semibold,
  },
  scrollContent: {
    flexGrow: 1,
  },
  feedContent: {
    paddingBottom: 100,
  },
  // Skeleton styles
  skeletonContainer: {
    padding: Spacing.lg,
  },
  skeletonCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadow.small,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.border,
    marginRight: Spacing.md,
  },
  skeletonAuthor: {
    flex: 1,
  },
  skeletonAuthorName: {
    height: 16,
    backgroundColor: Colors.light.border,
    borderRadius: 4,
    width: '40%',
    marginBottom: 4,
  },
  skeletonAuthorTime: {
    height: 12,
    backgroundColor: Colors.light.border,
    borderRadius: 4,
    width: '25%',
  },
  skeletonTitle: {
    height: 20,
    backgroundColor: Colors.light.border,
    borderRadius: 4,
    width: '80%',
    marginBottom: Spacing.sm,
  },
  skeletonDescription: {
    height: 14,
    backgroundColor: Colors.light.border,
    borderRadius: 4,
    width: '100%',
    marginBottom: Spacing.md,
  },
  skeletonTags: {
    flexDirection: 'row',
  },
  skeletonTag: {
    height: 24,
    width: 60,
    backgroundColor: Colors.light.border,
    borderRadius: 12,
    marginRight: Spacing.xs,
  },
  // Empty state styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  emptyStateTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    textAlign: 'center',
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
  // AI Prompt styles
  aiPromptCard: {
    backgroundColor: Colors.light.background,
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadow.medium,
  },
  aiPromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  aiPromptTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginLeft: Spacing.sm,
  },
  aiPromptDescription: {
    fontSize: FontSize.md,
    color: Colors.light.muted,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  aiPromptButton: {
    flexDirection: 'row',
    backgroundColor: Colors.light.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiPromptButtonText: {
    color: Colors.light.background,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginLeft: Spacing.xs,
  },
  disabledButton: {
    opacity: 0.7,
  },
  // Post styles
  postCard: {
    backgroundColor: Colors.light.background,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadow.medium,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  authorInitial: {
    color: Colors.light.background,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  authorName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
  },
  postTime: {
    fontSize: FontSize.xs,
    color: Colors.light.muted,
    marginTop: 2,
  },
  postTypeIndicator: {
    padding: Spacing.xs,
  },
  postTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginBottom: Spacing.sm,
    lineHeight: 24,
  },
  postDescription: {
    fontSize: FontSize.md,
    color: Colors.light.muted,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  postTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
  },
  postTag: {
    backgroundColor: Colors.light.card,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  postTagText: {
    fontSize: FontSize.xs,
    color: Colors.light.text,
    fontWeight: FontWeight.medium,
  },
  moreTagsText: {
    fontSize: FontSize.xs,
    color: Colors.light.muted,
    alignSelf: 'center',
  },
  postEngagement: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  engagementText: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginLeft: 4,
    fontWeight: FontWeight.medium,
  },
  // Footer loader
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  footerLoaderText: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginLeft: Spacing.sm,
  },
  // Floating Action Buttons
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: Spacing.md,
  },
  searchContainer: {
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.light.text,
    marginLeft: Spacing.sm,
    minHeight: 20,
  },
  clearSearchButton: {
    padding: Spacing.xs,
  },
  searchLoader: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.large,
  },
  secondaryFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.background,
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
});