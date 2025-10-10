from dotenv import load_dotenv
import os
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, HashingError
import logging
from typing import Optional

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class AuthService:
    """Service for handling authentication operations."""
    
    def __init__(self):
        # Initialize Argon2 password hasher with secure parameters
        self.ph = PasswordHasher(
            time_cost=3,        # 3 iterations
            memory_cost=65536,  # 64MB memory
            parallelism=4,      # 4 parallel threads
            hash_len=32,        # 32 byte hash length
            salt_len=16         # 16 byte salt length
        )
    
    def hash_password(self, password: str) -> str:
        """Hash a password using Argon2.
        
        Args:
            password: Plain text password to hash
            
        Returns:
            Hashed password string
            
        Raises:
            HashingError: If password hashing fails
        """
        try:
            return self.ph.hash(password)
        except Exception as e:
            logger.error(f"Password hashing failed: {str(e)}")
            raise HashingError(f"Failed to hash password: {str(e)}")
    
    def verify_password(self, password: str, hashed_password: str) -> bool:
        """Verify a password against its hash.
        
        Args:
            password: Plain text password to verify
            hashed_password: Stored password hash
            
        Returns:
            True if password matches, False otherwise
        """
        try:
            self.ph.verify(hashed_password, password)
            return True
        except VerifyMismatchError:
            return False
        except Exception as e:
            logger.error(f"Password verification failed: {str(e)}")
            return False
    
    def needs_rehash(self, hashed_password: str) -> bool:
        """Check if a password hash needs to be rehashed.
        
        Args:
            hashed_password: Stored password hash
            
        Returns:
            True if hash needs updating, False otherwise
        """
        try:
            return self.ph.check_needs_rehash(hashed_password)
        except Exception as e:
            logger.warning(f"Hash check failed: {str(e)}")
            return False
    
    def get_hash_algorithm(self) -> str:
        """Get the hash algorithm identifier.
        
        Returns:
            String identifier for the hashing algorithm
        """
        return f"argon2id(time={self.ph.time_cost},memory={self.ph.memory_cost},parallelism={self.ph.parallelism})"

# Global auth service instance
auth_service = AuthService()