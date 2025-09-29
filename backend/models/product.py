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

class NutriScore(str, Enum):
    A = "a"
    B = "b" 
    C = "c"
    D = "d"
    E = "e"
    UNKNOWN = "unknown"

class NovaGroup(int, Enum):
    UNPROCESSED = 1
    CULINARY_INGREDIENTS = 2
    PROCESSED_FOODS = 3
    ULTRA_PROCESSED = 4

class Nutriments(BaseModel):
    energy_kj: Optional[float] = Field(None, description="Énergie en kilojoules pour 100g")
    energy_kcal: Optional[float] = Field(None, description="Énergie en kilocalories pour 100g")
    fat: Optional[float] = Field(None, description="Matières grasses pour 100g")
    saturated_fat: Optional[float] = Field(None, description="Acides gras saturés pour 100g")
    carbohydrates: Optional[float] = Field(None, description="Glucides pour 100g")
    sugars: Optional[float] = Field(None, description="Sucres pour 100g")
    fiber: Optional[float] = Field(None, description="Fibres pour 100g")
    proteins: Optional[float] = Field(None, description="Protéines pour 100g")
    salt: Optional[float] = Field(None, description="Sel pour 100g")
    sodium: Optional[float] = Field(None, description="Sodium pour 100g")
    
    @validator('*', pre=True)
    def parse_numeric_values(cls, v):
        if isinstance(v, str):
            try:
                return float(v.replace(',', '.'))
            except (ValueError, AttributeError):
                return None
        return v

class ProductBase(BaseModel):
    barcode: str = Field(..., description="Code-barres du produit")
    product_name: Optional[str] = Field(None, description="Nom du produit")
    product_name_fr: Optional[str] = Field(None, description="Nom du produit en français")
    generic_name: Optional[str] = Field(None, description="Nom générique")
    generic_name_fr: Optional[str] = Field(None, description="Nom générique en français")
    
    # Brand and manufacturer
    brands: Optional[str] = Field(None, description="Marques du produit")
    brands_tags: Optional[List[str]] = Field(default_factory=list)
    manufacturing_places: Optional[str] = Field(None, description="Lieux de fabrication")
    
    # Categories
    categories: Optional[str] = Field(None, description="Catégories du produit")
    categories_tags: Optional[List[str]] = Field(default_factory=list)
    
    # Nutrition
    nutriments: Optional[Nutriments] = None
    nutrition_grades: Optional[NutriScore] = Field(None, description="Note nutritionnelle Nutri-Score")
    nova_group: Optional[NovaGroup] = Field(None, description="Classification NOVA")
    
    # Ingredients
    ingredients_text: Optional[str] = Field(None, description="Liste des ingrédients")
    ingredients_text_fr: Optional[str] = Field(None, description="Ingrédients en français")
    allergens: Optional[str] = Field(None, description="Allergènes connus")
    allergens_tags: Optional[List[str]] = Field(default_factory=list)
    
    # Labels
    labels: Optional[str] = Field(None, description="Labels du produit")
    labels_tags: Optional[List[str]] = Field(default_factory=list)
    
    # Images
    image_front_url: Optional[str] = Field(None, description="URL image de face")
    image_ingredients_url: Optional[str] = Field(None, description="URL image des ingrédients")
    image_nutrition_url: Optional[str] = Field(None, description="URL image valeurs nutritionnelles")
    
    # Metadata
    last_modified_t: Optional[int] = Field(None, description="Timestamp dernière modification")
    completeness: Optional[float] = Field(None, description="Score de complétude des données")

class ProductInDB(ProductBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    language: str = Field(default="fr", description="Langue des données")
    source: str = Field(default="openfoodfacts", description="Source des données")
    
    # Cache metadata
    cached_at: datetime = Field(default_factory=datetime.utcnow)
    access_count: int = Field(default=0, description="Nombre d'accès au cache")
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class ProductResponse(BaseModel):
    success: bool = Field(..., description="Statut de la requête")
    product: Optional[ProductBase] = None
    message: Optional[str] = None
    cached: bool = Field(default=False, description="Réponse servie depuis le cache")
    cache_age: Optional[int] = Field(None, description="Âge du cache en secondes")
    
class ProductNotFound(BaseModel):
    success: bool = False
    message: str = "Produit non trouvé"
    barcode: str
    suggestions: Optional[List[str]] = Field(default_factory=list)

class ProductSearch(BaseModel):
    query: str = Field(..., min_length=2, description="Terme de recherche")
    language: str = Field(default="fr", description="Langue de recherche")
    page: int = Field(default=1, ge=1, description="Page de résultats")
    per_page: int = Field(default=20, ge=1, le=100, description="Résultats par page")

class ProductSearchResponse(BaseModel):
    success: bool
    products: List[ProductBase]
    total: int
    page: int
    per_page: int
    has_next: bool
    message: Optional[str] = None