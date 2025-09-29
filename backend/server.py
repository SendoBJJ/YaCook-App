from fastapi import FastAPI, HTTPException, Depends, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import uvicorn
import logging
from datetime import datetime, timedelta
from typing import Optional, List

# Import services and models
from services.database_service import database_service
from services.auth_service import auth_service
from services.openfoodfacts_service import openfoodfacts_service
from services.ai_service import ai_service

# Import models
from models.user import (
    UserCreate, UserUpdate, UserResponse, UserLogin, Token, 
    RefreshTokenRequest, AuthProvider
)
from models.recipe import (
    RecipeCreate, RecipeUpdate, RecipeResponse, RecipeList
)
from models.product import (
    ProductResponse, ProductNotFound, ProductSearch, ProductSearchResponse
)

# Import JWT utilities
from jose import JWTError, jwt
from dotenv import load_dotenv
from bson import ObjectId
import os

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

# Security
security = HTTPBearer()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management."""
    # Startup
    try:
        await database_service.connect()
        logger.info("YaCook API started successfully")
    except Exception as e:
        logger.error(f"Failed to start application: {str(e)}")
        raise
    
    yield
    
    # Shutdown
    await database_service.disconnect()
    logger.info("YaCook API shut down")

# Create FastAPI app
app = FastAPI(
    title="YaCook API",
    description="API pour l'application YaCook - Planification de repas et recettes",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://localhost:3000", 
        "exp://localhost:19000",
        "https://meal-app-preview.preview.emergentagent.com",
        "https://app.emergent.sh"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)

# JWT Helper Functions
def create_access_token(data: dict) -> str:
    """Create access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: dict) -> str:
    """Create refresh token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get current authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if user_id is None or token_type != "access":
            raise credentials_exception
            
        # Get user from database
        db = database_service.get_database()
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        
        if user is None:
            raise credentials_exception
            
        return user
        
    except JWTError:
        raise credentials_exception

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "YaCook API", 
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

# Health check
@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    try:
        # Test database connection
        db = database_service.get_database()
        await db.command("ping")
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "database": "connected",
                "api": "running"
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service unhealthy: {str(e)}"
        )

# Authentication endpoints
@app.post("/api/auth/register", response_model=Token)
async def register(user_data: UserCreate, background_tasks: BackgroundTasks):
    """Register new user."""
    try:
        db = database_service.get_database()
        
        # Check if user already exists
        existing_user = await db.users.find_one({"email": user_data.email.lower()})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Un utilisateur avec cet email existe déjà"
            )
        
        # Hash password if email auth
        password_hash = None
        if user_data.auth_provider == AuthProvider.EMAIL and user_data.password:
            password_hash = auth_service.hash_password(user_data.password)
        
        # Create user document
        user_dict = user_data.dict(exclude={"password"})
        user_dict.update({
            "email": user_data.email.lower(),
            "password_hash": password_hash,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "is_active": True,
            "email_verified": user_data.auth_provider != AuthProvider.EMAIL  # Auto-verify OAuth
        })
        
        # Insert user
        result = await db.users.insert_one(user_dict)
        user_id = str(result.inserted_id)
        
        # Create tokens
        access_token = create_access_token({"sub": user_id})
        refresh_token = create_refresh_token({"sub": user_id})
        
        # Get created user for response
        created_user = await db.users.find_one({"_id": result.inserted_id})
        user_response = UserResponse(
            id=user_id,
            **{k: v for k, v in created_user.items() if k != "_id" and k != "password_hash"}
        )
        
        # Update last login
        await db.users.update_one(
            {"_id": result.inserted_id},
            {"$set": {"last_login": datetime.utcnow()}}
        )
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=user_response
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de l'inscription"
        )

@app.post("/api/auth/login", response_model=Token)
async def login(user_credentials: UserLogin):
    """Login user."""
    try:
        db = database_service.get_database()
        
        # Find user by email
        user = await db.users.find_one({"email": user_credentials.email.lower()})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou mot de passe incorrect"
            )
        
        # Verify password
        if not user.get("password_hash") or not auth_service.verify_password(
            user_credentials.password, 
            user["password_hash"]
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou mot de passe incorrect"
            )
        
        # Check if user is active
        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Compte désactivé"
            )
        
        user_id = str(user["_id"])
        
        # Create tokens
        access_token = create_access_token({"sub": user_id})
        refresh_token = create_refresh_token({"sub": user_id})
        
        # Update last login
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": datetime.utcnow()}}
        )
        
        # Create user response
        user_response = UserResponse(
            id=user_id,
            **{k: v for k, v in user.items() if k != "_id" and k != "password_hash"}
        )
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=user_response
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la connexion"
        )

# Product/Barcode endpoints
@app.get("/api/products/{barcode}", response_model=ProductResponse)
async def get_product(barcode: str, language: str = "fr"):
    """Get product information by barcode."""
    try:
        async with openfoodfacts_service as service:
            result = await service.get_product_by_barcode(barcode, language)
            return result
            
    except Exception as e:
        logger.error(f"Error getting product {barcode}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la récupération du produit"
        )

# AI Recipe Generation endpoint
@app.post("/api/ai/generate-recipe")
async def generate_recipe(
    ingredients: Optional[List[str]] = None,
    cuisine_type: Optional[str] = None,
    difficulty: Optional[str] = "moyen",
    prep_time: Optional[int] = None,
    dietary_restrictions: Optional[List[str]] = None,
    current_user: dict = Depends(get_current_user)
):
    """Generate recipe using AI."""
    try:
        user_id = str(current_user["_id"])
        
        recipe_data = await ai_service.generate_recipe(
            ingredients=ingredients,
            cuisine_type=cuisine_type,
            difficulty=difficulty,
            prep_time=prep_time,
            dietary_restrictions=dietary_restrictions,
            user_id=user_id
        )
        
        if not recipe_data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Échec de la génération de recette"
            )
        
        return {
            "success": True,
            "recipe": recipe_data,
            "message": "Recette générée avec succès"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating recipe: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la génération de recette"
        )

# AI Meal Planning endpoint
@app.post("/api/ai/generate-meal-plan")
async def generate_meal_plan(
    days: int = 7,
    daily_calories: Optional[int] = None,
    dietary_restrictions: Optional[List[str]] = None,
    current_user: dict = Depends(get_current_user)
):
    """Generate meal plan using AI."""
    try:
        user_id = str(current_user["_id"])
        
        # Get user preferences from database
        user_data = current_user
        meal_preferences = {
            "daily_calorie_goal": user_data.get("daily_calorie_goal", daily_calories),
            "dietary_restrictions": user_data.get("dietary_restrictions", dietary_restrictions or [])
        }
        
        meal_plan = await ai_service.generate_meal_plan(
            days=days,
            daily_calories=meal_preferences["daily_calorie_goal"],
            dietary_restrictions=meal_preferences["dietary_restrictions"],
            user_id=user_id
        )
        
        if not meal_plan:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Échec de la génération du plan de repas"
            )
        
        return {
            "success": True,
            "meal_plan": meal_plan,
            "message": "Plan de repas généré avec succès"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating meal plan: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la génération du plan de repas"
        )

# User profile endpoints
@app.get("/api/users/me", response_model=UserResponse)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """Get current user profile."""
    user_id = str(current_user["_id"])
    return UserResponse(
        id=user_id,
        **{k: v for k, v in current_user.items() if k != "_id" and k != "password_hash"}
    )

@app.put("/api/users/me", response_model=UserResponse)
async def update_user_profile(
    user_update: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update user profile."""
    try:
        db = database_service.get_database()
        user_id = current_user["_id"]
        
        # Prepare update data
        update_data = {k: v for k, v in user_update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        # Update user
        await db.users.update_one(
            {"_id": user_id},
            {"$set": update_data}
        )
        
        # Get updated user
        updated_user = await db.users.find_one({"_id": user_id})
        
        return UserResponse(
            id=str(user_id),
            **{k: v for k, v in updated_user.items() if k != "_id" and k != "password_hash"}
        )
        
    except Exception as e:
        logger.error(f"Error updating user profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la mise à jour du profil"
        )

if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8001,
        reload=True
    )