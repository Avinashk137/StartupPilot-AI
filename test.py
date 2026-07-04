import asyncio
import httpx
from backend.core.supabase_client import supabase_admin

async def generate_token():
    # Login as an existing user
    res = supabase_admin.auth.admin.generate_link({
        "type": "magiclink",
        "email": "test@example.com" # I don't know the user's email
    })
