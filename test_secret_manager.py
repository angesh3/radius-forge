#!/usr/bin/env python3
"""Test secret manager functionality"""

import sys
sys.path.insert(0, 'src')

from api.security.secret_manager import SecretManager

def test_encryption_decryption():
    """Test basic encryption/decryption"""
    sm = SecretManager()
    secret = 'test-secret-123'
    encrypted = sm.encrypt_secret(secret)
    decrypted = sm.decrypt_secret(encrypted)
    
    if decrypted == secret:
        print('SUCCESS: Secret encryption/decryption works')
        return True
    else:
        print(f'ERROR: Secret mismatch. Original: {secret}, Decrypted: {decrypted}')
        return False

def test_redaction():
    """Test secret redaction"""
    sm = SecretManager()
    redacted = sm.redact_secret('testing123')
    if redacted == '******g123':
        print('SUCCESS: Secret redaction works')
        return True
    else:
        print(f'ERROR: Redaction failed. Expected: ******g123, Got: {redacted}')
        return False

def test_context_encryption():
    """Test encryption with context"""
    sm = SecretManager()
    secret = 'context-secret'
    context = {'server_id': 'test-server'}
    
    encrypted = sm.encrypt_secret(secret, context)
    decrypted = sm.decrypt_secret(encrypted, context)
    
    if decrypted == secret:
        print('SUCCESS: Context-based encryption works')
        return True
    else:
        print(f'ERROR: Context encryption failed. Original: {secret}, Decrypted: {decrypted}')
        return False

if __name__ == '__main__':
    tests = [
        test_encryption_decryption(),
        test_redaction(),
        test_context_encryption()
    ]
    
    if all(tests):
        print('All secret manager tests passed!')
        sys.exit(0)
    else:
        print('Some secret manager tests failed!')
        sys.exit(1)
