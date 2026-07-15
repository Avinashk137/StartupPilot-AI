# StartupPilot AI 🚀

StartupPilot AI is an advanced, agentic AI platform designed to automatically analyze and generate comprehensive business intelligence reports for startups and entrepreneurs. 

By simply providing a business idea or description, StartupPilot AI orchestrates multiple elite AI personas to instantly generate a full suite of strategic and execution reports.

## Features

- **Automated AI Pipeline**: A highly optimized dual-call architecture powered by the Google Gemini API.
- **Strategy Generation**: Instantly produces Market Research, Competitor Analysis, and a comprehensive Business Plan.
- **Execution Generation**: Automatically creates Financial Projections, Marketing Strategies, Ad Campaigns, and Executive Analytics.
- **Real-time UI**: A modern React frontend that animatedly tracks the progress of each AI agent as they work.
- **Secure Architecture**: Powered by Supabase for seamless authentication, database management, and structured report storage.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Python, FastAPI
- **Database & Auth**: Supabase
- **AI Integration**: Multi-provider support including Google Gemini, OpenAI (GPT-4o), Anthropic Claude, Groq, and Together AI.

## Getting Started

### Prerequisites
- Node.js & npm
- Python 3.10+
- Supabase Project (URL & Keys)
- API Keys for your preferred AI providers (Gemini, OpenAI, etc.)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Avinashk137/StartupPilot-AI.git
   cd StartupPilot-AI
   ```

2. **Environment Variables Setup (Missing Files):**
   You must create two environment files for the project to run successfully.

   **Backend (`backend/.env`):**
   Copy the example file:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Open `backend/.env` and add the following required keys:
   - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, & `SUPABASE_SECRET_KEY` (From your Supabase project)
   - At least ONE AI Provider key (e.g., `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, or `GROQ_API_KEY`)
   - You can set your preferred primary AI via the `PRIMARY_AI_PROVIDER` variable.

   **Frontend (`frontend/.env.local`):**
   Copy the example file:
   ```bash
   cp frontend/.env.example frontend/.env.local
   ```
   Open `frontend/.env.local` and add the following keys:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

3. **Backend Setup:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Frontend Setup:**
   ```bash
   cd ../frontend
   npm install
   ```

### Running the App

Start the FastAPI backend:
```bash
cd backend
fastapi dev main.py
```

Start the Vite frontend:
```bash
cd frontend
npm run dev
```

## AI Agent Architecture

StartupPilot AI employs a highly-efficient **Master Agent Strategy** to drastically reduce API overhead and prevent rate limiting. 

1. **`StrategyMasterAgent`**: Acts as an elite Strategy Consultant. It generates the Market Research, Competitor Analysis, and Business Plan in a single execution.
2. **`ExecutionMasterAgent`**: Acts as an elite Execution Consultant (CFO/CMO). It absorbs the Strategy data to generate Financial Projections, Marketing Strategies, Advertisements, and final CEO Analytics.

The orchestrator seamlessly splits these payloads and syncs them progressively with the frontend UI, delivering a magical user experience while respecting API quotas.

## Project Structure

```text
StartupPilot-AI/
├── backend/                  # Python FastAPI Backend
│   ├── agents/               # AI Orchestrator & Master Agents
│   ├── api/                  # FastAPI Routers & Endpoints
│   ├── core/                 # Configuration, Security, Dependencies
│   ├── logs/                 # Application Logs
│   ├── migrations/           # Database Migrations
│   ├── services/             # Core Services & AI Integration
│   ├── uploads/              # Uploaded Files & Assets
│   ├── main.py               # FastAPI Application Entry Point
│   └── requirements.txt      # Python Dependencies
├── frontend/                 # React + TypeScript + Vite Frontend
│   ├── public/               # Static Public Assets
│   ├── src/                  # React Source Code
│   │   ├── assets/           # Images, Icons, etc.
│   │   ├── components/       # Reusable UI Components
│   │   ├── hooks/            # Custom React Hooks
│   │   ├── lib/              # Utility Functions & API Clients
│   │   ├── pages/            # Application Views/Routes
│   │   └── providers/        # React Context Providers
│   ├── index.html            # HTML Entry Point
│   ├── package.json          # Node.js Dependencies & Scripts
│   └── vite.config.ts        # Vite Configuration
├── docs/                     # Project Documentation
├── scripts/                  # Utility & Helper Scripts
├── supabase/                 # Supabase Infrastructure
├── supabase_schema.sql       # Initial Database Schema Definition
└── README.md                 # Project Overview & Instructions
```

## Infrastructure Overview

- **Frontend Application (`/frontend`)**: A modern, responsive Single Page Application (SPA) built with React, TypeScript, and Vite. It utilizes Tailwind CSS for styling and manages state and API interactions through custom hooks and context providers.
- **Backend API (`/backend`)**: A highly performant RESTful API built with FastAPI and Python. It securely handles authentication, project management, and orchestrates the AI pipelines.
- **AI Orchestration (`/backend/agents`)**: The core intelligence layer powered by a dual-call architecture with multi-provider AI support (Google Gemini, OpenAI, Claude, etc.). It ensures efficient rate-limit handling and progressive data streaming to the frontend.
- **Database & Authentication (`supabase`)**: A fully managed PostgreSQL database with Row Level Security (RLS) and integrated user authentication, managed through Supabase. The `supabase_schema.sql` file defines the structured storage for reports, user profiles, and application settings.

## License
MIT License