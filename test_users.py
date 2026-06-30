import asyncio
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

async def test_users():
    from backend.core.supabase_client import supabase_admin
    res = supabase_admin.auth.admin.list_users()
    users = getattr(res, 'users', res)
    if hasattr(users, '__iter__'):
        for u in users:
            print(f"Email: {u.email}, Confirmed At: {u.email_confirmed_at}")

if __name__ == "__main__":
    asyncio.run(test_users())
