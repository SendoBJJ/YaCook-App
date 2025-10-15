#!/usr/bin/env python3
"""
Script to create premium test users for YaCook
"""
import asyncio
import sys
from datetime import datetime, timedelta
from dotenv import load_dotenv
load_dotenv()

from services.database_service import DatabaseService
from services.auth_service import AuthService
from models.user import UserPlan

async def create_premium_user():
    """Create a premium test user"""
    db_service = DatabaseService()
    auth_service = AuthService()
    
    # Connect to database
    db = db_service.get_database()
    
    # Premium user credentials
    premium_email = "test.premium@yacook.fr"
    premium_password = "PremiumPass123!"
    
    # Check if premium user already exists
    existing = await db.users.find_one({"email": premium_email})
    
    if existing:
        # Update existing user to premium
        print(f"✅ User {premium_email} already exists, updating to premium...")
        result = await db.users.update_one(
            {"email": premium_email},
            {
                "$set": {
                    "plan": UserPlan.PREMIUM.value,
                    "premium_until": None,  # Lifetime premium for testing
                    "updated_at": datetime.utcnow()
                }
            }
        )
        print(f"✅ Updated {result.modified_count} user to premium")
    else:
        # Create new premium user
        print(f"✅ Creating new premium user: {premium_email}")
        password_hash = auth_service.hash_password(premium_password)
        
        premium_user = {
            "email": premium_email,
            "password_hash": password_hash,
            "first_name": "Premium",
            "last_name": "User",
            "display_name": "Premium Tester",
            "auth_provider": "email",
            "email_verified": True,
            "is_active": True,
            "language": "fr",
            "plan": UserPlan.PREMIUM.value,
            "premium_until": None,  # Lifetime premium for testing
            "profile_public": False,
            "analytics_consent": False,
            "notifications_enabled": True,
            "dietary_restrictions": [],
            "allergens": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db.users.insert_one(premium_user)
        print(f"✅ Created premium user with ID: {result.inserted_id}")
    
    # Also update existing test.auth@yacook.fr user to have plan field (default free)
    existing_test = await db.users.find_one({"email": "test.auth@yacook.fr"})
    if existing_test and "plan" not in existing_test:
        print(f"✅ Updating test.auth@yacook.fr to have plan field...")
        await db.users.update_one(
            {"email": "test.auth@yacook.fr"},
            {
                "$set": {
                    "plan": UserPlan.FREE.value,
                    "premium_until": None,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        print(f"✅ Updated test.auth@yacook.fr to FREE plan")
    
    print("\n" + "=" * 80)
    print("🎉 PREMIUM USER SETUP COMPLETE!")
    print("=" * 80)
    print(f"\n📧 Premium User Credentials:")
    print(f"   Email: {premium_email}")
    print(f"   Password: {premium_password}")
    print(f"   Plan: PREMIUM (lifetime)")
    print(f"\n📧 Free User Credentials:")
    print(f"   Email: test.auth@yacook.fr")
    print(f"   Password: TestPassword123!")
    print(f"   Plan: FREE")
    print("\n" + "=" * 80)

if __name__ == "__main__":
    asyncio.run(create_premium_user())
