import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from bson import ObjectId

from services.database_service import database_service
from models.notification import (
    NotificationCreate, 
    NotificationResponse, 
    NotificationList,
    NotificationType
)

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self):
        self.db = None
        
    def get_database(self):
        """Get database connection (lazy initialization)."""
        if self.db is None:
            self.db = database_service.get_database()
        return self.db
        
    async def create_notification(
        self, 
        notification_data: NotificationCreate,
        from_user_name: str,
        from_user_avatar: Optional[str] = None
    ) -> Optional[NotificationResponse]:
        """Create a new notification."""
        try:
            # Don't create notification if user is notifying themselves
            if notification_data.from_user_id == notification_data.to_user_id:
                return None
                
            # Create notification document
            notification_doc = {
                "id": str(uuid.uuid4()),
                "type": notification_data.type.value,
                "entity_id": notification_data.entity_id,
                "from_user_id": notification_data.from_user_id,
                "from_user_name": from_user_name,
                "from_user_avatar": from_user_avatar,
                "to_user_id": notification_data.to_user_id,
                "message": notification_data.message,
                "read_at": None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Insert into database
            db = self.get_database()
            result = await db.notifications.insert_one(notification_doc)
            
            if result.inserted_id:
                logger.info(f"Created notification {notification_doc['id']} for user {notification_data.to_user_id}")
                return NotificationResponse(**notification_doc)
            
            return None
            
        except Exception as e:
            logger.error(f"Error creating notification: {str(e)}")
            return None
            
    async def get_user_notifications(
        self,
        user_id: str,
        page: int = 1,
        per_page: int = 20,
        unread_only: bool = False
    ) -> NotificationList:
        """Get notifications for a specific user."""
        try:
            # Build filter
            filter_dict = {"to_user_id": user_id}
            if unread_only:
                filter_dict["read_at"] = None
                
            # Calculate skip
            skip = (page - 1) * per_page
            
            # Get database connection
            db = self.get_database()
            
            # Get total count
            total_count = await db.notifications.count_documents(filter_dict)
            
            # Get unread count
            unread_count = await db.notifications.count_documents({
                "to_user_id": user_id,
                "read_at": None
            })
            
            # Get notifications
            cursor = db.notifications.find(filter_dict).sort("created_at", -1).skip(skip).limit(per_page)
            notifications = await cursor.to_list(length=per_page)
            
            # Convert to response models
            notification_responses = []
            for notification in notifications:
                # Parse datetime strings back to datetime objects
                if isinstance(notification.get('created_at'), str):
                    notification['created_at'] = datetime.fromisoformat(notification['created_at'].replace('Z', '+00:00'))
                if notification.get('read_at') and isinstance(notification['read_at'], str):
                    notification['read_at'] = datetime.fromisoformat(notification['read_at'].replace('Z', '+00:00'))
                    
                notification_responses.append(NotificationResponse(**notification))
            
            has_next = skip + per_page < total_count
            
            return NotificationList(
                notifications=notification_responses,
                total_count=total_count,
                unread_count=unread_count,
                page=page,
                per_page=per_page,
                has_next=has_next
            )
            
        except Exception as e:
            logger.error(f"Error getting user notifications: {str(e)}")
            return NotificationList(
                notifications=[],
                total_count=0,
                unread_count=0,
                page=page,
                per_page=per_page,
                has_next=False
            )
            
    async def mark_notification_read(
        self,
        notification_id: str,
        user_id: str
    ) -> bool:
        """Mark a specific notification as read."""
        try:
            result = await self.db.notifications.update_one(
                {
                    "id": notification_id,
                    "to_user_id": user_id,
                    "read_at": None
                },
                {
                    "$set": {
                        "read_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error marking notification read: {str(e)}")
            return False
            
    async def mark_all_notifications_read(self, user_id: str) -> int:
        """Mark all notifications as read for a user."""
        try:
            result = await self.db.notifications.update_many(
                {
                    "to_user_id": user_id,
                    "read_at": None
                },
                {
                    "$set": {
                        "read_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            return result.modified_count
            
        except Exception as e:
            logger.error(f"Error marking all notifications read: {str(e)}")
            return 0
            
    async def get_unread_count(self, user_id: str) -> int:
        """Get the count of unread notifications for a user."""
        try:
            count = await self.db.notifications.count_documents({
                "to_user_id": user_id,
                "read_at": None
            })
            return count
            
        except Exception as e:
            logger.error(f"Error getting unread count: {str(e)}")
            return 0
            
    async def create_comment_notification(
        self,
        post_id: str,
        post_author_id: str,
        comment_author_id: str,
        comment_author_name: str,
        post_title: str
    ):
        """Helper to create comment notifications."""
        if post_author_id != comment_author_id:  # Don't notify self
            notification = NotificationCreate(
                type=NotificationType.COMMENT,
                entity_id=post_id,
                from_user_id=comment_author_id,
                to_user_id=post_author_id,
                message=f"{comment_author_name} a commenté votre publication \"{post_title}\""
            )
            
            await self.create_notification(
                notification,
                comment_author_name
            )
            
    async def create_reply_notification(
        self,
        comment_id: str,
        original_comment_author_id: str,
        reply_author_id: str,
        reply_author_name: str,
        post_title: str
    ):
        """Helper to create reply notifications."""
        if original_comment_author_id != reply_author_id:  # Don't notify self
            notification = NotificationCreate(
                type=NotificationType.REPLY,
                entity_id=comment_id,
                from_user_id=reply_author_id,
                to_user_id=original_comment_author_id,
                message=f"{reply_author_name} a répondu à votre commentaire dans \"{post_title}\""
            )
            
            await self.create_notification(
                notification,
                reply_author_name
            )

# Create global notification service instance
notification_service = NotificationService()