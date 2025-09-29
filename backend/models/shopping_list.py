from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict
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

class ShoppingSection(str, Enum):
    LEGUMES = "légumes"
    FRUITS = "fruits"
    VIANDES = "viandes"
    POISSONS = "poissons"
    PRODUITS_LAITIERS = "produits_laitiers"
    CEREALES = "céréales"
    EPICES = "épices"
    SURGELES = "surgelés"
    CONSERVES = "conserves"
    BOISSONS = "boissons"
    AUTRES = "autres"

class ShoppingItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Nom de l'article")
    section: ShoppingSection = Field(..., description="Section/catégorie de l'article")
    quantity: float = Field(default=1.0, gt=0, description="Quantité")
    unit: Optional[str] = Field(None, max_length=20, description="Unité de mesure")
    notes: Optional[str] = Field(None, max_length=200, description="Notes sur l'article")
    is_checked: bool = Field(default=False, description="Article coché/acheté")
    
class ShoppingItemCreate(ShoppingItemBase):
    pass

class ShoppingItemUpdate(BaseModel):
    name: Optional[str] = None
    section: Optional[ShoppingSection] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    notes: Optional[str] = None
    is_checked: Optional[bool] = None

class ShoppingItemInDB(ShoppingItemBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId = Field(..., description="ID de l'utilisateur")
    recipe_id: Optional[PyObjectId] = Field(None, description="ID de la recette d'origine")
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class ShoppingItemResponse(ShoppingItemBase):
    id: str = Field(..., description="Item ID")
    user_id: str = Field(..., description="User ID")
    recipe_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class ShoppingListSection(BaseModel):
    section: ShoppingSection
    section_name: str
    items: List[ShoppingItemResponse]
    total_items: int
    checked_items: int
    is_expanded: bool = Field(default=True, description="Section étendue ou réduite")

class ShoppingListResponse(BaseModel):
    sections: List[ShoppingListSection]
    total_items: int
    total_checked: int
    completion_percentage: float
    last_updated: Optional[datetime] = None

class AddIngredientsToShoppingList(BaseModel):
    recipe_id: str = Field(..., description="ID de la recette")
    ingredients: List[Dict[str, any]] = Field(..., description="Ingrédients à ajouter")