from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")
        return field_schema

class CommentBase(BaseModel):
    body: str = Field(..., min_length=1, max_length=1000, description="Contenu du commentaire")
    post_id: PyObjectId = Field(..., description="ID du post")
    parent_id: Optional[PyObjectId] = Field(None, description="ID du commentaire parent pour les réponses")

class CommentCreate(CommentBase):
    pass

class CommentUpdate(BaseModel):
    body: Optional[str] = None

class CommentInDB(CommentBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    author_id: PyObjectId = Field(..., description="ID de l'auteur")
    
    # Engagement metrics
    likes_count: int = Field(default=0, description="Nombre de likes")
    replies_count: int = Field(default=0, description="Nombre de réponses")
    
    # Status
    is_deleted: bool = Field(default=False, description="Commentaire supprimé")
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class CommentResponse(CommentBase):
    id: str = Field(..., description="Comment ID")
    author_id: str = Field(..., description="Author ID")
    author_name: Optional[str] = Field(None, description="Nom d'affichage de l'auteur")
    author_avatar: Optional[str] = Field(None, description="Avatar de l'auteur")
    
    likes_count: int
    replies_count: int
    is_deleted: bool
    
    created_at: datetime
    updated_at: datetime
    
    # User-specific fields (if authenticated)
    is_liked: Optional[bool] = None
    
    # Nested replies for threaded display
    replies: Optional[List['CommentResponse']] = None

class CommentList(BaseModel):
    comments: List[CommentResponse]
    total: int
    page: int
    per_page: int
    has_next: bool
    has_prev: bool