"""
add_input_hash_column.py — Run this ONCE to add input_hash column to projects table.

Usage:
  cd "c:\\Users\\Avinash K\\Documents\\Projects\\StartupPilot AI"
  python -m backend.migrations.add_input_hash_column

Or run directly in Supabase SQL Editor:
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS input_hash TEXT;
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.core.supabase_client import supabase_admin


def run_migration():
    print("=" * 50)
    print("Adding input_hash column to projects table...")
    print("=" * 50)

    try:
        # Test by reading a project — this checks connection
        test = supabase_admin.table("projects").select("id").limit(1).execute()
        print(f"✓ Supabase connection OK. Found {len(test.data)} project(s).")
    except Exception as e:
        print(f"✗ Supabase connection failed: {e}")
        sys.exit(1)

    # Check if column exists by trying to select it
    try:
        result = supabase_admin.table("projects").select("input_hash").limit(1).execute()
        print("✓ Column 'input_hash' already exists. No migration needed.")
        return
    except Exception:
        pass

    print("\nThe 'input_hash' column does not exist yet.")
    print("\nPlease run this SQL in your Supabase SQL Editor:")
    print("  https://supabase.com/dashboard/project/bgvpdwffecmpqnhgpfav/sql/new")
    print()
    print("─" * 50)
    print("ALTER TABLE projects ADD COLUMN IF NOT EXISTS input_hash TEXT;")
    print("─" * 50)
    print()
    print("After running the SQL above, re-run this script to verify.")
    print()
    print("Note: Without this column, caching is disabled (analysis always runs).")
    print("The application will still work correctly without it.")


if __name__ == "__main__":
    run_migration()
