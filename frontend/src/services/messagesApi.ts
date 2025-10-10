import httpClient from '../utils/http';

// Types matching the backend response
export interface Message {
  id: string;
  content: string;
  from_user_id: string;
  from_user_name: string;
  to_user_id: string;
  to_user_name: string;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  participant_id: string;
  participant_name: string;
  participant_avatar?: string | null;
  last_message?: string | null;
  last_message_time?: string | null;
  unread_count: number;
  is_online: boolean;
}

export interface ConversationList {
  conversations: Conversation[];
  total_count: number;
}

export interface MessageList {
  messages: Message[];
  total_count: number;
  page: number;
  per_page: number;
  has_next: boolean;
}

export interface SendMessageData {
  content: string;
}

class MessagesApiService {
  async listConversations(): Promise<Conversation[]> {
    try {
      const response = await httpClient.get<ConversationList>('/conversations');
      return response.data.conversations;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw new Error('Erreur lors du chargement des conversations');
    }
  }

  async getThread(participantId: string, page: number = 1, perPage: number = 50): Promise<MessageList> {
    try {
      const response = await httpClient.get<MessageList>(`/conversations/${participantId}/messages`, {
        params: { page, per_page: perPage }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching thread:', error);
      throw new Error('Erreur lors du chargement des messages');
    }
  }

  async sendMessage(participantId: string, content: string): Promise<Message> {
    try {
      const response = await httpClient.post<Message>(`/conversations/${participantId}/messages`, {
        content
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Erreur lors de l\'envoi du message');
    }
  }

  // Utility method to convert backend conversation to frontend format
  convertConversationFormat(backendConversation: Conversation) {
    return {
      id: backendConversation.participant_id,
      name: backendConversation.participant_name,
      avatar: backendConversation.participant_avatar,
      lastMessage: backendConversation.last_message || '',
      lastMessageTime: this.formatTimeAgo(backendConversation.last_message_time),
      unreadCount: backendConversation.unread_count,
      isOnline: backendConversation.is_online,
    };
  }

  private formatTimeAgo(dateString?: string | null): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `${diffDays}j`;
    
    // For older messages, show formatted date
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short' 
    });
  }
}

export const messagesApi = new MessagesApiService();