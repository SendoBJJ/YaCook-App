#!/usr/bin/env python3
"""
Test MongoDB connection directly
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def test_connection():
    try:
        mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.getenv("DB_NAME", "yacook_database")
        
        print(f"Connecting to: {mongo_url}")
        print(f"Database: {db_name}")
        
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        # Test ping
        result = await client.admin.command('ping')
        print(f"Ping result: {result}")
        
        # Test database access
        print(f"Database object: {db}")
        print(f"Database name: {db.name}")
        
        # Test collection access
        users_collection = db.users
        print(f"Users collection: {users_collection}")
        
        # Test a simple query
        user_count = await users_collection.count_documents({})
        print(f"User count: {user_count}")
        
        # Test find_one
        existing_user = await users_collection.find_one({"email": "test@example.com"})
        print(f"Existing user: {existing_user}")
        
        # Test boolean evaluation
        if existing_user:
            print("User exists (boolean check worked)")
        else:
            print("No user found (boolean check worked)")
        
        client.close()
        print("Connection test successful!")
        
    except Exception as e:
        print(f"Connection test failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_connection())