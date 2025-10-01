#!/usr/bin/env python3
"""
Test fresh notification creation and individual marking as read
"""

import asyncio
import aiohttp
import json
import logging
import time

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_fresh_notification():
    """Test creating a fresh notification and marking it as read individually."""
    base_url = "http://localhost:8001"
    
    async with aiohttp.ClientSession() as session:
        # Login as first user
        login_data = {"email": "chef.marie@yacook.fr", "password": "SecurePass123!"}
        
        async with session.post(f"{base_url}/api/auth/login", json=login_data) as response:
            if response.status != 200:
                logger.error("Failed to login")
                return False
            
            data = await response.json()
            access_token = data.get("access_token")
            headers = {"Authorization": f"Bearer {access_token}"}
        
        # Create a fresh post
        post_data = {
            "title": f"Fresh test post {int(time.time())}",
            "body": "This is a fresh test post for notification testing",
            "type": "question",
            "tags": ["fresh", "test"],
            "is_public": True
        }
        
        async with session.post(f"{base_url}/api/posts", json=post_data, headers={**headers, "Content-Type": "application/json"}) as response:
            if response.status not in [200, 201]:
                logger.error("Failed to create fresh post")
                return False
            
            post_response = await response.json()
            post_id = post_response.get("id")
            logger.info(f"Created fresh post: {post_id}")
        
        # Create a fresh second user
        second_user_email = f"freshuser_{int(time.time())}@yacook.fr"
        second_user_data = {
            "email": second_user_email,
            "password": "FreshPass123!",
            "first_name": "FreshUser",
            "auth_provider": "email",
            "language": "fr"
        }
        
        async with session.post(f"{base_url}/api/auth/register", json=second_user_data) as response:
            if response.status != 200:
                logger.error("Failed to create fresh second user")
                return False
            
            second_user_response = await response.json()
            second_user_token = second_user_response.get("access_token")
            logger.info(f"Created fresh user: {second_user_email}")
        
        # Check initial unread count
        async with session.get(f"{base_url}/api/notifications/unread-count", headers=headers) as response:
            if response.status == 200:
                data = await response.json()
                initial_unread = data.get("unread_count", 0)
                logger.info(f"Initial unread count: {initial_unread}")
        
        # Create comment to trigger fresh notification
        comment_data = {
            "body": "This is a fresh comment to trigger a fresh notification!",
            "parent_id": None
        }
        
        async with session.post(
            f"{base_url}/api/posts/{post_id}/comments", 
            json=comment_data, 
            headers={"Authorization": f"Bearer {second_user_token}", "Content-Type": "application/json"}
        ) as response:
            if response.status not in [200, 201]:
                logger.error("Failed to create fresh comment")
                return False
            
            logger.info("Created fresh comment")
        
        # Wait for notification to be created
        await asyncio.sleep(2)
        
        # Check new unread count
        async with session.get(f"{base_url}/api/notifications/unread-count", headers=headers) as response:
            if response.status == 200:
                data = await response.json()
                new_unread = data.get("unread_count", 0)
                logger.info(f"New unread count: {new_unread}")
                
                if new_unread > initial_unread:
                    logger.info("✅ Fresh notification was created!")
                else:
                    logger.warning("⚠️ No new notification detected")
        
        # Get the fresh notification
        async with session.get(f"{base_url}/api/notifications", params={"unread_only": "true"}, headers=headers) as response:
            if response.status != 200:
                logger.error("Failed to get fresh notifications")
                return False
            
            data = await response.json()
            notifications = data.get("notifications", [])
            
            if not notifications:
                logger.error("No unread notifications found")
                return False
            
            # Get the first unread notification
            fresh_notification = notifications[0]
            notification_id = fresh_notification.get("id")
            logger.info(f"Found fresh notification ID: {notification_id}")
            logger.info(f"Notification message: {fresh_notification.get('message')}")
            logger.info(f"Notification read_at: {fresh_notification.get('read_at')}")
        
        # Test marking this specific notification as read
        async with session.put(f"{base_url}/api/notifications/{notification_id}/read", headers=headers) as response:
            if response.status == 200:
                data = await response.json()
                logger.info(f"✅ Fresh notification marked as read: {data.get('message')}")
                
                # Verify the notification is now marked as read
                async with session.get(f"{base_url}/api/notifications", headers=headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        notifications = data.get("notifications", [])
                        
                        # Find our notification
                        for notification in notifications:
                            if notification.get("id") == notification_id:
                                if notification.get("read_at") is not None:
                                    logger.info("✅ Notification is now marked as read")
                                    return True
                                else:
                                    logger.error("❌ Notification is still unread")
                                    return False
                        
                        logger.error("❌ Could not find the notification after marking as read")
                        return False
                
                return True
            else:
                logger.error(f"❌ Failed to mark fresh notification as read: {response.status}")
                text = await response.text()
                logger.error(f"Response: {text}")
                return False

async def main():
    """Main test runner."""
    logger.info("🚀 Testing fresh notification individual marking...")
    
    success = await test_fresh_notification()
    
    if success:
        print("✅ Fresh notification individual marking test passed!")
        return True
    else:
        print("❌ Fresh notification individual marking test failed!")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)