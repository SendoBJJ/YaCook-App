export interface Notification {
  id: string;
  type: 'comment' | 'reply' | 'mention' | 'like';
  entity_id: string;
  from_user_id: string;
  from_user_name: string;
  from_user_avatar?: string;
  to_user_id: string;
  message: string;
  read_at?: string;
  created_at: string;
}

export interface NotificationList {
  notifications: Notification[];
  total_count: number;
  unread_count: number;
  page: number;
  per_page: number;
  has_next: boolean;
}

export interface NotificationCounts {
  unread_count: number;
}

export interface MarkReadResponse {
  message: string;
  updated_count?: number;
}

export type NotificationSection = 'all' | 'mentions' | 'comments';

export interface NotificationFilters {
  section: NotificationSection;
  unread_only?: boolean;
}