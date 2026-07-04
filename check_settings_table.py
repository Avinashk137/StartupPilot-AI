import asyncio
from backend.core.supabase_client import supabase_admin

async def check():
    try:
        res = supabase_admin.table('user_settings').select('id').limit(1).execute()
        print("Table exists! Response:", res)
    except Exception as e:
        print("Table error:", e)

if __name__ == "__main__":
    asyncio.run(check())
