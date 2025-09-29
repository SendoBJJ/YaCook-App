from dotenv import load_dotenv
import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import ConnectionFailure
import logging
from typing import Optional

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class DatabaseService:
    """Database connection and management service."""
    
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.database: Optional[AsyncIOMotorDatabase] = None
        self.db_name = os.getenv("DB_NAME", "yacook_database")
        self.mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    
    async def connect(self):
        """Connect to MongoDB database."""
        try:
            self.client = AsyncIOMotorClient(
                self.mongo_url,
                maxPoolSize=10,
                minPoolSize=1,
                maxIdleTimeMS=30000,
                waitQueueTimeoutMS=5000,
                connectTimeoutMS=10000,
                socketTimeoutMS=20000,
                serverSelectionTimeoutMS=5000
            )
            
            # Test connection
            await self.client.admin.command('ping')
            self.database = self.client[self.db_name]
            
            # Create indexes
            await self._create_indexes()
            
            logger.info(f"Connected to MongoDB database: {self.db_name}")
            
        except ConnectionFailure as e:
            logger.error(f"Failed to connect to MongoDB: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Database connection error: {str(e)}")
            raise
    
    async def disconnect(self):
        """Close database connection."""
        if self.client:
            self.client.close()
            logger.info("Disconnected from MongoDB")
    
    async def _create_indexes(self):
        """Create necessary database indexes."""
        try:
            # User collection indexes
            await self.database.users.create_index("email", unique=True)
            await self.database.users.create_index("auth_provider")
            await self.database.users.create_index("provider_id")
            await self.database.users.create_index("created_at")
            
            # Recipe collection indexes
            await self.database.recipes.create_index("author_id")
            await self.database.recipes.create_index("is_public")
            await self.database.recipes.create_index("featured")
            await self.database.recipes.create_index("created_at")
            await self.database.recipes.create_index("tags")
            await self.database.recipes.create_index("meal_types")
            await self.database.recipes.create_index("difficulty")
            
            # Product cache with TTL (30 days = 2592000 seconds)
            await self.database.products_cache.create_index(
                "cached_at", 
                expireAfterSeconds=2592000
            )
            await self.database.products_cache.create_index(
                "barcode", 
                unique=True
            )
            await self.database.products_cache.create_index(
                [("barcode", 1), ("language", 1)]
            )
            
            # Posts collection indexes
            await self.database.posts.create_index("author_id")
            await self.database.posts.create_index("created_at")
            await self.database.posts.create_index("is_public")
            
            # Messages collection indexes
            await self.database.messages.create_index(
                [("sender_id", 1), ("recipient_id", 1), ("created_at", -1)]
            )
            await self.database.messages.create_index("conversation_id")
            
            # Sessions with TTL (30 days)
            await self.database.sessions.create_index(
                "expires_at", 
                expireAfterSeconds=0
            )
            await self.database.sessions.create_index("user_id")
            
            logger.info("Database indexes created successfully")
            
        except Exception as e:
            logger.error(f"Error creating indexes: {str(e)}")
            raise
    
    def get_database(self) -> AsyncIOMotorDatabase:
        """Get database instance."""
        if self.database is None:
            raise RuntimeError("Database not connected. Call connect() first.")
        return self.database

# Global database service instance
database_service = DatabaseService()