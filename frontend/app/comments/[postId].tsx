import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { commentsApi } from '../../src/services/api';
import { Colors } from '../../src/constants/Colors';
import { Spacing, BorderRadius, FontSize, FontWeight } from '../../src/constants/Layout';
import { SmartButton } from '../../src/components/SmartButton';
import { SkeletonText } from '../../src/components/SkeletonLoader';
import { Toast } from '../../src/components/Toast';

interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  created_at: string;
  likes_count: number;
  is_liked: boolean;
  replies_count: number;
  parent_id?: string;
}

export default function CommentsScreen() {
  const { postId, postTitle } = useLocalSearchParams<{ postId: string; postTitle?: string }>();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyToComment, setReplyToComment] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  
  const commentInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (postId) {
      loadComments();
    }
  }, [postId]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const loadComments = async () => {
    try {
      setIsLoading(true);
      const response = await commentsApi.getComments(postId!);
      if (response.success) {
        setComments(response.comments);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      showToast('Erreur lors du chargement des commentaires');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    try {
      setIsSubmitting(true);
      const response = await commentsApi.createComment(postId!, {
        content: newComment.trim(),
        parent_id: replyToComment
      });

      if (response.success) {
        setComments(prev => [response.comment, ...prev]);
        setNewComment('');
        setReplyToComment(null);
        showToast('Commentaire publié !');
        
        // Scroll to top to see the new comment
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }
    } catch (error: any) {
      console.error('Error creating comment:', error);
      showToast(error.response?.data?.detail || 'Erreur lors de la publication');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      const response = await commentsApi.toggleLike(commentId);
      if (response.success) {
        setComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? {
                ...comment,
                is_liked: !comment.is_liked,
                likes_count: comment.is_liked ? comment.likes_count - 1 : comment.likes_count + 1
              }
            : comment
        ));
      }
    } catch (error) {
      console.error('Error toggling comment like:', error);
    }
  };

  const handleReply = (commentId: string, authorName: string) => {
    setReplyToComment(commentId);
    setNewComment(`@${authorName} `);
    commentInputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyToComment(null);
    setNewComment('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return "Maintenant";
    if (diffMinutes < 60) return `Il y a ${diffMinutes}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const renderCommentItem = (comment: Comment) => (
    <View key={comment.id} style={styles.commentItem}>
      <View style={styles.commentHeader}>
        <View style={styles.authorAvatar}>
          <Text style={styles.authorAvatarText}>
            {comment.author.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.commentMeta}>
          <Text style={styles.authorName}>{comment.author.name}</Text>
          <Text style={styles.commentDate}>{formatDate(comment.created_at)}</Text>
        </View>
      </View>

      <Text style={styles.commentContent}>{comment.content}</Text>

      <View style={styles.commentActions}>
        <SmartButton
          style={[styles.actionButton, comment.is_liked && styles.actionButtonActive]}
          onPress={() => handleLikeComment(comment.id)}
          accessibilityLabel="J'aime ce commentaire"
        >
          <Ionicons 
            name={comment.is_liked ? "heart" : "heart-outline"} 
            size={16} 
            color={comment.is_liked ? Colors.light.error : Colors.light.muted} 
          />
          {comment.likes_count > 0 && (
            <Text style={[styles.actionText, comment.is_liked && styles.actionTextActive]}>
              {comment.likes_count}
            </Text>
          )}
        </SmartButton>

        <SmartButton
          style={styles.actionButton}
          onPress={() => handleReply(comment.id, comment.author.name)}
          accessibilityLabel="Répondre au commentaire"
        >
          <Ionicons name="chatbubble-outline" size={16} color={Colors.light.muted} />
          <Text style={styles.actionText}>Répondre</Text>
        </SmartButton>

        {comment.replies_count > 0 && (
          <SmartButton
            style={styles.actionButton}
            onPress={() => {/* Navigate to replies */}}
            accessibilityLabel="Voir les réponses"
          >
            <Text style={styles.repliesText}>
              {comment.replies_count} réponse{comment.replies_count > 1 ? 's' : ''}
            </Text>
          </SmartButton>
        )}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubble-outline" size={64} color={Colors.light.muted} />
      <Text style={styles.emptyStateTitle}>Aucun commentaire</Text>
      <Text style={styles.emptyStateText}>
        Soyez le premier à commenter cette publication !
      </Text>
    </View>
  );

  const renderCommentInput = () => (
    <View style={styles.commentInputContainer}>
      {replyToComment && (
        <View style={styles.replyIndicator}>
          <Text style={styles.replyText}>
            Réponse en cours...
          </Text>
          <SmartButton
            style={styles.cancelReplyButton}
            onPress={cancelReply}
            accessibilityLabel="Annuler la réponse"
          >
            <Ionicons name="close" size={16} color={Colors.light.muted} />
          </SmartButton>
        </View>
      )}
      
      <View style={styles.inputRow}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>M</Text>
        </View>
        
        <TextInput
          ref={commentInputRef}
          style={styles.commentInput}
          placeholder="Ajouter un commentaire..."
          placeholderTextColor={Colors.light.muted}
          value={newComment}
          onChangeText={setNewComment}
          multiline
          maxLength={500}
          onSubmitEditing={handleSubmitComment}
        />
        
        <SmartButton
          style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]}
          onPress={handleSubmitComment}
          disabled={isSubmitting || !newComment.trim()}
          loading={isSubmitting}
          accessibilityLabel="Publier le commentaire"
        >
          <Ionicons 
            name="send" 
            size={20} 
            color={newComment.trim() ? Colors.light.primary : Colors.light.muted} 
          />
        </SmartButton>
      </View>
    </View>
  );

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
          <Text style={styles.headerTitle}>Commentaires</Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView style={styles.content}>
          <SkeletonText lines={2} />
          <View style={{ height: 20 }} />
          <SkeletonText lines={3} />
          <View style={{ height: 20 }} />
          <SkeletonText lines={2} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <SmartButton
            style={styles.headerButton}
            onPress={() => router.back()}
            accessibilityLabel="Retour"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </SmartButton>
          <Text style={styles.headerTitle}>Commentaires</Text>
          <View style={styles.headerButton} />
        </View>

        {postTitle && (
          <View style={styles.postTitleContainer}>
            <Text style={styles.postTitle} numberOfLines={2}>
              {decodeURIComponent(postTitle)}
            </Text>
          </View>
        )}

        {/* Comments List */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {comments.length === 0 ? (
            renderEmptyState()
          ) : (
            comments.map(renderCommentItem)
          )}
          
          {/* Bottom padding for keyboard */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Comment Input */}
        {renderCommentInput()}

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
  },
  headerButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semiBold,
    color: Colors.light.text,
  },
  postTitleContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  postTitle: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    fontStyle: 'italic',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  commentItem: {
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  authorAvatarText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.light.background,
  },
  commentMeta: {
    flex: 1,
  },
  authorName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
  },
  commentDate: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginTop: 2,
  },
  commentContent: {
    fontSize: FontSize.md,
    color: Colors.light.text,
    lineHeight: FontSize.md * 1.4,
    marginBottom: Spacing.sm,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.md,
  },
  actionButtonActive: {
    backgroundColor: Colors.light.error + '15',
  },
  actionText: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginLeft: Spacing.xs,
  },
  actionTextActive: {
    color: Colors.light.error,
  },
  repliesText: {
    fontSize: FontSize.sm,
    color: Colors.light.primary,
    fontWeight: FontWeight.medium,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyStateTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semiBold,
    color: Colors.light.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    fontSize: FontSize.md,
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: FontSize.md * 1.4,
  },
  commentInputContainer: {
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.light.primary + '15',
  },
  replyText: {
    fontSize: FontSize.sm,
    color: Colors.light.primary,
    fontWeight: FontWeight.medium,
  },
  cancelReplyButton: {
    padding: Spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  userAvatarText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.light.background,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
    maxHeight: 100,
    minHeight: 40,
    textAlignVertical: 'top',
    marginRight: Spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.light.border,
  },
});