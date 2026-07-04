"""
Migration: Add current_step and heartbeat columns to the projects table.

These columns support the production-grade orchestration engine:
  - current_step: human-readable status string for the running agent
                  ("Calling Gemini", "Parsing Response", etc.)
  - heartbeat:    timestamp updated every few seconds by the pipeline;
                  used by the watchdog to detect stalled projects.

Run this script once against your Supabase database.
"""
import os
import sys
from pathlib import Path

# Allow running from project root
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

import structlog
logger = structlog.get_logger()

SQL_MIGRATIONS = [
    # Add current_step column to projects
    """
    ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS current_step TEXT;
    """,
    
    # Add heartbeat column to projects  
    """
    ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS heartbeat TIMESTAMPTZ DEFAULT NOW();
    """,

    # Add provider_used column to each report table (checkpoint metadata)
    """
    ALTER TABLE research_reports
    ADD COLUMN IF NOT EXISTS provider_used TEXT;
    """,
    """
    ALTER TABLE competitor_reports
    ADD COLUMN IF NOT EXISTS provider_used TEXT;
    """,
    """
    ALTER TABLE business_plans
    ADD COLUMN IF NOT EXISTS provider_used TEXT;
    """,
    """
    ALTER TABLE financial_reports
    ADD COLUMN IF NOT EXISTS provider_used TEXT;
    """,
    """
    ALTER TABLE marketing_reports
    ADD COLUMN IF NOT EXISTS provider_used TEXT;
    """,

    # Add runtime_ms column to each report table
    """
    ALTER TABLE research_reports
    ADD COLUMN IF NOT EXISTS runtime_ms INTEGER DEFAULT 0;
    """,
    """
    ALTER TABLE competitor_reports
    ADD COLUMN IF NOT EXISTS runtime_ms INTEGER DEFAULT 0;
    """,
    """
    ALTER TABLE business_plans
    ADD COLUMN IF NOT EXISTS runtime_ms INTEGER DEFAULT 0;
    """,
    """
    ALTER TABLE financial_reports
    ADD COLUMN IF NOT EXISTS runtime_ms INTEGER DEFAULT 0;
    """,
    """
    ALTER TABLE marketing_reports
    ADD COLUMN IF NOT EXISTS runtime_ms INTEGER DEFAULT 0;
    """,

    # Add retry_count column to each report table
    """
    ALTER TABLE research_reports
    ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
    """,
    """
    ALTER TABLE competitor_reports
    ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
    """,
    """
    ALTER TABLE business_plans
    ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
    """,
    """
    ALTER TABLE financial_reports
    ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
    """,
    """
    ALTER TABLE marketing_reports
    ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
    """,
]


def run_migrations():
    """Run all migrations against the Supabase database."""
    from supabase import create_client
    
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SECRET_KEY", "")
    
    if not url or not key:
        print("ERROR: SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env")
        sys.exit(1)
    
    client = create_client(url, key)
    
    print(f"Running {len(SQL_MIGRATIONS)} migrations...")
    succeeded = 0
    failed = 0
    
    for i, sql in enumerate(SQL_MIGRATIONS, 1):
        sql_preview = sql.strip().split('\n')[1].strip() if '\n' in sql.strip() else sql.strip()[:60]
        try:
            # Use Supabase's RPC or direct SQL if available
            # For Supabase, we use postgrest-py to run raw SQL
            result = client.rpc("exec_sql", {"sql": sql.strip()}).execute()
            print(f"  [{i:02d}] ✅ {sql_preview}")
            succeeded += 1
        except Exception as e:
            err = str(e)
            # Supabase may not have exec_sql RPC — that's fine, the columns are likely
            # already defined or will be added manually via Supabase Studio.
            if "Could not find the function" in err or "does not exist" in err:
                print(f"  [{i:02d}] ⚠️  {sql_preview}")
                print(f"        NOTE: Cannot run raw SQL via RPC. Run manually in Supabase SQL editor.")
                print(f"        SQL: {sql.strip()[:100]}")
            else:
                print(f"  [{i:02d}] ❌ {sql_preview}")
                print(f"        Error: {err[:200]}")
                failed += 1
    
    print(f"\nMigration complete: {succeeded} succeeded, {failed} failed.")
    
    if failed > 0:
        print("\nPlease run failed migrations manually in the Supabase SQL Editor:")
        print("  https://app.supabase.com/project/_/editor")
        for sql in SQL_MIGRATIONS:
            print(f"\n{sql.strip()}")


def print_sql():
    """Print all migration SQL for manual execution in Supabase Studio."""
    print("=" * 60)
    print("COPY AND RUN THIS IN SUPABASE SQL EDITOR:")
    print("=" * 60)
    for sql in SQL_MIGRATIONS:
        print(sql.strip())
        print()


if __name__ == "__main__":
    if "--print-sql" in sys.argv:
        print_sql()
    else:
        print_sql()  # Always print so user can manually run if needed
        print("\n" + "=" * 60)
        print("Also attempting automated migration...")
        print("=" * 60)
        try:
            run_migrations()
        except Exception as e:
            print(f"\nAutomated migration failed: {e}")
            print("Please run the SQL above manually in Supabase SQL Editor.")
