import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { postsApi, usersApi } from '../../src/services/api';
import { Colors } from '../../src/constants/Colors';
import { Spacing, BorderRadius, FontSize, FontWeight } from '../../src/constants/Layout';
import { SmartButton } from '../../src/components/SmartButton';
import { SkeletonCard } from '../../src/components/SkeletonLoader';

const { width: screenWidth } = Dimensions.get('window');

interface ProfileUser {
  id: string;
  first_name: string;
  last_name: string;
  display_name?: string;
  avatar_url?: string;
  email: string;
  created_at: string;
  posts_count: number;
  followers_count: number;
  following_count: number;
  is_following?: boolean;
}

interface Post {
  id: string;
  type: 'recipe' | 'question';
  title: string;
  content: string;
  image_url?: string;
  tags: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
}

type TabType = 'posts' | 'saved' | 'activity';

export default function UserProfileScreen() {
  const { user: currentUser } = useAuth();
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const isOwnProfile = !userId || userId === currentUser?.id;
  
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      
      if (isOwnProfile) {
        // Load current user's profile
        setProfileUser({
          id: currentUser!.id,
          first_name: currentUser!.first_name,
          last_name: currentUser!.last_name || '',
          display_name: currentUser!.display_name,
          avatar_url: currentUser!.avatar_url,
          email: currentUser!.email,
          created_at: currentUser!.created_at,
          posts_count: 0,
          followers_count: 0,
          following_count: 0,
        });
      } else {
        // Load other user's profile
        const response = await usersApi.getProfile(userId!);
        if (response.success) {
          setProfileUser(response.user);
          setIsFollowing(response.user.is_following || false);
        }
      }
      
      // Load user's posts
      await loadPosts();
      if (isOwnProfile) {
        await loadSavedPosts();
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      const targetUserId = userId || currentUser?.id;
      const response = await postsApi.getUserPosts(targetUserId!);
      if (response.success) {
        setPosts(response.posts);
        
        // Update posts count
        if (profileUser) {
          setProfileUser({
            ...profileUser,
            posts_count: response.posts.length
          });
        }
      }
    } catch (error) {
      console.error('Error loading user posts:', error);
    }
  };

  const loadSavedPosts = async () => {
    try {
      const response = await postsApi.getSavedPosts();
      if (response.success) {
        setSavedPosts(response.posts);
      }
    } catch (error) {
      console.error('Error loading saved posts:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadProfile();
    setIsRefreshing(false);
  };

  const handleFollowToggle = async () => {
    if (!profileUser || isOwnProfile) return;
    
    try {
      const response = await usersApi.toggleFollow(profileUser.id);
      if (response.success) {
        setIsFollowing(!isFollowing);
        setProfileUser({
          ...profileUser,
          followers_count: isFollowing ? profileUser.followers_count - 1 : profileUser.followers_count + 1
        });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      year: 'numeric', 
      month: 'long'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 7) {
      return `Il y a ${diffDays}j`;
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const renderProfileHeader = () => {
    if (!profileUser) return null;
    
    const displayName = profileUser.display_name || 
      `${profileUser.first_name} ${profileUser.last_name}`.trim();
    const initials = profileUser.first_name.charAt(0).toUpperCase() + 
      (profileUser.last_name?.charAt(0).toUpperCase() || '');

    return (
      <View style={styles.profileHeader}>
        {/* Avatar and basic info */}
        <View style={styles.profileInfo}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{initials}</Text>
          </View>
          
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileJoinDate}>
              Membre depuis {formatJoinDate(profileUser.created_at)}
            </Text>
          </View>
          
          {!isOwnProfile && (
            <SmartButton
              style={[styles.followButton, isFollowing && styles.followingButton]}
              onPress={handleFollowToggle}
              accessibilityLabel={isFollowing ? "Se désabonner" : "S'abonner"}
            >
              <Ionicons 
                name={isFollowing ? "person-remove" : "person-add"} 
                size={16} 
                color={isFollowing ? Colors.light.text : Colors.light.background} 
              />
              <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                {isFollowing ? 'Abonné' : 'Suivre'}
              </Text>
            </SmartButton>
          )}
        </View>

        {/* Stats */}
        <View style={styles.profileStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profileUser.posts_count}</Text>
            <Text style={styles.statLabel}>
              {profileUser.posts_count > 1 ? 'Publications' : 'Publication'}
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profileUser.followers_count}</Text>
            <Text style={styles.statLabel}>
              {profileUser.followers_count > 1 ? 'Abonnés' : 'Abonné'}
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profileUser.following_count}</Text>
            <Text style={styles.statLabel}>Abonnements</Text>
          </View>
        </View>

        {/* Actions for own profile */}
        {isOwnProfile && (
          <View style={styles.profileActions}>
            <SmartButton
              style={styles.editProfileButton}
              onPress={() => router.push('/profile/settings')}
              accessibilityLabel="Modifier le profil"
            >
              <Ionicons name="settings-outline" size={16} color={Colors.light.text} />
              <Text style={styles.editProfileButtonText}>Paramètres</Text>
            </SmartButton>
          </View>
        )}
      </View>
    );
  };

  const renderTabs = () => {
    const tabs = isOwnProfile ? [
      { key: 'posts', label: 'Publications', icon: 'grid-outline' },
      { key: 'saved', label: 'Sauvegardées', icon: 'bookmark-outline' },
      { key: 'activity', label: 'Activité', icon: 'time-outline' },
    ] : [
      { key: 'posts', label: 'Publications', icon: 'grid-outline' },
    ];

    return (
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <SmartButton
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key as TabType)}
            accessibilityLabel={`Voir ${tab.label}`}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={20} 
              color={activeTab === tab.key ? Colors.light.primary : Colors.light.muted} 
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </SmartButton>
        ))}
      </View>
    );
  };

  const renderPostGrid = (postsToShow: Post[]) => {
    if (postsToShow.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="images-outline" size={64} color={Colors.light.muted} />
          <Text style={styles.emptyStateTitle}>
            {activeTab === 'saved' ? 'Aucune sauvegarde' : 'Aucune publication'}
          </Text>
          <Text style={styles.emptyStateText}>
            {activeTab === 'saved' 
              ? 'Les recettes que vous sauvegardez apparaîtront ici'
              : isOwnProfile 
                ? 'Créez votre première publication !'
                : 'Cet utilisateur n\'a encore rien publié'
            }
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.postsGrid}>
        {postsToShow.map((post) => (
          <SmartButton
            key={post.id}
            style={styles.postGridItem}
            onPress={() => router.push(`/post/${post.id}`)}
            accessibilityLabel={`Voir: ${post.title}`}
          >
            {post.image_url ? (
              <View style={styles.postImageContainer}>
                {/* Would show actual image here */}
                <View style={[styles.postImagePlaceholder, { backgroundColor: Colors.light.border }]}>
                  <Ionicons name="image" size={24} color={Colors.light.muted} />
                </View>
                <View style={styles.postOverlay}>
                  <View style={styles.postStats}>
                    <View style={styles.postStat}>
                      <Ionicons name="heart" size={12} color={Colors.light.background} />
                      <Text style={styles.postStatText}>{post.likes_count}</Text>
                    </View>
                    <View style={styles.postStat}>
                      <Ionicons name="chatbubble" size={12} color={Colors.light.background} />
                      <Text style={styles.postStatText}>{post.comments_count}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.textPostContainer}>
                <View style={styles.postTypeIndicator}>
                  <Ionicons 
                    name={post.type === 'recipe' ? 'restaurant' : 'help-circle'} 
                    size={16} 
                    color={Colors.light.primary} 
                  />
                </View>
                <Text style={styles.textPostTitle} numberOfLines={3}>
                  {post.title}
                </Text>
                <View style={styles.textPostStats}>
                  <Text style={styles.textPostDate}>{formatDate(post.created_at)}</Text>
                  <View style={styles.textPostInteractions}>
                    <Text style={styles.textPostStatText}>{post.likes_count}♥</Text>
                    <Text style={styles.textPostStatText}>{post.comments_count}💬</Text>
                  </View>
                </View>
              </View>
            )}
          </SmartButton>
        ))}
      </View>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'posts':
        return renderPostGrid(posts);
      case 'saved':
        return renderPostGrid(savedPosts);
      case 'activity':
        return (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={64} color={Colors.light.muted} />
            <Text style={styles.emptyStateTitle}>Activité récente</Text>
            <Text style={styles.emptyStateText}>Votre activité récente apparaîtra ici</Text>
          </View>
        );
      default:
        return null;
    }
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
          <Text style={styles.headerTitle}>Profil</Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView style={styles.content}>
          <SkeletonCard />
          <View style={{ height: 20 }} />
          <SkeletonCard />
        </ScrollView>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle}>
          {isOwnProfile ? 'Mon Profil' : 'Profil'}
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {renderProfileHeader()}
        {renderTabs()}
        {renderContent()}
        
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
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semiBold,
    color: Colors.light.text,
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  profileAvatarText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.background,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semiBold,
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  profileJoinDate: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  followingButton: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  followButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.light.background,
    marginLeft: Spacing.xs,
  },
  followingButtonText: {
    color: Colors.light.text,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginTop: Spacing.xs,
  },
  profileActions: {
    alignItems: 'center',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  editProfileButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
    marginLeft: Spacing.xs,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.light.primary,
  },
  tabText: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    marginLeft: Spacing.xs,
    fontWeight: FontWeight.medium,
  },
  activeTabText: {
    color: Colors.light.primary,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.xs,
  },
  postGridItem: {
    width: (screenWidth - Spacing.md) / 3,
    aspectRatio: 1,
    margin: Spacing.xs,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  postImageContainer: {
    flex: 1,
    position: 'relative',
  },
  postImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: Spacing.xs,
  },
  postStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  postStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postStatText: {
    fontSize: FontSize.xs,
    color: Colors.light.background,
    marginLeft: 2,
  },
  textPostContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: Spacing.sm,
    justifyContent: 'space-between',
  },
  postTypeIndicator: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.xs,
  },
  textPostTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
    flex: 1,
  },
  textPostStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  textPostDate: {
    fontSize: FontSize.xs,
    color: Colors.light.muted,
  },
  textPostInteractions: {
    flexDirection: 'row',
  },
  textPostStatText: {
    fontSize: FontSize.xs,
    color: Colors.light.muted,
    marginLeft: Spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
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
});