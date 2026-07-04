import asyncio
import os
import sys
import random
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
    
    # 2. Modify project slightly to bust the input_hash cache
    new_budget = float(project.get("budget", 50000)) + random.randint(1, 100)
    supabase_admin.table("projects").update({"budget": new_budget}).eq("id", project_id).execute()
    project["budget"] = new_budget
    
    print(f"Testing pipeline for project {project_id} (Budget changed to {new_budget} to bust cache)")
    
    try:
        await _run_agent_pipeline(project, job_id)
        print("Pipeline finished successfully")
        
        # Verify
        reports = {}
        for table in ["research_reports", "competitor_reports", "business_plans", "financial_reports", "marketing_reports"]:
            r = supabase_admin.table(table).select("status").eq("project_id", project_id).execute()
            reports[table] = r.data[0].get("status") if r.data else "missing"
            
        print("Verification Results:", reports)
        if all(s == "completed" for s in reports.values()):
            print("ALL AGENTS SUCCEEDED!")
        else:
            print("SOME AGENTS FAILED!")
    except Exception as e:
        print("Pipeline Exception thrown:", repr(e))

if __name__ == "__main__":
    asyncio.run(test_run())
