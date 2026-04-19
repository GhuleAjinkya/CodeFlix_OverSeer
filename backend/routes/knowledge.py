import asyncio
from fastapi import APIRouter, Depends, HTTPException
from collections import defaultdict
import os

from utils.auth_helpers import get_current_user_token
from services.github_service import get_commits, get_commit_details, get_pull_requests, get_issues
from utils.cache import get_cached, set_cached

router = APIRouter(tags=["knowledge"])

@router.get("/knowledge-gaps")
async def knowledge_gaps(repo: str, token: str = Depends(get_current_user_token)):
    try:
        cache_key = f"knowledge_gaps:{repo}"
        cached = get_cached(cache_key)
        if cached:
            return cached

        # Fetch commits, PRs, and issues
        commits, prs, issues = await asyncio.gather(
            get_commits(token, repo),
            get_pull_requests(token, repo, "open"),
            get_issues(token, repo, "open")
        )

        commits = commits if isinstance(commits, list) else []
        prs = prs if isinstance(prs, list) else []
        issues = issues if isinstance(issues, list) else []

        # Get details for the latest 20 commits
        recent_commits = commits[:20]
        commit_details = await asyncio.gather(
            *[get_commit_details(token, repo, c.get("sha")) for c in recent_commits if c.get("sha")]
        )

        # Track file ownership and dev stats
        file_authors = defaultdict(set)
        file_commits = defaultdict(int)
        dev_total_commits = defaultdict(int)
        dev_workload = defaultdict(int)

        # Workload calculation (open PRs and assigned open issues)
        for pr in prs:
            if isinstance(pr, dict):
                assignee = pr.get("assignee")
                if assignee:
                    dev_workload[assignee.get("login")] += 1
                user = pr.get("user")
                if user:
                    dev_workload[user.get("login")] += 1

        for issue in issues:
            if isinstance(issue, dict):
                assignee = issue.get("assignee")
                if assignee:
                    dev_workload[assignee.get("login")] += 1

        # Analyze commit details
        for c in commit_details:
            if isinstance(c, dict):
                author_login = c.get("author", {}).get("login") if c.get("author") else None
                if not author_login:
                    # Fallback to committer
                    author_login = c.get("committer", {}).get("login") if c.get("committer") else "unknown"
                
                dev_total_commits[author_login] += 1
                
                files = c.get("files", [])
                for f in files:
                    filename = f.get("filename")
                    if filename:
                        file_authors[filename].add(author_login)
                        file_commits[filename] += 1

        # Find knowledge gaps (files with exactly 1 author)
        gaps = []
        for filename, authors in file_authors.items():
            # Skip common non-code files
            if filename.endswith(('.md', '.txt', '.gitignore', '.lock')) or len(authors) != 1:
                continue
                
            sole_owner = list(authors)[0]
            if sole_owner == "unknown":
                continue

            module_name = os.path.dirname(filename) or filename
            commits_count = file_commits[filename]
            risk_level = "high" if commits_count > 3 else "medium" if commits_count > 1 else "low"

            # Score alternative devs
            recommended = []
            for dev, total_commits in dev_total_commits.items():
                if dev == sole_owner or dev == "unknown":
                    continue
                
                score = 50 # Base score
                reasons = []

                # Reason 1: Workload
                wl = dev_workload.get(dev, 0)
                if wl < 2:
                    score += 20
                    reasons.append(f"Low current workload ({wl} open PRs/Issues)")
                elif wl < 5:
                    score += 10
                    reasons.append(f"Medium current workload ({wl} open PRs/Issues)")
                else:
                    score -= 10
                    reasons.append(f"High current workload ({wl} open PRs/Issues)")

                # Reason 2: Total Experience
                if total_commits > 5:
                    score += 15
                    reasons.append(f"{total_commits} total commits in this repo")
                elif total_commits > 0:
                    score += 5
                    reasons.append(f"{total_commits} total commits in this repo")

                # Reason 3: Module experience (heuristic based on other files touched by dev)
                module_commits = 0
                for f_name, f_authors in file_authors.items():
                    if f_name != filename and f_name.startswith(module_name) and dev in f_authors:
                        module_commits += 1

                if module_commits > 0:
                    score += 15
                    reasons.append(f"Committed to {module_commits} related files in {module_name}/")

                score = min(100, max(0, score))
                
                if score >= 60:  # Only recommend if score is decent
                    recommended.append({
                        "username": dev,
                        "score": score,
                        "reasons": reasons
                    })

            # Sort recommended by score descending
            recommended.sort(key=lambda x: x["score"], reverse=True)

            gaps.append({
                "file": filename,
                "module": module_name,
                "sole_owner": sole_owner,
                "risk_level": risk_level,
                "recommended_developers": recommended[:3]  # Top 3
            })

        # Calculate high risk gaps
        high_risk_gaps = len([g for g in gaps if g["risk_level"] == "high"])
        total_gaps = len(gaps)
        
        # Sort gaps by risk (high first) and then by recommended count
        risk_weights = {"high": 3, "medium": 2, "low": 1}
        gaps.sort(key=lambda g: (risk_weights[g["risk_level"]], len(g["recommended_developers"])), reverse=True)

        summary_msg = f"{total_gaps} knowledge silos detected"
        if high_risk_gaps > 0:
            summary_msg = f"{high_risk_gaps} critical knowledge silos detected"

        result = {
            "knowledge_gaps": gaps,
            "total_gaps": total_gaps,
            "high_risk_gaps": high_risk_gaps,
            "summary": summary_msg
        }

        set_cached(cache_key, result, 300)
        return result

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
