import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { Colors } from '../../../src/constants/Colors';
import { Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '../../../src/constants/Layout';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  timestamp: string;
  is_own: boolean;
}

// Mock conversation data
const mockMessages: Message[] = [
  {
    id: '1',
    content: 'Salut ! J\'ai vu ta recette de gratin, elle a l\'air délicieuse !',
    sender_id: 'user2',
    sender_name: 'Chef Marie',
    timestamp: '2024-01-15T10:30:00Z',
    is_own: false,
  },
  {
    id: '2',
    content: 'Merci beaucoup ! C\'est une recette de famille que je partage avec plaisir 😊',
    sender_id: 'user1',
    sender_name: 'Vous',
    timestamp: '2024-01-15T10:32:00Z',
    is_own: true,
  },
  {
    id: '3',
    content: 'Est-ce que tu peux me donner quelques conseils pour la cuisson ? Je ne veux pas rater !',
    sender_id: 'user2',
    sender_name: 'Chef Marie',
    timestamp: '2024-01-15T10:35:00Z',
    is_own: false,
  },
  {
    id: '4',
    content: 'Bien sûr ! Le secret c\'est de ne pas trop cuire les brocolis avant de les mettre dans le gratin. Ils doivent rester légèrement croquants.',
    sender_id: 'user1',
    sender_name: 'Vous',
    timestamp: '2024-01-15T10:38:00Z',
    is_own: true,
  },
  {
    id: '5',
    content: 'Et pour la béchamel, tu utilises du lait entier ou écrémé ?',
    sender_id: 'user2',
    sender_name: 'Chef Marie',
    timestamp: '2024-01-15T10:40:00Z',
    is_own: false,
  },
];

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [messages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');

  const formatMessageTime = (timestamp: string) => {
    const messageDate = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.abs(now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return messageDate.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return messageDate.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    
    // TODO: Implement actual message sending
    console.log('Sending message:', newMessage);
    setNewMessage('');
  };

  const renderMessage = (message: Message, index: number) => {
    const isLastInGroup = index === messages.length - 1 || 
      messages[index + 1]?.is_own !== message.is_own;

    return (
      <View key={message.id} style={[
        styles.messageContainer,
        message.is_own ? styles.ownMessageContainer : styles.otherMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          message.is_own ? styles.ownMessage : styles.otherMessage,
          isLastInGroup && (message.is_own ? styles.ownMessageLast : styles.otherMessageLast)
        ]}>
          <Text style={[
            styles.messageText,
            message.is_own ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {message.content}
          </Text>
        </View>
        {isLastInGroup && (
          <Text style={[
            styles.messageTime,
            message.is_own ? styles.ownMessageTime : styles.otherMessageTime
          ]}>
            {formatMessageTime(message.timestamp)}
          </Text>
        )}
      </View>
    );
  };

  const otherParticipant = 'Chef Marie'; // Would be dynamic based on conversation

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
        
        <View style={styles.headerInfo}>
          <View style={styles.participantAvatar}>
            <Text style={styles.avatarText}>
              {otherParticipant.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.participantName}>{otherParticipant}</Text>
            <Text style={styles.participantStatus}>En ligne</Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={20} color={Colors.light.muted} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView 
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(renderMessage)}
      </ScrollView>

      {/* Message Input */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.messageInput}
            placeholder="Tapez votre message..."
            placeholderTextColor={Colors.light.muted}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity 
            style={[styles.sendButton, !newMessage.trim() && styles.disabledSendButton]}
            onPress={sendMessage}
            disabled={!newMessage.trim()}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={newMessage.trim() ? Colors.light.background : Colors.light.muted} 
            />
          </TouchableOpacity>
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  backButton: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    color: Colors.light.background,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  headerText: {
    flex: 1,
  },
  participantName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  participantStatus: {
    fontSize: FontSize.sm,
    color: Colors.light.success,
    marginTop: 1,
  },
  moreButton: {
    padding: Spacing.sm,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: Spacing.md,
  },
  messageContainer: {
    marginVertical: 2,
    paddingHorizontal: Spacing.lg,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  ownMessage: {
    backgroundColor: Colors.light.primary,
  },
  otherMessage: {
    backgroundColor: Colors.light.card,
  },
  ownMessageLast: {
    borderBottomRightRadius: 4,
  },
  otherMessageLast: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: FontSize.md,
    lineHeight: 20,
  },
  ownMessageText: {
    color: Colors.light.background,
  },
  otherMessageText: {
    color: Colors.light.text,
  },
  messageTime: {
    fontSize: FontSize.xs,
    marginTop: 4,
    marginHorizontal: Spacing.md,
  },
  ownMessageTime: {
    color: Colors.light.muted,
    textAlign: 'right',
  },
  otherMessageTime: {
    color: Colors.light.muted,
    textAlign: 'left',
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  messageInput: {
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
    marginRight: Spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledSendButton: {
    backgroundColor: Colors.light.border,
  },
});