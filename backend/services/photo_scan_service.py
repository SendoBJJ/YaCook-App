"""
Photo Scan Service - AI-powered product recognition from photos
Uses OCR to extract text, then matches against Open Food Facts database
"""
import os
import re
import logging
from typing import Dict, List, Optional, Tuple
from io import BytesIO
from dotenv import load_dotenv

# Image processing
from PIL import Image
import numpy as np

# OCR
from paddleocr import PaddleOCR

# Fuzzy matching
from rapidfuzz import fuzz, process

# HTTP client
import httpx

load_dotenv()

logger = logging.getLogger(__name__)


class PhotoScanService:
    """Service for recognizing products from photos using OCR + Open Food Facts"""
    
    def __init__(self):
        self.off_api_base = os.getenv("OFF_API_BASE", "https://world.openfoodfacts.org")
        self.ocr_engine = os.getenv("OCR_ENGINE", "paddle")
        self.max_upload_mb = int(os.getenv("MAX_UPLOAD_MB", "8"))
        
        # Initialize PaddleOCR (runs once)
        try:
            self.ocr = PaddleOCR(
                use_angle_cls=True,
                lang='fr',  # French + English
                show_log=False,
                use_gpu=False  # CPU mode for compatibility
            )
            logger.info("✅ PaddleOCR initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize PaddleOCR: {str(e)}")
            self.ocr = None
    
    async def process_photo(
        self,
        image_bytes: bytes,
        language: str = "fr"
    ) -> Dict:
        """
        Process a photo and return matched products from Open Food Facts
        
        Args:
            image_bytes: Raw image data
            language: Language for results (default: fr)
            
        Returns:
            Dictionary with matched product or candidates
        """
        try:
            # Step 1: Load and validate image
            image = self._load_image(image_bytes)
            if not image:
                return {
                    "matched": False,
                    "error": "Image invalide ou corrompue",
                    "confidence": 0.0,
                    "candidates": []
                }
            
            # Step 2: Extract text using OCR
            ocr_text, keywords = await self._extract_text_from_image(image)
            logger.info(f"📝 OCR extracted: {ocr_text[:200]}...")
            logger.info(f"🔑 Keywords: {keywords}")
            
            if not keywords:
                return {
                    "matched": False,
                    "error": "Aucun texte reconnu sur l'image",
                    "confidence": 0.0,
                    "candidates": []
                }
            
            # Step 3: Search Open Food Facts
            search_results = await self._search_open_food_facts(keywords, language)
            
            if not search_results:
                return {
                    "matched": False,
                    "error": "Aucun produit correspondant trouvé",
                    "confidence": 0.0,
                    "candidates": []
                }
            
            # Step 4: Rank results by fuzzy matching
            ranked_products = self._rank_products(ocr_text, keywords, search_results)
            
            if not ranked_products:
                return {
                    "matched": False,
                    "error": "Aucun produit correspondant trouvé",
                    "confidence": 0.0,
                    "candidates": []
                }
            
            # Step 5: Return best match or candidates
            best_match = ranked_products[0]
            confidence = best_match['confidence']
            
            # High confidence match (> 0.7)
            if confidence > 0.7:
                # Fetch full product details
                full_product = await self._get_product_details(
                    best_match['code'],
                    language
                )
                
                return {
                    "matched": True,
                    "confidence": confidence,
                    "product": full_product,
                    "candidates": ranked_products[:3]  # Include top 3 for reference
                }
            
            # Medium confidence (0.4 - 0.7) - return candidates
            elif confidence > 0.4:
                return {
                    "matched": False,
                    "confidence": confidence,
                    "message": "Plusieurs produits possibles",
                    "candidates": ranked_products[:3]
                }
            
            # Low confidence (< 0.4)
            else:
                return {
                    "matched": False,
                    "confidence": confidence,
                    "error": "Produit non reconnu avec certitude",
                    "candidates": ranked_products[:3] if len(ranked_products) > 0 else []
                }
        
        except Exception as e:
            logger.error(f"❌ Error processing photo: {str(e)}")
            return {
                "matched": False,
                "error": f"Erreur lors du traitement: {str(e)}",
                "confidence": 0.0,
                "candidates": []
            }
    
    def _load_image(self, image_bytes: bytes) -> Optional[Image.Image]:
        """Load and validate image"""
        try:
            image = Image.open(BytesIO(image_bytes))
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Check size
            max_dimension = 2048
            if max(image.size) > max_dimension:
                # Resize maintaining aspect ratio
                ratio = max_dimension / max(image.size)
                new_size = tuple(int(dim * ratio) for dim in image.size)
                image = image.resize(new_size, Image.Resampling.LANCZOS)
            
            return image
        except Exception as e:
            logger.error(f"Error loading image: {str(e)}")
            return None
    
    async def _extract_text_from_image(
        self,
        image: Image.Image
    ) -> Tuple[str, List[str]]:
        """Extract text using PaddleOCR"""
        try:
            if not self.ocr:
                logger.error("OCR not initialized")
                return "", []
            
            # Convert PIL Image to numpy array
            img_array = np.array(image)
            
            # Run OCR
            result = self.ocr.ocr(img_array, cls=True)
            
            if not result or not result[0]:
                return "", []
            
            # Extract text from OCR results
            texts = []
            for line in result[0]:
                if line and len(line) > 1:
                    text = line[1][0]  # Get text content
                    confidence = line[1][1]  # Get confidence score
                    
                    if confidence > 0.5:  # Only use high-confidence text
                        texts.append(text)
            
            # Combine all text
            full_text = " ".join(texts)
            
            # Extract keywords (brand names, product names)
            keywords = self._extract_keywords(full_text)
            
            return full_text, keywords
        
        except Exception as e:
            logger.error(f"OCR error: {str(e)}")
            return "", []
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract meaningful keywords from OCR text"""
        # Normalize text
        text = text.lower()
        
        # Remove special characters but keep spaces
        text = re.sub(r'[^a-zA-Z0-9\s\u00C0-\u017F]', ' ', text)
        
        # Split into words
        words = text.split()
        
        # Filter stopwords (common French words)
        stopwords = {
            'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou',
            'pour', 'avec', 'sans', 'sur', 'dans', 'par', 'ce', 'cette',
            'ces', 'son', 'sa', 'ses', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes'
        }
        
        # Keep words > 3 characters and not stopwords
        keywords = [
            word for word in words
            if len(word) > 3 and word not in stopwords
        ]
        
        # Remove duplicates while preserving order
        seen = set()
        unique_keywords = []
        for word in keywords:
            if word not in seen:
                seen.add(word)
                unique_keywords.append(word)
        
        return unique_keywords[:10]  # Return top 10 keywords
    
    async def _search_open_food_facts(
        self,
        keywords: List[str],
        language: str = "fr"
    ) -> List[Dict]:
        """Search Open Food Facts API with keywords"""
        try:
            # Build search query
            search_query = " ".join(keywords)
            
            url = f"{self.off_api_base}/cgi/search.pl"
            params = {
                "search_terms": search_query,
                "search_simple": 1,
                "action": "process",
                "json": 1,
                "page_size": 20,
                "fields": "code,product_name,product_name_fr,brands,image_url,nutrition_grades,nutriments"
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                
                data = response.json()
                products = data.get("products", [])
                
                logger.info(f"🔍 OFF search returned {len(products)} products")
                return products
        
        except Exception as e:
            logger.error(f"Error searching Open Food Facts: {str(e)}")
            return []
    
    def _rank_products(
        self,
        ocr_text: str,
        keywords: List[str],
        products: List[Dict]
    ) -> List[Dict]:
        """Rank products by fuzzy matching score"""
        ranked = []
        ocr_text_lower = ocr_text.lower()
        keywords_str = " ".join(keywords).lower()
        
        for product in products:
            # Build product search string
            product_name = (
                product.get('product_name_fr') or
                product.get('product_name') or
                ''
            )
            brand = product.get('brands', '')
            search_string = f"{brand} {product_name}".lower()
            
            if not search_string.strip():
                continue
            
            # Calculate fuzzy match scores
            score_name = fuzz.partial_ratio(keywords_str, product_name.lower()) / 100.0
            score_brand = fuzz.partial_ratio(keywords_str, brand.lower()) / 100.0
            score_full = fuzz.partial_ratio(keywords_str, search_string) / 100.0
            
            # Weighted confidence score
            confidence = (
                score_full * 0.5 +
                score_name * 0.3 +
                score_brand * 0.2
            )
            
            ranked.append({
                "code": product.get('code', ''),
                "name": product_name,
                "brand": brand,
                "image": product.get('image_url', ''),
                "confidence": round(confidence, 2),
                "nutriscore_grade": product.get('nutrition_grades'),
                "nutriments": product.get('nutriments', {})
            })
        
        # Sort by confidence descending
        ranked.sort(key=lambda x: x['confidence'], reverse=True)
        
        return ranked
    
    async def _get_product_details(
        self,
        barcode: str,
        language: str = "fr"
    ) -> Dict:
        """Fetch full product details from Open Food Facts"""
        try:
            url = f"{self.off_api_base}/api/v2/product/{barcode}"
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                
                data = response.json()
                
                if data.get('status') == 1 and 'product' in data:
                    product = data['product']
                    
                    return {
                        "ean": barcode,
                        "name": product.get('product_name_fr') or product.get('product_name', ''),
                        "brand": product.get('brands', ''),
                        "image": product.get('image_url', ''),
                        "quantity": product.get('quantity', ''),
                        "nutriments": product.get('nutriments', {}),
                        "nutriscore_grade": product.get('nutrition_grades'),
                        "ingredients_text": product.get('ingredients_text_fr') or product.get('ingredients_text', ''),
                        "allergens_tags": product.get('allergens_tags', []),
                        "categories_tags": product.get('categories_tags', [])
                    }
                
                return {}
        
        except Exception as e:
            logger.error(f"Error fetching product details: {str(e)}")
            return {}
    
    @staticmethod
    def validate_image_size(size_bytes: int, max_mb: int = 8) -> bool:
        """Validate image size is within limits"""
        max_bytes = max_mb * 1024 * 1024
        return size_bytes <= max_bytes


# Singleton instance
photo_scan_service = PhotoScanService()
