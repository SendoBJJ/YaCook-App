import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Dimensions,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { postsApi, commentsApi } from '../../src/services/api';
import { Colors } from '../../src/constants/Colors';
import { Spacing, BorderRadius, FontSize, FontWeight } from '../../src/constants/Layout';
import { SmartButton } from '../../src/components/SmartButton';
import { SkeletonText, SkeletonCard } from '../../src/components/SkeletonLoader';

const { width: screenWidth } = Dimensions.get('window');

interface Post {
  id: string;
  type: 'recipe' | 'question';
  title: string;
  content: string;
  image_url?: string;
  tags: string[];
  author: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  recipe_data?: {
    servings: number;
    prep_time_minutes?: number;
    cook_time_minutes?: number;
    ingredients: Array<{
      name: string;
      quantity: string;
      unit: string;
    }>;
    instructions: Array<{
      order: number;
      instruction: string;
    }>;
  };
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  is_saved: boolean;
  created_at: string;
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadPost();
    }
  }, [id]);

  const loadPost = async () => {
    try {
      setIsLoading(true);
      const response = await postsApi.getPost(id!);
      if (response.success) {
        setPost(response.post);
      }
    } catch (error) {
      console.error('Error loading post:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async () => {
    if (!post || isLikeLoading) return;
    
    try {
      setIsLikeLoading(true);
      const response = await postsApi.toggleLike(post.id);
      if (response.success) {
        setPost({
          ...post,
          is_liked: !post.is_liked,
          likes_count: post.is_liked ? post.likes_count - 1 : post.likes_count + 1
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLikeLoading(false);
    }
  };

  const handleSave = async () => {
    if (!post || isSaveLoading) return;
    
    try {
      setIsSaveLoading(true);
      const response = await postsApi.toggleSave(post.id);
      if (response.success) {
        setPost({
          ...post,
          is_saved: !post.is_saved
        });
      }
    } catch (error) {
      console.error('Error toggling save:', error);
    } finally {
      setIsSaveLoading(false);
    }
  };

  const handleShare = async () => {
    if (!post) return;
    
    try {
      await Share.share({
        message: `Découvrez cette ${post.type === 'recipe' ? 'recette' : 'question'} sur YaCook: ${post.title}`,
        title: post.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const formatTime = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Maintenant";
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <SmartButton 
            style={styles.headerButton}
            onPress={() => router.back()}
            accessibilityLabel="Retour"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </SmartButton>
        </View>
        <ScrollView style={styles.content}>
          <SkeletonCard />
          <View style={{ height: 20 }} />
          <SkeletonText lines={3} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <SmartButton 
            style={styles.headerButton}
            onPress={() => router.back()}
            accessibilityLabel="Retour"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </SmartButton>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={Colors.light.muted} />
          <Text style={styles.errorTitle}>Post non trouvé</Text>
          <Text style={styles.errorText}>Ce post n'existe plus ou a été supprimé.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <SmartButton
        style={styles.headerButton}
        onPress={() => router.back()}
        accessibilityLabel="Retour"
      >
        <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
      </SmartButton>
      
      <View style={styles.headerActions}>
        <SmartButton
          style={styles.headerButton}
          onPress={handleShare}
          accessibilityLabel="Partager"
        >
          <Ionicons name="share-outline" size={24} color={Colors.light.text} />
        </SmartButton>
      </View>
    </View>
  );

  const renderHeroSection = () => (
    <View style={styles.heroSection}>
      {post.image_url && (
        <Image
          source={{ uri: post.image_url }}
          style={styles.heroImage}
          resizeMode="cover"
        />
      )}
      
      <View style={[styles.heroContent, !post.image_url && styles.heroContentNoImage]}>
        <View style={styles.typeIndicator}>
          <Ionicons 
            name={post.type === 'recipe' ? 'restaurant' : 'help-circle'} 
            size={16} 
            color={post.image_url ? Colors.light.background : Colors.light.primary} 
          />
          <Text style={[styles.typeText, !post.image_url && styles.typeTextNoImage]}>
            {post.type === 'recipe' ? 'Recette' : 'Question'}
          </Text>
        </View>
        
        <Text style={[styles.postTitle, !post.image_url && styles.postTitleNoImage]}>
          {post.title}
        </Text>
        
        <View style={styles.authorSection}>
          <View style={styles.authorAvatar}>
            <Text style={styles.authorAvatarText}>
              {post.author.first_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.authorInfo}>
            <Text style={[styles.authorName, !post.image_url && styles.authorNameNoImage]}>
              {post.author.first_name} {post.author.last_name}
            </Text>
            <Text style={[styles.postDate, !post.image_url && styles.postDateNoImage]}>
              {formatDate(post.created_at)}
            </Text>
          </View>
        </View>

        {post.tags.length > 0 && (
          <View style={styles.tagsSection}>
            {post.tags.map((tag) => (
              <View key={tag} style={[styles.tag, !post.image_url && styles.tagNoImage]}>
                <Text style={[styles.tagText, !post.image_url && styles.tagTextNoImage]}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  const renderRecipeInfo = () => {
    if (post.type !== 'recipe' || !post.recipe_data) return null;

    return (
      <View style={styles.recipeInfoSection}>
        <View style={styles.recipeStats}>
          <View style={styles.recipeStat}>
            <Ionicons name="people" size={20} color={Colors.light.primary} />
            <Text style={styles.recipeStatText}>{post.recipe_data.servings} portions</Text>
          </View>
          
          {post.recipe_data.prep_time_minutes && (
            <View style={styles.recipeStat}>
              <Ionicons name="time" size={20} color={Colors.light.primary} />
              <Text style={styles.recipeStatText}>
                Préparation: {formatTime(post.recipe_data.prep_time_minutes)}
              </Text>
            </View>
          )}
          
          {post.recipe_data.cook_time_minutes && (
            <View style={styles.recipeStat}>
              <Ionicons name="flame" size={20} color={Colors.light.primary} />
              <Text style={styles.recipeStatText}>
                Cuisson: {formatTime(post.recipe_data.cook_time_minutes)}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderIngredients = () => {
    if (post.type !== 'recipe' || !post.recipe_data?.ingredients.length) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ingrédients</Text>
        {post.recipe_data.ingredients.map((ingredient, index) => (
          <View key={index} style={styles.ingredient}>
            <View style={styles.ingredientBullet} />
            <Text style={styles.ingredientText}>
              <Text style={styles.ingredientQuantity}>
                {ingredient.quantity} {ingredient.unit}
              </Text>
              {' '}
              <Text style={styles.ingredientName}>
                {ingredient.name}
              </Text>
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderInstructions = () => {
    if (post.type !== 'recipe' || !post.recipe_data?.instructions.length) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        {post.recipe_data.instructions
          .sort((a, b) => a.order - b.order)
          .map((instruction) => (
            <View key={instruction.order} style={styles.instruction}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{instruction.order}</Text>
              </View>
              <Text style={styles.instructionText}>{instruction.instruction}</Text>
            </View>
          ))}
      </View>
    );
  };

  const renderContent = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {post.type === 'recipe' ? 'Description' : 'Question'}
      </Text>
      <Text style={styles.contentText}>{post.content}</Text>
    </View>
  );

  const renderActions = () => (
    <View style={styles.actionsSection}>
      <SmartButton
        style={[styles.actionButton, post.is_liked && styles.actionButtonActive]}
        onPress={handleLike}
        loading={isLikeLoading}
        disabled={isLikeLoading}
        accessibilityLabel="J'aime"
      >
        <Ionicons 
          name={post.is_liked ? "heart" : "heart-outline"} 
          size={24} 
          color={post.is_liked ? Colors.light.error : Colors.light.muted} 
        />
        <Text style={[styles.actionText, post.is_liked && styles.actionTextActive]}>
          {post.likes_count}
        </Text>
      </SmartButton>

      <SmartButton
        style={styles.actionButton}
        onPress={() => router.push(`/comments/${post.id}?postTitle=${encodeURIComponent(post.title)}`)}
        accessibilityLabel="Voir les commentaires"
      >
        <Ionicons name="chatbubble-outline" size={24} color={Colors.light.muted} />
        <Text style={styles.actionText}>{post.comments_count}</Text>
      </SmartButton>

      <SmartButton
        style={[styles.actionButton, post.is_saved && styles.actionButtonActive]}
        onPress={handleSave}
        loading={isSaveLoading}
        disabled={isSaveLoading}
        accessibilityLabel="Sauvegarder"
      >
        <Ionicons 
          name={post.is_saved ? "bookmark" : "bookmark-outline"} 
          size={24} 
          color={post.is_saved ? Colors.light.primary : Colors.light.muted} 
        />
      </SmartButton>

      <SmartButton
        style={styles.actionButton}
        onPress={handleShare}
        accessibilityLabel="Partager"
      >
        <Ionicons name="share-outline" size={24} color={Colors.light.muted} />
      </SmartButton>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderHeroSection()}
        {renderRecipeInfo()}
        {renderContent()}
        {renderIngredients()}
        {renderInstructions()}
        {renderActions()}
        
        {/* Bottom padding */}
        <View style={{ height: 100 }} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerButton: {
    padding: Spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
  },
  content: {
    flex: 1,
  },
  heroSection: {
    position: 'relative',
  },
  heroImage: {
    width: screenWidth,
    height: screenWidth * 0.6,
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: Spacing.lg,
  },
  heroContentNoImage: {
    position: 'relative',
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  typeText: {
    fontSize: FontSize.sm,
    color: Colors.light.background,
    fontWeight: FontWeight.medium,
    marginLeft: Spacing.xs,
    textTransform: 'uppercase',
  },
  typeTextNoImage: {
    color: Colors.light.primary,
  },
  postTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.background,
    marginBottom: Spacing.md,
  },
  postTitleNoImage: {
    color: Colors.light.text,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  authorAvatarText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.light.background,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.background,
  },
  authorNameNoImage: {
    color: Colors.light.text,
  },
  postDate: {
    fontSize: FontSize.sm,
    color: Colors.light.background + 'CC',
    marginTop: 2,
  },
  postDateNoImage: {
    color: Colors.light.muted,
  },
  tagsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: Colors.light.primary + '30',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  tagNoImage: {
    backgroundColor: Colors.light.primary + '15',
  },
  tagText: {
    fontSize: FontSize.sm,
    color: Colors.light.background,
    fontWeight: FontWeight.medium,
  },
  tagTextNoImage: {
    color: Colors.light.primary,
  },
  recipeInfoSection: {
    padding: Spacing.lg,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  recipeStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  recipeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    minWidth: '45%',
  },
  recipeStatText: {
    fontSize: FontSize.sm,
    color: Colors.light.text,
    marginLeft: Spacing.xs,
  },
  section: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semiBold,
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  contentText: {
    fontSize: FontSize.md,
    color: Colors.light.text,
    lineHeight: FontSize.md * 1.5,
  },
  ingredient: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  ingredientBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.primary,
    marginTop: 8,
    marginRight: Spacing.sm,
  },
  ingredientText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.light.text,
    lineHeight: FontSize.md * 1.4,
  },
  ingredientQuantity: {
    fontWeight: FontWeight.semiBold,
    color: Colors.light.primary,
  },
  ingredientName: {
    fontWeight: FontWeight.normal,
  },
  instruction: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.light.background,
  },
  instructionText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.light.text,
    lineHeight: FontSize.md * 1.5,
  },
  actionsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  actionButtonActive: {
    backgroundColor: Colors.light.primary + '15',
  },
  actionText: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginLeft: Spacing.xs,
  },
  actionTextActive: {
    color: Colors.light.primary,
    fontWeight: FontWeight.medium,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  errorTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semiBold,
    color: Colors.light.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontSize: FontSize.md,
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: FontSize.md * 1.4,
  },
});