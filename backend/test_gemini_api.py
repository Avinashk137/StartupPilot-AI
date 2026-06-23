import asyncio
import os
import sys

# add parent dir so we can import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.core.config import settings
from backend.services.ai.gemini_provider import GeminiProvider

async def main():
    print(f"API Key loaded: {bool(settings.GEMINI_API_KEY)}")
    print(f"API Key prefix: {settings.GEMINI_API_KEY[:4] if settings.GEMINI_API_KEY else 'None'}")
    print(f"Model: {settings.GEMINI_MODEL}")
    
    provider = GeminiProvider()
    print("Testing generate...")
    resp = await provider.generate(prompt="Reply with exactly 'OK'")
    print(f"Success: {resp.success}")
    if resp.success:
        print(f"Content: {resp.content}")
        print(f"Tokens: {resp.tokens_used}")
    else:
        print(f"Error: {resp.error}")

if __name__ == "__main__":
    asyncio.run(main())
