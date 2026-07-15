# StartupPilot AI — Developer Documentation

## Quick Start

```bash
# 1. Clone
git clone https://github.com/your-org/startuppilot-ai.git
cd startuppilot-ai

# 2. Configure environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# Edit both files with your API keys

# 3. Install all dependencies
npm run setup

# 4. Start the dev server
npm run dev
```

That's it. The startup script handles the rest.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | ✅ | Supabase anon/publishable key |
| `SUPABASE_SECRET_KEY` | ✅ | Supabase service-role key |
| `SUPABASE_JWKS_URL` | ✅ | JWT verification URL |
| `GEMINI_API_KEY` | ⚡ | Google Gemini (primary AI) |
| `OPENAI_API_KEY` | ⚡ | OpenAI fallback |

> At least one AI API key is required for the analysis pipeline.

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | ✅ | Same as backend SUPABASE_URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Same as SUPABASE_PUBLISHABLE_KEY |

---

## Architecture

```
StartupPilot AI/
├── backend/               # FastAPI server (Python 3.11+)
│   ├── main.py            # App factory + health endpoint
│   ├── core/              # Config, auth, Supabase client, exceptions
│   ├── api/               # Route handlers (auth, projects, reports, exports)
│   ├── agents/            # AI orchestrator + watchdog
│   └── services/ai/       # Multi-provider AI service layer
│
├── frontend/              # Vite + React + TypeScript
│   └── src/
│       ├── providers/     # AuthProvider (health check + session)
│       ├── pages/         # Route pages
│       ├── components/    # Reusable UI
│       └── lib/           # API client, Supabase client, utils
│
├── scripts/               # Dev orchestration
│   ├── setup.js           # One-time setup (venv + npm install)
│   └── start-dev.js       # Starts backend + frontend + health polling
│
├── supabase_schema.sql    # Canonical DB schema (run in Supabase SQL editor)
├── package.json           # Root scripts: npm run dev, npm run setup
└── docs/                  # This directory
```

## AI Pipeline

The analysis pipeline runs 5 agents in sequence/parallel:

1. **Research** (blocking) — market research, customer segments, opportunities
2. Then in parallel:
   - **Competitor** — competitive landscape, SWOT, pricing analysis
   - **Business Plan** — executive summary, revenue model, growth strategy
   - **Finance** — projections, break-even, ROI, cashflow
   - **Marketing** — content calendar, SEO, growth hacks

Each agent has up to 5 retries with exponential backoff. A background watchdog auto-recovers stalled projects.

## Health Check

```
GET http://localhost:8000/api/health
```

Returns:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime_seconds": 42.3,
  "database": { "status": "connected" },
  "ai": { "status": "ready", "providers": ["gemini", "openai"] },
  "storage": { "status": "ok" }
}
```
