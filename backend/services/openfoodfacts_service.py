from dotenv import load_dotenv
import os
import aiohttp
import asyncio
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from models.product import ProductBase, ProductResponse, ProductNotFound, NutriScore, NovaGroup, Nutriments
from services.database_service import database_service

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class RateLimiter:
    """Simple rate limiter for API requests."""
    
    def __init__(self, max_requests: int = 90, time_window: int = 60):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = []
        self._lock = asyncio.Lock()
    
    async def acquire(self) -> None:
        """Wait for permission to make an API request."""
        async with self._lock:
            now = datetime.utcnow()
            
            # Remove old requests
            self.requests = [
                req_time for req_time in self.requests 
                if (now - req_time).total_seconds() < self.time_window
            ]
            
            # Check if we can make a request
            if len(self.requests) >= self.max_requests:
                oldest_request = min(self.requests)
                wait_time = self.time_window - (now - oldest_request).total_seconds()
                if wait_time > 0:
                    await asyncio.sleep(wait_time)
                    return await self.acquire()
            
            self.requests.append(now)

class OpenFoodFactsService:
    """Service for interacting with Open Food Facts API."""
    
    def __init__(self):
        self.base_url = os.getenv("OPENFOODFACTS_BASE_URL", "https://world.openfoodfacts.org/api/v2")
        self.user_agent = os.getenv("USER_AGENT", "YaCook/1.0 (contact@yacook.app)")
        self.timeout = aiohttp.ClientTimeout(total=30)
        self.rate_limiter = RateLimiter(max_requests=90, time_window=60)
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        """Async context manager entry."""
        self.session = aiohttp.ClientSession(
            timeout=self.timeout,
            headers={"User-Agent": self.user_agent}
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.session:
            await self.session.close()
    
    def _clean_barcode(self, barcode: str) -> str:
        """Clean and validate barcode."""
        # Remove any non-digit characters
        clean_barcode = ''.join(filter(str.isdigit, barcode))
        
        # Validate length (most common barcode formats)
        if len(clean_barcode) not in [8, 12, 13, 14]:
            raise ValueError("Invalid barcode format")
        
        return clean_barcode
    
    def _build_product_url(self, barcode: str, language: str = "fr") -> str:
        """Build API URL for product lookup."""
        # Use French subdomain for better French content
        if language == "fr":
            base = "https://fr.openfoodfacts.org/api/v2"
        else:
            base = self.base_url
        
        # Default fields for comprehensive product information
        fields = [
            "code", "product_name", "product_name_fr", "generic_name", "generic_name_fr",
            "brands", "brands_tags", "categories", "categories_tags",
            "nutriments", "nutrition_grades", "nova_group",
            "ingredients_text", "ingredients_text_fr", "allergens", "allergens_tags",
            "labels", "labels_tags", "manufacturing_places",
            "image_front_url", "image_ingredients_url", "image_nutrition_url",
            "last_modified_t", "completeness"
        ]
        
        url = f"{base}/product/{barcode}?fields={','.join(fields)}&lc={language}"
        return url
    
    async def _make_request(self, url: str, max_retries: int = 3) -> Optional[Dict[str, Any]]:
        """Make HTTP request with retry logic."""
        if not self.session:
            raise RuntimeError("Service not initialized. Use async context manager.")
        
        for attempt in range(max_retries):
            try:
                async with self.session.get(url) as response:
                    if response.status == 200:
                        return await response.json()
                    elif response.status == 429:  # Rate limited
                        wait_time = 2 ** attempt
                        logger.warning(f"Rate limited. Waiting {wait_time}s before retry {attempt + 1}")
                        await asyncio.sleep(wait_time)
                        continue
                    else:
                        logger.warning(f"API request failed with status {response.status}")
                        return None
            except asyncio.TimeoutError:
                logger.warning(f"Request timeout on attempt {attempt + 1}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(1)
                    continue
            except Exception as e:
                logger.error(f"Request error on attempt {attempt + 1}: {str(e)}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(1)
                    continue
        
        return None
    
    def _parse_nutriments(self, nutriments_data: Dict[str, Any]) -> Optional[Nutriments]:
        """Parse nutriments data from API response."""
        try:
            return Nutriments(
                energy_kj=nutriments_data.get("energy-kj_100g"),
                energy_kcal=nutriments_data.get("energy-kcal_100g"),
                fat=nutriments_data.get("fat_100g"),
                saturated_fat=nutriments_data.get("saturated-fat_100g"),
                carbohydrates=nutriments_data.get("carbohydrates_100g"),
                sugars=nutriments_data.get("sugars_100g"),
                fiber=nutriments_data.get("fiber_100g"),
                proteins=nutriments_data.get("proteins_100g"),
                salt=nutriments_data.get("salt_100g"),
                sodium=nutriments_data.get("sodium_100g")
            )
        except Exception as e:
            logger.warning(f"Error parsing nutriments: {str(e)}")
            return None
    
    def _transform_api_response(self, api_data: Dict[str, Any], barcode: str) -> ProductBase:
        """Transform Open Food Facts API response to internal model."""
        try:
            # Parse nutriments
            nutriments_data = api_data.get("nutriments", {})
            nutriments = self._parse_nutriments(nutriments_data) if nutriments_data else None
            
            # Parse nutrition grade
            nutrition_grade = api_data.get("nutrition_grades")
            nutri_score = None
            if nutrition_grade:
                try:
                    nutri_score = NutriScore(nutrition_grade.lower())
                except ValueError:
                    nutri_score = NutriScore.UNKNOWN
            
            # Parse NOVA group
            nova_group = api_data.get("nova_group")
            nova_classification = None
            if nova_group:
                try:
                    nova_classification = NovaGroup(int(nova_group))
                except (ValueError, TypeError):
                    pass
            
            return ProductBase(
                barcode=barcode,
                product_name=api_data.get("product_name"),
                product_name_fr=api_data.get("product_name_fr"),
                generic_name=api_data.get("generic_name"),
                generic_name_fr=api_data.get("generic_name_fr"),
                brands=api_data.get("brands"),
                brands_tags=api_data.get("brands_tags", []),
                manufacturing_places=api_data.get("manufacturing_places"),
                categories=api_data.get("categories"),
                categories_tags=api_data.get("categories_tags", []),
                nutriments=nutriments,
                nutrition_grades=nutri_score,
                nova_group=nova_classification,
                ingredients_text=api_data.get("ingredients_text"),
                ingredients_text_fr=api_data.get("ingredients_text_fr"),
                allergens=api_data.get("allergens"),
                allergens_tags=api_data.get("allergens_tags", []),
                labels=api_data.get("labels"),
                labels_tags=api_data.get("labels_tags", []),
                image_front_url=api_data.get("image_front_url"),
                image_ingredients_url=api_data.get("image_ingredients_url"),
                image_nutrition_url=api_data.get("image_nutrition_url"),
                last_modified_t=api_data.get("last_modified_t"),
                completeness=api_data.get("completeness")
            )
        except Exception as e:
            logger.error(f"Error transforming API response: {str(e)}")
            raise ValueError(f"Failed to parse product data: {str(e)}")
    
    async def get_cached_product(self, barcode: str, language: str = "fr") -> Optional[ProductResponse]:
        """Get product from cache."""
        try:
            db = database_service.get_database()
            
            # Query cache
            cached_doc = await db.products_cache.find_one({
                "barcode": barcode,
                "language": language
            })
            
            if cached_doc:
                # Calculate cache age
                cached_at = cached_doc.get("cached_at", datetime.utcnow())
                cache_age = int((datetime.utcnow() - cached_at).total_seconds())
                
                # Create product from cached data
                product_data = cached_doc.copy()
                product_data.pop("_id", None)
                product_data.pop("cached_at", None)
                product_data.pop("access_count", None)
                product_data.pop("language", None)
                product_data.pop("source", None)
                
                try:
                    product = ProductBase(**product_data)
                    
                    # Update access count
                    await db.products_cache.update_one(
                        {"barcode": barcode, "language": language},
                        {"$inc": {"access_count": 1}}
                    )
                    
                    return ProductResponse(
                        success=True,
                        product=product,
                        message="Produit récupéré depuis le cache",
                        cached=True,
                        cache_age=cache_age
                    )
                except Exception as e:
                    logger.warning(f"Error parsing cached product {barcode}: {str(e)}")
                    # Remove corrupted cache entry
                    await db.products_cache.delete_one({
                        "barcode": barcode, 
                        "language": language
                    })
            
            return None
            
        except Exception as e:
            logger.error(f"Error retrieving cached product {barcode}: {str(e)}")
            return None
    
    async def cache_product(self, product: ProductBase, language: str = "fr") -> bool:
        """Cache product data."""
        try:
            db = database_service.get_database()
            
            # Prepare cache document
            cache_doc = product.dict()
            cache_doc.update({
                "language": language,
                "source": "openfoodfacts",
                "cached_at": datetime.utcnow(),
                "access_count": 0
            })
            
            # Upsert cache document
            await db.products_cache.replace_one(
                {"barcode": product.barcode, "language": language},
                cache_doc,
                upsert=True
            )
            
            logger.debug(f"Cached product {product.barcode} in {language}")
            return True
            
        except Exception as e:
            logger.error(f"Error caching product {product.barcode}: {str(e)}")
            return False
    
    async def get_product_by_barcode(
        self, 
        barcode: str, 
        language: str = "fr", 
        use_cache: bool = True
    ) -> ProductResponse:
        """Get product information by barcode.
        
        Args:
            barcode: Product barcode
            language: Language for localized content
            use_cache: Whether to use cached data
            
        Returns:
            ProductResponse with product data or error
        """
        try:
            # Clean barcode
            clean_barcode = self._clean_barcode(barcode)
            
            # Try cache first if enabled
            if use_cache:
                cached_response = await self.get_cached_product(clean_barcode, language)
                if cached_response:
                    return cached_response
            
            # Apply rate limiting
            await self.rate_limiter.acquire()
            
            # Build API URL
            url = self._build_product_url(clean_barcode, language)
            
            # Make API request
            api_data = await self._make_request(url)
            
            if not api_data:
                return ProductResponse(
                    success=False,
                    message="Échec de la récupération des données produit",
                    product=None
                )
            
            # Check API response status
            if api_data.get("status") != 1:
                return ProductResponse(
                    success=False,
                    message="Produit non trouvé dans la base Open Food Facts",
                    product=None
                )
            
            # Transform API response
            product = self._transform_api_response(
                api_data.get("product", {}),
                clean_barcode
            )
            
            # Cache the product
            if use_cache:
                await self.cache_product(product, language)
            
            return ProductResponse(
                success=True,
                product=product,
                message="Produit récupéré avec succès",
                cached=False
            )
            
        except ValueError as e:
            return ProductResponse(
                success=False,
                message=f"Code-barres invalide: {str(e)}",
                product=None
            )
        except Exception as e:
            logger.error(f"Error retrieving product {barcode}: {str(e)}")
            return ProductResponse(
                success=False,
                message=f"Erreur du service: {str(e)}",
                product=None
            )

# Global service instance
openfoodfacts_service = OpenFoodFactsService()