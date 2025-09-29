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

export default function PostDetailScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const postId = params.id as string;
  
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    loadPost();
    loadComments();
  }, [postId]);

  const loadPost = async () => {
    try {
      setLoading(true);
      const response = await postsApi.getPost(postId);
      setPost(response);
    } catch (error) {
      console.error('Error loading post:', error);
      Alert.alert('Erreur', 'Impossible de charger le post');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      setCommentsLoading(true);
      const response = await commentsApi.getComments(postId);
      setComments(response.comments || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;

    try {
      setIsSubmittingComment(true);
      const newComment = await commentsApi.createComment(postId, commentText.trim());
      setComments(prev => [newComment, ...prev]);
      setCommentText('');
      
      // Update post comment count
      if (post) {
        setPost({ ...post, comments_count: post.comments_count + 1 });
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter le commentaire');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffMs = now.getTime() - postDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'À l\'instant';
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return postDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const renderComment = (comment: Comment) => (
    <View key={comment.id} style={styles.commentCard}>
      <View style={styles.commentHeader}>
        <View style={styles.commentAuthor}>
          <View style={styles.commentAvatar}>
            <Text style={styles.commentAuthorInitial}>
              {comment.author_name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View>
            <Text style={styles.commentAuthorName}>
              {comment.author_name || 'Utilisateur'}
            </Text>
            <Text style={styles.commentTime}>
              {formatTimeAgo(comment.created_at)}
            </Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.commentBody}>{comment.body}</Text>
      
      <View style={styles.commentActions}>
        <TouchableOpacity style={styles.commentAction}>
          <Ionicons name="heart-outline" size={16} color={Colors.light.muted} />
          <Text style={styles.commentActionText}>{comment.likes_count}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.commentAction}>
          <Ionicons name="chatbubble-outline" size={16} color={Colors.light.muted} />
          <Text style={styles.commentActionText}>Répondre</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={80} color={Colors.light.muted} />
          <Text style={styles.errorText}>Post introuvable</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {post.type === 'recipe' ? 'Recette' : 'Question'}
        </Text>
        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="share-outline" size={24} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Post Content */}
          <View style={styles.postCard}>
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
                  size={20}
                  color={Colors.light.primary}
                />
              </View>
            </View>

            {/* Post Title */}
            <Text style={styles.postTitle}>{post.title}</Text>

            {/* Post Body */}
            <Text style={styles.postBody}>{post.body}</Text>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <View style={styles.postTags}>
                {post.tags.map((tag, index) => (
                  <View key={index} style={styles.postTag}>
                    <Text style={styles.postTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Post Engagement */}
            <View style={styles.postEngagement}>
              <TouchableOpacity style={styles.engagementItem}>
                <Ionicons name="heart-outline" size={20} color={Colors.light.muted} />
                <Text style={styles.engagementText}>{post.likes_count}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.engagementItem}>
                <Ionicons name="chatbubble-outline" size={20} color={Colors.light.muted} />
                <Text style={styles.engagementText}>{post.comments_count}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.engagementItem}>
                <Ionicons name="bookmark-outline" size={20} color={Colors.light.muted} />
                <Text style={styles.engagementText}>Sauvegarder</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>
              Commentaires ({post.comments_count})
            </Text>
            
            {commentsLoading ? (
              <View style={styles.commentsLoading}>
                <ActivityIndicator size="small" color={Colors.light.primary} />
                <Text style={styles.commentsLoadingText}>Chargement des commentaires...</Text>
              </View>
            ) : comments.length === 0 ? (
              <View style={styles.noComments}>
                <Ionicons name="chatbubble-outline" size={40} color={Colors.light.muted} />
                <Text style={styles.noCommentsText}>Aucun commentaire pour le moment</Text>
                <Text style={styles.noCommentsSubtext}>Soyez le premier à commenter !</Text>
              </View>
            ) : (
              <View style={styles.commentsList}>
                {comments.map(renderComment)}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Comment Input */}
        <View style={styles.commentInputContainer}>
          <View style={styles.commentInputWrapper}>
            <TextInput
              style={styles.commentInput}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Ajouter un commentaire..."
              placeholderTextColor={Colors.light.muted}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendButton, !commentText.trim() && styles.sendButtonDisabled]}
              onPress={handleSubmitComment}
              disabled={!commentText.trim() || isSubmittingComment}
            >
              {isSubmittingComment ? (
                <ActivityIndicator size="small" color={Colors.light.background} />
              ) : (
                <Ionicons name="send" size={20} color={Colors.light.background} />
              )}
            </TouchableOpacity>
          </View>
        </View>
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
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  headerAction: {
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.light.muted,
    marginTop: Spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: FontSize.lg,
    color: Colors.light.muted,
    marginTop: Spacing.md,
  },
  postCard: {
    backgroundColor: Colors.light.background,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
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
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    marginBottom: Spacing.md,
    lineHeight: 28,
  },
  postBody: {
    fontSize: FontSize.md,
    color: Colors.light.text,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  postTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.lg,
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
  commentsSection: {
    padding: Spacing.lg,
  },
  commentsTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginBottom: Spacing.lg,
  },
  commentsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  commentsLoadingText: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginLeft: Spacing.sm,
  },
  noComments: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  noCommentsText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
    marginTop: Spacing.md,
  },
  noCommentsSubtext: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginTop: Spacing.xs,
  },
  commentsList: {
    gap: Spacing.md,
  },
  commentCard: {
    backgroundColor: Colors.light.card,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  commentHeader: {
    marginBottom: Spacing.sm,
  },
  commentAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  commentAuthorInitial: {
    color: Colors.light.background,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  commentAuthorName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
  },
  commentTime: {
    fontSize: FontSize.xs,
    color: Colors.light.muted,
    marginTop: 2,
  },
  commentBody: {
    fontSize: FontSize.md,
    color: Colors.light.text,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  commentActions: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentActionText: {
    fontSize: FontSize.xs,
    color: Colors.light.muted,
    marginLeft: 4,
  },
  commentInputContainer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  commentInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  commentInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.light.text,
    maxHeight: 100,
    paddingVertical: Spacing.xs,
  },
  sendButton: {
    backgroundColor: Colors.light.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});