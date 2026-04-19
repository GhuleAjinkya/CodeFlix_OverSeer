import asyncio
from fastapi import APIRouter, Depends, HTTPException
from utils.auth_helpers import get_current_user_token
from services.github_service import get_issues, get_pull_requests, get_commits
from services.summary_service import generate_summary
from models.schemas import SummaryResponse

router = APIRouter(tags=["summary"])

@router.get("/summary", response_model=SummaryResponse)
async def summary(repo: str, token: str = Depends(get_current_user_token)):
    try:
        # We only need recent issues, prs, commits
        issues, prs, commits = await asyncio.gather(
            get_issues(token, repo, "all"),
            get_pull_requests(token, repo, "all"),
            get_commits(token, repo)
        )
        
        result = await generate_summary(repo, commits, issues, prs)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {str(e)}")
