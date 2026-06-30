import asyncio
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

async def test():
    from backend.core.supabase_client import supabase_client
    try:
        supabase_client.auth.sign_in_with_password({'email': 'testuser@example.com', 'password': 'wrongpassword'})
    except Exception as e:
        print(f'ERROR TYPE: {type(e)}')
        print(f'ERROR MSG: {str(e)}')

if __name__ == "__main__":
    asyncio.run(test())
