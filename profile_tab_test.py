#!/usr/bin/env python3
"""
YaCook Profile Tab Integration Testing
Tests backend API readiness for Profile Tab functionality
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

class ProfileTabTester:
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
    
    async def test_health_check(self) -> bool:
        """Test GET /api/health endpoint."""
        logger.info("🏥 Testing health check endpoint...")
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
    
    async def test_authentication_with_demo_credentials(self) -> bool:
        """Test authentication with known demo credentials."""
        logger.info("🔐 Testing authentication with demo credentials...")
        
        # Try known working credentials from test_result.md
        demo_credentials = [
            {"email": "chef.marie@yacook.fr", "password": "SecurePass123!"},
            {"email": "test@example.com", "password": "testpassword123"}
        ]
        
        for creds in demo_credentials:
            logger.info(f"Trying credentials: {creds['email']}")
            
            try:
                async with self.session.post(
                    f"{self.base_url}/api/auth/login",
                    json=creds,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    
                    if response.status == 200:
                        data = await response.json()
                        self.access_token = data.get("access_token")
                        self.user_data = data.get("user")
                        logger.info(f"✅ Login successful with {creds['email']}")
                        logger.info(f"   User ID: {self.user_data.get('id')}")
                        logger.info(f"   Email: {self.user_data.get('email')}")
                        logger.info(f"   Name: {self.user_data.get('first_name')} {self.user_data.get('last_name', '')}")
                        return True
                    elif response.status == 401:
                        logger.info(f"❌ Invalid credentials for {creds['email']}")
                        continue
                    else:
                        logger.error(f"❌ Login failed with status {response.status}")
                        text = await response.text()
                        logger.error(f"Response: {text}")
                        continue
                        
            except Exception as e:
                logger.error(f"❌ Login failed with exception: {str(e)}")
                continue
        
        # If login failed, try registration with a new user
        logger.info("🆕 Trying to register a new test user...")
        test_user = {
            "email": f"profile_test_{int(datetime.now().timestamp())}@yacook.fr",
            "password": "ProfileTest123!",
            "first_name": "Profile",
            "last_name": "Tester",
            "auth_provider": "email",
            "language": "fr",
            "daily_calorie_goal": 2000,
            "dietary_restrictions": [],
            "allergens": []
        }
        
        try:
            async with self.session.post(
                f"{self.base_url}/api/auth/register",
                json=test_user,
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    self.access_token = data.get("access_token")
                    self.user_data = data.get("user")
                    logger.info(f"✅ Registration successful: {test_user['email']}")
                    return True
                else:
                    logger.error(f"❌ Registration failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Registration failed with exception: {str(e)}")
            return False
    
    async def test_user_profile_retrieval(self) -> Dict[str, Any]:
        """Test GET /api/users/me endpoint and analyze user data structure."""
        logger.info("👤 Testing user profile retrieval (GET /api/users/me)...")
        
        if not self.access_token:
            logger.error("❌ No access token available for user profile test")
            return {"success": False, "user_data": None}
        
        try:
            async with self.session.get(
                f"{self.base_url}/api/users/me",
                headers=self.get_auth_headers()
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    logger.info("✅ User profile retrieval successful!")
                    
                    # Analyze user data structure for Profile Tab requirements
                    logger.info("📊 User Data Structure Analysis:")
                    logger.info(f"   ID: {data.get('id', 'N/A')}")
                    logger.info(f"   Email: {data.get('email', 'N/A')}")
                    logger.info(f"   First Name: {data.get('first_name', 'N/A')}")
                    logger.info(f"   Last Name: {data.get('last_name', 'N/A')}")
                    logger.info(f"   Display Name: {data.get('display_name', 'N/A')}")
                    logger.info(f"   Avatar URL: {data.get('avatar_url', 'N/A')}")
                    logger.info(f"   Bio: {data.get('bio', 'N/A')}")
                    logger.info(f"   Language: {data.get('language', 'N/A')}")
                    logger.info(f"   Daily Calorie Goal: {data.get('daily_calorie_goal', 'N/A')}")
                    logger.info(f"   Dietary Restrictions: {data.get('dietary_restrictions', 'N/A')}")
                    logger.info(f"   Allergens: {data.get('allergens', 'N/A')}")
                    logger.info(f"   Created At: {data.get('created_at', 'N/A')}")
                    logger.info(f"   Last Login: {data.get('last_login', 'N/A')}")
                    
                    # Check for Profile Tab required fields
                    profile_fields = {
                        "first_name": data.get('first_name'),
                        "last_name": data.get('last_name'),
                        "email": data.get('email'),
                        "bio": data.get('bio'),
                        "avatar_url": data.get('avatar_url'),
                        "display_name": data.get('display_name')
                    }
                    
                    logger.info("🎯 Profile Tab Field Availability:")
                    for field, value in profile_fields.items():
                        status = "✅ Available" if value is not None else "❌ Missing"
                        logger.info(f"   {field}: {status}")
                    
                    return {"success": True, "user_data": data, "profile_fields": profile_fields}
                else:
                    logger.error(f"❌ User profile retrieval failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return {"success": False, "user_data": None}
                    
        except Exception as e:
            logger.error(f"❌ User profile retrieval failed with exception: {str(e)}")
            return {"success": False, "user_data": None}
    
    async def test_profile_update_endpoints(self) -> bool:
        """Test PUT /api/users/me endpoint for profile updates."""
        logger.info("✏️ Testing profile update endpoint (PUT /api/users/me)...")
        
        if not self.access_token:
            logger.error("❌ No access token available for profile update test")
            return False
        
        # Test updating profile information that would be used by Edit Profile screen
        update_data = {
            "first_name": "Updated",
            "last_name": "Profile",
            "bio": "This is a test bio for the Profile Tab integration testing. Updated via API.",
            "display_name": "Updated Profile Tester"
        }
        
        try:
            async with self.session.put(
                f"{self.base_url}/api/users/me",
                json=update_data,
                headers={**self.get_auth_headers(), "Content-Type": "application/json"}
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    logger.info("✅ Profile update successful!")
                    
                    # Verify the updates were applied
                    logger.info("📝 Updated Profile Data:")
                    logger.info(f"   First Name: {data.get('first_name')}")
                    logger.info(f"   Last Name: {data.get('last_name')}")
                    logger.info(f"   Bio: {data.get('bio')}")
                    logger.info(f"   Display Name: {data.get('display_name')}")
                    
                    # Verify the changes match what we sent
                    for field, expected_value in update_data.items():
                        actual_value = data.get(field)
                        if actual_value == expected_value:
                            logger.info(f"   ✅ {field} updated correctly: {actual_value}")
                        else:
                            logger.warning(f"   ⚠️ {field} mismatch - expected: {expected_value}, got: {actual_value}")
                    
                    return True
                else:
                    logger.error(f"❌ Profile update failed with status {response.status}")
                    text = await response.text()
                    logger.error(f"Response: {text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Profile update failed with exception: {str(e)}")
            return False
    
    async def test_profile_data_persistence(self) -> bool:
        """Test that profile updates persist by retrieving the profile again."""
        logger.info("💾 Testing profile data persistence...")
        
        if not self.access_token:
            logger.error("❌ No access token available for persistence test")
            return False
        
        try:
            async with self.session.get(
                f"{self.base_url}/api/users/me",
                headers=self.get_auth_headers()
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    logger.info("✅ Profile data retrieved after update!")
                    
                    # Check if our previous updates are still there
                    expected_values = {
                        "first_name": "Updated",
                        "last_name": "Profile",
                        "bio": "This is a test bio for the Profile Tab integration testing. Updated via API.",
                        "display_name": "Updated Profile Tester"
                    }
                    
                    logger.info("🔍 Verifying data persistence:")
                    all_persisted = True
                    for field, expected_value in expected_values.items():
                        actual_value = data.get(field)
                        if actual_value == expected_value:
                            logger.info(f"   ✅ {field} persisted correctly")
                        else:
                            logger.warning(f"   ⚠️ {field} not persisted - expected: {expected_value}, got: {actual_value}")
                            all_persisted = False
                    
                    return all_persisted
                else:
                    logger.error(f"❌ Profile retrieval for persistence test failed with status {response.status}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Profile persistence test failed with exception: {str(e)}")
            return False
    
    async def test_authentication_after_tab_changes(self) -> bool:
        """Test that authentication still works correctly after tab bar changes."""
        logger.info("🔄 Testing authentication stability after tab bar changes...")
        
        # Test that we can still make authenticated requests
        if not self.access_token:
            logger.error("❌ No access token available for authentication stability test")
            return False
        
        # Make multiple authenticated requests to ensure stability
        endpoints_to_test = [
            ("/api/users/me", "User Profile"),
            ("/api/posts", "Posts Feed"),
            ("/api/shopping-list", "Shopping List"),
            ("/api/notifications/unread-count", "Notifications")
        ]
        
        all_working = True
        for endpoint, name in endpoints_to_test:
            try:
                async with self.session.get(
                    f"{self.base_url}{endpoint}",
                    headers=self.get_auth_headers()
                ) as response:
                    
                    if response.status == 200:
                        logger.info(f"   ✅ {name} endpoint working")
                    elif response.status in [401, 403]:
                        logger.error(f"   ❌ {name} endpoint authentication failed")
                        all_working = False
                    else:
                        logger.warning(f"   ⚠️ {name} endpoint returned {response.status}")
                        
            except Exception as e:
                logger.error(f"   ❌ {name} endpoint failed with exception: {str(e)}")
                all_working = False
        
        if all_working:
            logger.info("✅ Authentication working correctly across all endpoints")
        else:
            logger.error("❌ Some authentication issues detected")
        
        return all_working
    
    async def run_profile_tab_tests(self) -> Dict[str, Any]:
        """Run all Profile Tab integration tests."""
        logger.info("🎯 Starting YaCook Profile Tab Integration Tests...")
        logger.info("="*60)
        
        results = {
            "health_check": False,
            "authentication": False,
            "user_profile_retrieval": False,
            "profile_update": False,
            "data_persistence": False,
            "auth_stability": False,
            "user_data_structure": None,
            "profile_fields_available": None
        }
        
        # Test 1: Health Check
        results["health_check"] = await self.test_health_check()
        
        # Test 2: Authentication with Demo Credentials
        results["authentication"] = await self.test_authentication_with_demo_credentials()
        
        if not results["authentication"]:
            logger.error("❌ Cannot proceed with Profile Tab tests - authentication failed")
            return results
        
        # Test 3: User Profile Data Structure
        profile_result = await self.test_user_profile_retrieval()
        results["user_profile_retrieval"] = profile_result["success"]
        results["user_data_structure"] = profile_result.get("user_data")
        results["profile_fields_available"] = profile_result.get("profile_fields")
        
        # Test 4: Profile Update Endpoints
        results["profile_update"] = await self.test_profile_update_endpoints()
        
        # Test 5: Data Persistence
        results["data_persistence"] = await self.test_profile_data_persistence()
        
        # Test 6: Authentication Stability
        results["auth_stability"] = await self.test_authentication_after_tab_changes()
        
        return results

async def main():
    """Main test runner for Profile Tab integration."""
    async with ProfileTabTester() as tester:
        results = await tester.run_profile_tab_tests()
        
        # Print summary
        print("\n" + "="*60)
        print("🎯 YaCook Profile Tab Integration Test Results")
        print("="*60)
        
        # Core functionality tests
        core_tests = [
            ("health_check", "Backend Health Check"),
            ("authentication", "Demo Credentials Authentication"),
            ("user_profile_retrieval", "User Profile Data Retrieval"),
            ("profile_update", "Profile Update Endpoint"),
            ("data_persistence", "Profile Data Persistence"),
            ("auth_stability", "Authentication Stability")
        ]
        
        passed = 0
        total = len(core_tests)
        
        for test_key, test_name in core_tests:
            result = results.get(test_key, False)
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name}: {status}")
            if result:
                passed += 1
        
        print(f"\nCore Tests: {passed}/{total} passed")
        
        # Profile Tab Readiness Assessment
        print("\n" + "="*60)
        print("📋 Profile Tab Integration Readiness Assessment")
        print("="*60)
        
        if results["profile_fields_available"]:
            print("Available Profile Fields:")
            for field, value in results["profile_fields_available"].items():
                status = "✅" if value is not None else "❌"
                print(f"  {status} {field}: {value if value is not None else 'Not available'}")
        
        # Overall assessment
        critical_tests = ["health_check", "authentication", "user_profile_retrieval", "profile_update"]
        critical_passed = sum(1 for test in critical_tests if results.get(test, False))
        
        print(f"\n🎯 Profile Tab Integration Status:")
        if critical_passed == len(critical_tests):
            print("✅ READY - All critical endpoints working correctly")
            print("✅ Backend is ready to support Profile Tab functionality")
        else:
            print("❌ NOT READY - Critical issues found")
            print("❌ Profile Tab integration may have issues")
        
        return critical_passed == len(critical_tests)

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)