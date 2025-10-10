#!/usr/bin/env python3
"""
YaCook Profile Tab Backend Analysis
Analyzes backend readiness for Profile Tab functionality and identifies missing fields
"""

import asyncio
import aiohttp
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ProfileTabAnalyzer:
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.session: Optional[aiohttp.ClientSession] = None
        self.access_token: Optional[str] = None
        
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
    
    async def authenticate(self) -> bool:
        """Authenticate with demo credentials."""
        demo_credentials = [
            {"email": "chef.marie@yacook.fr", "password": "SecurePass123!"},
            {"email": "test@example.com", "password": "testpassword123"}
        ]
        
        for creds in demo_credentials:
            try:
                async with self.session.post(
                    f"{self.base_url}/api/auth/login",
                    json=creds,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    
                    if response.status == 200:
                        data = await response.json()
                        self.access_token = data.get("access_token")
                        logger.info(f"✅ Authenticated with {creds['email']}")
                        return True
                        
            except Exception as e:
                continue
        
        return False
    
    async def analyze_current_user_data_structure(self) -> Dict[str, Any]:
        """Analyze the current user data structure from GET /api/users/me."""
        logger.info("📊 Analyzing current user data structure...")
        
        try:
            async with self.session.get(
                f"{self.base_url}/api/users/me",
                headers=self.get_auth_headers()
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    
                    logger.info("Current User Data Structure:")
                    for key, value in data.items():
                        value_type = type(value).__name__
                        logger.info(f"  {key}: {value} ({value_type})")
                    
                    return data
                else:
                    logger.error(f"Failed to get user data: {response.status}")
                    return {}
                    
        except Exception as e:
            logger.error(f"Error analyzing user data: {str(e)}")
            return {}
    
    async def test_profile_update_fields(self) -> Dict[str, Any]:
        """Test which fields can be updated via PUT /api/users/me."""
        logger.info("🧪 Testing profile update capabilities...")
        
        # Fields that the Profile Tab might want to update
        test_fields = {
            "first_name": "Test First",
            "last_name": "Test Last", 
            "display_name": "Test Display Name",
            "bio": "This is a test bio for profile tab",
            "avatar_url": "https://example.com/avatar.jpg",
            "language": "en",
            "timezone": "Europe/Paris",
            "daily_calorie_goal": 1800,
            "dietary_restrictions": ["vegetarian"],
            "allergens": ["nuts"],
            "profile_public": True,
            "notifications_enabled": False
        }
        
        results = {}
        
        for field, test_value in test_fields.items():
            logger.info(f"Testing field: {field}")
            
            # Test updating single field
            update_data = {field: test_value}
            
            try:
                async with self.session.put(
                    f"{self.base_url}/api/users/me",
                    json=update_data,
                    headers={**self.get_auth_headers(), "Content-Type": "application/json"}
                ) as response:
                    
                    if response.status == 200:
                        data = await response.json()
                        actual_value = data.get(field)
                        
                        if actual_value == test_value:
                            results[field] = {"status": "✅ SUPPORTED", "updated": True, "persisted": True}
                            logger.info(f"  ✅ {field}: Successfully updated and persisted")
                        elif actual_value is not None:
                            results[field] = {"status": "⚠️ PARTIAL", "updated": True, "persisted": False, "actual": actual_value}
                            logger.info(f"  ⚠️ {field}: Updated but value differs - expected: {test_value}, got: {actual_value}")
                        else:
                            results[field] = {"status": "❌ NOT_PERSISTED", "updated": False, "persisted": False}
                            logger.info(f"  ❌ {field}: Update accepted but not persisted")
                    elif response.status == 422:
                        # Validation error - field might not be supported
                        error_data = await response.json()
                        results[field] = {"status": "❌ VALIDATION_ERROR", "error": error_data}
                        logger.info(f"  ❌ {field}: Validation error - {error_data}")
                    else:
                        results[field] = {"status": "❌ ERROR", "status_code": response.status}
                        logger.info(f"  ❌ {field}: HTTP error {response.status}")
                        
            except Exception as e:
                results[field] = {"status": "❌ EXCEPTION", "error": str(e)}
                logger.info(f"  ❌ {field}: Exception - {str(e)}")
        
        return results
    
    def analyze_profile_tab_requirements(self) -> Dict[str, Any]:
        """Define what the Profile Tab needs based on the implementation."""
        return {
            "profile_home_screen": {
                "required_fields": [
                    "first_name",  # For display name
                    "last_name",   # For display name  
                    "email",       # For user identification
                    "avatar_url"   # For profile picture (with fallback to initials)
                ],
                "optional_fields": [
                    "display_name"  # Alternative to first_name + last_name
                ]
            },
            "edit_profile_screen": {
                "required_fields": [
                    "first_name",   # Name field (required)
                    "last_name",    # Name field (required)
                    "email"         # Email field (read-only)
                ],
                "optional_fields": [
                    "bio",          # Bio field (multiline optional)
                    "avatar_url"    # Avatar with change photo button
                ]
            },
            "settings_screen": {
                "required_fields": [
                    "language",                # Units selector (métrique/impérial)
                    "dietary_restrictions",    # Food Preferences checkboxes
                    "notifications_enabled"    # Notifications toggles
                ],
                "optional_fields": [
                    "daily_calorie_goal",      # Nutrition preferences
                    "allergens",               # Food restrictions
                    "profile_public",          # Privacy settings
                    "timezone"                 # User preferences
                ]
            }
        }
    
    async def generate_profile_tab_readiness_report(self) -> Dict[str, Any]:
        """Generate comprehensive readiness report for Profile Tab integration."""
        logger.info("📋 Generating Profile Tab Readiness Report...")
        
        # Get current user data structure
        current_data = await self.analyze_current_user_data_structure()
        
        # Test update capabilities
        update_results = await self.test_profile_update_fields()
        
        # Get requirements
        requirements = self.analyze_profile_tab_requirements()
        
        # Analyze readiness for each screen
        readiness_report = {}
        
        for screen_name, screen_reqs in requirements.items():
            logger.info(f"\n🔍 Analyzing {screen_name.replace('_', ' ').title()}...")
            
            screen_analysis = {
                "required_fields_status": {},
                "optional_fields_status": {},
                "readiness_score": 0,
                "missing_critical": [],
                "missing_optional": []
            }
            
            # Check required fields
            required_count = len(screen_reqs["required_fields"])
            required_available = 0
            
            for field in screen_reqs["required_fields"]:
                if field in current_data and current_data[field] is not None:
                    screen_analysis["required_fields_status"][field] = "✅ Available"
                    required_available += 1
                    logger.info(f"  ✅ Required field '{field}': Available")
                else:
                    screen_analysis["required_fields_status"][field] = "❌ Missing"
                    screen_analysis["missing_critical"].append(field)
                    logger.info(f"  ❌ Required field '{field}': Missing")
            
            # Check optional fields
            optional_count = len(screen_reqs["optional_fields"])
            optional_available = 0
            
            for field in screen_reqs["optional_fields"]:
                if field in current_data and current_data[field] is not None:
                    screen_analysis["optional_fields_status"][field] = "✅ Available"
                    optional_available += 1
                    logger.info(f"  ✅ Optional field '{field}': Available")
                else:
                    screen_analysis["optional_fields_status"][field] = "❌ Missing"
                    screen_analysis["missing_optional"].append(field)
                    logger.info(f"  ⚠️ Optional field '{field}': Missing")
            
            # Calculate readiness score
            total_fields = required_count + optional_count
            available_fields = required_available + optional_available
            screen_analysis["readiness_score"] = (available_fields / total_fields * 100) if total_fields > 0 else 100
            
            # Determine overall status
            if required_available == required_count:
                if optional_available == optional_count:
                    screen_analysis["status"] = "✅ FULLY READY"
                else:
                    screen_analysis["status"] = "⚠️ READY (missing optional features)"
            else:
                screen_analysis["status"] = "❌ NOT READY (missing critical fields)"
            
            logger.info(f"  📊 {screen_name.replace('_', ' ').title()} Status: {screen_analysis['status']}")
            logger.info(f"  📊 Readiness Score: {screen_analysis['readiness_score']:.1f}%")
            
            readiness_report[screen_name] = screen_analysis
        
        return {
            "current_data_structure": current_data,
            "update_capabilities": update_results,
            "requirements": requirements,
            "screen_readiness": readiness_report,
            "overall_assessment": self.calculate_overall_assessment(readiness_report)
        }
    
    def calculate_overall_assessment(self, readiness_report: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate overall Profile Tab integration assessment."""
        total_screens = len(readiness_report)
        ready_screens = sum(1 for screen in readiness_report.values() 
                          if not screen["missing_critical"])
        
        overall_score = sum(screen["readiness_score"] for screen in readiness_report.values()) / total_screens
        
        if ready_screens == total_screens:
            status = "✅ READY FOR INTEGRATION"
            recommendation = "All Profile Tab screens can be implemented with current backend"
        elif ready_screens >= total_screens * 0.7:
            status = "⚠️ MOSTLY READY"
            recommendation = "Most features can be implemented, some optional features missing"
        else:
            status = "❌ NOT READY"
            recommendation = "Critical fields missing, backend updates required"
        
        return {
            "status": status,
            "overall_score": overall_score,
            "ready_screens": ready_screens,
            "total_screens": total_screens,
            "recommendation": recommendation
        }

async def main():
    """Main analyzer runner."""
    async with ProfileTabAnalyzer() as analyzer:
        # Authenticate
        if not await analyzer.authenticate():
            logger.error("❌ Authentication failed")
            return False
        
        # Generate comprehensive report
        report = await analyzer.generate_profile_tab_readiness_report()
        
        # Print summary
        print("\n" + "="*80)
        print("📋 YaCook Profile Tab Backend Readiness Report")
        print("="*80)
        
        # Overall assessment
        assessment = report["overall_assessment"]
        print(f"\n🎯 Overall Assessment: {assessment['status']}")
        print(f"📊 Overall Readiness Score: {assessment['overall_score']:.1f}%")
        print(f"✅ Ready Screens: {assessment['ready_screens']}/{assessment['total_screens']}")
        print(f"💡 Recommendation: {assessment['recommendation']}")
        
        # Screen-by-screen breakdown
        print(f"\n📱 Screen-by-Screen Analysis:")
        for screen_name, screen_data in report["screen_readiness"].items():
            print(f"\n  {screen_name.replace('_', ' ').title()}:")
            print(f"    Status: {screen_data['status']}")
            print(f"    Score: {screen_data['readiness_score']:.1f}%")
            
            if screen_data["missing_critical"]:
                print(f"    ❌ Missing Critical: {', '.join(screen_data['missing_critical'])}")
            
            if screen_data["missing_optional"]:
                print(f"    ⚠️ Missing Optional: {', '.join(screen_data['missing_optional'])}")
        
        # Field update capabilities
        print(f"\n🔧 Profile Update Capabilities:")
        update_results = report["update_capabilities"]
        
        supported_fields = [field for field, result in update_results.items() 
                          if result["status"].startswith("✅")]
        partial_fields = [field for field, result in update_results.items() 
                        if result["status"].startswith("⚠️")]
        unsupported_fields = [field for field, result in update_results.items() 
                            if result["status"].startswith("❌")]
        
        if supported_fields:
            print(f"  ✅ Fully Supported: {', '.join(supported_fields)}")
        if partial_fields:
            print(f"  ⚠️ Partially Supported: {', '.join(partial_fields)}")
        if unsupported_fields:
            print(f"  ❌ Not Supported: {', '.join(unsupported_fields)}")
        
        # Recommendations for missing fields
        print(f"\n💡 Backend Enhancement Recommendations:")
        all_missing = set()
        for screen_data in report["screen_readiness"].values():
            all_missing.update(screen_data["missing_critical"])
            all_missing.update(screen_data["missing_optional"])
        
        if all_missing:
            print("  To fully support Profile Tab functionality, consider adding these fields to the user model:")
            for field in sorted(all_missing):
                field_type = "Optional[str]" if field in ["bio", "avatar_url"] else "Optional[Any]"
                print(f"    {field}: {field_type}")
        else:
            print("  ✅ No backend enhancements needed!")
        
        return assessment["status"].startswith("✅")

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)