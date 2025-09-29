import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { aiApi } from '../../src/services/api';
import { Colors } from '../../src/constants/Colors';
import { AppTexts } from '../../src/constants/Texts';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../src/constants/Layout';
import { SmartButton } from '../../src/components/SmartButton';

interface MealPlan {
  plan_name: string;
  total_days: number;
  daily_target_calories: number;
  days: Array<{
    day_number: number;
    day_name: string;
    meals: {
      petit_dejeuner: { name: string; estimated_calories: number };
      dejeuner: { name: string; estimated_calories: number };
      diner: { name: string; estimated_calories: number };
      collation?: { name: string; estimated_calories: number };
    };
    total_calories: number;
  }>;
}

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [calorieProgress] = useState(68); // Mock data - would come from actual tracking

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const generateMealPlan = async () => {
    try {
      setIsGenerating(true);
      const response = await aiApi.generateMealPlan({
        days: 7,
        daily_calories: user?.daily_calorie_goal || 2000,
        dietary_restrictions: user?.dietary_restrictions || [],
      });
      
      if (response.success) {
        setMealPlan(response.meal_plan);
      } else {
        Alert.alert('Erreur', 'Impossible de générer le plan de repas');
      }
    } catch (error) {
      console.error('Error generating meal plan:', error);
      Alert.alert('Erreur', 'Erreur lors de la génération du plan de repas');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleProfilePress = () => {
    router.push('/profile/settings');
  };

  const handleShoppingListPress = () => {
    router.push('/shopping-list');
  };

  const renderCalorieRing = () => {
    const circumference = 2 * Math.PI * 45;
    const strokeDasharray = `${(calorieProgress / 100) * circumference} ${circumference}`;
    
    return (
      <View style={styles.calorieRing}>
        <Text style={styles.caloriePercentage}>{calorieProgress}%</Text>
        <Text style={styles.calorieLabel}>Cette semaine</Text>
      </View>
    );
  };

  const handleAddMealPress = () => {
    router.push('/meals/add');
  };

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={handleAddMealPress} 
        activeOpacity={0.7}
      >
        <Ionicons name="add-circle" size={24} color={Colors.light.primary} />
        <Text style={styles.actionText}>{AppTexts.dashboard.addMeal}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={handleShoppingListPress} 
        activeOpacity={0.7}
      >
        <Ionicons name="list" size={24} color={Colors.light.primary} />
        <Text style={styles.actionText}>{AppTexts.dashboard.groceryList}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMealPlanCard = () => {
    if (!mealPlan) {
      return (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Plan de repas IA</Text>
            <TouchableOpacity 
              style={styles.generateButton}
              onPress={generateMealPlan}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color={Colors.light.background} />
              ) : (
                <Text style={styles.generateButtonText}>Générer</Text>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.cardDescription}>
            Générez un plan de repas personnalisé avec l'IA
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{mealPlan.plan_name}</Text>
          <TouchableOpacity onPress={generateMealPlan}>
            <Ionicons name="refresh" size={20} color={Colors.light.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.mealPlanSummary}>
          <Text style={styles.mealPlanStats}>
            {mealPlan.total_days} jours • {mealPlan.daily_target_calories} kcal/jour
          </Text>
        </View>
        
        {mealPlan.days.slice(0, 3).map((day) => (
          <View key={day.day_number} style={styles.dayCard}>
            <Text style={styles.dayName}>{day.day_name}</Text>
            <Text style={styles.dayCalories}>{day.total_calories} kcal</Text>
            <Text style={styles.dayMeals}>
              {day.meals.petit_dejeuner.name} • {day.meals.dejeuner.name} • {day.meals.diner.name}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderMockMealCards = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Repas à venir</Text>
      
      <View style={styles.mealCard}>
        <Text style={styles.mealName}>Gratin de Saumon sur son lit de brocolis</Text>
        <Text style={styles.mealCalories}>450 kcal</Text>
        <Text style={styles.mealExpiry}>Expire demain</Text>
      </View>
      
      <View style={styles.mealCard}>
        <Text style={styles.mealName}>Salade de quinoa aux légumes</Text>
        <Text style={styles.mealCalories}>320 kcal</Text>
        <Text style={styles.mealExpiry}>Expire dans 3 jours</Text>
      </View>
    </View>
  );

  const renderUserAvatar = () => {
    const initials = user?.first_name?.charAt(0)?.toUpperCase() || 'U';
    
    return (
      <TouchableOpacity style={styles.avatarButton} onPress={handleProfilePress}>
        {user?.avatar_url ? (
          <View style={styles.avatar}>
            {/* Would show actual image here */}
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header with user greeting and avatar */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Bonjour {user?.first_name || 'Chef'} !
            </Text>
            <Text style={styles.subGreeting}>Prêt à cuisiner aujourd'hui ?</Text>
          </View>
          {renderUserAvatar()}
        </View>

        {/* Calorie progress ring */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{AppTexts.dashboard.caloriesProgress}</Text>
          {renderCalorieRing()}
        </View>

        {/* Quick actions */}
        {renderQuickActions()}

        {/* AI Meal plan */}
        {renderMealPlanCard()}

        {/* Mock meal cards */}
        {renderMockMealCards()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingTop: 0,
  },
  greeting: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  subGreeting: {
    fontSize: FontSize.md,
    color: Colors.light.muted,
    marginTop: 2,
  },
  avatarButton: {
    padding: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.small,
  },
  avatarText: {
    color: Colors.light.background,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  card: {
    backgroundColor: Colors.light.background,
    margin: Spacing.lg,
    marginVertical: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadow.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  cardDescription: {
    fontSize: FontSize.md,
    color: Colors.light.muted,
  },
  calorieRing: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  caloriePercentage: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.light.primary,
  },
  calorieLabel: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginTop: Spacing.xs,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    flex: 1,
    marginHorizontal: Spacing.xs,
    ...Shadow.small,
  },
  actionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  generateButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  generateButtonText: {
    color: Colors.light.background,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  mealPlanSummary: {
    marginBottom: Spacing.md,
  },
  mealPlanStats: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
  },
  dayCard: {
    backgroundColor: Colors.light.card,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  dayName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  dayCalories: {
    fontSize: FontSize.sm,
    color: Colors.light.primary,
    marginTop: 2,
  },
  dayMeals: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginTop: Spacing.xs,
  },
  section: {
    margin: Spacing.lg,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  mealCard: {
    backgroundColor: Colors.light.background,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    ...Shadow.small,
  },
  mealName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
  },
  mealCalories: {
    fontSize: FontSize.sm,
    color: Colors.light.primary,
    marginTop: 2,
  },
  mealExpiry: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginTop: Spacing.xs,
  },
});