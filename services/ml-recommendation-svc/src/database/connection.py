"""
Database connection and session management for ML Recommendation Service.

Provides async database connections using SQLAlchemy 2.0 async patterns.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional
import logging

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
    AsyncEngine,
)
from sqlalchemy.pool import NullPool

from ..config import get_settings
from .models import Base

logger = logging.getLogger(__name__)
settings = get_settings()


class Database:
    """
    Manages async database connections and sessions.
    
    Usage:
        db = Database()
        await db.connect()
        
        async with db.session() as session:
            result = await session.execute(query)
        
        await db.disconnect()
    """
    
    def __init__(self, database_url: Optional[str] = None):
        """
        Initialize database with connection URL.
        
        Args:
            database_url: PostgreSQL async connection string.
                         If not provided, uses DATABASE_URL from settings.
        """
        self._url = database_url or str(settings.database_url)
        self._engine: Optional[AsyncEngine] = None
        self._session_factory: Optional[async_sessionmaker[AsyncSession]] = None
    
    @property
    def engine(self) -> AsyncEngine:
        """Get the database engine, raising if not connected."""
        if self._engine is None:
            raise RuntimeError("Database not connected. Call connect() first.")
        return self._engine
    
    async def connect(self) -> None:
        """
        Establish database connection.
        
        Creates the async engine and session factory.
        Should be called during application startup.
        """
        if self._engine is not None:
            logger.warning("Database already connected")
            return
        
        logger.info("Connecting to database", url=self._mask_url(self._url))
        
        # Create async engine with connection pool settings
        self._engine = create_async_engine(
            self._url,
            echo=settings.environment == "development",
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,  # Verify connections before using
            pool_recycle=3600,   # Recycle connections after 1 hour
        )
        
        # Create session factory
        self._session_factory = async_sessionmaker(
            bind=self._engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
        
        logger.info("Database connected successfully")
    
    async def disconnect(self) -> None:
        """
        Close database connection.
        
        Should be called during application shutdown.
        """
        if self._engine is None:
            return
        
        logger.info("Disconnecting from database")
        await self._engine.dispose()
        self._engine = None
        self._session_factory = None
        logger.info("Database disconnected")
    
    @asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        """
        Get a database session as async context manager.
        
        Automatically handles commit/rollback and closing.
        
        Usage:
            async with db.session() as session:
                result = await session.execute(query)
                await session.commit()
        
        Yields:
            AsyncSession: Database session
        """
        if self._session_factory is None:
            raise RuntimeError("Database not connected. Call connect() first.")
        
        session = self._session_factory()
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
    
    async def create_tables(self) -> None:
        """
        Create all tables defined in models.
        
        Only use in development/testing. Use migrations in production.
        """
        async with self._engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created")
    
    async def drop_tables(self) -> None:
        """
        Drop all tables. USE WITH CAUTION.
        
        Only use in development/testing.
        """
        async with self._engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        logger.warning("Database tables dropped")
    
    async def health_check(self) -> bool:
        """
        Check database connectivity.
        
        Returns:
            bool: True if database is reachable
        """
        try:
            async with self.session() as session:
                await session.execute("SELECT 1")
            return True
        except Exception as e:
            logger.error("Database health check failed", error=str(e))
            return False
    
    def _mask_url(self, url: str) -> str:
        """Mask password in database URL for logging."""
        # Simple masking - replace password portion
        parts = url.split("@")
        if len(parts) > 1 and ":" in parts[0]:
            creds = parts[0].rsplit(":", 1)
            if len(creds) > 1:
                masked_creds = f"{creds[0]}:****"
                return f"{masked_creds}@{'@'.join(parts[1:])}"
        return url


# Global database instance
_database: Optional[Database] = None


def get_database() -> Database:
    """
    Get the global database instance.
    
    Returns:
        Database: The global database instance
    
    Raises:
        RuntimeError: If database has not been initialized
    """
    global _database
    if _database is None:
        _database = Database()
    return _database


async def init_database(database_url: Optional[str] = None) -> Database:
    """
    Initialize and connect the global database.
    
    Args:
        database_url: Optional database URL override
    
    Returns:
        Database: Connected database instance
    """
    global _database
    _database = Database(database_url)
    await _database.connect()
    return _database


@asynccontextmanager
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Convenience function to get a database session.
    
    Usage:
        async with get_session() as session:
            result = await session.execute(query)
    
    Yields:
        AsyncSession: Database session
    """
    db = get_database()
    async with db.session() as session:
        yield session


class TestDatabase(Database):
    """
    Database class configured for testing.
    
    Uses NullPool to avoid connection issues in tests.
    """
    
    async def connect(self) -> None:
        """Connect with test-appropriate settings."""
        if self._engine is not None:
            return
        
        self._engine = create_async_engine(
            self._url,
            echo=False,
            poolclass=NullPool,  # No connection pooling for tests
        )
        
        self._session_factory = async_sessionmaker(
            bind=self._engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
