import asyncio
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

async def test_pipeline():
    from backend.core.supabase_client import supabase_admin
    from backend.api.projects import _run_agent_pipeline
    
    print("Creating test user if needed...")
    user_id = None
    try:
        res = supabase_admin.auth.admin.list_users()
        users = getattr(res, 'users', res)
        if hasattr(users, '__iter__'):
            for u in users:
                if u.email == "testuser@example.com":
                    user_id = u.id
                    break
    except Exception:
        pass

    if not user_id:
        try:
            new_user = supabase_admin.auth.admin.create_user({
                "email": "testuser@example.com",
                "password": "password123",
                "email_confirm": True
            })
            user_id = new_user.user.id
        except Exception as e:
            print(f"User might already exist: {e}")
            # If we still can't find them, we can't test.
            if not user_id:
                return
        
    print(f"Using user_id: {user_id}")
    
    project_data = {
        "user_id": user_id,
        "business_name": "EcoTest AI E2E",
        "business_idea": "An AI platform that optimizes energy usage for smart homes by predicting weather and occupancy.",
        "industry": "Technology",
        "country": "USA",
        "state": "California",
        "target_audience": "Homeowners with smart devices",
        "budget": 50000,
        "budget_currency": "USD",
        "goals": "Reduce energy bills by 30%",
        "business_stage": "idea",
        "risk_appetite": "medium",
        "timeline": "6 Months",
        "status": "processing",
        "progress_percent": 0
    }
    
    print("Inserting project into database...")
    try:
        res = supabase_admin.table("projects").insert(project_data).execute()
        project = res.data[0]
        project_id = project["id"]
        print(f"Project created with ID: {project_id}")
    except Exception as e:
        print(f"Failed to create project: {e}")
        return

    print("Running AI pipeline...")
    await _run_agent_pipeline(project)
    print("Pipeline finished.")
    
    res = supabase_admin.table("projects").select("*").eq("id", project_id).execute()
    final_project = res.data[0]
    print("\n--- FINAL STATUS ---")
    print(f"Status: {final_project['status']}")
    print(f"Progress: {final_project['progress_percent']}%")
    print(f"Error Message: {final_project['error_message']}")
    print(f"AI Diagnostics: {final_project.get('ai_diagnostics')}")

if __name__ == "__main__":
    asyncio.run(test_pipeline())
