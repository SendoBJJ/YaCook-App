from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId
from enum import Enum

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")
        return field_schema

class DifficultyLevel(str, Enum):
    FACILE = "facile"
    MOYEN = "moyen"
    DIFFICILE = "difficile"

class MealType(str, Enum):
    PETIT_DEJEUNER = "petit_dejeuner"
    DEJEUNER = "dejeuner"
    DINER = "diner"
    COLLATION = "collation"
    DESSERT = "dessert"

class CookingMethod(str, Enum):
    FOUR = "four"
    CASSEROLE = "casserole"
    POELE = "poele"
    VAPEUR = "vapeur"
    GRILL = "grill"
    FRITURE = "friture"
    MIJOTEUSE = "mijoteuse"
    CRUE = "crue"

class NutritionalInfo(BaseModel):
    calories_per_serving: Optional[int] = Field(None, ge=0, description="Calories par portion")
    protein_g: Optional[float] = Field(None, ge=0, description="Protéines en grammes")
    carbs_g: Optional[float] = Field(None, ge=0, description="Glucides en grammes")
    fat_g: Optional[float] = Field(None, ge=0, description="Lipides en grammes")
    fiber_g: Optional[float] = Field(None, ge=0, description="Fibres en grammes")
    sugar_g: Optional[float] = Field(None, ge=0, description="Sucres en grammes")
    sodium_mg: Optional[float] = Field(None, ge=0, description="Sodium en milligrammes")

class Ingredient(BaseModel):
    name: str = Field(..., max_length=100, description="Nom de l'ingrédient")
    quantity: Optional[float] = Field(None, gt=0, description="Quantité")
    unit: Optional[str] = Field(None, max_length=20, description="Unité de mesure")
    notes: Optional[str] = Field(None, max_length=200, description="Notes sur l'ingrédient")
    optional: bool = Field(default=False, description="Ingrédient optionnel")
    
class CookingStep(BaseModel):
    step_number: int = Field(..., ge=1, description="Numéro de l'étape")
    instruction: str = Field(..., min_length=10, max_length=500, description="Instruction de l'étape")
    duration_minutes: Optional[int] = Field(None, ge=0, description="Durée en minutes")
    temperature: Optional[int] = Field(None, description="Température en degrés Celsius")
    image_url: Optional[str] = Field(None, description="Image de l'étape")

class RecipeBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=100, description="Titre de la recette")
    description: Optional[str] = Field(None, max_length=500, description="Description de la recette")
    image_url: Optional[str] = Field(None, description="Image principale de la recette")
    
    # Recipe details
    servings: int = Field(default=4, ge=1, le=20, description="Nombre de portions")
    prep_time_minutes: Optional[int] = Field(None, ge=0, description="Temps de préparation")
    cook_time_minutes: Optional[int] = Field(None, ge=0, description="Temps de cuisson")
    total_time_minutes: Optional[int] = Field(None, ge=0, description="Temps total")
    
    # Classification
    difficulty: DifficultyLevel = Field(default=DifficultyLevel.MOYEN, description="Niveau de difficulté")
    meal_types: List[MealType] = Field(default_factory=list, description="Types de repas")
    cooking_methods: List[CookingMethod] = Field(default_factory=list, description="Méthodes de cuisson")
    
    # Content
    ingredients: List[Ingredient] = Field(..., min_items=1, description="Liste des ingrédients")
    steps: List[CookingStep] = Field(..., min_items=1, description="Étapes de préparation")
    
    # Additional info
    tips: Optional[str] = Field(None, max_length=1000, description="Conseils et astuces")
    storage_instructions: Optional[str] = Field(None, max_length=300, description="Instructions de conservation")
    
    # Tags and categories
    tags: List[str] = Field(default_factory=list, description="Tags de la recette")
    cuisine_type: Optional[str] = Field(None, max_length=50, description="Type de cuisine")
    dietary_labels: List[str] = Field(default_factory=list, description="Étiquettes diététiques")
    
    # Nutrition
    nutrition: Optional[NutritionalInfo] = None
    
    @validator('total_time_minutes', always=True)
    def calculate_total_time(cls, v, values):
        if v is not None:
            return v
        prep_time = values.get('prep_time_minutes', 0) or 0
        cook_time = values.get('cook_time_minutes', 0) or 0
        return prep_time + cook_time

class RecipeCreate(RecipeBase):
    pass

class RecipeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    servings: Optional[int] = None
    prep_time_minutes: Optional[int] = None
    cook_time_minutes: Optional[int] = None
    difficulty: Optional[DifficultyLevel] = None
    meal_types: Optional[List[MealType]] = None
    cooking_methods: Optional[List[CookingMethod]] = None
    ingredients: Optional[List[Ingredient]] = None
    steps: Optional[List[CookingStep]] = None
    tips: Optional[str] = None
    storage_instructions: Optional[str] = None
    tags: Optional[List[str]] = None
    cuisine_type: Optional[str] = None
    dietary_labels: Optional[List[str]] = None
    nutrition: Optional[NutritionalInfo] = None

class RecipeInDB(RecipeBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    author_id: PyObjectId = Field(..., description="ID de l'auteur")
    
    # Social features
    is_public: bool = Field(default=True, description="Recette publique")
    featured: bool = Field(default=False, description="Recette mise en avant")
    
    # Statistics
    likes_count: int = Field(default=0, description="Nombre de likes")
    saves_count: int = Field(default=0, description="Nombre de sauvegardes")
    views_count: int = Field(default=0, description="Nombre de vues")
    
    # AI generated
    ai_generated: bool = Field(default=False, description="Générée par IA")
    ai_prompt: Optional[str] = Field(None, description="Prompt utilisé pour la génération")
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    published_at: Optional[datetime] = None
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class RecipeResponse(RecipeBase):
    id: str = Field(..., description="Recipe ID")
    author_id: str = Field(..., description="Author ID")
    author_name: Optional[str] = Field(None, description="Author display name")
    author_avatar: Optional[str] = Field(None, description="Author avatar URL")
    
    is_public: bool
    featured: bool
    likes_count: int
    saves_count: int
    views_count: int
    ai_generated: bool
    
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime]
    
    # User-specific fields (if authenticated)
    is_liked: Optional[bool] = None
    is_saved: Optional[bool] = None

class RecipeList(BaseModel):
    recipes: List[RecipeResponse]
    total: int
    page: int
    per_page: int
    has_next: bool
    has_prev: bool