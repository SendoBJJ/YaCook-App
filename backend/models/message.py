from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId

class MessageBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)
    to_user_id: str = Field(..., description="Recipient user ID")

class MessageCreate(MessageBase):
    pass

class MessageUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1, max_length=1000)
    read_at: Optional[datetime] = None

class MessageResponse(BaseModel):
    id: str
    content: str
    from_user_id: str
    from_user_name: str
    to_user_id: str
    to_user_name: str
    read_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda dt: dt.isoformat()
        }

class ConversationResponse(BaseModel):
    participant_id: str
    participant_name: str
    participant_avatar: Optional[str] = None
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    unread_count: int = 0
    is_online: bool = False

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }

class MessageList(BaseModel):
    messages: List[MessageResponse]
    total_count: int
    page: int
    per_page: int
    has_next: bool

class ConversationList(BaseModel):
    conversations: List[ConversationResponse]
    total_count: int