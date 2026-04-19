# OVERSEER Setup Instructions

## 1. GitHub OAuth App Setup
1. Go to your GitHub account settings -> **Developer settings** -> **OAuth Apps** -> **New OAuth App**.
2. **Application name**: OVERSEER (or any name)
3. **Homepage URL**: `http://localhost:5500`
4. **Authorization callback URL**: `http://localhost:8000/auth/github/callback`
5. Click **Register application**.
6. Copy the **Client ID**.
7. Click **Generate a new client secret** and copy it.

## 2. Infrastructure (PostgreSQL & Redis)
You need PostgreSQL and Redis running locally. The easiest way is via Docker:

```bash
# Start PostgreSQL
docker run -d --name overseer-postgres -p 5432:5432 -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=overseer postgres:15

# Start Redis
docker run -d --name overseer-redis -p 6379:6379 redis:7
```

## 3. Backend Setup
1. Open a terminal in the `backend` directory.
2. (Optional but recommended) Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy `.env.example` to `.env` and fill in your keys (GitHub Client ID/Secret, Gemini API Key).
   ```bash
   cp .env.example .env
   ```
5. Run the FastAPI server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   *(Note: The database tables will be auto-created on startup).*

## 4. Frontend Setup
1. The frontend consists of static files in the `frontend` folder.
2. You can serve them using a simple HTTP server. Open a new terminal in the `frontend` folder:
   ```bash
   python -m http.server 5500
   ```
   Or use VS Code's "Live Server" extension on port 5500.
3. Open your browser and navigate to `http://localhost:5500`.

## 5. Model File
The pre-trained XGBoost model should already be located at `backend/models/xgboost_health_model.pkl`. If you don't have it, the application will automatically fall back to a heuristic scoring formula.
