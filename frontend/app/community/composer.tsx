import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { postsApi } from '../../src/services/api';
import { uploadImageToCloudinary } from '../../src/services/cloudinaryService';
import { Colors } from '../../src/constants/Colors';
import { Spacing, BorderRadius, FontSize, FontWeight } from '../../src/constants/Layout';
import { SmartButton } from '../../src/components/SmartButton';
import { Toast } from '../../src/components/Toast';

const { width: screenWidth } = Dimensions.get('window');

interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
}

interface Step {
  order: number;
  instruction: string;
}

export default function ComposerScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const postType = (params.type as 'recipe' | 'question') || 'recipe';

  // Basic post fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Recipe-specific fields
  const [servings, setServings] = useState('4');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: '', quantity: '', unit: 'g' }
  ]);
  const [steps, setSteps] = useState<Step[]>([
    { order: 1, instruction: '' }
  ]);

  // State management
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    // Request permissions for image picker
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'L\'accès à la galerie photo est nécessaire pour ajouter des images.'
        );
      }
    })();
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        
        // Start upload immediately
        setIsImageUploading(true);
        setUploadProgress(0);
        
        try {
          await uploadImageToCloudinary(asset.uri, {
            postType,
            tags: [postType, 'community'],
            onProgress: (progress) => setUploadProgress(progress),
            onComplete: (result) => {
              console.log('Upload successful:', result.secure_url);
              setImageUri(result.secure_url);
              showToast('Image uploadée avec succès !');
            },
            onError: (error) => {
              console.error('Upload failed:', error);
              showToast('Échec de l\'upload de l\'image');
              setImageUri(null);
            }
          });
        } finally {
          setIsImageUploading(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showToast('Erreur lors de la sélection de l\'image');
    }
  };

  const removeImage = () => {
    setImageUri(null);
    setUploadProgress(0);
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim()) && tags.length < 5) {
      setTags(prev => [...prev, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: '', unit: 'g' }]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updatedIngredients = ingredients.map((ingredient, i) =>
      i === index ? { ...ingredient, [field]: value } : ingredient
    );
    setIngredients(updatedIngredients);
  };

  const addStep = () => {
    setSteps([...steps, { order: steps.length + 1, instruction: '' }]);
  };

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      const updatedSteps = steps
        .filter((_, i) => i !== index)
        .map((step, i) => ({ ...step, order: i + 1 }));
      setSteps(updatedSteps);
    }
  };

  const updateStep = (index: number, instruction: string) => {
    const updatedSteps = steps.map((step, i) =>
      i === index ? { ...step, instruction } : step
    );
    setSteps(updatedSteps);
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      showToast('Le titre est requis');
      return false;
    }

    if (!description.trim()) {
      showToast('La description est requise');
      return false;
    }

    if (postType === 'recipe') {
      const hasValidIngredients = ingredients.some(ing => 
        ing.name.trim() && ing.quantity.trim()
      );
      if (!hasValidIngredients) {
        showToast('Au moins un ingrédient complet est requis');
        return false;
      }

      const hasValidSteps = steps.some(step => step.instruction.trim());
      if (!hasValidSteps) {
        showToast('Au moins une étape d\'instruction est requise');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);

      const postData = {
        type: postType,
        title: title.trim(),
        content: description.trim(),
        image_url: imageUri || undefined,
        tags: tags,
        ...(postType === 'recipe' && {
          recipe_data: {
            servings: parseInt(servings) || 4,
            prep_time_minutes: prepTime ? parseInt(prepTime) : undefined,
            cook_time_minutes: cookTime ? parseInt(cookTime) : undefined,
            ingredients: ingredients
              .filter(ing => ing.name.trim() && ing.quantity.trim())
              .map(ing => ({
                name: ing.name.trim(),
                quantity: ing.quantity.trim(),
                unit: ing.unit
              })),
            instructions: steps
              .filter(step => step.instruction.trim())
              .map(step => ({
                order: step.order,
                instruction: step.instruction.trim()
              }))
          }
        })
      };

      console.log('🚀 Creating post:', postData);
      const response = await postsApi.createPost(postData);

      if (response.success) {
        showToast(postType === 'recipe' ? 'Recette créée avec succès !' : 'Question publiée avec succès !');
        // Navigate back after brief delay
        setTimeout(() => {
          router.back();
        }, 1500);
      } else {
        throw new Error('Failed to create post');
      }

    } catch (error: any) {
      console.error('Error creating post:', error);
      showToast(error.response?.data?.detail || 'Erreur lors de la publication');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderImageSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Photo (optionnelle)</Text>
      
      {imageUri ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          {isImageUploading && (
            <View style={styles.uploadOverlay}>
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
              </View>
              <Text style={styles.uploadText}>Upload: {uploadProgress}%</Text>
            </View>
          )}
          <SmartButton
            style={styles.removeImageButton}
            onPress={removeImage}
            disabled={isImageUploading}
            accessibilityLabel="Supprimer l'image"
          >
            <Ionicons name="close" size={20} color={Colors.light.background} />
          </SmartButton>
        </View>
      ) : (
        <SmartButton
          style={styles.addImageButton}
          onPress={pickImage}
          disabled={isImageUploading}
          accessibilityLabel="Ajouter une image"
        >
          <Ionicons name="image" size={24} color={Colors.light.primary} />
          <Text style={styles.addImageText}>Ajouter une photo</Text>
        </SmartButton>
      )}
    </View>
  );

  const renderBasicFields = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {postType === 'recipe' ? 'Nom de la recette' : 'Titre de la question'}
        </Text>
        <TextInput
          style={styles.input}
          placeholder={postType === 'recipe' ? 'Ex: Spaghetti Carbonara' : 'Ex: Comment réussir une pâte à crêpes ?'}
          placeholderTextColor={Colors.light.muted}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={postType === 'recipe' ? 'Décrivez votre recette...' : 'Décrivez votre question en détail...'}
          placeholderTextColor={Colors.light.muted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          maxLength={500}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tags</Text>
        <View style={styles.tagsContainer}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
              <SmartButton
                style={styles.tagRemove}
                onPress={() => handleRemoveTag(tag)}
                accessibilityLabel={`Supprimer le tag ${tag}`}
              >
                <Ionicons name="close" size={14} color={Colors.light.primary} />
              </SmartButton>
            </View>
          ))}
        </View>
        {tags.length < 5 && (
          <View style={styles.tagInputContainer}>
            <TextInput
              style={styles.tagInput}
              placeholder="Ajouter un tag"
              placeholderTextColor={Colors.light.muted}
              value={currentTag}
              onChangeText={setCurrentTag}
              onSubmitEditing={handleAddTag}
              maxLength={20}
            />
            <SmartButton
              style={styles.tagAddButton}
              onPress={handleAddTag}
              disabled={!currentTag.trim()}
              accessibilityLabel="Ajouter le tag"
            >
              <Ionicons name="add" size={20} color={Colors.light.primary} />
            </SmartButton>
          </View>
        )}
      </View>
    </>
  );

  const renderRecipeFields = () => {
    if (postType !== 'recipe') return null;

    return (
      <>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations générales</Text>
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Portions</Text>
              <TextInput
                style={styles.smallInput}
                placeholder="4"
                placeholderTextColor={Colors.light.muted}
                value={servings}
                onChangeText={setServings}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Préparation (min)</Text>
              <TextInput
                style={styles.smallInput}
                placeholder="30"
                placeholderTextColor={Colors.light.muted}
                value={prepTime}
                onChangeText={setPrepTime}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Cuisson (min)</Text>
              <TextInput
                style={styles.smallInput}
                placeholder="20"
                placeholderTextColor={Colors.light.muted}
                value={cookTime}
                onChangeText={setCookTime}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ingrédients</Text>
            <SmartButton
              style={styles.addButton}
              onPress={addIngredient}
              accessibilityLabel="Ajouter un ingrédient"
            >
              <Ionicons name="add" size={20} color={Colors.light.primary} />
            </SmartButton>
          </View>
          
          {ingredients.map((ingredient, index) => (
            <View key={index} style={styles.ingredientRow}>
              <TextInput
                style={[styles.input, styles.ingredientInput]}
                placeholder="Nom de l'ingrédient"
                placeholderTextColor={Colors.light.muted}
                value={ingredient.name}
                onChangeText={(value) => updateIngredient(index, 'name', value)}
              />
              <TextInput
                style={[styles.input, styles.quantityInput]}
                placeholder="Qté"
                placeholderTextColor={Colors.light.muted}
                value={ingredient.quantity}
                onChangeText={(value) => updateIngredient(index, 'quantity', value)}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.unitInput]}
                placeholder="g"
                placeholderTextColor={Colors.light.muted}
                value={ingredient.unit}
                onChangeText={(value) => updateIngredient(index, 'unit', value)}
              />
              {ingredients.length > 1 && (
                <SmartButton
                  style={styles.removeButton}
                  onPress={() => removeIngredient(index)}
                  accessibilityLabel="Supprimer l'ingrédient"
                >
                  <Ionicons name="remove" size={16} color={Colors.light.error} />
                </SmartButton>
              )}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            <SmartButton
              style={styles.addButton}
              onPress={addStep}
              accessibilityLabel="Ajouter une étape"
            >
              <Ionicons name="add" size={20} color={Colors.light.primary} />
            </SmartButton>
          </View>
          
          {steps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{step.order}</Text>
              </View>
              <TextInput
                style={[styles.input, styles.stepInput]}
                placeholder="Décrivez cette étape..."
                placeholderTextColor={Colors.light.muted}
                value={step.instruction}
                onChangeText={(value) => updateStep(index, value)}
                multiline
                numberOfLines={2}
              />
              {steps.length > 1 && (
                <SmartButton
                  style={styles.removeButton}
                  onPress={() => removeStep(index)}
                  accessibilityLabel="Supprimer l'étape"
                >
                  <Ionicons name="remove" size={16} color={Colors.light.error} />
                </SmartButton>
              )}
            </View>
          ))}
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <SmartButton
            style={styles.headerButton}
            onPress={() => router.back()}
            accessibilityLabel="Retour"
          >
            <Ionicons name="close" size={24} color={Colors.light.text} />
          </SmartButton>
          <Text style={styles.headerTitle}>
            {postType === 'recipe' ? 'Nouvelle recette' : 'Nouvelle question'}
          </Text>
          <SmartButton
            style={styles.headerButton}
            onPress={handleSubmit}
            disabled={isSubmitting}
            loading={isSubmitting}
            accessibilityLabel="Publier"
          >
            <Text style={[
              styles.publishText,
              isSubmitting && styles.publishTextDisabled
            ]}>
              Publier
            </Text>
          </SmartButton>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderImageSection()}
          {renderBasicFields()}
          {renderRecipeFields()}
          
          {/* Bottom padding for iOS keyboard */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Toast */}
        {toastMessage && (
          <Toast
            message={toastMessage}
            onDismiss={() => setToastMessage('')}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  headerButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semiBold,
    color: Colors.light.text,
  },
  publishText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.primary,
  },
  publishTextDisabled: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  section: {
    marginVertical: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputGroup: {
    flex: 1,
    marginHorizontal: Spacing.xs,
  },
  inputLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  smallInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
    textAlign: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primary + '15',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  tagText: {
    fontSize: FontSize.sm,
    color: Colors.light.primary,
    marginRight: Spacing.xs,
  },
  tagRemove: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
    marginRight: Spacing.sm,
  },
  tagAddButton: {
    padding: Spacing.sm,
  },
  addButton: {
    padding: Spacing.xs,
  },
  removeButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  ingredientInput: {
    flex: 3,
    marginRight: Spacing.xs,
  },
  quantityInput: {
    flex: 1,
    marginRight: Spacing.xs,
    textAlign: 'center',
  },
  unitInput: {
    flex: 1,
    marginRight: Spacing.xs,
    textAlign: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    marginTop: Spacing.sm,
  },
  stepNumberText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.light.background,
  },
  stepInput: {
    flex: 1,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  imagePreview: {
    width: screenWidth - (Spacing.md * 2),
    height: (screenWidth - (Spacing.md * 2)) * 9 / 16,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.muted,
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
  progressContainer: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginBottom: Spacing.sm,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: 2,
  },
  uploadText: {
    fontSize: FontSize.sm,
    color: Colors.light.background,
    fontWeight: FontWeight.medium,
  },
  removeImageButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
  },
  addImageText: {
    fontSize: FontSize.md,
    color: Colors.light.primary,
    fontWeight: FontWeight.medium,
    marginLeft: Spacing.sm,
  },
});