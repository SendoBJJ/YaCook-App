#!/usr/bin/env python3
"""
YaCook Authentication Testing Suite
Focused testing for authentication endpoints to diagnose login issues
"""

import asyncio
import aiohttp
import json
import logging
import time
from typing import Dict, Any, Optional, List
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class YaCookAuthTester:
    def __init__(self, base_url: str = "https://yacook-native.preview.emergentagent.com"):
        self.base_url = base_url
        self.session: Optional[aiohttp.ClientSession] = None
        self.test_results: List[Dict[str, Any]] = []
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            connector=aiohttp.TCPConnector(ssl=False)
        )
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def log_test_result(self, test_name: str, success: bool, details: Dict[str, Any]):
        """Log test result for summary."""
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def test_demo_user_login_scenarios(self) -> Dict[str, Any]:
        """Test various demo user login scenarios."""
        logger.info("🔐 Testing demo user login scenarios...")
        
        # Common demo credentials to test
        demo_credentials = [
            {"email": "test@example.com", "password": "testpassword123", "description": "Common test user"},
            {"email": "chef.marie@yacook.fr", "password": "password123", "description": "Chef Marie demo user"},
            {"email": "chef.marie@yacook.fr", "password": "SecurePass123!", "description": "Chef Marie with secure password"},
            {"email": "demo@yacook.fr", "password": "demo123", "description": "Demo user"},
            {"email": "user@yacook.fr", "password": "user123", "description": "Generic user"},
            {"email": "admin@yacook.fr", "password": "admin123", "description": "Admin user"}
        ]
        
        successful_logins = []
        failed_logins = []
        
        for creds in demo_credentials:
            logger.info(f"Testing login for: {creds['email']} ({creds['description']})")
            
            try:
                async with self.session.post(
                    f"{self.base_url}/api/auth/login",
                    json={
                        "email": creds["email"],
                        "password": creds["password"]
                    },
                    headers={"Content-Type": "application/json"}
                ) as response:
                    
                    response_text = await response.text()
                    
                    if response.status == 200:
                        try:
                            data = await response.json() if response.content_type == 'application/json' else json.loads(response_text)
                            successful_logins.append({
                                "email": creds["email"],
                                "description": creds["description"],
                                "response": data,
                                "has_access_token": "access_token" in data,
                                "has_refresh_token": "refresh_token" in data,
                                "user_info": data.get("user", {})
                            })
                            logger.info(f"✅ Login successful for {creds['email']}")
                        except json.JSONDecodeError:
                            logger.error(f"❌ Login response not valid JSON for {creds['email']}: {response_text}")
                            failed_logins.append({
                                "email": creds["email"],
                                "description": creds["description"],
                                "status": response.status,
                                "error": "Invalid JSON response",
                                "response_text": response_text
                            })
                    else:
                        try:
                            error_data = await response.json() if response.content_type == 'application/json' else {"detail": response_text}
                        except:
                            error_data = {"detail": response_text}
                        
                        failed_logins.append({
                            "email": creds["email"],
                            "description": creds["description"],
                            "status": response.status,
                            "error": error_data.get("detail", "Unknown error"),
                            "response_text": response_text
                        })
                        logger.info(f"❌ Login failed for {creds['email']}: {response.status} - {error_data.get('detail', 'Unknown error')}")
                        
            except Exception as e:
                failed_logins.append({
                    "email": creds["email"],
                    "description": creds["description"],
                    "status": "exception",
                    "error": str(e),
                    "response_text": ""
                })
                logger.error(f"❌ Login exception for {creds['email']}: {str(e)}")
        
        result = {
            "successful_logins": successful_logins,
            "failed_logins": failed_logins,
            "total_tested": len(demo_credentials),
            "success_count": len(successful_logins),
            "failure_count": len(failed_logins)
        }
        
        self.log_test_result("demo_user_login_scenarios", len(successful_logins) > 0, result)
        return result
    
    async def test_registration_flow(self) -> Dict[str, Any]:
        """Test user registration flow."""
        logger.info("📝 Testing user registration flow...")
        
        # Generate unique test user
        timestamp = int(time.time())
        test_email = f"newuser{timestamp}@test.com"
        
        registration_data = {
            "email": test_email,
            "password": "testpass123",
            "first_name": "Test",
            "last_name": "User",
            "auth_provider": "email",
            "language": "fr",
            "daily_calorie_goal": 2000,
            "dietary_restrictions": [],
            "allergens": []
        }
        
        try:
            async with self.session.post(
                f"{self.base_url}/api/auth/register",
                json=registration_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                
                response_text = await response.text()
                
                if response.status == 200:
                    try:
                        data = await response.json() if response.content_type == 'application/json' else json.loads(response_text)
                        result = {
                            "success": True,
                            "email": test_email,
                            "response": data,
                            "has_access_token": "access_token" in data,
                            "has_refresh_token": "refresh_token" in data,
                            "user_info": data.get("user", {}),
                            "status": response.status
                        }
                        logger.info(f"✅ Registration successful for {test_email}")
                        
                        # Test immediate login with new credentials
                        login_result = await self.test_specific_login(test_email, "testpass123")
                        result["immediate_login_test"] = login_result
                        
                    except json.JSONDecodeError:
                        result = {
                            "success": False,
                            "email": test_email,
                            "error": "Invalid JSON response",
                            "response_text": response_text,
                            "status": response.status
                        }
                        logger.error(f"❌ Registration response not valid JSON: {response_text}")
                else:
                    try:
                        error_data = await response.json() if response.content_type == 'application/json' else {"detail": response_text}
                    except:
                        error_data = {"detail": response_text}
                    
                    result = {
                        "success": False,
                        "email": test_email,
                        "error": error_data.get("detail", "Unknown error"),
                        "response_text": response_text,
                        "status": response.status
                    }
                    logger.info(f"❌ Registration failed for {test_email}: {response.status} - {error_data.get('detail', 'Unknown error')}")
                    
        except Exception as e:
            result = {
                "success": False,
                "email": test_email,
                "error": str(e),
                "response_text": "",
                "status": "exception"
            }
            logger.error(f"❌ Registration exception for {test_email}: {str(e)}")
        
        self.log_test_result("registration_flow", result.get("success", False), result)
        return result
    
    async def test_specific_login(self, email: str, password: str) -> Dict[str, Any]:
        """Test login for specific credentials."""
        try:
            async with self.session.post(
                f"{self.base_url}/api/auth/login",
                json={"email": email, "password": password},
                headers={"Content-Type": "application/json"}
            ) as response:
                
                response_text = await response.text()
                
                if response.status == 200:
                    try:
                        data = await response.json() if response.content_type == 'application/json' else json.loads(response_text)
                        return {
                            "success": True,
                            "email": email,
                            "response": data,
                            "has_access_token": "access_token" in data,
                            "has_refresh_token": "refresh_token" in data,
                            "user_info": data.get("user", {}),
                            "status": response.status
                        }
                    except json.JSONDecodeError:
                        return {
                            "success": False,
                            "email": email,
                            "error": "Invalid JSON response",
                            "response_text": response_text,
                            "status": response.status
                        }
                else:
                    try:
                        error_data = await response.json() if response.content_type == 'application/json' else {"detail": response_text}
                    except:
                        error_data = {"detail": response_text}
                    
                    return {
                        "success": False,
                        "email": email,
                        "error": error_data.get("detail", "Unknown error"),
                        "response_text": response_text,
                        "status": response.status
                    }
                    
        except Exception as e:
            return {
                "success": False,
                "email": email,
                "error": str(e),
                "response_text": "",
                "status": "exception"
            }
    
    async def test_cors_and_headers(self) -> Dict[str, Any]:
        """Test CORS configuration and headers."""
        logger.info("🌐 Testing CORS configuration and headers...")
        
        # Test OPTIONS request (preflight)
        cors_results = {}
        
        try:
            async with self.session.options(
                f"{self.base_url}/api/auth/login",
                headers={
                    "Origin": "https://yacook-native.preview.emergentagent.com",
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "Content-Type, Authorization"
                }
            ) as response:
                
                cors_results["preflight"] = {
                    "status": response.status,
                    "headers": dict(response.headers),
                    "allows_credentials": response.headers.get("Access-Control-Allow-Credentials", "").lower() == "true",
                    "allows_origin": response.headers.get("Access-Control-Allow-Origin", ""),
                    "allows_methods": response.headers.get("Access-Control-Allow-Methods", ""),
                    "allows_headers": response.headers.get("Access-Control-Allow-Headers", "")
                }
                
                logger.info(f"CORS preflight status: {response.status}")
                logger.info(f"CORS allows credentials: {cors_results['preflight']['allows_credentials']}")
                logger.info(f"CORS allows origin: {cors_results['preflight']['allows_origin']}")
                
        except Exception as e:
            cors_results["preflight"] = {
                "error": str(e),
                "status": "exception"
            }
            logger.error(f"❌ CORS preflight test failed: {str(e)}")
        
        # Test actual POST request with CORS headers
        try:
            async with self.session.post(
                f"{self.base_url}/api/auth/login",
                json={"email": "test@example.com", "password": "testpassword123"},
                headers={
                    "Content-Type": "application/json",
                    "Origin": "https://yacook-native.preview.emergentagent.com"
                }
            ) as response:
                
                cors_results["actual_request"] = {
                    "status": response.status,
                    "headers": dict(response.headers),
                    "has_cors_headers": "Access-Control-Allow-Origin" in response.headers
                }
                
                logger.info(f"Actual request status: {response.status}")
                logger.info(f"Has CORS headers: {cors_results['actual_request']['has_cors_headers']}")
                
        except Exception as e:
            cors_results["actual_request"] = {
                "error": str(e),
                "status": "exception"
            }
            logger.error(f"❌ CORS actual request test failed: {str(e)}")
        
        result = {
            "cors_results": cors_results,
            "cors_properly_configured": (
                cors_results.get("preflight", {}).get("status") in [200, 204] and
                cors_results.get("actual_request", {}).get("has_cors_headers", False)
            )
        }
        
        self.log_test_result("cors_and_headers", result["cors_properly_configured"], result)
        return result
    
    async def test_jwt_token_validation(self, access_token: str) -> Dict[str, Any]:
        """Test JWT token validation."""
        logger.info("🔑 Testing JWT token validation...")
        
        if not access_token:
            result = {
                "success": False,
                "error": "No access token provided"
            }
            self.log_test_result("jwt_token_validation", False, result)
            return result
        
        # Test protected endpoint with token
        try:
            async with self.session.get(
                f"{self.base_url}/api/users/me",
                headers={"Authorization": f"Bearer {access_token}"}
            ) as response:
                
                response_text = await response.text()
                
                if response.status == 200:
                    try:
                        data = await response.json() if response.content_type == 'application/json' else json.loads(response_text)
                        result = {
                            "success": True,
                            "user_profile": data,
                            "token_valid": True,
                            "status": response.status
                        }
                        logger.info("✅ JWT token validation successful")
                    except json.JSONDecodeError:
                        result = {
                            "success": False,
                            "error": "Invalid JSON response",
                            "response_text": response_text,
                            "status": response.status
                        }
                        logger.error(f"❌ JWT validation response not valid JSON: {response_text}")
                else:
                    try:
                        error_data = await response.json() if response.content_type == 'application/json' else {"detail": response_text}
                    except:
                        error_data = {"detail": response_text}
                    
                    result = {
                        "success": False,
                        "token_valid": False,
                        "error": error_data.get("detail", "Unknown error"),
                        "response_text": response_text,
                        "status": response.status
                    }
                    logger.info(f"❌ JWT token validation failed: {response.status} - {error_data.get('detail', 'Unknown error')}")
                    
        except Exception as e:
            result = {
                "success": False,
                "error": str(e),
                "response_text": "",
                "status": "exception"
            }
            logger.error(f"❌ JWT token validation exception: {str(e)}")
        
        self.log_test_result("jwt_token_validation", result.get("success", False), result)
        return result
    
    async def test_health_check(self) -> Dict[str, Any]:
        """Test health check endpoint."""
        logger.info("🏥 Testing health check endpoint...")
        
        try:
            async with self.session.get(f"{self.base_url}/api/health") as response:
                response_text = await response.text()
                
                if response.status == 200:
                    try:
                        data = await response.json() if response.content_type == 'application/json' else json.loads(response_text)
                        result = {
                            "success": True,
                            "health_data": data,
                            "status": response.status
                        }
                        logger.info("✅ Health check successful")
                    except json.JSONDecodeError:
                        result = {
                            "success": False,
                            "error": "Invalid JSON response",
                            "response_text": response_text,
                            "status": response.status
                        }
                        logger.error(f"❌ Health check response not valid JSON: {response_text}")
                else:
                    result = {
                        "success": False,
                        "error": f"Health check failed with status {response.status}",
                        "response_text": response_text,
                        "status": response.status
                    }
                    logger.error(f"❌ Health check failed: {response.status}")
                    
        except Exception as e:
            result = {
                "success": False,
                "error": str(e),
                "response_text": "",
                "status": "exception"
            }
            logger.error(f"❌ Health check exception: {str(e)}")
        
        self.log_test_result("health_check", result.get("success", False), result)
        return result
    
    async def run_comprehensive_auth_tests(self) -> Dict[str, Any]:
        """Run all authentication tests."""
        logger.info("🚀 Starting comprehensive YaCook authentication tests...")
        
        all_results = {}
        
        # Test 1: Health check
        all_results["health_check"] = await self.test_health_check()
        
        # Test 2: CORS configuration
        all_results["cors_and_headers"] = await self.test_cors_and_headers()
        
        # Test 3: Demo user login scenarios
        all_results["demo_user_login_scenarios"] = await self.test_demo_user_login_scenarios()
        
        # Test 4: Registration flow
        all_results["registration_flow"] = await self.test_registration_flow()
        
        # Test 5: JWT token validation (if we have a successful login)
        access_token = None
        
        # Try to get access token from successful login
        if all_results["demo_user_login_scenarios"]["successful_logins"]:
            access_token = all_results["demo_user_login_scenarios"]["successful_logins"][0]["response"].get("access_token")
        elif all_results["registration_flow"].get("success") and all_results["registration_flow"].get("response"):
            access_token = all_results["registration_flow"]["response"].get("access_token")
        
        if access_token:
            all_results["jwt_token_validation"] = await self.test_jwt_token_validation(access_token)
        else:
            all_results["jwt_token_validation"] = {
                "success": False,
                "error": "No access token available from previous tests"
            }
            self.log_test_result("jwt_token_validation", False, all_results["jwt_token_validation"])
        
        return all_results
    
    def print_summary(self, results: Dict[str, Any]):
        """Print comprehensive test summary."""
        print("\n" + "="*80)
        print("🔐 YaCook Authentication Test Results Summary")
        print("="*80)
        
        # Overall statistics
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        
        print(f"\nOverall Results: {passed_tests}/{total_tests} tests passed")
        
        # Health check results
        if "health_check" in results:
            health = results["health_check"]
            status = "✅ WORKING" if health["success"] else "❌ FAILED"
            print(f"\n🏥 Health Check: {status}")
            if health["success"]:
                print(f"   Status: {health['health_data'].get('status', 'unknown')}")
            else:
                print(f"   Error: {health.get('error', 'Unknown error')}")
        
        # CORS results
        if "cors_and_headers" in results:
            cors = results["cors_and_headers"]
            status = "✅ WORKING" if cors["cors_properly_configured"] else "❌ ISSUES DETECTED"
            print(f"\n🌐 CORS Configuration: {status}")
            
            preflight = cors["cors_results"].get("preflight", {})
            if "status" in preflight:
                print(f"   Preflight Status: {preflight['status']}")
                print(f"   Allows Credentials: {preflight.get('allows_credentials', False)}")
                print(f"   Allows Origin: {preflight.get('allows_origin', 'Not set')}")
        
        # Demo user login results
        if "demo_user_login_scenarios" in results:
            demo = results["demo_user_login_scenarios"]
            print(f"\n🔐 Demo User Login Tests:")
            print(f"   Total Tested: {demo['total_tested']}")
            print(f"   Successful: {demo['success_count']}")
            print(f"   Failed: {demo['failure_count']}")
            
            if demo["successful_logins"]:
                print(f"\n   ✅ WORKING DEMO CREDENTIALS:")
                for login in demo["successful_logins"]:
                    print(f"   • {login['email']} - {login['description']}")
                    if login.get("has_access_token"):
                        print(f"     → JWT tokens generated successfully")
            
            if demo["failed_logins"]:
                print(f"\n   ❌ FAILED LOGIN ATTEMPTS:")
                for login in demo["failed_logins"]:
                    print(f"   • {login['email']} - {login['description']}")
                    print(f"     → Status: {login['status']}, Error: {login['error']}")
        
        # Registration results
        if "registration_flow" in results:
            reg = results["registration_flow"]
            status = "✅ WORKING" if reg["success"] else "❌ FAILED"
            print(f"\n📝 Registration Flow: {status}")
            if reg["success"]:
                print(f"   New User: {reg['email']}")
                print(f"   JWT Tokens: {'✅' if reg.get('has_access_token') else '❌'}")
                if "immediate_login_test" in reg:
                    login_status = "✅" if reg["immediate_login_test"]["success"] else "❌"
                    print(f"   Immediate Login: {login_status}")
            else:
                print(f"   Error: {reg.get('error', 'Unknown error')}")
        
        # JWT validation results
        if "jwt_token_validation" in results:
            jwt = results["jwt_token_validation"]
            status = "✅ WORKING" if jwt["success"] else "❌ FAILED"
            print(f"\n🔑 JWT Token Validation: {status}")
            if jwt["success"]:
                user_email = jwt["user_profile"].get("email", "Unknown")
                print(f"   Validated User: {user_email}")
            else:
                print(f"   Error: {jwt.get('error', 'Unknown error')}")
        
        # Recommendations
        print(f"\n💡 RECOMMENDATIONS:")
        
        if results.get("demo_user_login_scenarios", {}).get("successful_logins"):
            successful_login = results["demo_user_login_scenarios"]["successful_logins"][0]
            print(f"   ✅ Use these working demo credentials:")
            print(f"      Email: {successful_login['email']}")
            print(f"      Password: [Use the password that worked for this email]")
        else:
            print(f"   ❌ No working demo credentials found!")
            print(f"      → Check if demo users are seeded in database")
            print(f"      → Verify password hashing is working correctly")
        
        if not results.get("cors_and_headers", {}).get("cors_properly_configured", False):
            print(f"   ⚠️  CORS configuration may need attention")
            print(f"      → Check CORS middleware settings")
            print(f"      → Verify allowed origins include frontend URL")
        
        if not results.get("registration_flow", {}).get("success", False):
            print(f"   ⚠️  Registration flow has issues")
            print(f"      → Check database connectivity")
            print(f"      → Verify password hashing service")
        
        print("\n" + "="*80)

async def main():
    """Main test runner for authentication diagnostics."""
    async with YaCookAuthTester() as tester:
        results = await tester.run_comprehensive_auth_tests()
        tester.print_summary(results)
        
        # Return success if at least one login method works
        has_working_login = (
            results.get("demo_user_login_scenarios", {}).get("success_count", 0) > 0 or
            results.get("registration_flow", {}).get("success", False)
        )
        
        return has_working_login

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)