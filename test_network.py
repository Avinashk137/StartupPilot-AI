import asyncio
import httpx

async def test():
    # Login to get a real token
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000") as client:
        # Assuming the user email is available in db, let's just bypass auth by checking what the server returns when we send PUT without proper JSON.
        pass

asyncio.run(test())
