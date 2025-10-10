from fastapi import FastAPI, HTTPException, Depends, status, BackgroundTasks, Request
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import uvicorn
import logging
import time
from datetime import datetime, timedelta
from typing import Optional, List

# Import services and models
from services.database_service import database_service
from services.auth_service import auth_service
from services.openfoodfacts_service import openfoodfacts_service
from services.ai_service import ai_service
from services.cloudinary_service import cloudinary_service, SignatureRequest, SignatureResponse
from services.notification_service import notification_service

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
from models.post import (
    PostCreate, PostUpdate, PostResponse, PostList, PostType
)
from models.comment import (
    CommentCreate, CommentUpdate, CommentResponse, CommentList
)
from models.shopping_list import (
    ShoppingItemCreate, ShoppingItemUpdate, ShoppingItemResponse,
    ShoppingListResponse, AddIngredientsToShoppingList
)
from models.notification import (
    NotificationCreate, NotificationResponse, NotificationList,
    NotificationUpdate, NotificationMarkAllRead
)
from models.message import (
    MessageCreate, MessageUpdate, MessageResponse, MessageList,
    ConversationResponse, ConversationList
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
        
        # Startup diagnostics
        logger.info("=" * 50)
        logger.info("YaCook API Startup Diagnostics")
        logger.info("=" * 50)
        
        # Check .env loading
        import os
        env_loaded = os.path.exists(".env")
        logger.info(f"📄 .env file loaded: {env_loaded}")
        
        # Log allowed origins (no secrets)
        allowed_origins = [
            "http://localhost:19006",
            "http://localhost:3000", 
            "https://app.yacook.app",
            "https://chef-companion-9.preview.emergentagent.com",
            "https://app.emergent.sh"
        ]
        logger.info(f"🌐 CORS allowed origins: {allowed_origins}")
        logger.info(f"🔗 CORS origin regex: r'https:\/\/.*\.(preview\.emergentagent\.com|trycloudflare\.com|railway\.app)$'")
        
        # Log API base path
        logger.info(f"🚀 API base path: /api")
        logger.info(f"✅ OPTIONS handler registered for all routes")
        
        logger.info("YaCook API started successfully")
        logger.info("=" * 50)
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

# CORS middleware - configured for Platform Router & Production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000", 
        "http://localhost:19006",
        "http://127.0.0.1:19006",
        "https://app.yacook.app",
    ],
    allow_origin_regex=r"https:\/\/.*\.preview\.emergentagent\.com$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],
    max_age=600,
)

# Generic OPTIONS handler for all routes to handle preflight requests
@app.options("/{full_path:path}")
async def options_handler(request: Request, full_path: str):
    """Handle OPTIONS requests for all routes."""
    origin = request.headers.get("origin", "")
    logger.debug(f"OPTIONS request - Origin: {origin}, Path: /{full_path}")
    return Response(status_code=204)

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

# Cloudinary media upload endpoints
@app.post("/api/media/signature", response_model=SignatureResponse)
async def generate_upload_signature(
    signature_request: SignatureRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate secure upload signature for Cloudinary EU region."""
    try:
        # Validate request parameters
        validation_errors = cloudinary_service.validate_upload_params(signature_request)
        if validation_errors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"errors": validation_errors}
            )
        
        # Add user context to signature request
        if not signature_request.context:
            signature_request.context = {}
        
        signature_request.context.update({
            "user_id": str(current_user["_id"]),
            "user_email": current_user.get("email", ""),
            "upload_timestamp": str(int(time.time()))
        })
        
        # Generate signature
        signature_response = cloudinary_service.generate_upload_signature(signature_request)
        
        logger.info(f"Generated upload signature for user {current_user['email']} in folder {signature_request.folder}")
        
        return signature_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating upload signature: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la génération de la signature d'upload"
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

# Posts endpoints
@app.get("/api/posts", response_model=PostList)
async def get_posts(
    page: int = 1,
    per_page: int = 20,
    post_type: Optional[PostType] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get posts feed."""
    try:
        db = database_service.get_database()
        skip = (page - 1) * per_page
        
        # Build filter
        filter_query = {"is_public": True}
        if post_type:
            filter_query["type"] = post_type.value
        
        # Get posts with pagination
        posts_cursor = db.posts.find(filter_query).sort("created_at", -1).skip(skip).limit(per_page)
        posts = await posts_cursor.to_list(length=per_page)
        
        # Get total count
        total = await db.posts.count_documents(filter_query)
        
        # Transform posts
        post_responses = []
        for post in posts:
            # Get author info
            author = await db.users.find_one({"_id": post["author_id"]})
            
            post_response = PostResponse(
                id=str(post["_id"]),
                author_id=str(post["author_id"]),
                author_name=author.get("display_name") or f"{author.get('first_name', '')} {author.get('last_name', '')}".strip(),
                author_avatar=author.get("avatar_url"),
                **{k: v for k, v in post.items() if k not in ["_id", "author_id"]}
            )
            post_responses.append(post_response)
        
        has_next = skip + per_page < total
        has_prev = page > 1
        
        return PostList(
            posts=post_responses,
            total=total,
            page=page,
            per_page=per_page,
            has_next=has_next,
            has_prev=has_prev
        )
        
    except Exception as e:
        logger.error(f"Error getting posts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la récupération des posts"
        )

@app.post("/api/posts", response_model=PostResponse)
async def create_post(
    post_data: PostCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create new post."""
    try:
        db = database_service.get_database()
        user_id = current_user["_id"]
        
        # Create post document
        post_dict = post_data.dict()
        post_dict.update({
            "author_id": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "likes_count": 0,
            "saves_count": 0,
            "comments_count": 0,
            "views_count": 0
        })
        
        # Insert post
        result = await db.posts.insert_one(post_dict)
        
        # Get created post with author info
        created_post = await db.posts.find_one({"_id": result.inserted_id})
        author = await db.users.find_one({"_id": user_id})
        
        return PostResponse(
            id=str(result.inserted_id),
            author_id=str(user_id),
            author_name=author.get("display_name") or f"{author.get('first_name', '')} {author.get('last_name', '')}".strip(),
            author_avatar=author.get("avatar_url"),
            **{k: v for k, v in created_post.items() if k not in ["_id", "author_id"]}
        )
        
    except Exception as e:
        logger.error(f"Error creating post: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la création du post"
        )

@app.get("/api/posts/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get single post by ID."""
    try:
        db = database_service.get_database()
        
        # Get post
        post = await db.posts.find_one({"_id": ObjectId(post_id)})
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post non trouvé"
            )
        
        # Increment view count
        await db.posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$inc": {"views_count": 1}}
        )
        
        # Get author info
        author = await db.users.find_one({"_id": post["author_id"]})
        
        return PostResponse(
            id=str(post["_id"]),
            author_id=str(post["author_id"]),
            author_name=author.get("display_name") or f"{author.get('first_name', '')} {author.get('last_name', '')}".strip(),
            author_avatar=author.get("avatar_url"),
            **{k: v for k, v in post.items() if k not in ["_id", "author_id"]}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting post {post_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la récupération du post"
        )

# Comments endpoints
@app.get("/api/posts/{post_id}/comments", response_model=CommentList)
async def get_post_comments(
    post_id: str,
    page: int = 1,
    per_page: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Get comments for a post."""
    try:
        db = database_service.get_database()
        skip = (page - 1) * per_page
        
        # Get comments for post
        comments_cursor = db.comments.find({
            "post_id": ObjectId(post_id),
            "parent_id": None,  # Only top-level comments
            "is_deleted": False
        }).sort("created_at", -1).skip(skip).limit(per_page)
        
        comments = await comments_cursor.to_list(length=per_page)
        total = await db.comments.count_documents({
            "post_id": ObjectId(post_id),
            "parent_id": None,
            "is_deleted": False
        })
        
        # Transform comments with author info
        comment_responses = []
        for comment in comments:
            author = await db.users.find_one({"_id": comment["author_id"]})
            
            comment_response = CommentResponse(
                id=str(comment["_id"]),
                body=comment["body"],
                post_id=str(comment["post_id"]),
                parent_id=str(comment["parent_id"]) if comment.get("parent_id") else None,
                author_id=str(comment["author_id"]),
                author_name=author.get("display_name") or f"{author.get('first_name', '')} {author.get('last_name', '')}".strip(),
                author_avatar=author.get("avatar_url"),
                likes_count=comment["likes_count"],
                replies_count=comment["replies_count"],
                is_deleted=comment["is_deleted"],
                created_at=comment["created_at"],
                updated_at=comment["updated_at"]
            )
            comment_responses.append(comment_response)
        
        has_next = skip + per_page < total
        has_prev = page > 1
        
        return CommentList(
            comments=comment_responses,
            total=total,
            page=page,
            per_page=per_page,
            has_next=has_next,
            has_prev=has_prev
        )
        
    except Exception as e:
        logger.error(f"Error getting comments for post {post_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la récupération des commentaires"
        )

@app.post("/api/posts/{post_id}/comments", response_model=CommentResponse)
async def create_comment(
    post_id: str,
    comment_data: CommentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create new comment."""
    try:
        db = database_service.get_database()
        user_id = current_user["_id"]
        
        # Verify post exists
        post = await db.posts.find_one({"_id": ObjectId(post_id)})
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post non trouvé"
            )
        
        # Create comment document
        comment_dict = comment_data.dict()
        comment_dict.update({
            "post_id": ObjectId(post_id),
            "author_id": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "likes_count": 0,
            "replies_count": 0,
            "is_deleted": False
        })
        
        # Insert comment
        result = await db.comments.insert_one(comment_dict)
        
        # Update post comment count
        await db.posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$inc": {"comments_count": 1}}
        )
        
        # Get created comment with author info
        created_comment = await db.comments.find_one({"_id": result.inserted_id})
        author = await db.users.find_one({"_id": user_id})
        
        # Create notification for post author (if not commenting on own post)
        post_author_id = str(post["author_id"])
        comment_author_id = str(user_id)
        comment_author_name = author.get("display_name") or f"{author.get('first_name', '')} {author.get('last_name', '')}".strip()
        post_title = post.get("title", "")[:50] + "..." if len(post.get("title", "")) > 50 else post.get("title", "")
        
        # Create notification in background (don't wait for it)
        try:
            await notification_service.create_comment_notification(
                post_id=post_id,
                post_author_id=post_author_id,
                comment_author_id=comment_author_id,
                comment_author_name=comment_author_name,
                post_title=post_title
            )
        except Exception as notification_error:
            logger.warning(f"Failed to create comment notification: {notification_error}")
        
        return CommentResponse(
            id=str(result.inserted_id),
            body=created_comment["body"],
            post_id=str(created_comment["post_id"]),
            parent_id=str(created_comment["parent_id"]) if created_comment.get("parent_id") else None,
            author_id=str(user_id),
            author_name=author.get("display_name") or f"{author.get('first_name', '')} {author.get('last_name', '')}".strip(),
            author_avatar=author.get("avatar_url"),
            likes_count=created_comment["likes_count"],
            replies_count=created_comment["replies_count"],
            is_deleted=created_comment["is_deleted"],
            created_at=created_comment["created_at"],
            updated_at=created_comment["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating comment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la création du commentaire"
        )

# Shopping List endpoints
@app.get("/api/shopping-list", response_model=ShoppingListResponse)
async def get_shopping_list(current_user: dict = Depends(get_current_user)):
    """Get user's shopping list."""
    try:
        db = database_service.get_database()
        user_id = current_user["_id"]
        
        # Get shopping items
        items_cursor = db.shopping_items.find({"user_id": user_id}).sort("created_at", -1)
        items = await items_cursor.to_list(length=None)
        
        # Group by section
        sections_dict = {}
        total_items = len(items)
        total_checked = 0
        
        for item in items:
            section_name = item["section"] 
            if section_name not in sections_dict:
                sections_dict[section_name] = {
                    "section": section_name,
                    "section_name": section_name.replace('_', ' ').title(),
                    "items": [],
                    "total_items": 0,
                    "checked_items": 0,
                    "is_expanded": True
                }
            
            item_response = ShoppingItemResponse(
                id=str(item["_id"]),
                user_id=str(item["user_id"]),
                recipe_id=str(item["recipe_id"]) if item.get("recipe_id") else None,
                **{k: v for k, v in item.items() if k not in ["_id", "user_id", "recipe_id"]}
            )
            
            sections_dict[section_name]["items"].append(item_response)
            sections_dict[section_name]["total_items"] += 1
            
            if item["is_checked"]:
                sections_dict[section_name]["checked_items"] += 1
                total_checked += 1
        
        # Convert to list
        sections = list(sections_dict.values())
        completion_percentage = (total_checked / total_items * 100) if total_items > 0 else 0
        
        return ShoppingListResponse(
            sections=sections,
            total_items=total_items,
            total_checked=total_checked,
            completion_percentage=completion_percentage,
            last_updated=datetime.utcnow() if items else None
        )
        
    except Exception as e:
        logger.error(f"Error getting shopping list: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la récupération de la liste de courses"
        )

@app.post("/api/shopping-list/items", response_model=ShoppingItemResponse)
async def add_shopping_item(
    item_data: ShoppingItemCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add item to shopping list."""
    try:
        db = database_service.get_database()
        user_id = current_user["_id"]
        
        # Create item document
        item_dict = item_data.dict()
        item_dict.update({
            "user_id": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
        
        # Insert item
        result = await db.shopping_items.insert_one(item_dict)
        
        # Get created item
        created_item = await db.shopping_items.find_one({"_id": result.inserted_id})
        
        return ShoppingItemResponse(
            id=str(result.inserted_id),
            user_id=str(user_id),
            recipe_id=str(created_item["recipe_id"]) if created_item.get("recipe_id") else None,
            **{k: v for k, v in created_item.items() if k not in ["_id", "user_id", "recipe_id"]}
        )
        
    except Exception as e:
        logger.error(f"Error adding shopping item: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de l'ajout de l'article"
        )

@app.put("/api/shopping-list/items/{item_id}", response_model=ShoppingItemResponse)
async def update_shopping_item(
    item_id: str,
    item_update: ShoppingItemUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update shopping list item."""
    try:
        db = database_service.get_database()
        user_id = current_user["_id"]
        
        # Prepare update data
        update_data = {k: v for k, v in item_update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        # Update item
        result = await db.shopping_items.update_one(
            {"_id": ObjectId(item_id), "user_id": user_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Article non trouvé"
            )
        
        # Get updated item
        updated_item = await db.shopping_items.find_one({"_id": ObjectId(item_id)})
        
        return ShoppingItemResponse(
            id=str(item_id),
            user_id=str(user_id),
            recipe_id=str(updated_item["recipe_id"]) if updated_item.get("recipe_id") else None,
            **{k: v for k, v in updated_item.items() if k not in ["_id", "user_id", "recipe_id"]}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating shopping item: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la mise à jour de l'article"
        )

# ============================================================================
# NOTIFICATION ENDPOINTS
# ============================================================================

@app.get("/api/notifications", response_model=NotificationList)
async def get_user_notifications(
    page: int = 1,
    per_page: int = 20,
    unread_only: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Get notifications for the authenticated user."""
    try:
        user_id = str(current_user["_id"])
        return await notification_service.get_user_notifications(
            user_id=user_id,
            page=page,
            per_page=per_page,
            unread_only=unread_only
        )
        
    except Exception as e:
        logger.error(f"Error getting notifications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la récupération des notifications"
        )

@app.put("/api/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark a specific notification as read."""
    try:
        user_id = str(current_user["_id"])
        success = await notification_service.mark_notification_read(
            notification_id=notification_id,
            user_id=user_id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification non trouvée"
            )
            
        return {"message": "Notification marquée comme lue"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification read: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la mise à jour de la notification"
        )

@app.put("/api/notifications/mark-all-read")
async def mark_all_notifications_read(
    current_user: dict = Depends(get_current_user)
):
    """Mark all notifications as read for the authenticated user."""
    try:
        user_id = str(current_user["_id"])
        updated_count = await notification_service.mark_all_notifications_read(user_id)
        
        return {
            "message": f"{updated_count} notifications marquées comme lues",
            "updated_count": updated_count
        }
        
    except Exception as e:
        logger.error(f"Error marking all notifications read: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la mise à jour des notifications"
        )

@app.get("/api/notifications/unread-count")
async def get_unread_notifications_count(
    current_user: dict = Depends(get_current_user)
):
    """Get the count of unread notifications for the authenticated user."""
    try:
        user_id = str(current_user["_id"])
        unread_count = await notification_service.get_unread_count(user_id)
        
        return {"unread_count": unread_count}
        
    except Exception as e:
        logger.error(f"Error getting unread count: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la récupération du nombre de notifications"
        )

# Messages/Chat endpoints
@app.get("/api/conversations", response_model=ConversationList)
async def get_conversations(
    current_user: dict = Depends(get_current_user)
):
    """Get user's conversations list."""
    try:
        user_id = current_user["sub"]
        
        # Get conversations from messages collection
        pipeline = [
            {
                "$match": {
                    "$or": [
                        {"from_user_id": ObjectId(user_id)},
                        {"to_user_id": ObjectId(user_id)}
                    ]
                }
            },
            {
                "$sort": {"created_at": -1}
            },
            {
                "$group": {
                    "_id": {
                        "$cond": [
                            {"$eq": ["$from_user_id", ObjectId(user_id)]},
                            "$to_user_id",
                            "$from_user_id"
                        ]
                    },
                    "last_message": {"$first": "$content"},
                    "last_message_time": {"$first": "$created_at"},
                    "unread_count": {
                        "$sum": {
                            "$cond": [
                                {
                                    "$and": [
                                        {"$eq": ["$to_user_id", ObjectId(user_id)]},
                                        {"$eq": ["$read_at", None]}
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {
                "$lookup": {
                    "from": "users",
                    "localField": "_id",
                    "foreignField": "_id",
                    "as": "participant"
                }
            },
            {
                "$unwind": "$participant"
            }
        ]
        
        conversations_data = await database_service.database["messages"].aggregate(pipeline).to_list(None)
        
        conversations = []
        for conv in conversations_data:
            participant = conv["participant"]
            participant_name = f"{participant.get('first_name', '')} {participant.get('last_name', '')}".strip()
            if not participant_name:
                participant_name = participant.get('display_name', participant.get('email', 'Utilisateur'))
            
            conversations.append(ConversationResponse(
                participant_id=str(conv["_id"]),
                participant_name=participant_name,
                participant_avatar=participant.get("avatar_url"),
                last_message=conv["last_message"],
                last_message_time=conv["last_message_time"],
                unread_count=conv["unread_count"],
                is_online=False  # TODO: Implement online status
            ))
        
        return ConversationList(
            conversations=conversations,
            total_count=len(conversations)
        )
        
    except Exception as e:
        logger.error(f"Error getting conversations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la récupération des conversations"
        )

@app.get("/api/conversations/{participant_id}/messages", response_model=MessageList)
async def get_conversation_messages(
    participant_id: str,
    page: int = 1,
    per_page: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get messages in a conversation."""
    try:
        user_id = current_user["sub"]
        
        # Validate participant exists
        participant = await database_service.database["users"].find_one({"_id": ObjectId(participant_id)})
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouvé"
            )
        
        skip = (page - 1) * per_page
        
        # Get messages between users
        messages_data = await database_service.database["messages"].find({
            "$or": [
                {"from_user_id": ObjectId(user_id), "to_user_id": ObjectId(participant_id)},
                {"from_user_id": ObjectId(participant_id), "to_user_id": ObjectId(user_id)}
            ]
        }).sort("created_at", -1).skip(skip).limit(per_page).to_list(None)
        
        # Get total count
        total_count = await database_service.database["messages"].count_documents({
            "$or": [
                {"from_user_id": ObjectId(user_id), "to_user_id": ObjectId(participant_id)},
                {"from_user_id": ObjectId(participant_id), "to_user_id": ObjectId(user_id)}
            ]
        })
        
        # Get user info for message responses
        from_user = await database_service.database["users"].find_one({"_id": ObjectId(user_id)})
        from_user_name = f"{from_user.get('first_name', '')} {from_user.get('last_name', '')}".strip()
        if not from_user_name:
            from_user_name = from_user.get('display_name', from_user.get('email', 'Vous'))
            
        participant_name = f"{participant.get('first_name', '')} {participant.get('last_name', '')}".strip()
        if not participant_name:
            participant_name = participant.get('display_name', participant.get('email', 'Utilisateur'))
        
        messages = []
        for msg in messages_data:
            is_from_current_user = str(msg["from_user_id"]) == user_id
            
            messages.append(MessageResponse(
                id=str(msg["_id"]),
                content=msg["content"],
                from_user_id=str(msg["from_user_id"]),
                from_user_name=from_user_name if is_from_current_user else participant_name,
                to_user_id=str(msg["to_user_id"]),
                to_user_name=participant_name if is_from_current_user else from_user_name,
                read_at=msg.get("read_at"),
                created_at=msg["created_at"],
                updated_at=msg["updated_at"]
            ))
        
        # Mark messages as read (messages TO current user from participant)
        await database_service.database["messages"].update_many(
            {
                "from_user_id": ObjectId(participant_id),
                "to_user_id": ObjectId(user_id),
                "read_at": None
            },
            {
                "$set": {
                    "read_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return MessageList(
            messages=messages,
            total_count=total_count,
            page=page,
            per_page=per_page,
            has_next=skip + len(messages) < total_count
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversation messages: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la récupération des messages"
        )

@app.post("/api/conversations/{participant_id}/messages", response_model=MessageResponse)
async def send_message(
    participant_id: str,
    message_data: MessageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Send a message to a user."""
    try:
        user_id = current_user["sub"]
        
        # Validate participant exists
        participant = await database_service.database["users"].find_one({"_id": ObjectId(participant_id)})
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouvé"
            )
        
        # Prevent sending messages to self
        if participant_id == user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Impossible d'envoyer un message à soi-même"
            )
        
        # Create message document
        message_doc = {
            "content": message_data.content,
            "from_user_id": ObjectId(user_id),
            "to_user_id": ObjectId(participant_id),
            "read_at": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert message
        result = await database_service.database["messages"].insert_one(message_doc)
        
        # Get user info for response
        from_user = await database_service.database["users"].find_one({"_id": ObjectId(user_id)})
        from_user_name = f"{from_user.get('first_name', '')} {from_user.get('last_name', '')}".strip()
        if not from_user_name:
            from_user_name = from_user.get('display_name', from_user.get('email', 'Vous'))
            
        participant_name = f"{participant.get('first_name', '')} {participant.get('last_name', '')}".strip()
        if not participant_name:
            participant_name = participant.get('display_name', participant.get('email', 'Utilisateur'))
        
        return MessageResponse(
            id=str(result.inserted_id),
            content=message_data.content,
            from_user_id=user_id,
            from_user_name=from_user_name,
            to_user_id=participant_id,
            to_user_name=participant_name,
            read_at=None,
            created_at=message_doc["created_at"],
            updated_at=message_doc["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de l'envoi du message"
        )

if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8001,
        reload=True
    )