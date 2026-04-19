import asyncio
from fastapi import APIRouter, Depends, HTTPException
from utils.auth_helpers import get_current_user_token
from services.github_service import get_repos as fetch_repos, get_issues, get_pull_requests, get_commits, get_contributors
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from utils.cache import get_cached, set_cached
import traceback

router = APIRouter(tags=["repos"])

@router.get("/repos")
async def list_repos(token: str = Depends(get_current_user_token)):
    repos = await fetch_repos(token)
    # Simplify response
    return [{"name": r["name"], "full_name": r["full_name"], "description": r["description"], "stars": r["stargazers_count"]} for r in repos]

@router.get("/repo-data")
async def repo_data(repo: str, token: str = Depends(get_current_user_token)):
    try:
        cache_key = f"repo_data:{repo}"
        cached = get_cached(cache_key)
        if cached:
            return cached

        issues, prs, commits, contributors = await asyncio.gather(
            get_issues(token, repo, "all"),
            get_pull_requests(token, repo, "all"),
            get_commits(token, repo),
            get_contributors(token, repo)
        )
        issues = issues if isinstance(issues, list) else []
        prs = prs if isinstance(prs, list) else []
        commits = commits if isinstance(commits, list) else []
        contributors = contributors if isinstance(contributors, list) else []

        # Calculate last 14 days dates
        now = datetime.now(timezone.utc)
        days14 = [(now - timedelta(days=13 - i)).strftime("%Y-%m-%d") for i in range(14)]
        
        # Commits per day
        commits_dict = defaultdict(int)
        for c in commits:
            if isinstance(c, dict):
                commit_info = c.get("commit") or {}
                author_info = commit_info.get("author") or {}
                date_str = author_info.get("date")
                if date_str:
                    d = date_str[:10]
                    commits_dict[d] += 1
                
        commits_per_day = [{"date": d, "count": commits_dict.get(d, 0)} for d in days14]
        
        # Issues per day
        opened_dict = defaultdict(int)
        closed_dict = defaultdict(int)
        for i in issues:
            if isinstance(i, dict):
                created_at = i.get("created_at")
                if created_at:
                    opened_dict[created_at[:10]] += 1
                closed_at = i.get("closed_at")
                if closed_at:
                    closed_dict[closed_at[:10]] += 1
                
        issues_per_day = {
            "opened": [{"date": d, "count": opened_dict.get(d, 0)} for d in days14],
            "closed": [{"date": d, "count": closed_dict.get(d, 0)} for d in days14]
        }

        # PR Aging
        pr_aging_buckets = [0, 0, 0, 0, 0] # <1d, 1-3d, 3-7d, 1-2w, >2w
        for pr in prs:
            if isinstance(pr, dict) and pr.get("state") == "open":
                created_at = pr.get("created_at")
                if created_at:
                    created_date = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                    age_days = (now - created_date).days
                    if age_days < 1: pr_aging_buckets[0] += 1
                    elif age_days < 3: pr_aging_buckets[1] += 1
                    elif age_days < 7: pr_aging_buckets[2] += 1
                    elif age_days < 14: pr_aging_buckets[3] += 1
                    else: pr_aging_buckets[4] += 1

        # Dev Workload
        contributor_commits = []
        for contrib in contributors:
            if isinstance(contrib, dict):
                login = contrib.get("author", {}).get("login") or contrib.get("login")
                commits_count = contrib.get("total") or contrib.get("contributions") or 0
                if login and commits_count > 0:
                    contributor_commits.append({"name": login, "commits": commits_count})
        
        contributor_commits.sort(key=lambda x: x["commits"], reverse=True)
        dev_workload = contributor_commits[:4]
        others_commits = sum(c["commits"] for c in contributor_commits[4:])
        if others_commits > 0:
            dev_workload.append({"name": "Others", "commits": others_commits})

        # Activity Feed
        feed = []
        for c in commits[:20]:
            if isinstance(c, dict):
                commit_info = c.get("commit") or {}
                author_info = commit_info.get("author") or {}
                date_str = author_info.get("date")
                # Need to safely get author login because author dict could be None or missing login
                author_dict = c.get("author") or {}
                login = author_dict.get("login") or author_info.get("name") or "Unknown"
                msg = commit_info.get("message", "No message").split('\n')[0]
                if date_str:
                    feed.append({"type": "commit", "text": f"@{login} pushed commit: {msg}", "timestamp": date_str})
                    
        for i in issues[:20]:
            if isinstance(i, dict):
                login = i.get("user", {}).get("login") or "Unknown"
                state = "opened" if i.get("state") == "open" else "closed"
                date_str = i.get("created_at") if state == "opened" else i.get("closed_at")
                num = i.get("number", "?")
                if date_str:
                    feed.append({"type": "issue", "text": f"@{login} {state} issue #{num}", "timestamp": date_str})

        for p in prs[:20]:
            if isinstance(p, dict):
                login = p.get("user", {}).get("login") or "Unknown"
                if p.get("merged_at"):
                    state = "merged"
                    date_str = p.get("merged_at")
                else:
                    state = "opened"
                    date_str = p.get("created_at")
                num = p.get("number", "?")
                if date_str:
                    feed.append({"type": "pr", "text": f"@{login} {state} PR #{num}", "timestamp": date_str})
        
        feed.sort(key=lambda x: x["timestamp"], reverse=True)
        top_feed = feed[:10]

        open_issues_count = len([i for i in issues if isinstance(i, dict) and i.get("state") == "open"])
        
        # Stat badges
        high_priority_issues = 0
        for i in issues:
            if isinstance(i, dict) and i.get("state") == "open":
                labels = [l.get("name", "").lower() for l in i.get("labels", []) if isinstance(l, dict)]
                if any("bug" in l or "critical" in l for l in labels):
                    high_priority_issues += 1
                    
        active_sprint = set()
        days14_ago = now - timedelta(days=14)
        for c in commits:
            if isinstance(c, dict):
                date_str = c.get("commit", {}).get("author", {}).get("date")
                if date_str:
                    cd = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                    if cd > days14_ago:
                        author_dict = c.get("author") or {}
                        login = author_dict.get("login") or c.get("commit", {}).get("author", {}).get("name")
                        if login:
                            active_sprint.add(login)
        active_devs_sprint = len(active_sprint)

        result = {
            "issues_count": open_issues_count,
            "prs_count": len(prs),
            "commits_count": len(commits),
            "contributors_count": len(contributors),
            "commits_per_day": commits_per_day,
            "issues_per_day": issues_per_day,
            "pr_aging": pr_aging_buckets,
            "dev_workload": dev_workload,
            "activity_feed": top_feed,
            "high_priority_issues": high_priority_issues,
            "active_devs_sprint": active_devs_sprint
        }
        set_cached(cache_key, result, 300)
        return result
    except Exception as e:
        print("=== REPO-DATA ERROR ===")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
