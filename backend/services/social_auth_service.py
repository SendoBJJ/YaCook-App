"""
Social Authentication Service - Google & Apple ID token verification
"""
import os
import logging
from typing import Dict, Optional
from dotenv import load_dotenv

# Google auth
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

# Apple auth (JWT verification)
import jwt
import requests
from jose import jwt as jose_jwt
from jose.exceptions import JWTError
import time

load_dotenv()

logger = logging.getLogger(__name__)


class SocialAuthService:
    """Service for verifying social login tokens from Google and Apple"""
    
    def __init__(self):
        # Google OAuth credentials
        self.google_client_id_ios = os.getenv("GOOGLE_CLIENT_ID_IOS", "")
        self.google_client_id_android = os.getenv("GOOGLE_CLIENT_ID_ANDROID", "")
        self.google_client_id_web = os.getenv("GOOGLE_CLIENT_ID_WEB", "")
        
        # Apple OAuth credentials
        self.apple_team_id = os.getenv("APPLE_TEAM_ID", "")
        self.apple_key_id = os.getenv("APPLE_KEY_ID", "")
        self.apple_bundle_id = os.getenv("APPLE_BUNDLE_ID", "com.yacook.app")
        self.apple_private_key = os.getenv("APPLE_PRIVATE_KEY", "")
        
        # Apple JWKS URL
        self.apple_jwks_url = "https://appleid.apple.com/auth/keys"
        self._apple_jwks_cache = None
        self._apple_jwks_cache_time = 0
        self._apple_jwks_cache_ttl = 86400  # 24 hours
    
    def verify_google_token(self, id_token_str: str) -> Dict[str, str]:
        """
        Verify Google ID token and extract user information
        
        Args:
            id_token_str: Google ID token from client
            
        Returns:
            Dictionary with user info: {email, sub, name, picture}
            
        Raises:
            ValueError: If token is invalid
        """
        try:
            # List of valid client IDs (iOS, Android, Web)
            valid_client_ids = [
                cid for cid in [
                    self.google_client_id_ios,
                    self.google_client_id_android,
                    self.google_client_id_web
                ] if cid
            ]
            
            if not valid_client_ids:
                logger.warning("No Google client IDs configured, accepting token without audience verification")
                # For development, we can skip audience verification
                # but this is not recommended for production
                idinfo = id_token.verify_oauth2_token(
                    id_token_str,
                    google_requests.Request()
                )
            else:
                # Verify with audience check
                idinfo = id_token.verify_oauth2_token(
                    id_token_str,
                    google_requests.Request(),
                    audience=valid_client_ids[0]  # Use first available
                )
            
            # Verify issuer
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                raise ValueError('Token issuer is not Google')
            
            logger.info(f"Successfully verified Google token for email: {idinfo.get('email', 'N/A')}")
            
            return {
                'email': idinfo.get('email', ''),
                'sub': idinfo['sub'],  # Google user ID
                'name': idinfo.get('name', ''),
                'given_name': idinfo.get('given_name', ''),
                'family_name': idinfo.get('family_name', ''),
                'picture': idinfo.get('picture', ''),
                'email_verified': idinfo.get('email_verified', False)
            }
            
        except ValueError as e:
            logger.error(f"Google token verification failed: {str(e)}")
            raise ValueError(f"Token Google invalide: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error verifying Google token: {str(e)}")
            raise ValueError(f"Erreur de vérification Google: {str(e)}")
    
    def _get_apple_jwks(self) -> Dict:
        """
        Fetch and cache Apple's JWKS (JSON Web Key Set)
        
        Returns:
            JWKS dictionary
        """
        current_time = time.time()
        
        # Return cached JWKS if still valid
        if (self._apple_jwks_cache and 
            current_time - self._apple_jwks_cache_time < self._apple_jwks_cache_ttl):
            return self._apple_jwks_cache
        
        try:
            response = requests.get(self.apple_jwks_url, timeout=10)
            response.raise_for_status()
            jwks = response.json()
            
            # Cache the JWKS
            self._apple_jwks_cache = jwks
            self._apple_jwks_cache_time = current_time
            
            logger.info("Successfully fetched Apple JWKS")
            return jwks
            
        except Exception as e:
            logger.error(f"Failed to fetch Apple JWKS: {str(e)}")
            raise ValueError(f"Impossible de récupérer les clés Apple: {str(e)}")
    
    def verify_apple_token(
        self,
        id_token_str: str,
        nonce: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Verify Apple ID token and extract user information
        
        Args:
            id_token_str: Apple identity token from client
            nonce: Optional nonce for additional security
            
        Returns:
            Dictionary with user info: {email, sub, email_verified}
            
        Raises:
            ValueError: If token is invalid
        """
        try:
            # Get Apple's JWKS
            jwks = self._get_apple_jwks()
            
            # Decode token header to get the key ID (kid)
            unverified_header = jose_jwt.get_unverified_header(id_token_str)
            kid = unverified_header.get('kid')
            
            if not kid:
                raise ValueError("Token Apple manquant 'kid' dans l'en-tête")
            
            # Find the matching key in JWKS
            key = None
            for jwk in jwks.get('keys', []):
                if jwk.get('kid') == kid:
                    key = jwk
                    break
            
            if not key:
                raise ValueError(f"Clé publique Apple introuvable pour kid: {kid}")
            
            # Verify the token
            payload = jose_jwt.decode(
                id_token_str,
                key,
                algorithms=['RS256'],
                audience=self.apple_bundle_id,
                issuer='https://appleid.apple.com'
            )
            
            # Verify nonce if provided
            if nonce and payload.get('nonce') != nonce:
                raise ValueError("Nonce de token Apple ne correspond pas")
            
            # Extract user information
            email = payload.get('email', '')
            sub = payload.get('sub', '')
            
            # Apple may not always provide email
            if not email:
                logger.warning(f"Apple token missing email, using placeholder for sub: {sub}")
                email = f"{sub}@apple.yacook.placeholder"
            
            email_verified = payload.get('email_verified', False)
            if isinstance(email_verified, str):
                email_verified = email_verified.lower() == 'true'
            
            logger.info(f"Successfully verified Apple token for email: {email}")
            
            return {
                'email': email,
                'sub': sub,  # Apple user ID
                'email_verified': email_verified,
                'is_private_email': payload.get('is_private_email', False)
            }
            
        except JWTError as e:
            logger.error(f"Apple token JWT verification failed: {str(e)}")
            raise ValueError(f"Token Apple invalide (JWT): {str(e)}")
        except ValueError as e:
            logger.error(f"Apple token verification failed: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error verifying Apple token: {str(e)}")
            raise ValueError(f"Erreur de vérification Apple: {str(e)}")


# Singleton instance
social_auth_service = SocialAuthService()
