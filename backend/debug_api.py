import asyncio
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import BackgroundTasks
from backend.api.projects import run_agents
from backend.core.supabase_client import supabase_admin

class MockUser:
    def __init__(self, id):
        self.id = id

async def test_run():
    # 1. Fetch a real project
    res = supabase_admin.table("projects").select("*").limit(1).execute()
    if not res.data:
        print("No project found to test")
        return
    
    project = res.data[0]
    project_id = project["id"]
    user_id = project["user_id"]
    
    print(f"Testing with project {project_id} (User: {user_id})")
    
    bg_tasks = BackgroundTasks()
    user = MockUser(user_id)
    
    try:
        response = await run_agents(project_id, bg_tasks, user)
        print("API Response:", response)
    except Exception as e:
        print("API Exception thrown:", repr(e))

if __name__ == "__main__":
    asyncio.run(test_run())
