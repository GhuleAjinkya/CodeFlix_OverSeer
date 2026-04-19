# OVERSEER

**AI-Based Project Intelligence and Risk Prediction System**

OVERSEER is an AI-powered platform that connects to GitHub repositories and transforms raw development data into actionable intelligence. It predicts project risks, detects knowledge silos, classifies issues automatically, and recommends the right developer for every task — all surfaced through a real-time dashboard.

Built by Arnav Borde, Atharva Dhamdhere, and Ajinkya Ghule

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Running Tests](#running-tests)

---

## Overview

Modern software teams using tools like GitHub have access to raw data but no foresight. Problems are discovered after damage is done, critical knowledge lives in single developers, and tracking multiple repositories manually yields no real insight.

OVERSEER addresses this by running an autonomous 11-step pipeline — from GitHub OAuth login through data ingestion, ML analysis, and dashboard rendering — that continuously monitors repository health and surfaces warnings before they become incidents.

---

## Features

### Module 1: Project Health Analysis
Computes a unified health score using XGBoost, factoring in open issue count, average PR review time, commit frequency, active contributor ratio, and issue close rate. Falls back to a transparent heuristic formula if the model is unavailable.

### Module 2: Deep Learning Risk Prediction
Treats project activity as time-series data. LSTM networks analyze commit and issue backlogs to forecast development slowdowns and bottlenecks weeks in advance. A Gantt-style risk timeline is rendered directly on the dashboard.

### Module 3: Issue Classification
A BERT-based NLP model reads unstructured issue titles and descriptions and categorizes them automatically, eliminating the need for manual triage.

### Module 4: Developer Recommendation
Matches each open issue to the most suitable developer based on keyword alignment with commit history, domain activity, current workload (open PRs and assigned issues), and past resolution rate.

### Module 5: Knowledge Gap Detection
Graph analysis maps file-level contribution relationships across recent commits. Files with a single author are flagged as knowledge silos and ranked by risk level. Recommended cross-training candidates are surfaced with match scores and rationale.

### Module 6: Project Summarization
Large language models (Google Gemini) ingest merged PRs and closed issues to auto-generate concise weekly natural language summaries covering accomplishments, current risks, and recommended focus areas for the team.

---

## System Architecture

The system is organized into four layers:

| Layer | Responsibility |
|---|---|
| Data Source | Raw commits, pull requests, and issues fetched via GitHub REST APIs and Webhooks |
| Backend Processing | Python/FastAPI handles OAuth, data cleaning, and feature extraction |
| AI/ML Core Engine | Six distinct models — XGBoost, LSTM, BERT, RoBERTa, graph analysis, LLM summarization |
| Frontend Dashboard | HTML/CSS/JS interface with real-time charts, AI insights panel, and activity feed |

**Storage** uses a dual-engine approach:
- **PostgreSQL** — persistent system of record for sessions, commit history, extracted metrics, and model predictions
- **Redis** — acceleration layer that caches GitHub API responses and dashboard metrics to stay within rate limits and avoid redundant ML recomputation

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, Uvicorn |
| AI/ML | XGBoost, LSTM, BERT, Transformers, Scikit-learn, Google Gemini |
| Data | PostgreSQL, Redis |
| Frontend | HTML, CSS, JavaScript, Chart.js |
| Auth | GitHub OAuth 2.0 |
| Infrastructure | Docker (recommended for Postgres and Redis) |

---

## Getting Started

### Prerequisites

- Python 3.10 or higher
- Docker (for PostgreSQL and Redis, or provide your own instances)
- A GitHub account with access to the repositories you want to monitor
- A Google Gemini API key (optional — a fallback summary is generated if absent)

---

### 1. GitHub OAuth App Setup

1. Go to **GitHub Settings > Developer settings > OAuth Apps > New OAuth App**
2. Set the following values:
   - **Application name**: OVERSEER (or any name)
   - **Homepage URL**: `http://localhost:5500`
   - **Authorization callback URL**: `http://localhost:8000/auth/github/callback`
3. Click **Register application**
4. Copy the **Client ID**
5. Generate and copy the **Client Secret**

---

### 2. Start Infrastructure

```bash
# PostgreSQL
docker run -d --name overseer-postgres \
  -p 5432:5432 \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=overseer \
  postgres:15

# Redis
docker run -d --name overseer-redis \
  -p 6379:6379 \
  redis:7
```

---

### 3. Backend Setup

```bash
cd backend

# Create and activate virtual environment (recommended)
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and fill in: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GEMINI_API_KEY
```

Start the API server:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Database tables are created automatically on first startup.

---

### 4. Frontend Setup

Serve the frontend from the `frontend/` directory on port 5500:

```bash
cd frontend
python -m http.server 5500
```

Alternatively, use the **Live Server** extension in VS Code pointed at the `frontend/` folder.

Open your browser and navigate to `http://localhost:5500`.

---

### 5. Model File

The pre-trained XGBoost model should be located at `backend/models/xgboost_health_model.pkl`. If the file is absent or produces a feature shape mismatch, the system automatically falls back to a transparent heuristic scoring formula — no configuration required.

---

## Configuration

All configuration is managed through the `backend/.env` file. Copy `.env.example` to get started.

| Variable | Description |
|---|---|
| `GITHUB_CLIENT_ID` | OAuth App Client ID from GitHub |
| `GITHUB_CLIENT_SECRET` | OAuth App Client Secret from GitHub |
| `GITHUB_REDIRECT_URI` | Must match the callback URL set in the OAuth App (default: `http://localhost:8000/auth/github/callback`) |
| `FRONTEND_URL` | URL where the frontend is served (default: `http://localhost:5500`) |
| `DATABASE_URL` | PostgreSQL connection string (default: `postgresql://user:password@localhost:5432/overseer`) |
| `REDIS_URL` | Redis connection string (default: `redis://localhost:6379`) |
| `GEMINI_API_KEY` | Google Gemini API key for project summarization (optional) |

---

## API Reference

All endpoints (except `/auth/github` and `/auth/github/callback`) require a valid session ID passed as a Bearer token in the `Authorization` header.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/auth/github` | Initiates GitHub OAuth login flow |
| `GET` | `/auth/github/callback` | OAuth callback — creates session, redirects to dashboard |
| `GET` | `/auth/me` | Returns the authenticated user's GitHub username and email |
| `GET` | `/repos` | Lists the authenticated user's GitHub repositories |
| `GET` | `/repo-data?repo={full_name}` | Returns commit activity, issue trends, PR aging, dev workload, and activity feed |
| `GET` | `/health-score?repo={full_name}` | Computes and returns the XGBoost project health score and breakdown |
| `GET` | `/summary?repo={full_name}` | Generates an LLM-powered project summary |
| `GET` | `/recommendations?repo={full_name}` | Returns ranked developer recommendations for open issues |
| `GET` | `/risk-timeline?repo={full_name}` | Returns a Gantt-style risk timeline based on open issue groupings |
| `GET` | `/knowledge-gaps?repo={full_name}` | Detects knowledge silos and returns cross-training recommendations |

All data-fetching endpoints cache results in Redis for 5 minutes (300 seconds). Summaries are cached for 30 minutes.

---

## Project Structure

```
overseer/
├── backend/
│   ├── main.py                    # FastAPI app entry point
│   ├── requirements.txt
│   ├── models/
│   │   ├── schemas.py             # Pydantic response models
│   │   └── xgboost_health_model.pkl
│   ├── routes/
│   │   ├── auth.py                # GitHub OAuth
│   │   ├── repos.py               # Repository data
│   │   ├── health.py              # Health score
│   │   ├── summary.py             # LLM summarization
│   │   ├── recommendations.py     # Developer recommendations
│   │   ├── risk.py                # Risk timeline
│   │   └── knowledge.py           # Knowledge gap detection
│   ├── services/
│   │   ├── github_service.py      # GitHub API client
│   │   ├── health_service.py      # XGBoost scoring logic
│   │   ├── recommendation_service.py
│   │   └── summary_service.py     # Gemini integration
│   └── utils/
│       ├── auth_helpers.py        # Session extraction
│       ├── cache.py               # Redis client
│       └── db.py                  # SQLAlchemy models and engine
├── frontend/
│   ├── index.html                 # Landing page
│   ├── login.html
│   ├── dashboard.html             # Main analytics dashboard
│   ├── recomandation.html         # Resource allocator / knowledge gaps
│   ├── CSS/
│   │   ├── style.css
│   │   ├── dashboard.css
│   │   └── recomndation.css
│   └── JS/
│       ├── api.js                 # Centralised API client
│       ├── auth.js                # Session management
│       ├── dashboard.js           # Dashboard logic and charts
│       └── recomandation.js       # Knowledge gap UI
├── test_backend.py
└── README.md
```

---

## Running Tests

```bash
python test_backend.py
```

The test suite covers endpoint authentication, health score heuristic fallback, and model loading. SQLite is used in place of PostgreSQL during testing — no running database is required.

---

## Future Scope

- **Real-time Webhooks** — live event processing from GitHub with instant dashboard updates
- **Autonomous Sprint Planning** — AI-generated sprint plans with task breakdowns and developer assignments
- **Code Risk Heatmaps** — visual overlays identifying which parts of the codebase are most likely to cause delays or failures
- **Jira / Slack Integration** — two-way sync with existing project management and communication tools
- **Auto Refactoring Suggestions** — AI-recommended module restructuring to reduce dependency risk and improve maintainability
- **Enterprise Deployment** — multi-organization support and integration with company project management platforms
