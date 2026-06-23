import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SECRET_KEY")

if not url or not key:
    print("❌ Error: SUPABASE_URL or SUPABASE_SECRET_KEY not found in .env")
    exit(1)

try:
    supabase: Client = create_client(url, key)
    # Attempt a simple request, e.g., fetching from auth
    res = supabase.auth.admin.list_users()
    print("✅ Successfully connected to Supabase!")
    print(f"Project URL: {url}")
except Exception as e:
    print(f"❌ Failed to connect to Supabase: {e}")
