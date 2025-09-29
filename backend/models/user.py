from pydantic import BaseModel, Field, validator
from typing import Optional, List
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

class AuthProvider(str, Enum):
    EMAIL = "email"
    GOOGLE = "google"
    APPLE = "apple"

class UserBase(BaseModel):
    email: str = Field(..., description="User email address")
    first_name: Optional[str] = Field(None, max_length=50, description="First name")
    last_name: Optional[str] = Field(None, max_length=50, description="Last name")
    display_name: Optional[str] = Field(None, max_length=100, description="Display name")
    avatar_url: Optional[str] = Field(None, description="Avatar image URL")
    language: str = Field(default="fr", description="Preferred language")
    timezone: Optional[str] = Field(None, description="User timezone")
    
    # Nutrition preferences
    daily_calorie_goal: Optional[int] = Field(None, ge=1000, le=5000, description="Daily calorie goal")
    dietary_restrictions: Optional[List[str]] = Field(default_factory=list, description="Dietary restrictions")
    allergens: Optional[List[str]] = Field(default_factory=list, description="User allergens")
    
    # Privacy settings
    profile_public: bool = Field(default=False, description="Public profile visibility")
    analytics_consent: bool = Field(default=False, description="Analytics consent")
    notifications_enabled: bool = Field(default=True, description="Push notifications enabled")

class UserCreate(UserBase):
    password: Optional[str] = Field(None, min_length=8, description="Password for email auth")
    auth_provider: AuthProvider = Field(default=AuthProvider.EMAIL, description="Authentication provider")
    provider_id: Optional[str] = Field(None, description="Provider-specific user ID")
    
    @validator('password')
    def validate_password(cls, v, values):
        auth_provider = values.get('auth_provider')
        if auth_provider == AuthProvider.EMAIL and not v:
            raise ValueError('Password required for email authentication')
        return v

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    language: Optional[str] = None
    timezone: Optional[str] = None
    daily_calorie_goal: Optional[int] = None
    dietary_restrictions: Optional[List[str]] = None
    allergens: Optional[List[str]] = None
    profile_public: Optional[bool] = None
    analytics_consent: Optional[bool] = None
    notifications_enabled: Optional[bool] = None

class UserInDB(UserBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    password_hash: Optional[str] = Field(None, description="Hashed password")
    auth_provider: AuthProvider = Field(default=AuthProvider.EMAIL)
    provider_id: Optional[str] = None
    email_verified: bool = Field(default=False)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class UserResponse(UserBase):
    id: str = Field(..., description="User ID")
    auth_provider: AuthProvider
    email_verified: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None

class UserLogin(BaseModel):
    email: str = Field(..., description="User email")
    password: str = Field(..., min_length=8, description="User password")

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[str] = None
    scopes: List[str] = Field(default_factory=list)

class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="Refresh token")

class PasswordResetRequest(BaseModel):
    email: str = Field(..., description="User email for password reset")

class PasswordReset(BaseModel):
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=8, description="New password")