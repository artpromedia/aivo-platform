"""
Supabase Client Configuration

Provides configured Supabase client for database operations.
"""

from typing import Optional
from supabase import create_client, Client
from src.config.settings import get_settings

_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """Get configured Supabase client instance."""
    global _supabase_client

    if _supabase_client is None:
        settings = get_settings()
        _supabase_client = create_client(
            settings.supabase_url,
            settings.supabase_service_key or settings.supabase_key
        )

    return _supabase_client


async def check_connection() -> bool:
    """Check if Supabase connection is healthy."""
    try:
        client = get_supabase_client()
        # Try a simple query to verify connection
        client.table('learner_brain_states').select('learner_id').limit(1).execute()
        return True
    except Exception:
        return False
