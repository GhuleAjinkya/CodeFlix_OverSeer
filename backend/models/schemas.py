from pydantic import BaseModel
from typing import List, Optional, Any, Dict

class HealthScoreResponse(BaseModel):
    score: float
    grade: str
    breakdown: Dict[str, float]

class SummaryResponse(BaseModel):
    summary: str
    generated_at: str
    cached: bool

class Recommendation(BaseModel):
    developer: str
    score: float
    reasons: List[str]

class RecommendationsResponse(BaseModel):
    recommendations: List[Recommendation]

class AuthResponse(BaseModel):
    session_id: str
