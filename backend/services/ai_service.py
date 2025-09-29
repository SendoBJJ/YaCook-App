from dotenv import load_dotenv
import os
import logging
from typing import Optional, List, Dict, Any
from emergentintegrations.llm.chat import LlmChat, UserMessage
from models.recipe import RecipeBase, Ingredient, CookingStep, DifficultyLevel, MealType, CookingMethod, NutritionalInfo
import json
import re

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class AIRecipeService:
    """Service for AI-powered recipe generation and meal planning."""
    
    def __init__(self):
        self.api_key = os.getenv("EMERGENT_LLM_KEY") or os.getenv("OPENAI_API_KEY")
        self.temperature = 0.5  # Balanced creativity and consistency
        self.max_tokens = 2000
        
        # System messages for different tasks
        self.recipe_generation_prompt = """
Tu es un chef cuisinier français expert en création de recettes. 
Tu dois créer des recettes délicieuses, équilibrées et faciles à réaliser.
Réponds UNIQUEMENT en français.
Formate toujours ta réponse en JSON valide avec la structure demandée.
Sois créatif mais réaliste dans tes suggestions.
"""
        
        self.meal_planning_prompt = """
Tu es un nutritionniste français expert en planification de repas.
Tu dois créer des plans de repas équilibrés et adaptés aux besoins de l'utilisateur.
Réponds UNIQUEMENT en français.
Tiens compte des préférences alimentaires, allergies et objectifs nutritionnels.
"""
    
    async def generate_recipe(
        self, 
        ingredients: Optional[List[str]] = None,
        cuisine_type: Optional[str] = None,
        difficulty: Optional[str] = "moyen",
        prep_time: Optional[int] = None,
        dietary_restrictions: Optional[List[str]] = None,
        user_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Generate a recipe using AI based on given parameters.
        
        Args:
            ingredients: List of ingredients to include
            cuisine_type: Type of cuisine (française, italienne, etc.)
            difficulty: Difficulty level (facile, moyen, difficile)
            prep_time: Maximum preparation time in minutes
            dietary_restrictions: List of dietary restrictions
            user_id: User ID for logging purposes
            
        Returns:
            Generated recipe as dictionary or None if failed
        """
        try:
            # Build the user prompt
            prompt_parts = ["Crée une recette avec les paramètres suivants:"]
            
            if ingredients:
                prompt_parts.append(f"Ingrédients à inclure: {', '.join(ingredients)}")
            
            if cuisine_type:
                prompt_parts.append(f"Type de cuisine: {cuisine_type}")
            
            prompt_parts.append(f"Niveau de difficulté: {difficulty}")
            
            if prep_time:
                prompt_parts.append(f"Temps de préparation maximum: {prep_time} minutes")
            
            if dietary_restrictions:
                prompt_parts.append(f"Restrictions alimentaires: {', '.join(dietary_restrictions)}")
            
            prompt_parts.append("""
Structure la réponse en JSON avec cette structure exacte:
{
    "title": "Titre de la recette",
    "description": "Description courte de la recette",
    "servings": 4,
    "prep_time_minutes": 30,
    "cook_time_minutes": 45,
    "difficulty": "moyen",
    "meal_types": ["dejeuner"],
    "cooking_methods": ["four"],
    "ingredients": [
        {
            "name": "Nom de l'ingrédient",
            "quantity": 200,
            "unit": "g",
            "notes": "Remarques optionnelles",
            "optional": false
        }
    ],
    "steps": [
        {
            "step_number": 1,
            "instruction": "Instructions détaillées pour cette étape",
            "duration_minutes": 10,
            "temperature": 180
        }
    ],
    "tips": "Conseils pour réussir la recette",
    "tags": ["tag1", "tag2"],
    "cuisine_type": "française",
    "dietary_labels": ["végétarien"],
    "nutrition": {
        "calories_per_serving": 350,
        "protein_g": 25,
        "carbs_g": 40,
        "fat_g": 12
    }
}
            """)
            
            user_prompt = "\n".join(prompt_parts)
            
            # Create chat session
            session_id = f"recipe_generation_{user_id}_{hash(user_prompt) % 10000}"
            chat = LlmChat(
                api_key=self.api_key,
                session_id=session_id,
                system_message=self.recipe_generation_prompt
            ).with_model("openai", "gpt-4o-mini")
            
            # Generate recipe
            user_message = UserMessage(text=user_prompt)
            response = await chat.send_message(user_message)
            
            # Parse JSON response
            recipe_data = self._extract_json_from_response(response)
            if not recipe_data:
                logger.error("Failed to extract JSON from AI response")
                return None
            
            # Validate and clean the recipe data
            validated_recipe = self._validate_recipe_data(recipe_data)
            
            # Log the generation (without PII)
            await self._log_ai_generation(
                "recipe", 
                user_prompt[:200] + "..." if len(user_prompt) > 200 else user_prompt,
                bool(validated_recipe),
                user_id
            )
            
            return validated_recipe
            
        except Exception as e:
            logger.error(f"Error generating recipe: {str(e)}")
            await self._log_ai_generation("recipe", "Error occurred", False, user_id)
            return None
    
    async def generate_meal_plan(
        self,
        days: int = 7,
        daily_calories: Optional[int] = None,
        dietary_restrictions: Optional[List[str]] = None,
        meal_preferences: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Generate a weekly meal plan using AI.
        
        Args:
            days: Number of days to plan for
            daily_calories: Target daily calories
            dietary_restrictions: List of dietary restrictions
            meal_preferences: User meal preferences
            user_id: User ID for logging
            
        Returns:
            Generated meal plan or None if failed
        """
        try:
            # Build meal planning prompt
            prompt_parts = [f"Crée un plan de repas pour {days} jours avec:"]
            
            if daily_calories:
                prompt_parts.append(f"Objectif calorique quotidien: {daily_calories} kcal")
            
            if dietary_restrictions:
                prompt_parts.append(f"Restrictions alimentaires: {', '.join(dietary_restrictions)}")
            
            if meal_preferences:
                pref_text = []
                if meal_preferences.get("breakfast_preference"):
                    pref_text.append(f"Petit-déjeuner: {meal_preferences['breakfast_preference']}")
                if meal_preferences.get("lunch_preference"):
                    pref_text.append(f"Déjeuner: {meal_preferences['lunch_preference']}")
                if meal_preferences.get("dinner_preference"):
                    pref_text.append(f"Dîner: {meal_preferences['dinner_preference']}")
                
                if pref_text:
                    prompt_parts.append("Préférences: " + "; ".join(pref_text))
            
            prompt_parts.append("""
Structure la réponse en JSON avec cette structure:
{
    "plan_name": "Nom du plan",
    "total_days": 7,
    "daily_target_calories": 2000,
    "days": [
        {
            "day_number": 1,
            "day_name": "Lundi",
            "meals": {
                "petit_dejeuner": {
                    "name": "Nom du repas",
                    "description": "Description",
                    "estimated_calories": 400
                },
                "dejeuner": {
                    "name": "Nom du repas",
                    "description": "Description",
                    "estimated_calories": 600
                },
                "diner": {
                    "name": "Nom du repas",
                    "description": "Description",
                    "estimated_calories": 700
                },
                "collation": {
                    "name": "Nom de la collation",
                    "description": "Description",
                    "estimated_calories": 200
                }
            },
            "total_calories": 1900,
            "notes": "Notes spéciales pour la journée"
        }
    ],
    "shopping_list": ["ingrédient1", "ingrédient2"],
    "nutritional_summary": {
        "avg_daily_calories": 1950,
        "avg_protein_g": 80,
        "avg_carbs_g": 220,
        "avg_fat_g": 75
    }
}
            """)
            
            user_prompt = "\n".join(prompt_parts)
            
            # Create chat session
            session_id = f"meal_plan_{user_id}_{hash(user_prompt) % 10000}"
            chat = LlmChat(
                api_key=self.api_key,
                session_id=session_id,
                system_message=self.meal_planning_prompt
            ).with_model("openai", "gpt-4o-mini")
            
            # Generate meal plan
            user_message = UserMessage(text=user_prompt)
            response = await chat.send_message(user_message)
            
            # Parse JSON response
            meal_plan_data = self._extract_json_from_response(response)
            if not meal_plan_data:
                logger.error("Failed to extract JSON from meal plan response")
                return None
            
            # Log the generation
            await self._log_ai_generation(
                "meal_plan",
                f"Generated {days}-day plan",
                True,
                user_id
            )
            
            return meal_plan_data
            
        except Exception as e:
            logger.error(f"Error generating meal plan: {str(e)}")
            await self._log_ai_generation("meal_plan", "Error occurred", False, user_id)
            return None
    
    def _extract_json_from_response(self, response: str) -> Optional[Dict[str, Any]]:
        """Extract JSON from AI response."""
        try:
            # Try to parse the entire response as JSON first
            return json.loads(response)
        except json.JSONDecodeError:
            # Look for JSON within the response
            json_pattern = r'```(?:json)?\s*({[^}]*(?:{[^}]*}[^}]*)*})\s*```'
            match = re.search(json_pattern, response, re.DOTALL)
            
            if match:
                try:
                    return json.loads(match.group(1))
                except json.JSONDecodeError:
                    pass
            
            # Try to find JSON-like structure
            json_pattern2 = r'({\s*"[^"]+"[^}]*(?:{[^}]*}[^}]*)*}?)'
            match2 = re.search(json_pattern2, response, re.DOTALL)
            
            if match2:
                try:
                    return json.loads(match2.group(1))
                except json.JSONDecodeError:
                    pass
            
            logger.error(f"Could not extract JSON from response: {response[:500]}...")
            return None
    
    def _validate_recipe_data(self, recipe_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Validate and clean recipe data from AI."""
        try:
            # Ensure required fields exist
            required_fields = ['title', 'ingredients', 'steps']
            for field in required_fields:
                if field not in recipe_data:
                    logger.error(f"Missing required field: {field}")
                    return None
            
            # Validate ingredients structure
            if not isinstance(recipe_data['ingredients'], list) or len(recipe_data['ingredients']) == 0:
                logger.error("Invalid ingredients structure")
                return None
            
            # Validate steps structure
            if not isinstance(recipe_data['steps'], list) or len(recipe_data['steps']) == 0:
                logger.error("Invalid steps structure")
                return None
            
            # Clean and validate fields
            validated = {
                'title': str(recipe_data['title'])[:100],
                'description': str(recipe_data.get('description', ''))[:500],
                'servings': max(1, min(20, int(recipe_data.get('servings', 4)))),
                'prep_time_minutes': max(0, int(recipe_data.get('prep_time_minutes', 30))),
                'cook_time_minutes': max(0, int(recipe_data.get('cook_time_minutes', 30))),
                'difficulty': recipe_data.get('difficulty', 'moyen'),
                'meal_types': recipe_data.get('meal_types', ['dejeuner']),
                'cooking_methods': recipe_data.get('cooking_methods', ['casserole']),
                'ingredients': self._validate_ingredients(recipe_data['ingredients']),
                'steps': self._validate_steps(recipe_data['steps']),
                'tips': str(recipe_data.get('tips', ''))[:1000],
                'tags': recipe_data.get('tags', [])[:10],
                'cuisine_type': str(recipe_data.get('cuisine_type', ''))[:50],
                'dietary_labels': recipe_data.get('dietary_labels', []),
                'ai_generated': True
            }
            
            # Validate nutrition if provided
            if 'nutrition' in recipe_data and isinstance(recipe_data['nutrition'], dict):
                nutrition = recipe_data['nutrition']
                validated['nutrition'] = {
                    'calories_per_serving': max(0, int(nutrition.get('calories_per_serving', 0))) if nutrition.get('calories_per_serving') else None,
                    'protein_g': max(0, float(nutrition.get('protein_g', 0))) if nutrition.get('protein_g') else None,
                    'carbs_g': max(0, float(nutrition.get('carbs_g', 0))) if nutrition.get('carbs_g') else None,
                    'fat_g': max(0, float(nutrition.get('fat_g', 0))) if nutrition.get('fat_g') else None,
                    'fiber_g': max(0, float(nutrition.get('fiber_g', 0))) if nutrition.get('fiber_g') else None,
                    'sugar_g': max(0, float(nutrition.get('sugar_g', 0))) if nutrition.get('sugar_g') else None,
                    'sodium_mg': max(0, float(nutrition.get('sodium_mg', 0))) if nutrition.get('sodium_mg') else None
                }
            
            return validated
            
        except Exception as e:
            logger.error(f"Error validating recipe data: {str(e)}")
            return None
    
    def _validate_ingredients(self, ingredients: List[Dict]) -> List[Dict]:
        """Validate ingredients list."""
        validated_ingredients = []
        
        for i, ingredient in enumerate(ingredients[:20]):  # Max 20 ingredients
            if not isinstance(ingredient, dict) or 'name' not in ingredient:
                continue
                
            validated_ingredient = {
                'name': str(ingredient['name'])[:100],
                'quantity': float(ingredient.get('quantity', 0)) if ingredient.get('quantity') else None,
                'unit': str(ingredient.get('unit', ''))[:20] if ingredient.get('unit') else None,
                'notes': str(ingredient.get('notes', ''))[:200] if ingredient.get('notes') else None,
                'optional': bool(ingredient.get('optional', False))
            }
            
            validated_ingredients.append(validated_ingredient)
        
        return validated_ingredients
    
    def _validate_steps(self, steps: List[Dict]) -> List[Dict]:
        """Validate cooking steps list."""
        validated_steps = []
        
        for i, step in enumerate(steps[:20]):  # Max 20 steps
            if not isinstance(step, dict) or 'instruction' not in step:
                continue
                
            validated_step = {
                'step_number': i + 1,  # Ensure sequential numbering
                'instruction': str(step['instruction'])[:500],
                'duration_minutes': int(step.get('duration_minutes', 0)) if step.get('duration_minutes') else None,
                'temperature': int(step.get('temperature', 0)) if step.get('temperature') else None
            }
            
            validated_steps.append(validated_step)
        
        return validated_steps
    
    async def _log_ai_generation(
        self, 
        generation_type: str, 
        prompt: str, 
        success: bool, 
        user_id: Optional[str]
    ):
        """Log AI generation for monitoring (without PII)."""
        try:
            from services.database_service import database_service
            db = database_service.get_database()
            
            log_entry = {
                'type': generation_type,
                'success': success,
                'prompt_preview': prompt[:200],  # First 200 chars only
                'user_id_hash': hash(user_id) % 10000 if user_id else None,  # Hashed user ID
                'timestamp': datetime.now(),
                'model': 'gpt-4o-mini',
                'temperature': self.temperature
            }
            
            await db.ai_generations_log.insert_one(log_entry)
            
        except Exception as e:
            logger.warning(f"Failed to log AI generation: {str(e)}")

# Global AI service instance
ai_service = AIRecipeService()