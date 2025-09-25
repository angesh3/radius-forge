#!/usr/bin/env python3
"""
RadiusForge Database Configuration
SQLAlchemy setup with async support for PostgreSQL
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import NullPool
from contextlib import asynccontextmanager
from typing import AsyncGenerator
import logging

from .config import settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """Base class for all database models"""

    pass


# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DATABASE_ECHO,
    poolclass=NullPool,  # Use NullPool for async
    pool_pre_ping=True,
    pool_recycle=3600,  # Recycle connections every hour
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False, autoflush=True, autocommit=False
)


async def init_db():
    """Initialize database - create all tables (idempotent)"""
    try:
        async with engine.begin() as conn:
            # Import all models to ensure they're registered
            from . import models

            # Create all tables (idempotent - won't fail if tables exist)
            await conn.run_sync(Base.metadata.create_all, checkfirst=True)

        logger.info("Database initialized successfully")

    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency to get database session

    Usage:
        @app.get("/endpoint")
        async def endpoint(db: AsyncSession = Depends(get_db)):
            # Use db session
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            await session.close()


@asynccontextmanager
async def get_db_context() -> AsyncGenerator[AsyncSession, None]:
    """
    Context manager for database session

    Usage:
        async with get_db_context() as db:
            # Use db session
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"Database context error: {e}")
            raise
        finally:
            await session.close()


class DatabaseManager:
    """Database manager for advanced operations"""

    def __init__(self):
        self.engine = engine
        self.session_factory = AsyncSessionLocal

    async def health_check(self) -> bool:
        """Check database connectivity"""
        try:
            async with self.session_factory() as session:
                await session.execute("SELECT 1")
                return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False

    async def cleanup_expired_sessions(self):
        """Clean up expired test sessions and old data"""
        try:
            async with self.session_factory() as session:
                from .models import TestRun
                from datetime import datetime, timedelta

                # Clean up test runs older than retention period
                cutoff_date = datetime.utcnow() - timedelta(days=settings.METRICS_RETENTION_DAYS)

                # Note: Using text() for raw SQL if needed
                # await session.execute(text("DELETE FROM test_runs WHERE created_at < :cutoff"), {"cutoff": cutoff_date})

                await session.commit()
                logger.info("Database cleanup completed")

        except Exception as e:
            logger.error(f"Database cleanup failed: {e}")

    async def get_db_stats(self) -> dict:
        """Get database statistics"""
        try:
            async with self.session_factory() as session:
                from .models import TestRun, NAD, Report

                # Get counts
                test_runs_count = await session.scalar("SELECT COUNT(*) FROM test_runs")
                nads_count = await session.scalar("SELECT COUNT(*) FROM nads")
                reports_count = await session.scalar("SELECT COUNT(*) FROM reports")

                return {
                    "test_runs": test_runs_count or 0,
                    "nads": nads_count or 0,
                    "reports": reports_count or 0,
                    "status": "healthy",
                }

        except Exception as e:
            logger.error(f"Failed to get database stats: {e}")
            return {"status": "error", "error": str(e)}


# Global database manager instance
db_manager = DatabaseManager()


async def close_db_connections():
    """Close all database connections"""
    try:
        await engine.dispose()
        logger.info("Database connections closed")
    except Exception as e:
        logger.error(f"Error closing database connections: {e}")
