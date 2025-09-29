import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { aiApi } from '../../src/services/api';
import { Colors } from '../../src/constants/Colors';
import { AppTexts } from '../../src/constants/Texts';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../src/constants/Layout';

interface Recipe {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  author_name: string;
  author_avatar?: string;
  likes_count: number;
  tags: string[];
  prep_time_minutes?: number;
  difficulty: 'facile' | 'moyen' | 'difficile';
}

// Mock data for the community feed
const mockRecipes: Recipe[] = [
  {
    id: '1',
    title: 'Gratin de Saumon sur son lit de brocolis',
    description: 'Un plat équilibré et délicieux parfait pour le dîner',
    author_name: 'Marie C.',
    likes_count: 42,
    tags: ['Poisson', 'Légumes', 'Gratin'],
    prep_time_minutes: 45,
    difficulty: 'moyen',
  },
  {
    id: '2',
    title: 'Pancakes moelleux aux myrtilles',
    description: 'Pour un petit-déjeuner gourmand et énergisant',
    author_name: 'Thomas L.',
    likes_count: 89,
    tags: ['Pancakes', 'Fruits', 'Petit-déjeuner'],
    prep_time_minutes: 25,
    difficulty: 'facile',
  },
  {
    id: '3',
    title: 'Salade de quinoa méditerranéenne',
    description: 'Fraîche, colorée et pleine de saveurs',
    author_name: 'Sophie M.',
    likes_count: 67,
    tags: ['Salade', 'Quinoa', 'Végétarien', 'Méditerranéen'],
    prep_time_minutes: 20,
    difficulty: 'facile',
  },
];

export default function CommunityScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>(mockRecipes);
  const [activeTab, setActiveTab] = useState<'feed' | 'trending' | 'favorites'>('feed');
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const generateAIRecipe = async () => {
    try {
      setIsGeneratingRecipe(true);
      
      const response = await aiApi.generateRecipe({
        cuisine_type: 'française',
        difficulty: 'moyen',
        prep_time: 30,
      });
      
      if (response.success) {
        Alert.alert(
          'Recette générée !',
          `"${response.recipe.title}" a été générée par l'IA. Voulez-vous la voir ?`,
          [
            { text: 'Plus tard', style: 'cancel' },
            { text: 'Voir la recette', onPress: () => console.log('Navigate to recipe') },
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

  const handleLike = (recipeId: string) => {
    setRecipes(prev => 
      prev.map(recipe => 
        recipe.id === recipeId 
          ? { ...recipe, likes_count: recipe.likes_count + 1 }
          : recipe
      )
    );
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'facile': return Colors.light.success;
      case 'moyen': return Colors.light.warning;
      case 'difficile': return Colors.light.error;
      default: return Colors.light.muted;
    }
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {[
        { key: 'feed', label: 'Fil d\'actualité' },
        { key: 'trending', label: 'Tendances' },
        { key: 'favorites', label: 'Favoris' },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.activeTab]}
          onPress={() => setActiveTab(tab.key as any)}
        >
          <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderRecipeCard = (recipe: Recipe) => (
    <TouchableOpacity key={recipe.id} style={styles.recipeCard}>
      {/* Recipe image placeholder */}
      <View style={styles.recipeImagePlaceholder}>
        <Ionicons name="image" size={40} color={Colors.light.muted} />
      </View>
      
      {/* Recipe content */}
      <View style={styles.recipeContent}>
        <View style={styles.recipeHeader}>
          <Text style={styles.recipeTitle}>{recipe.title}</Text>
          <View style={styles.recipeAuthor}>
            <View style={styles.authorAvatar}>
              <Text style={styles.authorInitial}>
                {recipe.author_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.authorName}>{recipe.author_name}</Text>
          </View>
        </View>
        
        {recipe.description && (
          <Text style={styles.recipeDescription} numberOfLines={2}>
            {recipe.description}
          </Text>
        )}
        
        {/* Recipe info */}
        <View style={styles.recipeInfo}>
          <View style={styles.recipeStats}>
            {recipe.prep_time_minutes && (
              <View style={styles.statItem}>
                <Ionicons name="time" size={14} color={Colors.light.muted} />
                <Text style={styles.statText}>{recipe.prep_time_minutes} min</Text>
              </View>
            )}
            <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(recipe.difficulty) + '20' }]}>
              <Text style={[styles.difficultyText, { color: getDifficultyColor(recipe.difficulty) }]}>
                {recipe.difficulty}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Tags */}
        <View style={styles.tags}>
          {recipe.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          {recipe.tags.length > 3 && (
            <Text style={styles.moreTagsText}>+{recipe.tags.length - 3}</Text>
          )}
        </View>
        
        {/* Actions */}
        <View style={styles.recipeActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleLike(recipe.id)}
          >
            <Ionicons name="heart-outline" size={20} color={Colors.light.primary} />
            <Text style={styles.actionText}>{recipe.likes_count}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={20} color={Colors.light.muted} />
            <Text style={styles.actionText}>Commenter</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="bookmark-outline" size={20} color={Colors.light.muted} />
            <Text style={styles.actionText}>Sauvegarder</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderAIPrompt = () => (
    <View style={styles.aiPromptCard}>
      <View style={styles.aiPromptHeader}>
        <Ionicons name="sparkles" size={24} color={Colors.light.primary} />
        <Text style={styles.aiPromptTitle}>Générer une recette IA</Text>
      </View>
      <Text style={styles.aiPromptDescription}>
        Laissez l'intelligence artificielle créer une recette personnalisée pour vous
      </Text>
      <TouchableOpacity 
        style={[styles.aiPromptButton, isGeneratingRecipe && styles.disabledButton]}
        onPress={generateAIRecipe}
        disabled={isGeneratingRecipe}
      >
        {isGeneratingRecipe ? (
          <ActivityIndicator size="small" color={Colors.light.background} />
        ) : (
          <>
            <Ionicons name="add" size={20} color={Colors.light.background} />
            <Text style={styles.aiPromptButtonText}>Générer une recette</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderTabBar()}
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* AI Recipe Generation */}
        {renderAIPrompt()}
        
        {/* Recipe Feed */}
        <View style={styles.feed}>
          {recipes.map(renderRecipeCard)}
        </View>
        
        {/* Load more button */}
        <TouchableOpacity style={styles.loadMoreButton}>
          <Text style={styles.loadMoreText}>Voir plus de recettes</Text>
        </TouchableOpacity>
      </ScrollView>
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