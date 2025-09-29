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
import { useAuth } from '../../../src/context/AuthContext';
import { Colors } from '../../../src/constants/Colors';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../../src/constants/Layout';

// Mock users - would come from API in real app
interface MockUser {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
}

const mockUsers: MockUser[] = [
  { id: '1', name: 'Chef Marie', avatar: 'M', isOnline: true },
  { id: '2', name: 'Thomas L.', avatar: 'T', isOnline: false },
  { id: '3', name: 'Sophie M.', avatar: 'S', isOnline: true },
  { id: '4', name: 'Paul D.', avatar: 'P', isOnline: false },
  { id: '5', name: 'Emma R.', avatar: 'E', isOnline: true },
];

export default function NewThreadScreen() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [selectedUser, setSelectedUser] = useState<MockUser | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const filteredUsers = mockUsers.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateThread = async () => {
    if (!selectedUser || !messageText.trim()) {
      Alert.alert('Erreur', 'Veuillez sélectionner un utilisateur et taper un message');
      return;
    }

    try {
      setIsCreating(true);
      
      // TODO: Create actual thread via API
      console.log('Creating thread with:', { selectedUser, messageText });
      
      // Simulate success
      Alert.alert(
        'Conversation créée !',
        'Votre message a été envoyé.',
        [
          { 
            text: 'OK', 
            onPress: () => router.replace('/messages/thread/mock-new-id')
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error creating thread:', error);
      Alert.alert('Erreur', 'Impossible de créer la conversation');
    } finally {
      setIsCreating(false);
    }
  };

  const renderUserItem = (user) => (
    <TouchableOpacity
      key={user.id}
      style={[styles.userItem, selectedUser?.id === user.id && styles.selectedUserItem]}
      onPress={() => setSelectedUser(user)}
      activeOpacity={0.8}
    >
      <View style={styles.userAvatarContainer}>
        <View style={styles.userAvatar}>
          <Text style={styles.avatarText}>{user.avatar}</Text>
        </View>
        {user.isOnline && <View style={styles.onlineIndicator} />}
      </View>
      <Text style={[
        styles.userName, 
        selectedUser?.id === user.id && styles.selectedUserName
      ]}>
        {user.name}
      </Text>
      {selectedUser?.id === user.id && (
        <Ionicons name="checkmark-circle" size={20} color={Colors.light.primary} />
      )}
    </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Nouvelle conversation</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={handleCreateThread}
          disabled={isCreating || !selectedUser || !messageText.trim()}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color={Colors.light.primary} />
          ) : (
            <Text style={[
              styles.createButtonText,
              (!selectedUser || !messageText.trim()) && styles.disabledText
            ]}>
              Créer
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* User Search */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Destinataire</Text>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={Colors.light.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un utilisateur..."
              placeholderTextColor={Colors.light.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={Colors.light.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* User List */}
        <View style={styles.section}>
          {filteredUsers.length > 0 ? (
            <View style={styles.usersList}>
              {filteredUsers.map(renderUserItem)}
            </View>
          ) : (
            <View style={styles.emptyUsers}>
              <Text style={styles.emptyUsersText}>
                Aucun utilisateur trouvé pour "{searchQuery}"
              </Text>
            </View>
          )}
        </View>

        {/* Message Input */}
        {selectedUser && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Message à {selectedUser.name}
            </Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Tapez votre message..."
              placeholderTextColor={Colors.light.muted}
              value={messageText}
              onChangeText={setMessageText}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.characterCount}>
              {messageText.length}/1000
            </Text>
          </View>
        )}
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
  createButton: {
    padding: Spacing.xs,
  },
  createButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.primary,
  },
  disabledText: {
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.light.text,
    marginLeft: Spacing.sm,
    paddingVertical: 4,
  },
  usersList: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  selectedUserItem: {
    backgroundColor: Colors.light.card,
  },
  userAvatarContainer: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: Colors.light.background,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.light.success,
    borderWidth: 2,
    borderColor: Colors.light.background,
  },
  userName: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
  },
  selectedUserName: {
    color: Colors.light.primary,
  },
  emptyUsers: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyUsersText: {
    fontSize: FontSize.md,
    color: Colors.light.muted,
    textAlign: 'center',
  },
  messageInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
    height: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: FontSize.sm,
    color: Colors.light.muted,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
});