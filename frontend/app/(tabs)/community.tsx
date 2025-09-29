import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  FlatList,
  Animated,
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

    if (diffHours < 1) return 'À l'instant';
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
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.activeTab]}
          onPress={() => setActiveTab(tab.key as any)}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
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
        <TouchableOpacity 
          style={styles.emptyCTAButton}
          onPress={() => handleCreatePost('recipe')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color={Colors.light.background} />
          <Text style={styles.emptyCTAButtonText}>Créer une recette</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.emptyCTAButton, styles.secondaryCTAButton]}
          onPress={() => handleCreatePost('question')}
          activeOpacity={0.8}
        >
          <Ionicons name="help-circle" size={20} color={Colors.light.primary} />
          <Text style={[styles.emptyCTAButtonText, styles.secondaryCTAButtonText]}>
            Poser une question
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPost = ({ item: post }: { item: Post }) => (
    <TouchableOpacity 
      style={styles.postCard} 
      onPress={() => handlePostPress(post)}
      activeOpacity={0.95}
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
    </TouchableOpacity>
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
      <TouchableOpacity 
        style={[styles.aiPromptButton, isGeneratingRecipe && styles.disabledButton]}
        onPress={generateAIRecipe}
        disabled={isGeneratingRecipe}
        activeOpacity={0.8}
      >
        {isGeneratingRecipe ? (
          <>
            <ActivityIndicator size="small" color={Colors.light.background} />
            <Text style={styles.aiPromptButtonText}>Génération en cours...</Text>
          </>
        ) : (
          <>
            <Ionicons name="add" size={20} color={Colors.light.background} />
            <Text style={styles.aiPromptButtonText}>Générer une recette</Text>
          </>
        )}
      </TouchableOpacity>
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
      {renderTabBar()}
      
      {loading ? (
        renderSkeleton()
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
        <TouchableOpacity 
          style={[styles.fab, styles.secondaryFab]}
          onPress={() => handleCreatePost('question')}
          activeOpacity={0.8}
        >
          <Ionicons name="help-circle" size={24} color={Colors.light.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => handleCreatePost('recipe')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color={Colors.light.background} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
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
  feed: {
    paddingHorizontal: Spacing.lg,
  },
  recipeCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    ...Shadow.medium,
  },
  recipeImagePlaceholder: {
    height: 200,
    backgroundColor: Colors.light.card,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeContent: {
    padding: Spacing.lg,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  recipeTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    flex: 1,
    marginRight: Spacing.md,
  },
  recipeAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.xs,
  },
  authorInitial: {
    color: Colors.light.background,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  authorName: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    fontWeight: FontWeight.medium,
  },
  recipeDescription: {
    fontSize: FontSize.md,
    color: Colors.light.muted,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  recipeInfo: {
    marginBottom: Spacing.md,
  },
  recipeStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  statText: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginLeft: 4,
  },
  difficultyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginLeft: 'auto',
  },
  difficultyText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'capitalize',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
  },
  tag: {
    backgroundColor: Colors.light.card,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  tagText: {
    fontSize: FontSize.xs,
    color: Colors.light.text,
    fontWeight: FontWeight.medium,
  },
  moreTagsText: {
    fontSize: FontSize.xs,
    color: Colors.light.muted,
    alignSelf: 'center',
  },
  recipeActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginLeft: 4,
    fontWeight: FontWeight.medium,
  },
  loadMoreButton: {
    backgroundColor: Colors.light.background,
    margin: Spacing.lg,
    marginTop: 0,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadow.small,
  },
  loadMoreText: {
    fontSize: FontSize.md,
    color: Colors.light.primary,
    fontWeight: FontWeight.semibold,
  },
});