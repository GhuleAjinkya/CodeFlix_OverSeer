from dotenv import load_dotenv
import os
load_dotenv()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from utils.db import init_db
from routes import auth, repos, health, summary, recommendations, risk, knowledge
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="OVERSEER API", description="AI-powered project intelligence backend")

# Configure CORS
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5500")
origins = [
    "http://localhost:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    FRONTEND_URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Database on startup
@app.on_event("startup")
def on_startup():
    print("Initializing database...")
    init_db()
    print("Database initialized.")

# Include routers
app.include_router(auth.router)
app.include_router(repos.router)
app.include_router(health.router)
app.include_router(summary.router)
app.include_router(recommendations.router)
app.include_router(risk.router)
app.include_router(knowledge.router)

@app.get("/")
def root():
    return {"message": "OVERSEER API is running"}
