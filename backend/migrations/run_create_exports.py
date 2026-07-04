import os
import sys
from pathlib import Path

# Allow running from project root
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

def run():
    from supabase import create_client
    
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SECRET_KEY", "")
    
    if not url or not key:
        print("ERROR: SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env")
        sys.exit(1)
        
    client = create_client(url, key)
    
    sql_path = Path(__file__).parent / "create_exports_table.sql"
    with open(sql_path, "r") as f:
        sql = f.read()
        
    try:
        # Many hosted Supabase instances do not allow arbitrary SQL execution via REST/RPC
        # unless a custom `exec_sql` function was created.
        res = client.rpc("exec_sql", {"sql": sql}).execute()
        print("Migration executed successfully via exec_sql RPC!")
    except Exception as e:
        print(f"Could not execute migration automatically: {str(e)}")
        print("Please copy the contents of create_exports_table.sql and run it manually in the Supabase SQL Editor.")
        
if __name__ == "__main__":
    run()
