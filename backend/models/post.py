from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from bson import ObjectId
from enum import Enum

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

class PostType(str, Enum):
    QUESTION = "question"
    RECIPE = "recipe"

class MediaType(str, Enum):
    IMAGE = "image"
    VIDEO = "video"

class PostMedia(BaseModel):
    type: MediaType = Field(..., description="Type de média")
    url: str = Field(..., description="URL du média")
    thumbnail_url: Optional[str] = Field(None, description="URL de la miniature")
    caption: Optional[str] = Field(None, max_length=200, description="Légende du média")
    duration: Optional[int] = Field(None, description="Durée en secondes pour les vidéos")

class PostBase(BaseModel):
    type: PostType = Field(..., description="Type de post")
    title: str = Field(..., min_length=5, max_length=150, description="Titre du post")
    body: str = Field(..., min_length=10, max_length=5000, description="Contenu du post")
    tags: List[str] = Field(default_factory=list, max_items=10, description="Tags du post")
    media: List[PostMedia] = Field(default_factory=list, max_items=5, description="Médias attachés")
    is_public: bool = Field(default=True, description="Post public ou privé")
    
class PostCreate(PostBase):
    pass

class PostUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    tags: Optional[List[str]] = None
    media: Optional[List[PostMedia]] = None
    is_public: Optional[bool] = None

class PostInDB(PostBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    author_id: PyObjectId = Field(..., description="ID de l'auteur")
    
    # Engagement metrics
    likes_count: int = Field(default=0, description="Nombre de likes")
    saves_count: int = Field(default=0, description="Nombre de sauvegardes")
    comments_count: int = Field(default=0, description="Nombre de commentaires")
    views_count: int = Field(default=0, description="Nombre de vues")
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class PostResponse(PostBase):
    id: str = Field(..., description="Post ID")
    author_id: str = Field(..., description="Author ID")
    author_name: Optional[str] = Field(None, description="Nom d'affichage de l'auteur")
    author_avatar: Optional[str] = Field(None, description="Avatar de l'auteur")
    
    likes_count: int
    saves_count: int
    comments_count: int
    views_count: int
    
    created_at: datetime
    updated_at: datetime
    
    # User-specific fields (if authenticated)
    is_liked: Optional[bool] = None
    is_saved: Optional[bool] = None
    is_following_author: Optional[bool] = None

class PostList(BaseModel):
    posts: List[PostResponse]
    total: int
    page: int
    per_page: int
    has_next: bool
    has_prev: bool