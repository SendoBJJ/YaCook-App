import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { postsApi } from '../../src/services/api';
import { Colors } from '../../src/constants/Colors';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../src/constants/Layout';

interface PostType {
  type: 'recipe' | 'question';
}

export default function ComposerScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const [postType, setPostType] = useState<'recipe' | 'question'>((params.type as 'recipe' | 'question') || 'recipe');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim()) && tags.length < 5) {
      setTags(prev => [...prev, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
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
        tags: tags,
        is_public: isPublic
      };

      const newPost = await postsApi.createPost(postData);
      
      Alert.alert(
        'Post créé ! ✅',
        `Votre ${postType === 'recipe' ? 'recette' : 'question'} a été publiée avec succès.`,
        [
          {
            text: 'Voir le post',
            onPress: () => {
              router.dismiss();
              router.push({
                pathname: '/post/[id]',
                params: { id: newPost.id }
              });
            }
          },
          {
            text: 'Continuer',
            onPress: () => router.dismiss(),
            style: 'cancel'
          }
        ]
      );
      
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Erreur', 'Impossible de créer le post. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (title.trim() || body.trim()) {
      Alert.alert(
        'Abandonner ?',
        'Voulez-vous vraiment abandonner ? Vos modifications seront perdues.',
        [
          { text: 'Continuer l\'édition', style: 'cancel' },
          { text: 'Abandonner', style: 'destructive', onPress: () => router.dismiss() }
        ]
      );
    } else {
      router.dismiss();
    }
  };

  const renderPostTypeSelector = () => (
    <View style={styles.postTypeContainer}>
      <Text style={styles.sectionTitle}>Type de post</Text>
      <View style={styles.postTypeSelector}>
        <TouchableOpacity
          style={[styles.typeButton, postType === 'recipe' && styles.activeTypeButton]}
          onPress={() => setPostType('recipe')}
          activeOpacity={0.8}
        >
          <Ionicons 
            name="restaurant" 
            size={20} 
            color={postType === 'recipe' ? Colors.light.background : Colors.light.primary} 
          />
          <Text style={[styles.typeButtonText, postType === 'recipe' && styles.activeTypeButtonText]}>
            Recette
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.typeButton, postType === 'question' && styles.activeTypeButton]}
          onPress={() => setPostType('question')}
          activeOpacity={0.8}
        >
          <Ionicons 
            name="help-circle" 
            size={20} 
            color={postType === 'question' ? Colors.light.background : Colors.light.primary} 
          />
          <Text style={[styles.typeButtonText, postType === 'question' && styles.activeTypeButtonText]}>
            Question
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTagsInput = () => (
    <View style={styles.tagsContainer}>
      <Text style={styles.sectionTitle}>Tags (optionnel)</Text>
      
      {tags.length > 0 && (
        <View style={styles.tagsList}>
          {tags.map((tag, index) => (
            <TouchableOpacity
              key={index}
              style={styles.tagChip}
              onPress={() => handleRemoveTag(tag)}
              activeOpacity={0.8}
            >
              <Text style={styles.tagChipText}>{tag}</Text>
              <Ionicons name="close-circle" size={16} color={Colors.light.background} />
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      <View style={styles.tagInputContainer}>
        <TextInput
          style={styles.tagInput}
          value={currentTag}
          onChangeText={setCurrentTag}
          placeholder="Ajouter un tag..."
          placeholderTextColor={Colors.light.muted}
          onSubmitEditing={handleAddTag}
          returnKeyType="done"
          maxLength={20}
        />
        <TouchableOpacity
          style={[styles.addTagButton, !currentTag.trim() && styles.disabledButton]}
          onPress={handleAddTag}
          disabled={!currentTag.trim() || tags.length >= 5}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color={Colors.light.background} />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.tagHint}>
        {tags.length}/5 tags • Appuyez sur un tag pour le supprimer
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
          <Text style={styles.cancelText}>Annuler</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Créer un post</Text>
        
        <TouchableOpacity 
          onPress={handleSubmit} 
          style={[styles.headerButton, styles.publishButton, (!title.trim() || !body.trim() || isSubmitting) && styles.disabledButton]}
          disabled={!title.trim() || !body.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={Colors.light.background} />
          ) : (
            <Text style={styles.publishText}>Publier</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {renderPostTypeSelector()}
          
          {/* Title Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.sectionTitle}>Titre *</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder={postType === 'recipe' ? 'Ex: Gratin de saumon aux brocolis' : 'Ex: Comment réussir une pâte à crêpes ?'}
              placeholderTextColor={Colors.light.muted}
              maxLength={150}
              multiline
            />
            <Text style={styles.characterCount}>{title.length}/150</Text>
          </View>

          {/* Body Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.sectionTitle}>
              {postType === 'recipe' ? 'Recette' : 'Détails'} *
            </Text>
            <TextInput
              style={styles.bodyInput}
              value={body}
              onChangeText={setBody}
              placeholder={
                postType === 'recipe' 
                  ? 'Décrivez votre recette: ingrédients, étapes de préparation, conseils...'
                  : 'Décrivez votre question en détail...'
              }
              placeholderTextColor={Colors.light.muted}
              multiline
              maxLength={5000}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>{body.length}/5000</Text>
          </View>

          {renderTagsInput()}

          {/* Privacy Toggle */}
          <View style={styles.privacyContainer}>
            <View style={styles.privacyHeader}>
              <Ionicons name={isPublic ? 'globe' : 'lock-closed'} size={20} color={Colors.light.text} />
              <Text style={styles.privacyTitle}>
                {isPublic ? 'Post public' : 'Post privé'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.toggleButton, isPublic && styles.toggleButtonActive]}
              onPress={() => setIsPublic(!isPublic)}
              activeOpacity={0.8}
            >
              <View style={[styles.toggleIndicator, isPublic && styles.toggleIndicatorActive]} />
            </TouchableOpacity>
          </View>

          <Text style={styles.privacyDescription}>
            {isPublic 
              ? 'Votre post sera visible par tous les utilisateurs de YaCook'
              : 'Votre post ne sera visible que par vous'
            }
          </Text>
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  publishButton: {
    backgroundColor: Colors.light.primary,
  },
  cancelText: {
    fontSize: FontSize.md,
    color: Colors.light.muted,
    fontWeight: FontWeight.medium,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  publishText: {
    fontSize: FontSize.md,
    color: Colors.light.background,
    fontWeight: FontWeight.semibold,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  postTypeContainer: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  postTypeSelector: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.background,
  },
  activeTypeButton: {
    backgroundColor: Colors.light.primary,
  },
  typeButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.primary,
    marginLeft: Spacing.sm,
  },
  activeTypeButtonText: {
    color: Colors.light.background,
  },
  inputContainer: {
    marginBottom: Spacing.xl,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
    minHeight: 60,
  },
  bodyInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    fontSize: FontSize.md,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
    height: 200,
  },
  characterCount: {
    fontSize: FontSize.xs,
    color: Colors.light.muted,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  tagsContainer: {
    marginBottom: Spacing.xl,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  tagChipText: {
    fontSize: FontSize.sm,
    color: Colors.light.background,
    fontWeight: FontWeight.medium,
    marginRight: Spacing.xs,
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  },
  addTagButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagHint: {
    fontSize: FontSize.xs,
    color: Colors.light.muted,
    marginTop: Spacing.sm,
  },
  privacyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  privacyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginLeft: Spacing.sm,
  },
  toggleButton: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.light.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: Colors.light.primary,
  },
  toggleIndicator: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.light.background,
    alignSelf: 'flex-start',
  },
  toggleIndicatorActive: {
    alignSelf: 'flex-end',
  },
  privacyDescription: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    lineHeight: 18,
    marginBottom: Spacing.xl,
  },
  disabledButton: {
    opacity: 0.5,
  },
});