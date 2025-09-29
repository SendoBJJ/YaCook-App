import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { postsApi } from '../../src/services/api';
import { Colors } from '../../src/constants/Colors';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../src/constants/Layout';

export default function ComposerScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const postType = (params.type as 'recipe' | 'question') || 'recipe';
  
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 10) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir le titre et le contenu');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const postData = {
        type: postType,
        title: title.trim(),
        body: body.trim(),
        tags,
        is_public: isPublic,
      };

      await postsApi.createPost(postData);
      
      Alert.alert(
        'Succès !',
        `Votre ${postType === 'recipe' ? 'recette' : 'question'} a été publiée.`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Erreur', 'Impossible de publier votre post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlaceholders = () => {
    if (postType === 'recipe') {
      return {
        title: 'Nom de votre recette...',
        body: `Décrivez votre recette en détail :

**Ingrédients :**
• 200g de farine
• 3 œufs
• 250ml de lait
• ...

**Instructions :**
1. Mélangez la farine et les œufs
2. Ajoutez progressivement le lait
3. ...

**Conseils :**
• Laissez reposer la pâte 30 minutes
• ...`,
      };
    } else {
      return {
        title: 'Votre question culinaire...',
        body: 'Décrivez votre question en détail. Plus vous donnez d\'informations, meilleures seront les réponses !',
      };
    }
  };

  const placeholders = getPlaceholders();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="close" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          {postType === 'recipe' ? 'Nouvelle recette' : 'Nouvelle question'}
        </Text>
        
        <TouchableOpacity 
          onPress={handleSubmit}
          style={[styles.headerButton, styles.publishButton, isSubmitting && styles.disabledButton]}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={Colors.light.background} />
          ) : (
            <Text style={styles.publishButtonText}>Publier</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Post Type Indicator */}
          <View style={styles.typeIndicator}>
            <Ionicons
              name={postType === 'recipe' ? 'restaurant' : 'help-circle'}
              size={20}
              color={Colors.light.primary}
            />
            <Text style={styles.typeText}>
              {postType === 'recipe' ? 'Recette' : 'Question'}
            </Text>
          </View>

          {/* Title Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Titre *</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder={placeholders.title}
              placeholderTextColor={Colors.light.muted}
              maxLength={100}
            />
            <Text style={styles.charCount}>{title.length}/100</Text>
          </View>

          {/* Body Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contenu *</Text>
            <TextInput
              style={styles.bodyInput}
              value={body}
              onChangeText={setBody}
              placeholder={placeholders.body}
              placeholderTextColor={Colors.light.muted}
              multiline
              textAlignVertical="top"
              maxLength={5000}
            />
            <Text style={styles.charCount}>{body.length}/5000</Text>
          </View>

          {/* Tags Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tags</Text>
            <View style={styles.tagInputContainer}>
              <TextInput
                style={styles.tagInput}
                value={tagInput}
                onChangeText={setTagInput}
                placeholder="Ajouter un tag..."
                placeholderTextColor={Colors.light.muted}
                onSubmitEditing={handleAddTag}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={handleAddTag} style={styles.addTagButton}>
                <Ionicons name="add" size={20} color={Colors.light.primary} />
              </TouchableOpacity>
            </View>
            
            {/* Tags Display */}
            {tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                    <TouchableOpacity onPress={() => handleRemoveTag(tag)}>
                      <Ionicons name="close" size={16} color={Colors.light.muted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <Text style={styles.tagHint}>
              Ajoutez des tags pour aider les autres à trouver votre {postType === 'recipe' ? 'recette' : 'question'}
            </Text>
          </View>

          {/* Privacy Setting */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Visibilité</Text>
            <TouchableOpacity 
              style={styles.privacyToggle}
              onPress={() => setIsPublic(!isPublic)}
            >
              <View style={styles.privacyInfo}>
                <Ionicons
                  name={isPublic ? 'globe' : 'lock-closed'}
                  size={20}
                  color={Colors.light.primary}
                />
                <View style={styles.privacyText}>
                  <Text style={styles.privacyTitle}>
                    {isPublic ? 'Public' : 'Privé'}
                  </Text>
                  <Text style={styles.privacyDescription}>
                    {isPublic 
                      ? 'Visible par tous les utilisateurs'
                      : 'Visible uniquement par vous'
                    }
                  </Text>
                </View>
              </View>
              <Ionicons
                name={isPublic ? 'radio-button-on' : 'radio-button-off'}
                size={24}
                color={Colors.light.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Conseils</Text>
            {postType === 'recipe' ? (
              <View>
                <Text style={styles.tipText}>• Soyez précis dans les quantités et les temps</Text>
                <Text style={styles.tipText}>• Ajoutez des conseils personnels</Text>
                <Text style={styles.tipText}>• Mentionnez les allergènes importants</Text>
              </View>
            ) : (
              <View>
                <Text style={styles.tipText}>• Soyez spécifique dans votre question</Text>
                <Text style={styles.tipText}>• Donnez du contexte si nécessaire</Text>
                <Text style={styles.tipText}>• Utilisez des tags pertinents</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  publishButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  publishButtonText: {
    color: Colors.light.background,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  disabledButton: {
    opacity: 0.7,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  typeText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.primary,
    marginLeft: Spacing.sm,
  },
  inputGroup: {
    marginBottom: Spacing.xl,
  },
  inputLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  },
  bodyInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
    minHeight: 200,
  },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.light.muted,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.background,
  },
  tagInput: {
    flex: 1,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.light.text,
  },
  addTagButton: {
    padding: Spacing.md,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.md,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  tagText: {
    fontSize: FontSize.sm,
    color: Colors.light.text,
    marginRight: Spacing.xs,
  },
  tagHint: {
    fontSize: FontSize.xs,
    color: Colors.light.muted,
    marginTop: Spacing.sm,
  },
  privacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.background,
  },
  privacyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  privacyText: {
    marginLeft: Spacing.md,
  },
  privacyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
  },
  privacyDescription: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
  },
  tipsContainer: {
    backgroundColor: Colors.light.card,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  tipsTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  tipText: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginBottom: Spacing.xs,
  },
});