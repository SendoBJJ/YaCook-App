from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum
import uuid

class NotificationType(str, Enum):
    COMMENT = "comment"
    REPLY = "reply"
    MENTION = "mention"
    LIKE = "like"

class NotificationCreate(BaseModel):
    type: NotificationType
    entity_id: str = Field(..., description="ID of the related entity (post, comment, etc.)")
    from_user_id: str = Field(..., description="ID of the user who triggered the notification")
    to_user_id: str = Field(..., description="ID of the user receiving the notification")
    message: str = Field(..., description="Notification message in French")
    
class NotificationResponse(BaseModel):
    id: str
    type: NotificationType
    entity_id: str
    from_user_id: str
    from_user_name: str = Field(..., description="Name of the user who triggered the notification")
    from_user_avatar: Optional[str] = None
    to_user_id: str
    message: str
    read_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class NotificationList(BaseModel):
    notifications: List[NotificationResponse]
    total_count: int
    unread_count: int
    page: int
    per_page: int
    has_next: bool

class NotificationUpdate(BaseModel):
    read_at: Optional[datetime] = None

class NotificationMarkAllRead(BaseModel):
    read_at: datetime = Field(default_factory=lambda: datetime.utcnow())