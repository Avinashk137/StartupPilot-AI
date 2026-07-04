import asyncio
import httpx
from backend.core.supabase_client import supabase_admin

async def test_update():
    # Attempt to upsert the way the backend does
    user_id = "test-user-id-not-found" # Wait, we need a real user_id from auth.users to avoid foreign key violation
    
    try:
        # Let's fetch a real user_id to test
        res = supabase_admin.table("projects").select("user_id").limit(1).execute()
        if not res.data:
            print("No users found to test with")
            return
        real_user_id = res.data[0]["user_id"]
        
        print(f"Testing upsert for user {real_user_id}")
        
        updates = {"theme": "dark"}
        result = supabase_admin.table("user_settings").upsert(
            {"user_id": real_user_id, **updates},
            on_conflict="user_id"
        ).execute()
        
        print("Upsert success:", result.data)
    except Exception as e:
        print(f"Error during upsert: {e}")

if __name__ == "__main__":
    asyncio.run(test_update())
