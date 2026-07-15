# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Project Structure & Infrastructure

```text
StartupPilot-AI/
├── backend/                  # Python FastAPI Backend
│   ├── agents/               # AI Orchestrator & Master Agents
│   ├── api/                  # FastAPI Routers & Endpoints
│   ├── core/                 # Configuration, Security, Dependencies
│   ├── services/             # Core Services & AI Integration
│   └── main.py               # FastAPI Application Entry Point
├── frontend/                 # React + TypeScript + Vite Frontend (This directory)
│   ├── public/               # Static Public Assets
│   ├── src/                  
│   │   ├── assets/           # Images, Icons, etc.
│   │   ├── components/       # Reusable UI Components
│   │   ├── hooks/            # Custom React Hooks
│   │   ├── lib/              # Utility Functions & API Clients
│   │   ├── pages/            # Application Views/Routes
│   │   └── providers/        # React Context Providers
│   ├── package.json          # Node.js Dependencies & Scripts
│   └── vite.config.ts        # Vite Configuration
├── supabase_schema.sql       # Database Schema Definition
└── README.md                 # Main Project Overview
```

### Infrastructure Overview

- **Frontend Application (`/frontend`)**: A modern, responsive Single Page Application (SPA) built with React, TypeScript, and Vite. It serves as the primary user interface.
- **Backend API (`/backend`)**: A highly performant RESTful API built with FastAPI and Python, handling all core business logic and AI orchestration.
- **AI Orchestration (`/backend/agents`)**: The intelligence layer powered by dual-call architecture supporting multiple AI providers including Google Gemini, OpenAI, Anthropic, and Groq (`StrategyMasterAgent` and `ExecutionMasterAgent`).
- **Database & Authentication**: Fully managed PostgreSQL database with Row Level Security (RLS) and integrated user authentication, managed through Supabase.

### Getting Started (Missing Files & Keys)

To run this frontend and connect it to the backend successfully, you must create a `.env.local` file in this `/frontend` directory:

```bash
cp .env.example .env.local
```

**Required keys in `.env.local`**:
- `VITE_SUPABASE_URL`: Your Supabase Project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase Project Anon/Publishable Key

*Note: Ensure the backend is also properly configured with its respective `.env` file containing Supabase and AI provider keys (like `OPENAI_API_KEY` or `GEMINI_API_KEY`).*
