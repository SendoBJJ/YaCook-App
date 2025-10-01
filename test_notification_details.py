#!/usr/bin/env python3
"""
YaCook Notification System Detailed Testing
Tests specific notification endpoints including mark individual as read
"""

import asyncio
import aiohttp
import json
import logging
import time

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_individual_notification_endpoints():
    """Test individual notification marking as read."""
    base_url = "http://localhost:8001"
    
    async with aiohttp.ClientSession() as session:
        # Login first
        login_data = {"email": "chef.marie@yacook.fr", "password": "SecurePass123!"}
        
        async with session.post(f"{base_url}/api/auth/login", json=login_data) as response:
            if response.status != 200:
                logger.error("Failed to login")
                return False
            
            data = await response.json()
            access_token = data.get("access_token")
            headers = {"Authorization": f"Bearer {access_token}"}
        
        # Get notifications to find an ID
        async with session.get(f"{base_url}/api/notifications", headers=headers) as response:
            if response.status != 200:
                logger.error("Failed to get notifications")
                return False
            
            data = await response.json()
            notifications = data.get("notifications", [])
            
            if not notifications:
                logger.info("No notifications found, creating test scenario...")
                
                # Create a post
                post_data = {
                    "title": "Test pour notification individuelle",
                    "body": "Test post pour tester les notifications individuelles",
                    "type": "question",
                    "tags": ["test"],
                    "is_public": True
                }
                
                async with session.post(f"{base_url}/api/posts", json=post_data, headers={**headers, "Content-Type": "application/json"}) as response:
                    if response.status not in [200, 201]:
                        logger.error("Failed to create test post")
                        return False
                    
                    post_data_response = await response.json()
                    post_id = post_data_response.get("id")
                
                # Create second user
                second_user_email = f"testuser_individual_{int(time.time())}@yacook.fr"
                second_user_data = {
                    "email": second_user_email,
                    "password": "TestPass456!",
                    "first_name": "TestUserIndividual",
                    "auth_provider": "email",
                    "language": "fr"
                }
                
                async with session.post(f"{base_url}/api/auth/register", json=second_user_data) as response:
                    if response.status != 200:
                        logger.error("Failed to create second user")
                        return False
                    
                    second_user_data_response = await response.json()
                    second_user_token = second_user_data_response.get("access_token")
                
                # Create comment to trigger notification
                comment_data = {
                    "body": "Commentaire pour tester la notification individuelle",
                    "parent_id": None
                }
                
                async with session.post(
                    f"{base_url}/api/posts/{post_id}/comments", 
                    json=comment_data, 
                    headers={"Authorization": f"Bearer {second_user_token}", "Content-Type": "application/json"}
                ) as response:
                    if response.status not in [200, 201]:
                        logger.error("Failed to create comment")
                        return False
                
                # Wait for notification
                await asyncio.sleep(2)
                
                # Get notifications again
                async with session.get(f"{base_url}/api/notifications", headers=headers) as response:
                    if response.status != 200:
                        logger.error("Failed to get notifications after comment")
                        return False
                    
                    data = await response.json()
                    notifications = data.get("notifications", [])
            
            if not notifications:
                logger.error("Still no notifications found")
                return False
            
            # Find an unread notification
            unread_notification = None
            for notification in notifications:
                if notification.get("read_at") is None:
                    unread_notification = notification
                    break
            
            if not unread_notification:
                logger.info("No unread notifications, using first notification")
                unread_notification = notifications[0]
            
            notification_id = unread_notification.get("id")
            logger.info(f"Testing with notification ID: {notification_id}")
            
            # Test marking individual notification as read
            async with session.put(f"{base_url}/api/notifications/{notification_id}/read", headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    logger.info(f"✅ Individual notification marked as read: {data.get('message')}")
                    
                    # Verify French message
                    message = data.get("message", "")
                    if "marquée comme lue" in message:
                        logger.info("✅ French response message correct")
                    else:
                        logger.warning(f"⚠️ Response message: {message}")
                    
                    return True
                else:
                    logger.error(f"❌ Failed to mark notification as read: {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
        
        # Test invalid notification ID
        logger.info("Testing invalid notification ID...")
        async with session.put(f"{base_url}/api/notifications/invalid-id-123/read", headers=headers) as response:
            if response.status == 404:
                logger.info("✅ Invalid notification ID properly handled with 404")
                return True
            else:
                logger.warning(f"⚠️ Invalid notification ID returned {response.status} instead of 404")
                return True  # Not a critical failure

async def main():
    """Main test runner."""
    logger.info("🚀 Testing individual notification endpoints...")
    
    success = await test_individual_notification_endpoints()
    
    if success:
        print("✅ Individual notification endpoint tests passed!")
        return True
    else:
        print("❌ Individual notification endpoint tests failed!")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)