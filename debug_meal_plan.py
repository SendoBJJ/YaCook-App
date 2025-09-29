#!/usr/bin/env python3
"""
Debug meal plan generation endpoint
"""

import asyncio
import aiohttp
import json

async def debug_meal_plan():
    base_url = "https://meal-app-preview.preview.emergentagent.com"
    
    async with aiohttp.ClientSession() as session:
        # First, register/login to get a token
        login_data = {
            "email": "chef.marie@yacook.fr",
            "password": "SecurePass123!"
        }
        
        async with session.post(
            f"{base_url}/api/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        ) as response:
            if response.status == 200:
                data = await response.json()
                access_token = data.get("access_token")
                print(f"Got access token: {access_token[:20]}...")
            else:
                print(f"Login failed: {response.status}")
                return
        
        # Now test meal plan generation with different approaches
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # Test 1: Query parameters
        print("\n=== Test 1: Query parameters ===")
        async with session.post(
            f"{base_url}/api/ai/generate-meal-plan?days=7&daily_calories=2000",
            headers=headers
        ) as response:
            print(f"Status: {response.status}")
            text = await response.text()
            print(f"Response: {text[:500]}...")
        
        # Test 2: JSON body
        print("\n=== Test 2: JSON body ===")
        meal_plan_data = {
            "days": 7,
            "daily_calories": 2000,
            "dietary_restrictions": []
        }
        async with session.post(
            f"{base_url}/api/ai/generate-meal-plan",
            json=meal_plan_data,
            headers={**headers, "Content-Type": "application/json"}
        ) as response:
            print(f"Status: {response.status}")
            text = await response.text()
            print(f"Response: {text[:500]}...")
        
        # Test 3: Form data
        print("\n=== Test 3: Form data ===")
        form_data = aiohttp.FormData()
        form_data.add_field('days', '7')
        form_data.add_field('daily_calories', '2000')
        
        async with session.post(
            f"{base_url}/api/ai/generate-meal-plan",
            data=form_data,
            headers=headers
        ) as response:
            print(f"Status: {response.status}")
            text = await response.text()
            print(f"Response: {text[:500]}...")

if __name__ == "__main__":
    asyncio.run(debug_meal_plan())