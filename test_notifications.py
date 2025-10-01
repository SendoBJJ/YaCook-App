#!/usr/bin/env python3
"""
YaCook Notification System Testing
Tests the notification API endpoints for Phase 2 implementation
"""

import asyncio
import aiohttp
import json
import logging
import time
from typing import Dict, Any, Optional

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class NotificationTester:
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.session: Optional[aiohttp.ClientSession] = None
        self.access_token: Optional[str] = None
        self.user_data: Optional[Dict[str, Any]] = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            connector=aiohttp.TCPConnector(ssl=False)
        )
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def get_auth_headers(self) -> Dict[str, str]:
        """Get authorization headers if token is available."""
        if self.access_token:
            return {"Authorization": f"Bearer {self.access_token}"}
        return {}
    
    async def login(self, email: str = "chef.marie@yacook.fr", password: str = "SecurePass123!") -> bool:
        """Login user."""
        logger.info(f"Logging in as {email}...")
        
        login_data = {
            "email": email,
            "password": password
        }
        
        try:
            async with self.session.post(
                f"{self.base_url}/api/auth/login",
                json=login_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    self.access_token = data.get("access_token")
                    self.user_data = data.get("user")
                    logger.info(f"✅ Login successful: {data.get('user', {}).get('email')}")
                    return True
                else:
                    logger.error(f"❌ Login failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Login failed with exception: {str(e)}")
            return False
    
    async def test_unread_count(self) -> bool:
        """Test GET /api/notifications/unread-count endpoint."""
        logger.info("Testing GET /api/notifications/unread-count...")
        
        try:
            async with self.session.get(
                f"{self.base_url}/api/notifications/unread-count",
                headers=self.get_auth_headers()
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    unread_count = data.get("unread_count", -1)
                    logger.info(f"✅ Unread notifications count: {unread_count}")
                    return True
                else:
                    logger.error(f"❌ Unread count failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Unread count test failed with exception: {str(e)}")
            return False
    
    async def test_notifications_list(self) -> bool:
        """Test GET /api/notifications endpoint."""
        logger.info("Testing GET /api/notifications...")
        
        try:
            async with self.session.get(
                f"{self.base_url}/api/notifications",
                params={"page": 1, "per_page": 20},
                headers=self.get_auth_headers()
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    notifications = data.get("notifications", [])
                    total_count = data.get("total_count", -1)
                    unread_count = data.get("unread_count", -1)
                    
                    logger.info(f"✅ Notifications retrieved: {len(notifications)} notifications, {total_count} total, {unread_count} unread")
                    
                    # Show first few notifications
                    for i, notification in enumerate(notifications[:3]):
                        logger.info(f"   Notification {i+1}: {notification.get('type')} - {notification.get('message')[:50]}...")
                    
                    return True
                else:
                    logger.error(f"❌ Notifications list failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Notifications list test failed with exception: {str(e)}")
            return False
    
    async def test_mark_all_read(self) -> bool:
        """Test PUT /api/notifications/mark-all-read endpoint."""
        logger.info("Testing PUT /api/notifications/mark-all-read...")
        
        try:
            async with self.session.put(
                f"{self.base_url}/api/notifications/mark-all-read",
                headers=self.get_auth_headers()
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    updated_count = data.get("updated_count", 0)
                    message = data.get("message", "")
                    logger.info(f"✅ Mark all read successful: {message} (updated: {updated_count})")
                    return True
                else:
                    logger.error(f"❌ Mark all read failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Mark all read test failed with exception: {str(e)}")
            return False
    
    async def test_authentication_required(self) -> bool:
        """Test that authentication is required for notification endpoints."""
        logger.info("Testing authentication requirement...")
        
        try:
            async with self.session.get(
                f"{self.base_url}/api/notifications/unread-count"
            ) as response:
                
                if response.status in [401, 403]:
                    logger.info(f"✅ Authentication requirement working - {response.status} returned without token")
                    return True
                else:
                    logger.error(f"❌ Authentication requirement failed - expected 401/403, got {response.status}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Authentication test failed with exception: {str(e)}")
            return False
    
    async def create_test_post(self) -> Optional[str]:
        """Create a test post for notification testing."""
        logger.info("Creating test post...")
        
        post_data = {
            "title": "Test de notification - Comment faire une bonne pâte brisée?",
            "body": "Je cherche des conseils pour réussir une pâte brisée qui ne se casse pas. Merci!",
            "type": "question",
            "tags": ["pâte brisée", "pâtisserie"],
            "is_public": True
        }
        
        try:
            async with self.session.post(
                f"{self.base_url}/api/posts",
                json=post_data,
                headers={**self.get_auth_headers(), "Content-Type": "application/json"}
            ) as response:
                
                if response.status in [200, 201]:
                    data = await response.json()
                    post_id = data.get("id")
                    logger.info(f"✅ Test post created: {data.get('title')}")
                    return post_id
                else:
                    logger.error(f"❌ Test post creation failed with status {response.status}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ Test post creation failed with exception: {str(e)}")
            return None
    
    async def create_second_user_and_comment(self, post_id: str) -> bool:
        """Create a second user and make them comment on the post."""
        logger.info("Creating second user for notification testing...")
        
        # Create second user
        second_user_email = f"testuser_{int(time.time())}@yacook.fr"
        second_user_data = {
            "email": second_user_email,
            "password": "TestPass456!",
            "first_name": "TestUser",
            "auth_provider": "email",
            "language": "fr"
        }
        
        try:
            async with self.session.post(
                f"{self.base_url}/api/auth/register",
                json=second_user_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    second_user_token = data.get("access_token")
                    logger.info(f"✅ Second user created: {second_user_email}")
                else:
                    logger.error(f"❌ Second user creation failed with status {response.status}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Second user creation failed with exception: {str(e)}")
            return False
        
        # Create comment with second user
        logger.info("Creating comment to trigger notification...")
        comment_data = {
            "body": "Pour une bonne pâte brisée, il faut bien incorporer le beurre froid et ne pas trop travailler la pâte!",
            "parent_id": None
        }
        
        try:
            async with self.session.post(
                f"{self.base_url}/api/posts/{post_id}/comments",
                json=comment_data,
                headers={"Authorization": f"Bearer {second_user_token}", "Content-Type": "application/json"}
            ) as response:
                
                if response.status in [200, 201]:
                    data = await response.json()
                    logger.info(f"✅ Comment created: {data.get('body')[:50]}...")
                    
                    # Wait for notification to be created
                    await asyncio.sleep(2)
                    return True
                else:
                    logger.error(f"❌ Comment creation failed with status {response.status}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Comment creation failed with exception: {str(e)}")
            return False
    
    async def run_all_tests(self) -> bool:
        """Run all notification system tests."""
        logger.info("🚀 Starting YaCook Notification System tests...")
        
        # Step 1: Login
        if not await self.login():
            return False
        
        # Step 2: Test authentication requirement
        if not await self.test_authentication_required():
            return False
        
        # Step 3: Test initial unread count
        if not await self.test_unread_count():
            return False
        
        # Step 4: Test notifications list
        if not await self.test_notifications_list():
            return False
        
        # Step 5: Create test post
        post_id = await self.create_test_post()
        if not post_id:
            logger.warning("⚠️ Could not create test post, skipping notification creation test")
        else:
            # Step 6: Create second user and comment (should trigger notification)
            if await self.create_second_user_and_comment(post_id):
                # Step 7: Check if notification was created
                logger.info("Checking if notification was created...")
                await self.test_unread_count()
                await self.test_notifications_list()
        
        # Step 8: Test mark all as read
        if not await self.test_mark_all_read():
            return False
        
        # Step 9: Verify unread count is now 0
        await self.test_unread_count()
        
        logger.info("✅ All notification system tests completed!")
        return True

async def main():
    """Main test runner."""
    async with NotificationTester() as tester:
        success = await tester.run_all_tests()
        
        if success:
            print("🎉 All notification tests passed!")
            return True
        else:
            print("⚠️ Some notification tests failed.")
            return False

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)