import os
import time
import cloudinary
import cloudinary.uploader
from fastapi import HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

# Pydantic models for Cloudinary operations
class SignatureRequest(BaseModel):
    timestamp: Optional[int] = None
    folder: str = Field(...)  # Removed restrictive pattern to allow avatars and posts
    public_id: Optional[str] = None
    resource_type: str = Field(default="image", pattern=r'^(image|video)$')
    tags: Optional[List[str]] = Field(default=[], max_items=10)
    context: Optional[Dict[str, str]] = None
    transformation: Optional[str] = None  # Allow transformation parameters

class SignatureResponse(BaseModel):
    signature: str
    timestamp: int
    api_key: str
    cloud_name: str
    upload_url: str
    expires_at: int

class CloudinaryService:
    def __init__(self):
        """Initialize Cloudinary service with EU region configuration."""
        self.cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
        self.api_key = os.getenv("CLOUDINARY_API_KEY") 
        self.api_secret = os.getenv("CLOUDINARY_API_SECRET")
        self.upload_preset = os.getenv("CLOUDINARY_UPLOAD_PRESET", "yacook_uploads")
        
        if not all([self.cloud_name, self.api_key, self.api_secret]):
            raise ValueError("Missing Cloudinary configuration. Please check environment variables.")
        
        # Configure Cloudinary with EU region settings
        cloudinary.config(
            cloud_name=self.cloud_name,
            api_key=self.api_key,
            api_secret=self.api_secret,
            secure=True,
            upload_prefix="https://api.cloudinary.com"  # EU region
        )
        
        logger.info(f"Cloudinary service initialized for cloud: {self.cloud_name}")
    
    def generate_upload_signature(self, params: SignatureRequest) -> SignatureResponse:
        """Generate a secure upload signature for Cloudinary EU region."""
        try:
            # Generate timestamp if not provided
            timestamp = params.timestamp or int(time.time())
            
            # Prepare parameters for signature generation
            params_to_sign = {
                "timestamp": timestamp,
                "folder": params.folder,
                "upload_preset": self.upload_preset,
                "resource_type": params.resource_type
            }
            
            # Add optional parameters if provided
            if params.public_id:
                params_to_sign["public_id"] = params.public_id
            
            if params.transformation:
                params_to_sign["transformation"] = params.transformation
            
            if params.tags:
                # Filter and clean tags
                clean_tags = [tag.strip().lower() for tag in params.tags if tag.strip()]
                if clean_tags:
                    params_to_sign["tags"] = ",".join(clean_tags)
            
            if params.context:
                # Convert context dict to Cloudinary format
                context_string = "|".join([f"{k}={v}" for k, v in params.context.items()])
                params_to_sign["context"] = context_string
            
            # Generate signature using Cloudinary SDK
            signature = cloudinary.utils.api_sign_request(
                params_to_sign,
                self.api_secret
            )
            
            # Construct EU upload URL
            upload_url = f"https://api.cloudinary.com/{self.cloud_name}/image/upload"
            expires_at = timestamp + 3600  # 1 hour validity
            
            logger.info(f"Generated upload signature for folder: {params.folder}")
            
            return SignatureResponse(
                signature=signature,
                timestamp=timestamp,
                api_key=self.api_key,
                cloud_name=self.cloud_name,
                upload_url=upload_url,
                expires_at=expires_at
            )
            
        except Exception as e:
            logger.error(f"Failed to generate upload signature: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate upload signature: {str(e)}"
            )
    
    def delete_media(self, public_id: str, resource_type: str = "image") -> bool:
        """Delete media from Cloudinary (for GDPR compliance)."""
        try:
            result = cloudinary.uploader.destroy(
                public_id,
                resource_type=resource_type
            )
            
            success = result.get("result") == "ok"
            if success:
                logger.info(f"Successfully deleted media: {public_id}")
            else:
                logger.warning(f"Failed to delete media: {public_id}, result: {result}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error deleting media {public_id}: {str(e)}")
            return False
    
    def validate_upload_params(self, params: SignatureRequest) -> List[str]:
        """Validate upload parameters for security compliance."""
        errors = []
        
        # Validate folder structure (already handled by regex in model)
        if not params.folder.startswith('yacook/community/'):
            errors.append("Invalid folder path - must start with yacook/community/")
        
        # Validate tags
        if params.tags:
            for tag in params.tags:
                if len(tag) > 50:
                    errors.append(f"Tag '{tag}' exceeds maximum length of 50 characters")
                if not tag.replace('_', '').replace('-', '').isalnum():
                    errors.append(f"Tag '{tag}' contains invalid characters")
        
        # Validate public_id if provided
        if params.public_id:
            if len(params.public_id) > 100:
                errors.append("Public ID exceeds maximum length of 100 characters")
            if not params.public_id.replace('_', '').replace('-', '').isalnum():
                errors.append("Public ID contains invalid characters")
        
        return errors

# Create service instance
cloudinary_service = CloudinaryService()