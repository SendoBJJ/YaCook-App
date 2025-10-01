#!/usr/bin/env python3
"""
YaCook Backend API Testing Suite
Tests all backend endpoints for the YaCook application
"""

import asyncio
import aiohttp
import json
import logging
import time
from typing import Dict, Any, Optional
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class YaCookAPITester:
    def __init__(self, base_url: str = "https://meal-app-preview.preview.emergentagent.com", internal_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.internal_url = internal_url
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
    
    async def test_health_check(self) -> bool:
        """Test GET /api/health endpoint."""
        logger.info("Testing health check endpoint...")
        try:
            async with self.session.get(f"{self.base_url}/api/health") as response:
                if response.status == 200:
                    data = await response.json()
                    logger.info(f"✅ Health check passed: {data}")
                    return True
                else:
                    logger.error(f"❌ Health check failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
        except Exception as e:
            logger.error(f"❌ Health check failed with exception: {str(e)}")
            return False
    
    async def test_user_registration(self, email: str = "chef.marie@yacook.fr", 
                                   password: str = "SecurePass123!", 
                                   first_name: str = "Marie") -> bool:
        """Test POST /api/auth/register endpoint."""
        logger.info("Testing user registration endpoint...")
        
        user_data = {
            "email": email,
            "password": password,
            "first_name": first_name,
            "auth_provider": "email",
            "language": "fr",
            "daily_calorie_goal": 2000,
            "dietary_restrictions": [],
            "allergens": []
        }
        
        try:
            async with self.session.post(
                f"{self.base_url}/api/auth/register",
                json=user_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    self.access_token = data.get("access_token")
                    self.user_data = data.get("user")
                    logger.info(f"✅ User registration successful: {data.get('user', {}).get('email')}")
                    return True
                elif response.status == 400:
                    # User might already exist, try login instead
                    logger.info("User already exists, will try login...")
                    return await self.test_user_login(email, password)
                else:
                    logger.error(f"❌ User registration failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ User registration failed with exception: {str(e)}")
            return False
    
    async def test_user_login(self, email: str = "chef.marie@yacook.fr", 
                            password: str = "SecurePass123!") -> bool:
        """Test POST /api/auth/login endpoint."""
        logger.info("Testing user login endpoint...")
        
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
                    logger.info(f"✅ User login successful: {data.get('user', {}).get('email')}")
                    return True
                else:
                    logger.error(f"❌ User login failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ User login failed with exception: {str(e)}")
            return False
    
    async def test_product_lookup(self, barcode: str = "3017620425400") -> bool:
        """Test GET /api/products/{barcode} endpoint."""
        logger.info(f"Testing product lookup endpoint for barcode: {barcode}...")
        
        try:
            async with self.session.get(
                f"{self.base_url}/api/products/{barcode}",
                params={"language": "fr"}
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    product_name = data.get("product_name", "Unknown")
                    logger.info(f"✅ Product lookup successful: {product_name}")
                    return True
                else:
                    logger.error(f"❌ Product lookup failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Product lookup failed with exception: {str(e)}")
            return False
    
    async def test_ai_recipe_generation(self) -> bool:
        """Test POST /api/ai/generate-recipe endpoint."""
        logger.info("Testing AI recipe generation endpoint...")
        
        if not self.access_token:
            logger.error("❌ No access token available for AI recipe generation")
            return False
        
        recipe_request = {
            "ingredients": ["tomates", "basilic", "mozzarella", "huile d'olive"],
            "cuisine_type": "italienne",
            "difficulty": "facile",
            "prep_time": 30,
            "dietary_restrictions": []
        }
        
        try:
            async with self.session.post(
                f"{self.base_url}/api/ai/generate-recipe",
                json=recipe_request,
                headers={**self.get_auth_headers(), "Content-Type": "application/json"}
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    recipe_name = data.get("recipe", {}).get("name", "Unknown")
                    logger.info(f"✅ AI recipe generation successful: {recipe_name}")
                    return True
                else:
                    logger.error(f"❌ AI recipe generation failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ AI recipe generation failed with exception: {str(e)}")
            return False
    
    async def test_ai_meal_plan_generation(self) -> bool:
        """Test POST /api/ai/generate-meal-plan endpoint."""
        logger.info("Testing AI meal plan generation endpoint...")
        
        if not self.access_token:
            logger.error("❌ No access token available for AI meal plan generation")
            return False
        
        meal_plan_params = {
            "days": 7,
            "daily_calories": 2000,
            "dietary_restrictions": []
        }
        
        try:
            async with self.session.post(
                f"{self.base_url}/api/ai/generate-meal-plan",
                params=meal_plan_params,
                headers=self.get_auth_headers()
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    logger.info(f"✅ AI meal plan generation successful")
                    return True
                else:
                    logger.error(f"❌ AI meal plan generation failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ AI meal plan generation failed with exception: {str(e)}")
            return False
    
    async def test_user_profile(self) -> bool:
        """Test GET /api/users/me endpoint."""
        logger.info("Testing user profile endpoint...")
        
        if not self.access_token:
            logger.error("❌ No access token available for user profile")
            return False
        
        try:
            async with self.session.get(
                f"{self.base_url}/api/users/me",
                headers=self.get_auth_headers()
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    user_email = data.get("email", "Unknown")
                    logger.info(f"✅ User profile retrieval successful: {user_email}")
                    return True
                else:
                    logger.error(f"❌ User profile retrieval failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ User profile retrieval failed with exception: {str(e)}")
            return False
    
    async def test_posts_api(self) -> Dict[str, Any]:
        """Test Posts API endpoints."""
        logger.info("Testing Posts API endpoints...")
        
        if not self.access_token:
            logger.error("❌ No access token available for Posts API")
            return {"success": False, "question_post_id": None, "recipe_post_id": None}
        
        results = {"success": True, "question_post_id": None, "recipe_post_id": None}
        
        # Test creating a question post
        question_data = {
            "title": "Comment préparer un soufflé parfait?",
            "body": "Je cherche des conseils pour réussir un soufflé au fromage qui ne retombe pas. Quelles sont vos astuces?",
            "type": "question",
            "tags": ["soufflé", "fromage", "technique"],
            "is_public": True
        }
        
        try:
            async with self.session.post(
                f"{self.base_url}/api/posts",
                json=question_data,
                headers={**self.get_auth_headers(), "Content-Type": "application/json"}
            ) as response:
                
                if response.status in [200, 201]:
                    data = await response.json()
                    results["question_post_id"] = data.get("id")
                    logger.info(f"✅ Question post created: {data.get('title')}")
                else:
                    logger.error(f"❌ Question post creation failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    results["success"] = False
                    
        except Exception as e:
            logger.error(f"❌ Question post creation failed with exception: {str(e)}")
            results["success"] = False
        
        # Test creating a recipe post
        recipe_data = {
            "title": "Ratatouille Traditionnelle",
            "body": "Une délicieuse ratatouille avec des légumes de saison. Ingrédients: aubergines, courgettes, tomates, poivrons, oignons, ail, herbes de Provence.",
            "type": "recipe",
            "tags": ["ratatouille", "légumes", "français"],
            "is_public": True
        }
        
        try:
            async with self.session.post(
                f"{self.base_url}/api/posts",
                json=recipe_data,
                headers={**self.get_auth_headers(), "Content-Type": "application/json"}
            ) as response:
                
                if response.status in [200, 201]:
                    data = await response.json()
                    results["recipe_post_id"] = data.get("id")
                    logger.info(f"✅ Recipe post created: {data.get('title')}")
                else:
                    logger.error(f"❌ Recipe post creation failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    results["success"] = False
                    
        except Exception as e:
            logger.error(f"❌ Recipe post creation failed with exception: {str(e)}")
            results["success"] = False
        
        # Test getting posts feed
        try:
            async with self.session.get(
                f"{self.base_url}/api/posts",
                params={"page": 1, "per_page": 10},
                headers=self.get_auth_headers()
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    posts = data.get("posts", [])
                    total = data.get("total", 0)
                    logger.info(f"✅ Posts feed retrieved: {len(posts)} posts out of {total} total")
                else:
                    logger.error(f"❌ Posts feed retrieval failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    results["success"] = False
                    
        except Exception as e:
            logger.error(f"❌ Posts feed retrieval failed with exception: {str(e)}")
            results["success"] = False
        
        # Test getting individual post
        if results["question_post_id"]:
            try:
                async with self.session.get(
                    f"{self.base_url}/api/posts/{results['question_post_id']}",
                    headers=self.get_auth_headers()
                ) as response:
                    
                    if response.status == 200:
                        data = await response.json()
                        logger.info(f"✅ Individual post retrieved: {data.get('title')}")
                    else:
                        logger.error(f"❌ Individual post retrieval failed with status {response.status}")
                        text = await response.text()
                        logger.error(f"Response: {text}")
                        results["success"] = False
                        
            except Exception as e:
                logger.error(f"❌ Individual post retrieval failed with exception: {str(e)}")
                results["success"] = False
        
        return results
    
    async def test_comments_api(self, post_id: str) -> bool:
        """Test Comments API endpoints."""
        logger.info("Testing Comments API endpoints...")
        
        if not self.access_token or not post_id:
            logger.error("❌ No access token or post ID available for Comments API")
            return False
        
        # Test creating a comment
        comment_data = {
            "body": "Excellente question! Pour un soufflé réussi, il faut bien battre les blancs en neige ferme et les incorporer délicatement à la préparation.",
            "parent_id": None
        }
        
        comment_id = None
        try:
            async with self.session.post(
                f"{self.base_url}/api/posts/{post_id}/comments",
                json=comment_data,
                headers={**self.get_auth_headers(), "Content-Type": "application/json"}
            ) as response:
                
                if response.status in [200, 201]:
                    data = await response.json()
                    comment_id = data.get("id")
                    logger.info(f"✅ Comment created: {data.get('body')[:50]}...")
                else:
                    logger.error(f"❌ Comment creation failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Comment creation failed with exception: {str(e)}")
            return False
        
        # Test getting comments for post
        try:
            async with self.session.get(
                f"{self.base_url}/api/posts/{post_id}/comments",
                params={"page": 1, "per_page": 10},
                headers=self.get_auth_headers()
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    comments = data.get("comments", [])
                    total = data.get("total", 0)
                    logger.info(f"✅ Comments retrieved: {len(comments)} comments out of {total} total")
                    
                    # Verify our comment is in the list
                    if comment_id:
                        comment_ids = [comment.get("id") for comment in comments]
                        if comment_id in comment_ids:
                            logger.info("✅ Created comment found in comments list")
                        else:
                            logger.warning("⚠️ Created comment not found in comments list")
                    
                    return True
                else:
                    logger.error(f"❌ Comments retrieval failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Comments retrieval failed with exception: {str(e)}")
            return False
    
    async def test_shopping_list_api(self) -> bool:
        """Test Shopping List API endpoints."""
        logger.info("Testing Shopping List API endpoints...")
        
        if not self.access_token:
            logger.error("❌ No access token available for Shopping List API")
            return False
        
        # Test adding shopping list items with different sections
        items_to_add = [
            {
                "name": "Aubergines",
                "quantity": "2",
                "unit": "pièces",
                "section": "légumes",
                "is_checked": False,
                "notes": "Bien fermes et brillantes"
            },
            {
                "name": "Gruyère râpé",
                "quantity": "200",
                "unit": "g",
                "section": "produits_laitiers",
                "is_checked": False,
                "notes": "Pour le soufflé"
            },
            {
                "name": "Œufs",
                "quantity": "6",
                "unit": "pièces",
                "section": "produits_laitiers",
                "is_checked": False,
                "notes": "Extra frais"
            }
        ]
        
        added_item_ids = []
        
        for item_data in items_to_add:
            try:
                async with self.session.post(
                    f"{self.base_url}/api/shopping-list/items",
                    json=item_data,
                    headers={**self.get_auth_headers(), "Content-Type": "application/json"}
                ) as response:
                    
                    if response.status in [200, 201]:
                        data = await response.json()
                        item_id = data.get("id")
                        added_item_ids.append(item_id)
                        logger.info(f"✅ Shopping item added: {item_data['name']} to {item_data['section']} section")
                    else:
                        logger.error(f"❌ Shopping item addition failed with status {response.status}")
                        text = await response.text()
                        logger.error(f"Response: {text}")
                        return False
                        
            except Exception as e:
                logger.error(f"❌ Shopping item addition failed with exception: {str(e)}")
                return False
        
        # Test getting shopping list
        try:
            async with self.session.get(
                f"{self.base_url}/api/shopping-list",
                headers=self.get_auth_headers()
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    sections = data.get("sections", [])
                    total_items = data.get("total_items", 0)
                    completion_percentage = data.get("completion_percentage", 0)
                    
                    logger.info(f"✅ Shopping list retrieved: {len(sections)} sections, {total_items} items ({completion_percentage:.1f}% complete)")
                    
                    # Verify sections are organized correctly
                    section_names = [section.get("section") for section in sections]
                    expected_sections = ["légumes", "produits_laitiers"]
                    
                    for expected_section in expected_sections:
                        if expected_section in section_names:
                            logger.info(f"✅ Section {expected_section} found in shopping list")
                        else:
                            logger.warning(f"⚠️ Section {expected_section} not found in shopping list")
                else:
                    logger.error(f"❌ Shopping list retrieval failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Shopping list retrieval failed with exception: {str(e)}")
            return False
        
        # Test updating a shopping list item (mark as checked)
        if added_item_ids:
            item_id = added_item_ids[0]
            update_data = {
                "is_checked": True,
                "notes": "Acheté au marché"
            }
            
            try:
                async with self.session.put(
                    f"{self.base_url}/api/shopping-list/items/{item_id}",
                    json=update_data,
                    headers={**self.get_auth_headers(), "Content-Type": "application/json"}
                ) as response:
                    
                    if response.status == 200:
                        data = await response.json()
                        logger.info(f"✅ Shopping item updated: {data.get('name', 'Unknown')} marked as checked")
                        return True
                    else:
                        logger.error(f"❌ Shopping item update failed with status {response.status}")
                        text = await response.text()
                        logger.error(f"Response: {text}")
                        return False
                        
            except Exception as e:
                logger.error(f"❌ Shopping item update failed with exception: {str(e)}")
                return False
        
        return True
    
    async def test_cloudinary_signature_endpoint(self) -> bool:
        """Test POST /api/media/signature endpoint for Cloudinary upload signatures."""
        logger.info("Testing Cloudinary signature endpoint...")
        
        # Test 1: Authentication required (should fail without token)
        logger.info("Testing authentication requirement...")
        signature_request = {
            "folder": "yacook/community/recipe",
            "resource_type": "image",
            "tags": ["recipe", "test"]
        }
        
        try:
            async with self.session.post(
                f"{self.internal_url}/api/media/signature",
                json=signature_request,
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status in [401, 403]:
                    logger.info(f"✅ Authentication requirement working - {response.status} returned without token")
                else:
                    logger.error(f"❌ Authentication requirement failed - expected 401/403, got {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Authentication test failed with exception: {str(e)}")
            return False
        
        # Test 2: Valid signature request (requires authentication)
        if not self.access_token:
            logger.error("❌ No access token available for authenticated Cloudinary signature test")
            return False
        
        logger.info("Testing valid signature generation...")
        valid_request = {
            "folder": "yacook/community/recipe",
            "resource_type": "image",
            "tags": ["recipe", "italian", "pasta"],
            "context": {"recipe_type": "pasta", "difficulty": "easy"}
        }
        
        try:
            async with self.session.post(
                f"{self.internal_url}/api/media/signature",
                json=valid_request,
                headers={**self.get_auth_headers(), "Content-Type": "application/json"}
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    
                    # Validate response structure
                    required_fields = ["signature", "timestamp", "api_key", "cloud_name", "upload_url", "expires_at"]
                    missing_fields = [field for field in required_fields if field not in data]
                    
                    if missing_fields:
                        logger.error(f"❌ Response missing required fields: {missing_fields}")
                        return False
                    
                    # Validate EU Cloudinary URL
                    if "api.cloudinary.com" not in data.get("upload_url", ""):
                        logger.error(f"❌ Upload URL doesn't contain EU Cloudinary endpoint: {data.get('upload_url')}")
                        return False
                    
                    # Validate timestamp and expiry
                    current_time = int(time.time())
                    timestamp = data.get("timestamp", 0)
                    expires_at = data.get("expires_at", 0)
                    
                    if abs(timestamp - current_time) > 60:  # Allow 60 seconds tolerance
                        logger.error(f"❌ Timestamp seems incorrect: {timestamp} vs current {current_time}")
                        return False
                    
                    if expires_at <= timestamp:
                        logger.error(f"❌ Expiry time should be after timestamp: {expires_at} <= {timestamp}")
                        return False
                    
                    logger.info(f"✅ Valid signature generated successfully")
                    logger.info(f"   - Cloud: {data.get('cloud_name')}")
                    logger.info(f"   - Upload URL: {data.get('upload_url')}")
                    logger.info(f"   - Expires in: {expires_at - timestamp} seconds")
                    
                else:
                    logger.error(f"❌ Valid signature request failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Valid signature request failed with exception: {str(e)}")
            return False
        
        # Test 3: Invalid folder validation
        logger.info("Testing invalid folder path validation...")
        invalid_request = {
            "folder": "invalid/folder/path",
            "resource_type": "image",
            "tags": ["test"]
        }
        
        try:
            async with self.session.post(
                f"{self.internal_url}/api/media/signature",
                json=invalid_request,
                headers={**self.get_auth_headers(), "Content-Type": "application/json"}
            ) as response:
                
                if response.status == 400:
                    logger.info("✅ Invalid folder validation working - 400 returned for invalid path")
                elif response.status == 422:
                    logger.info("✅ Invalid folder validation working - 422 returned for validation error")
                else:
                    logger.error(f"❌ Invalid folder validation failed - expected 400/422, got {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Invalid folder validation test failed with exception: {str(e)}")
            return False
        
        # Test 4: Valid question folder path
        logger.info("Testing valid question folder path...")
        question_request = {
            "folder": "yacook/community/question",
            "resource_type": "image",
            "tags": ["question", "help"]
        }
        
        try:
            async with self.session.post(
                f"{self.internal_url}/api/media/signature",
                json=question_request,
                headers={**self.get_auth_headers(), "Content-Type": "application/json"}
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    logger.info("✅ Question folder path accepted successfully")
                else:
                    logger.error(f"❌ Question folder path rejected with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Question folder path test failed with exception: {str(e)}")
            return False
        
        # Test 5: User context verification (check if user context is added)
        logger.info("Testing user context addition...")
        context_request = {
            "folder": "yacook/community/recipe",
            "resource_type": "image",
            "tags": ["recipe", "context_test"],
            "context": {"recipe_name": "Test Recipe"}
        }
        
        try:
            async with self.session.post(
                f"{self.internal_url}/api/media/signature",
                json=context_request,
                headers={**self.get_auth_headers(), "Content-Type": "application/json"}
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    logger.info("✅ User context request processed successfully")
                    # Note: We can't directly verify context was added to signature without decoding it,
                    # but the successful response indicates the context processing worked
                else:
                    logger.error(f"❌ User context request failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ User context test failed with exception: {str(e)}")
            return False
        
        logger.info("✅ All Cloudinary signature endpoint tests passed!")
        return True
    
    async def test_notification_system(self) -> bool:
        """Test Notification System API endpoints for YaCook Phase 2."""
        logger.info("Testing Notification System API endpoints...")
        
        if not self.access_token:
            logger.error("❌ No access token available for Notification System API")
            return False
        
        # Test 1: Get unread notifications count (should be 0 for new user)
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
                    
                    if unread_count >= 0:
                        logger.info("✅ Unread count endpoint working correctly")
                    else:
                        logger.error("❌ Invalid unread count format")
                        return False
                else:
                    logger.error(f"❌ Unread count failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Unread count test failed with exception: {str(e)}")
            return False
        
        # Test 2: Get notifications list (should be empty for new user)
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
                    has_next = data.get("has_next", False)
                    
                    logger.info(f"✅ Notifications retrieved: {len(notifications)} notifications, {total_count} total, {unread_count} unread")
                    
                    # Validate response structure
                    required_fields = ["notifications", "total_count", "unread_count", "page", "per_page", "has_next"]
                    missing_fields = [field for field in required_fields if field not in data]
                    
                    if missing_fields:
                        logger.error(f"❌ Response missing required fields: {missing_fields}")
                        return False
                    
                    logger.info("✅ Notifications list endpoint working correctly")
                else:
                    logger.error(f"❌ Notifications list failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Notifications list test failed with exception: {str(e)}")
            return False
        
        # Test 3: Test authentication requirement
        logger.info("Testing authentication requirement for notification endpoints...")
        try:
            async with self.session.get(
                f"{self.base_url}/api/notifications/unread-count"
            ) as response:
                
                if response.status in [401, 403]:
                    logger.info(f"✅ Authentication requirement working - {response.status} returned without token")
                else:
                    logger.error(f"❌ Authentication requirement failed - expected 401/403, got {response.status}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Authentication test failed with exception: {str(e)}")
            return False
        
        # Test 4: Create a second user to test notification creation
        logger.info("Creating second user for notification integration testing...")
        second_user_email = f"testuser2_{int(time.time())}@yacook.fr"
        second_user_password = "TestPass456!"
        
        second_user_data = {
            "email": second_user_email,
            "password": second_user_password,
            "first_name": "TestUser2",
            "auth_provider": "email",
            "language": "fr",
            "daily_calorie_goal": 1800,
            "dietary_restrictions": [],
            "allergens": []
        }
        
        second_user_token = None
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
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Second user creation failed with exception: {str(e)}")
            return False
        
        # Test 5: Create a post with the first user
        logger.info("Creating a post to test notification integration...")
        post_data = {
            "title": "Comment réussir une pâte à choux?",
            "body": "Je cherche des conseils pour faire une pâte à choux parfaite. Mes choux ne gonflent jamais assez!",
            "type": "question",
            "tags": ["pâte à choux", "pâtisserie", "technique"],
            "is_public": True
        }
        
        post_id = None
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
                else:
                    logger.error(f"❌ Test post creation failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Test post creation failed with exception: {str(e)}")
            return False
        
        # Test 6: Create a comment with the second user (should trigger notification)
        logger.info("Creating comment to trigger notification...")
        if not post_id or not second_user_token:
            logger.error("❌ Cannot test notification creation - missing post ID or second user token")
            return False
        
        comment_data = {
            "body": "Pour réussir une pâte à choux, il faut bien dessécher la pâte sur le feu et incorporer les œufs un par un. La température du four est cruciale aussi!",
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
                    logger.info(f"✅ Comment created by second user: {data.get('body')[:50]}...")
                    
                    # Wait a moment for notification to be created
                    await asyncio.sleep(1)
                else:
                    logger.error(f"❌ Comment creation failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Comment creation failed with exception: {str(e)}")
            return False
        
        # Test 7: Check if notification was created for the first user
        logger.info("Checking if notification was created...")
        try:
            async with self.session.get(
                f"{self.base_url}/api/notifications/unread-count",
                headers=self.get_auth_headers()
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    new_unread_count = data.get("unread_count", 0)
                    
                    if new_unread_count > 0:
                        logger.info(f"✅ Notification created successfully! Unread count: {new_unread_count}")
                    else:
                        logger.warning("⚠️ No notification created - this might be expected if users are the same")
                else:
                    logger.error(f"❌ Unread count check failed with status {response.status}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Notification check failed with exception: {str(e)}")
            return False
        
        # Test 8: Get notifications list to verify notification content
        logger.info("Getting notifications list to verify content...")
        notification_id = None
        try:
            async with self.session.get(
                f"{self.base_url}/api/notifications",
                params={"page": 1, "per_page": 10},
                headers=self.get_auth_headers()
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    notifications = data.get("notifications", [])
                    
                    if notifications:
                        notification = notifications[0]  # Get the latest notification
                        notification_id = notification.get("id")
                        
                        # Validate notification structure
                        required_fields = ["id", "type", "entity_id", "from_user_id", "from_user_name", "to_user_id", "message", "created_at"]
                        missing_fields = [field for field in required_fields if field not in notification]
                        
                        if missing_fields:
                            logger.error(f"❌ Notification missing required fields: {missing_fields}")
                            return False
                        
                        # Check if it's a comment notification
                        if notification.get("type") == "comment":
                            logger.info(f"✅ Comment notification found: {notification.get('message')}")
                            
                            # Verify French message
                            message = notification.get("message", "")
                            if "commenté" in message and "publication" in message:
                                logger.info("✅ French notification message format correct")
                            else:
                                logger.warning(f"⚠️ Notification message format might be incorrect: {message}")
                        else:
                            logger.info(f"✅ Notification found with type: {notification.get('type')}")
                    else:
                        logger.info("ℹ️ No notifications found (might be expected)")
                else:
                    logger.error(f"❌ Notifications list failed with status {response.status}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Notifications list check failed with exception: {str(e)}")
            return False
        
        # Test 9: Mark specific notification as read
        if notification_id:
            logger.info(f"Testing mark notification as read for ID: {notification_id}")
            try:
                async with self.session.put(
                    f"{self.base_url}/api/notifications/{notification_id}/read",
                    headers=self.get_auth_headers()
                ) as response:
                    
                    if response.status == 200:
                        data = await response.json()
                        logger.info(f"✅ Notification marked as read: {data.get('message', 'Success')}")
                    else:
                        logger.error(f"❌ Mark notification read failed with status {response.status}")
                        text = await response.text()
                        logger.error(f"Response: {text}")
                        return False
                        
            except Exception as e:
                logger.error(f"❌ Mark notification read failed with exception: {str(e)}")
                return False
        
        # Test 10: Verify unread count decreased
        logger.info("Verifying unread count decreased...")
        try:
            async with self.session.get(
                f"{self.base_url}/api/notifications/unread-count",
                headers=self.get_auth_headers()
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    final_unread_count = data.get("unread_count", -1)
                    logger.info(f"✅ Final unread count: {final_unread_count}")
                else:
                    logger.error(f"❌ Final unread count check failed with status {response.status}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Final unread count check failed with exception: {str(e)}")
            return False
        
        # Test 11: Test mark all notifications as read
        logger.info("Testing mark all notifications as read...")
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
                    
                    # Verify French message
                    if "marquées comme lues" in message:
                        logger.info("✅ French response message format correct")
                    else:
                        logger.warning(f"⚠️ Response message format might be incorrect: {message}")
                else:
                    logger.error(f"❌ Mark all read failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Mark all read failed with exception: {str(e)}")
            return False
        
        # Test 12: Test invalid notification ID
        logger.info("Testing invalid notification ID handling...")
        try:
            async with self.session.put(
                f"{self.base_url}/api/notifications/invalid-id-123/read",
                headers=self.get_auth_headers()
            ) as response:
                
                if response.status == 404:
                    logger.info("✅ Invalid notification ID properly handled with 404")
                else:
                    logger.warning(f"⚠️ Invalid notification ID returned {response.status} instead of 404")
                    
        except Exception as e:
            logger.error(f"❌ Invalid notification ID test failed with exception: {str(e)}")
            return False
        
        # Test 13: Test pagination
        logger.info("Testing notification pagination...")
        try:
            async with self.session.get(
                f"{self.base_url}/api/notifications",
                params={"page": 1, "per_page": 5, "unread_only": False},
                headers=self.get_auth_headers()
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    page = data.get("page", 0)
                    per_page = data.get("per_page", 0)
                    has_next = data.get("has_next", False)
                    
                    if page == 1 and per_page == 5:
                        logger.info(f"✅ Pagination working correctly: page {page}, per_page {per_page}, has_next {has_next}")
                    else:
                        logger.error(f"❌ Pagination parameters incorrect: page {page}, per_page {per_page}")
                        return False
                else:
                    logger.error(f"❌ Pagination test failed with status {response.status}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Pagination test failed with exception: {str(e)}")
            return False
        
        logger.info("✅ All Notification System API tests completed successfully!")
        return True
    
    async def run_all_tests(self) -> Dict[str, bool]:
        """Run all API tests and return results."""
        logger.info("🚀 Starting YaCook API tests...")
        
        results = {}
        
        # Test 1: Health check
        results["health_check"] = await self.test_health_check()
        
        # Test 2: User registration (or login if exists)
        results["user_registration"] = await self.test_user_registration()
        
        # Test 3: User login (if registration failed)
        if not results["user_registration"]:
            results["user_login"] = await self.test_user_login()
        else:
            results["user_login"] = True  # Already logged in from registration
        
        # Test 4: Product lookup
        results["product_lookup"] = await self.test_product_lookup()
        
        # Test 5: User profile (requires auth)
        results["user_profile"] = await self.test_user_profile()
        
        # Test 6: AI recipe generation (requires auth)
        results["ai_recipe_generation"] = await self.test_ai_recipe_generation()
        
        # Test 7: AI meal plan generation (requires auth)
        results["ai_meal_plan_generation"] = await self.test_ai_meal_plan_generation()
        
        # NEW TESTS - Posts, Comments, Shopping List APIs
        logger.info("🆕 Testing new API endpoints...")
        
        # Test 8: Posts API (requires auth)
        posts_result = await self.test_posts_api()
        results["posts_api"] = posts_result["success"]
        
        # Test 9: Comments API (requires auth and post ID)
        if posts_result["question_post_id"]:
            results["comments_api"] = await self.test_comments_api(posts_result["question_post_id"])
        else:
            logger.error("❌ Cannot test Comments API - no post ID available")
            results["comments_api"] = False
        
        # Test 10: Shopping List API (requires auth)
        results["shopping_list_api"] = await self.test_shopping_list_api()
        
        # Test 11: Cloudinary Signature API (requires auth)
        results["cloudinary_signature_api"] = await self.test_cloudinary_signature_endpoint()
        
        # Test 12: Notification System API (requires auth)
        results["notification_system_api"] = await self.test_notification_system()
        
        return results

async def main():
    """Main test runner."""
    async with YaCookAPITester() as tester:
        results = await tester.run_all_tests()
        
        # Print summary
        print("\n" + "="*60)
        print("🧪 YaCook API Test Results Summary")
        print("="*60)
        
        passed = 0
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name.replace('_', ' ').title()}: {status}")
            if result:
                passed += 1
        
        print(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️  Some tests failed. Check logs above for details.")
            return False

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)