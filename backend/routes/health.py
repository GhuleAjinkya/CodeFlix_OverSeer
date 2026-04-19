import asyncio
from fastapi import APIRouter, Depends, HTTPException
from utils.auth_helpers import get_current_user_token
from services.github_service import get_issues, get_pull_requests, get_commits, get_contributors
from services.health_service import compute_health_score
from models.schemas import HealthScoreResponse
from utils.cache import get_cached, set_cached

router = APIRouter(tags=["health"])

@router.get("/health-score")
async def health_score(repo: str, token: str = Depends(get_current_user_token)):
    try:
        cache_key = f"health_score:{repo}"
        cached = get_cached(cache_key)
        
        # Calculate health_score_change relative to last cached value if it exists
        last_score = cached.get("score") if cached else None

        if cached:
            return cached

        # Fetch data needed for health score
        issues, prs, commits, contributors = await asyncio.gather(
            get_issues(token, repo, "all"),
            get_pull_requests(token, repo, "all"),
            get_commits(token, repo),
            get_contributors(token, repo)
        )
        
        result = compute_health_score(issues, prs, commits, contributors)
        
        # Calculate risk stats
        score = result["score"]
        if score > 75:
            risk_level = "Low"
        elif score >= 50:
            risk_level = "Medium"
        else:
            risk_level = "High"
            
        risk_factors_count = 0
        b = result["breakdown"]
        if b.get("open_issues", 0) > 20: risk_factors_count += 1
        if b.get("avg_pr_time_hours", 0) > 48: risk_factors_count += 1
        if b.get("commits_per_week", 0) < 5: risk_factors_count += 1
        if b.get("active_contributors", 0) < 2: risk_factors_count += 1
        if b.get("issue_close_rate", 1) < 0.3: risk_factors_count += 1
        
        result["risk_level"] = risk_level
        result["risk_factors_count"] = risk_factors_count
        
        if last_score is not None:
            result["health_score_change"] = round(score - last_score, 1)
        else:
            result["health_score_change"] = 0
            
        set_cached(cache_key, result, 300)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute health score: {str(e)}")
