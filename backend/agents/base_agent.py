"""
base_agent.py — Legacy compatibility module.

The MasterPromptBuilder in agents.py now handles all prompt construction.
This module is kept for any future standalone agent needs.
The build_context_summary function has been moved to agents.py and is
importable from there directly.
"""
from .agents import build_context_summary

__all__ = ["build_context_summary"]
