import asyncio
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from utils.auth_helpers import get_current_user_token
from services.github_service import get_issues, get_pull_requests, get_commits, get_contributors
from services.recommendation_service import get_recommendations
from models.schemas import RecommendationsResponse

router = APIRouter(tags=["recommendations"])

@router.get("/recommendations", response_model=RecommendationsResponse)
async def recommendations(repo: str, issue_id: Optional[int] = None, token: str = Depends(get_current_user_token)):
    try:
        issues, prs, commits, contributors = await asyncio.gather(
            get_issues(token, repo, "all"),
            get_pull_requests(token, repo, "all"),
            get_commits(token, repo),
            get_contributors(token, repo)
        )
        
        recs = get_recommendations(issue_id, issues, commits, prs, contributors)
        return {"recommendations": recs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get recommendations: {str(e)}")
