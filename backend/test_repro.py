import asyncio
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import os
from dotenv import load_dotenv

# load env
load_dotenv()

from backend.core.supabase_client import supabase_admin
from backend.agents.orchestrator import AgentOrchestrator

async def main():
    print("Testing DB connection...")
    try:
        res = supabase_admin.table("projects").select("*").limit(1).execute()
        print("DB connection OK:", len(res.data) if res.data else "No data")
    except Exception as e:
        print("DB connection failed:", e)
        return

    # Let's see if we can instantiate AI provider
    try:
        from backend.services.ai.ai_service import ai_service
        print("AI service loaded")
    except Exception as e:
        print("AI service load failed:", e)
        return

if __name__ == "__main__":
    asyncio.run(main())
