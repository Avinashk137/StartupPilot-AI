from supabase import create_client, Client
from .config import settings

def get_supabase_client() -> Client:
    if not settings.SUPABASE_URL or not settings.SUPABASE_SECRET_KEY:
        raise ValueError("Missing Supabase configuration. Please check your .env file.")
    
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SECRET_KEY)

supabase_client = get_supabase_client()
