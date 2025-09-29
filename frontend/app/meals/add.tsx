import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/constants/Colors';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../src/constants/Layout';

const MEAL_TYPES = [
  { id: 'petit_dejeuner', name: 'Petit déjeuner', icon: 'sunny' },
  { id: 'dejeuner', name: 'Déjeuner', icon: 'restaurant' },
  { id: 'diner', name: 'Dîner', icon: 'moon' },
  { id: 'collation', name: 'Collation', icon: 'nutrition' },
];

export default function AddMealScreen() {
  const { user } = useAuth();
  const [selectedMealType, setSelectedMealType] = useState('dejeuner');
  const [mealName, setMealName] = useState('');
  const [calories, setCalories] = useState('');
  const [notes, setNotes] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddMeal = async () => {
    if (!mealName.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir le nom du repas');
      return;
    }

    try {
      setIsAdding(true);
      
      // TODO: Implement actual meal addition API
      console.log('Adding meal:', {
        type: selectedMealType,
        name: mealName,
        calories: parseInt(calories) || 0,
        notes: notes.trim(),
      });

      Alert.alert(
        'Repas ajouté !',
        `${mealName} a été ajouté à votre journal alimentaire.`,
        [
          { 
            text: 'OK', 
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error adding meal:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter le repas');
    } finally {
      setIsAdding(false);
    }
  };

  const renderMealTypeSelector = () => (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>Type de repas</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mealTypePicker}>
        {MEAL_TYPES.map((mealType) => (
          <TouchableOpacity
            key={mealType.id}
            style={[
              styles.mealTypeOption,
              selectedMealType === mealType.id && styles.selectedMealTypeOption
            ]}
            onPress={() => setSelectedMealType(mealType.id)}
          >
            <Ionicons 
              name={mealType.icon as any} 
              size={24} 
              color={selectedMealType === mealType.id ? Colors.light.background : Colors.light.primary} 
            />
            <Text style={[
              styles.mealTypeText,
              selectedMealType === mealType.id && styles.selectedMealTypeText
            ]}>
              {mealType.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ajouter un repas</Text>
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleAddMeal}
          disabled={isAdding || !mealName.trim()}
        >
          {isAdding ? (
            <ActivityIndicator size="small" color={Colors.light.primary} />
          ) : (
            <Text style={[
              styles.saveButtonText,
              !mealName.trim() && styles.disabledText
            ]}>
              Ajouter
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Meal Type Selector */}
        {renderMealTypeSelector()}

        {/* Meal Name */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Nom du repas</Text>
          <TextInput
            style={styles.formInput}
            placeholder="Ex: Salade de quinoa aux légumes"
            value={mealName}
            onChangeText={setMealName}
            autoFocus
          />
        </View>

        {/* Calories */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Calories (optionnel)</Text>
          <TextInput
            style={styles.formInput}
            placeholder="Ex: 450"
            value={calories}
            onChangeText={setCalories}
            keyboardType="numeric"
          />
          <Text style={styles.formHint}>
            Laissez vide si vous ne connaissez pas les calories exactes
          </Text>
        </View>

        {/* Notes */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Notes (optionnel)</Text>
          <TextInput
            style={[styles.formInput, styles.formTextArea]}
            placeholder="Ajoutez des notes, ingrédients ou commentaires..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Quick Add Suggestions */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Suggestions rapides</Text>
          <View style={styles.suggestions}>
            {[
              'Salade verte',
              'Sandwich jambon-beurre',
              'Pâtes bolognaise',
              'Yaourt aux fruits',
              'Omelette aux champignons',
              'Smoothie banane-fraise'
            ].map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionChip}
                onPress={() => setMealName(suggestion)}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    textAlign: 'center',
  },
  saveButton: {
    padding: Spacing.xs,
  },
  saveButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.primary,
  },
  disabledText: {
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
    padding: Spacing.lg,
  },
  formGroup: {
    marginBottom: Spacing.xl,
  },
  formLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  formInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  },
  formTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  formHint: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginTop: Spacing.xs,
  },
  mealTypePicker: {
    marginTop: Spacing.sm,
  },
  mealTypeOption: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.lg,
    marginRight: Spacing.md,
    backgroundColor: Colors.light.background,
    minWidth: 100,
    ...Shadow.small,
  },
  selectedMealTypeOption: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  mealTypeText: {
    fontSize: FontSize.sm,
    color: Colors.light.primary,
    marginTop: Spacing.xs,
    fontWeight: FontWeight.medium,
  },
  selectedMealTypeText: {
    color: Colors.light.background,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.sm,
  },
  suggestionChip: {
    backgroundColor: Colors.light.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  suggestionText: {
    fontSize: FontSize.sm,
    color: Colors.light.text,
    fontWeight: FontWeight.medium,
  },
});