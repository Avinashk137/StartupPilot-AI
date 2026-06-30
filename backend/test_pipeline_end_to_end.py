import asyncio
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.api.projects import _run_agent_pipeline
from backend.core.supabase_client import supabase_admin

async def test_run():
    # 1. Fetch a real project
    res = supabase_admin.table("projects").select("*").limit(1).execute()
    if not res.data:
        print("No project found to test")
        return
    
    project = res.data[0]
    project_id = project["id"]
    job_id = "test-job-123"
    
    print(f"Testing pipeline for project {project_id}")
    
    try:
        await _run_agent_pipeline(project, job_id)
        print("Pipeline finished successfully")
    except Exception as e:
        print("Pipeline Exception thrown:", repr(e))

if __name__ == "__main__":
    asyncio.run(test_run())
