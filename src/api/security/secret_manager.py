#!/usr/bin/env python3
"""
RadiusForge Secret Manager
AES-GCM encryption for secure secret storage
"""

import os
import base64
import secrets
from typing import Optional, Dict, Any
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import logging

logger = logging.getLogger(__name__)


class SecretManager:
    """Manages encrypted storage of secrets using AES-GCM"""

    def __init__(self, key_source: Optional[str] = None):
        """
        Initialize SecretManager

        Args:
            key_source: Base key for encryption. If None, uses environment variable
        """
        self.key_source = key_source or os.getenv(
            "RADIUSFORGE_SECRET_KEY", "radiusforge-default-key-change-in-production"
        )
        self._master_key = self._derive_master_key()
        self.aesgcm = AESGCM(self._master_key)

    def _derive_master_key(self) -> bytes:
        """Derive master encryption key from key source"""
        salt = b"radiusforge-salt-v1"  # Fixed salt for consistency
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,  # 256-bit key for AES-256-GCM
            salt=salt,
            iterations=100000,
        )
        return kdf.derive(self.key_source.encode("utf-8"))

    def encrypt_secret(self, plaintext: str, context: Optional[Dict[str, str]] = None) -> str:
        """
        Encrypt a secret string

        Args:
            plaintext: The secret to encrypt
            context: Optional context for additional authenticated data

        Returns:
            Base64-encoded encrypted data with nonce
        """
        if not plaintext:
            return ""

        try:
            nonce = secrets.token_bytes(12)  # 96-bit nonce for GCM

            aad = None
            if context:
                aad = "|".join(f"{k}={v}" for k, v in sorted(context.items())).encode("utf-8")

            ciphertext = self.aesgcm.encrypt(nonce, plaintext.encode("utf-8"), aad)

            encrypted_data = nonce + ciphertext
            return base64.b64encode(encrypted_data).decode("ascii")

        except Exception as e:
            logger.error(f"Failed to encrypt secret: {e}")
            raise ValueError("Secret encryption failed")

    def decrypt_secret(self, encrypted_data: str, context: Optional[Dict[str, str]] = None) -> str:
        """
        Decrypt a secret string

        Args:
            encrypted_data: Base64-encoded encrypted data
            context: Optional context for additional authenticated data

        Returns:
            Decrypted plaintext
        """
        if not encrypted_data:
            return ""

        try:
            data = base64.b64decode(encrypted_data.encode("ascii"))

            nonce = data[:12]
            ciphertext = data[12:]

            aad = None
            if context:
                aad = "|".join(f"{k}={v}" for k, v in sorted(context.items())).encode("utf-8")

            plaintext_bytes = self.aesgcm.decrypt(nonce, ciphertext, aad)
            return plaintext_bytes.decode("utf-8")

        except Exception as e:
            logger.error(f"Failed to decrypt secret: {e}")
            raise ValueError("Secret decryption failed")

    def redact_secret(self, secret: str, show_chars: int = 4) -> str:
        """
        Redact a secret for logging/display

        Args:
            secret: The secret to redact
            show_chars: Number of characters to show at the end

        Returns:
            Redacted secret string
        """
        if not secret:
            return ""

        if len(secret) <= show_chars:
            return "*" * len(secret)

        return "*" * (len(secret) - show_chars) + secret[-show_chars:]

    def rotate_key(self, new_key_source: str) -> None:
        """
        Rotate the master encryption key

        Args:
            new_key_source: New key source for encryption
        """
        old_key = self._master_key
        self.key_source = new_key_source
        self._master_key = self._derive_master_key()
        self.aesgcm = AESGCM(self._master_key)

        logger.info("Master encryption key rotated successfully")

    def migrate_plaintext_secret(self, plaintext: str, context: Optional[Dict[str, str]] = None) -> str:
        """
        Migrate a plaintext secret to encrypted format

        Args:
            plaintext: Plaintext secret to encrypt
            context: Optional context for the secret

        Returns:
            Encrypted secret
        """
        if self.is_encrypted(plaintext):
            return plaintext  # Already encrypted

        return self.encrypt_secret(plaintext, context)

    def is_encrypted(self, data: str) -> bool:
        """
        Check if data appears to be encrypted

        Args:
            data: Data to check

        Returns:
            True if data appears encrypted
        """
        if not data:
            return False

        try:
            decoded = base64.b64decode(data.encode("ascii"))
            return len(decoded) >= 28
        except Exception:
            return False


secret_manager = SecretManager()


def get_secret_manager() -> SecretManager:
    """Get the global secret manager instance"""
    return secret_manager
