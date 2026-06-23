import asyncio
import os
import sys

# add parent dir so we can import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.agents.orchestrator import AgentOrchestrator
from backend.core.supabase_client import supabase_client
import structlog

logger = structlog.get_logger()

async def main():
    print("Testing orchestrator...")
    orchestrator = AgentOrchestrator(supabase_client)
    
    # Check if there is an existing project to test with
    res = supabase_client.table("projects").select("*").limit(1).execute()
    if not res.data:
        print("No project found in Supabase. Please create a project via UI first.")
        return
        
    project = res.data[0]
    print(f"Running pipeline for project: {project['id']} - {project.get('business_name')}")
    
    try:
        results = await orchestrator.run(project)
        print("Pipeline finished.")
        print("Results keys:", results.keys())
        for k, v in results.items():
            if "error" in v:
                print(f"  {k} failed with error: {v['error']}")
    except Exception as e:
        print(f"Pipeline crashed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
