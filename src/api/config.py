#!/usr/bin/env python3
"""
RadiusForge Configuration Management
Settings using pydantic-settings with environment variable support
"""

from pydantic import Field
from pydantic_settings import BaseSettings
from typing import List, Optional
import os


class Settings(BaseSettings):
    """Application settings with environment variable support"""

    # API Configuration
    API_HOST: str = Field(default="0.0.0.0", env="API_HOST")
    API_PORT: int = Field(default=8910, env="API_PORT")  # Production port per PRD
    DEBUG: bool = Field(default=False, env="DEBUG")

    # Database Configuration
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://radiusforge:radiusforge@radiusforge-db-prod/radiusforge", env="DATABASE_URL"
    )
    DATABASE_ECHO: bool = Field(default=False, env="DATABASE_ECHO")

    # Redis Configuration (for caching and session storage)
    REDIS_URL: str = Field(default="redis://radiusforge-redis-prod:6379/0", env="REDIS_URL")

    # CORS Configuration
    CORS_ORIGINS: str = Field(default="http://localhost:8911,http://127.0.0.1:8911", env="CORS_ORIGINS")

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins as a list"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    # Security Settings
    SECRET_KEY: str = Field(default="radiusforge-secret-key-change-in-production", env="SECRET_KEY")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES")

    # Secret Management
    ENCRYPTION_KEY_SOURCE: str = Field(
        default="radiusforge-encryption-key-change-in-production", env="ENCRYPTION_KEY_SOURCE"
    )

    ALLOW_SIMULATORS: str = Field(default="0", env="ALLOW_SIMULATORS")

    # RADIUS Configuration
    RADIUS_SECRET: str = Field(default="testing123", env="RADIUS_SECRET")
    RADIUS_AUTH_PORT: int = Field(default=1812, env="RADIUS_AUTH_PORT")
    RADIUS_ACCT_PORT: int = Field(default=1813, env="RADIUS_ACCT_PORT")

    # Test Configuration
    MAX_CONCURRENT_TESTS: int = Field(default=10, env="MAX_CONCURRENT_TESTS")
    DEFAULT_TEST_DURATION: int = Field(default=300, env="DEFAULT_TEST_DURATION")  # seconds
    MAX_RPS_LIMIT: int = Field(default=100000, env="MAX_RPS_LIMIT")

    # WebSocket Configuration
    WS_HEARTBEAT_INTERVAL: int = Field(default=30, env="WS_HEARTBEAT_INTERVAL")  # seconds
    WS_MAX_CONNECTIONS: int = Field(default=100, env="WS_MAX_CONNECTIONS")

    # Logging Configuration
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    LOG_FORMAT: str = Field(default="%(asctime)s - %(name)s - %(levelname)s - %(message)s", env="LOG_FORMAT")

    # File Storage
    REPORTS_DIR: str = Field(default="./reports", env="REPORTS_DIR")
    LOGS_DIR: str = Field(default="./logs", env="LOGS_DIR")
    TEMP_DIR: str = Field(default="./temp", env="TEMP_DIR")

    # Performance Settings
    WORKER_POOL_SIZE: int = Field(default=10, env="WORKER_POOL_SIZE")
    PACKET_BUFFER_SIZE: int = Field(default=1000, env="PACKET_BUFFER_SIZE")

    # Monitoring & Metrics
    METRICS_RETENTION_DAYS: int = Field(default=30, env="METRICS_RETENTION_DAYS")
    TELEMETRY_BROADCAST_INTERVAL: float = Field(default=1.0, env="TELEMETRY_BROADCAST_INTERVAL")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields from .env


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings"""
    return settings


def create_directories():
    """Create necessary directories if they don't exist"""
    directories = [settings.REPORTS_DIR, settings.LOGS_DIR, settings.TEMP_DIR]

    for directory in directories:
        os.makedirs(directory, exist_ok=True)


# Initialize directories on import
create_directories()
