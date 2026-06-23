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
- **AI Integration**: Google Gemini API (`gemini-3.1-pro`)

## Getting Started

### Prerequisites
- Node.js & npm
- Python 3.10+
- Supabase Project (URL & Keys)
- Google Gemini API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Avinashk137/StartupPilot-AI.git
   cd StartupPilot-AI
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
   *Create a `.env` file in the `backend` directory based on `.env.example` and add your Supabase and Gemini keys.*

3. **Frontend Setup:**
   ```bash
   cd frontend
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

## License
MIT License