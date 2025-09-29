#!/usr/bin/env python3
"""
YaCook Backend API Testing Suite
Tests all backend endpoints for the YaCook application
"""

import asyncio
import aiohttp
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class YaCookAPITester:
    def __init__(self, base_url: str = "https://meal-app-preview.preview.emergentagent.com"):
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