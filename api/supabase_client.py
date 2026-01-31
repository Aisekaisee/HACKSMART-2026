"""Supabase client singleton for database operations."""

import os
from supabase import create_client, Client


# Module-level cache for the Supabase client
_supabase_client: Client | None = None


def get_supabase() -> Client:
    """Get the Supabase client instance.
    
    Returns a cached client instance, creating one if it doesn't exist.
    Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from environment variables.
    
    Returns:
        Client: The Supabase client instance.
    
    Raises:
        ValueError: If required environment variables are not set.
    """
    global _supabase_client
    
    if _supabase_client is None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        
        if not url:
            raise ValueError("SUPABASE_URL environment variable is not set")
        if not key:
            raise ValueError("SUPABASE_SERVICE_ROLE_KEY environment variable is not set")
        
        _supabase_client = create_client(url, key)
    
    return _supabase_client
