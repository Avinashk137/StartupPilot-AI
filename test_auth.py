import asyncio
import httpx
from backend.core.supabase_client import supabase_admin

async def generate_token():
    # Let's get the first user in the database
    res = supabase_admin.table('projects').select('user_id').limit(1).execute()
    if not res.data:
        print("No users found")
        return
    user_id = res.data[0]['user_id']
    print(f"User ID: {user_id}")
    
    # We can't easily generate a JWT token without knowing the email and signing in,
    # or signing a custom JWT with the Supabase JWT secret.
    # We DO have the JWT secret in our .env? No, only the URL and service key.
    # The service role key is a valid JWT. BUT if we send it as Bearer to the API, 
    # `get_current_user` calls `supabase_client.auth.get_user(token)`.
    # Does `get_user` work with the service role key? Usually not, it's not a user token.

if __name__ == "__main__":
    asyncio.run(generate_token())
