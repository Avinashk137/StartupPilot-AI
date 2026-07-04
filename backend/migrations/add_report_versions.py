import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv

load_dotenv()

TABLES = [
    "research_reports",
    "competitor_reports",
    "business_plans",
    "financial_reports",
    "marketing_reports"
]

async def migrate():
    print("Migration SQL generated.")
    print("---")
    
    sql = ""
    for table in TABLES:
        sql += f"""
ALTER TABLE {table} ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE {table} ADD COLUMN IF NOT EXISTS previous_versions JSONB DEFAULT '[]'::jsonb;
"""
    print(sql)
    print("---")
    print("Please execute the above SQL in the Supabase SQL Editor.")

if __name__ == "__main__":
    asyncio.run(migrate())
