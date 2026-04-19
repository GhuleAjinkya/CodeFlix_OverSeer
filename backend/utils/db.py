import os
from sqlalchemy import create_engine, Column, String, Text, DateTime, Integer, JSON
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/overseer")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Session(Base):
    __tablename__ = "sessions"
    session_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    github_token = Column(Text, nullable=False)
    github_username = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class RepoCache(Base):
    __tablename__ = "repo_cache"
    id = Column(Integer, primary_key=True, index=True)
    repo_full_name = Column(Text, nullable=False, index=True)
    data_type = Column(Text, nullable=False)  # 'issues', 'commits', 'prs', 'contributors'
    payload = Column(JSONB, nullable=False)
    fetched_at = Column(DateTime, default=datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
