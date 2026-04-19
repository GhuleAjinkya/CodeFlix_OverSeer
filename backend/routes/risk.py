from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from utils.auth_helpers import get_current_user_token
from services.github_service import get_issues
from utils.cache import get_cached, set_cached

router = APIRouter(tags=["risk"])

@router.get("/risk-timeline")
async def risk_timeline(repo: str, token: str = Depends(get_current_user_token)):
    try:
        cache_key = f"risk_timeline:{repo}"
        cached = get_cached(cache_key)
        if cached:
            return cached

        issues = await get_issues(token, repo, "open")
        issues = issues if isinstance(issues, list) else []
        
        # Group by label
        groups = {}
        for i in issues:
            if not isinstance(i, dict): continue
            
            labels = i.get("labels", [])
            label_names = [l.get("name").lower() for l in labels if isinstance(l, dict) and l.get("name")]
            group_name = "Uncategorized"
            
            if any("bug" in n for n in label_names):
                group_name = "Fix Bugs"
            elif any("feature" in n or "enhancement" in n for n in label_names):
                group_name = "Develop Features"
            elif label_names:
                group_name = f"Address '{label_names[0]}' issues"
                
            if group_name not in groups:
                groups[group_name] = []
            groups[group_name].append(i)
            
        tasks = []
        now = datetime.now(timezone.utc)
        task_id = 1
        
        for group_name, group_issues in groups.items():
            # Oldest created
            oldest_date = now
            assignees = set()
            total_comments = 0
            
            for i in group_issues:
                created_str = i.get("created_at")
                if created_str:
                    cd = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
                    if cd < oldest_date:
                        oldest_date = cd
                        
                for a in i.get("assignees", []):
                    if isinstance(a, dict) and a.get("login"):
                        assignees.add(a.get("login"))
                        
                total_comments += i.get("comments", 0)
                
            age_days = (now - oldest_date).days
            avg_comments = total_comments / len(group_issues) if group_issues else 0
            
            duration_days = max(1, len(group_issues) * 2)
            
            # Status logic
            if age_days > 14:
                status = "delayed"
                reason = f"Oldest issue has been open for {age_days} days"
            elif not assignees:
                status = "at_risk"
                reason = f"{len(group_issues)} open issues are unassigned"
            elif age_days > 7:
                status = "at_risk"
                reason = f"Stagnant progress: open for {age_days} days"
            elif avg_comments > 5:
                status = "at_risk"
                reason = f"High discussion volume ({round(avg_comments)} avg comments) with no resolution"
            else:
                status = "on_track"
                reason = "Recently opened and assigned"
                
            start_date = now.strftime("%Y-%m-%d")
            end_date = (now + timedelta(days=duration_days)).strftime("%Y-%m-%d")
            
            assignee_str = ", ".join(assignees) if assignees else "Unassigned"
            
            tasks.append({
                "id": task_id,
                "task": group_name,
                "assignee": assignee_str,
                "start_date": start_date,
                "end_date": end_date,
                "status": status,
                "risk_reason": reason
            })
            task_id += 1
            
        # Ensure at least one dummy task if repository has no open issues
        if not tasks:
            tasks.append({
                "id": 1,
                "task": "No Open Issues",
                "assignee": "N/A",
                "start_date": now.strftime("%Y-%m-%d"),
                "end_date": (now + timedelta(days=3)).strftime("%Y-%m-%d"),
                "status": "on_track",
                "risk_reason": "Everything is completely clear!"
            })

        result = {"tasks": tasks}
        set_cached(cache_key, result, 300)
        return result
        
    except Exception as e:
        import traceback
        print("=== RISK TIMELINE ERROR ===")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
