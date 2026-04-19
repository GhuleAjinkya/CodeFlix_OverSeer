import httpx
import asyncio
import urllib.parse
from fastapi import HTTPException

GITHUB_API_BASE = "https://api.github.com"

async def _fetch(url: str, token: str, params: dict = None):
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, params=params, timeout=10.0)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return [] if url.endswith(("/issues", "/pulls", "/commits", "/contributors")) else {}
            print(f"GitHub API error: {e}")
            raise HTTPException(status_code=e.response.status_code, detail="GitHub API request failed")
        except Exception as e:
            print(f"Request failed: {e}")
            raise HTTPException(status_code=500, detail="Internal server error connecting to GitHub")

async def get_repos(token: str):
    """Fetch user repositories"""
    url = f"{GITHUB_API_BASE}/user/repos"
    params = {"per_page": 100, "sort": "updated"}
    return await _fetch(url, token, params)

async def get_issues(token: str, repo_full_name: str, state: str = "open"):
    """Fetch issues for a repo"""
    url = f"{GITHUB_API_BASE}/repos/{repo_full_name}/issues"
    params = {"per_page": 50, "state": state}
    issues = await _fetch(url, token, params)
    # GitHub API returns PRs as issues too, filter them out
    return [i for i in issues if "pull_request" not in i]

async def get_pull_requests(token: str, repo_full_name: str, state: str = "all"):
    """Fetch pull requests"""
    url = f"{GITHUB_API_BASE}/repos/{repo_full_name}/pulls"
    params = {"per_page": 100, "state": state, "sort": "updated"}
    return await _fetch(url, token, params)

async def get_commits(token: str, repo_full_name: str):
    """Fetch recent commits"""
    url = f"{GITHUB_API_BASE}/repos/{repo_full_name}/commits"
    params = {"per_page": 30}
    return await _fetch(url, token, params)

async def get_commit_details(token: str, repo_full_name: str, sha: str):
    """Fetch details of a single commit, including files changed"""
    url = f"{GITHUB_API_BASE}/repos/{repo_full_name}/commits/{sha}"
    return await _fetch(url, token)

async def get_contributors(token: str, repo_full_name: str):
    """Fetch contributors (with stats if possible, else standard list)"""
    try:
        url = f"{GITHUB_API_BASE}/repos/{repo_full_name}/stats/contributors"
        # Note: stats/contributors might return 202 accepted and empty on first request.
        # We fallback to standard contributors endpoint if so.
        stats = await _fetch(url, token)
        if not stats or isinstance(stats, dict): 
            url_fallback = f"{GITHUB_API_BASE}/repos/{repo_full_name}/contributors"
            params = {"per_page": 100}
            return await _fetch(url_fallback, token, params)
        return stats
    except Exception as e:
        print(f"Error fetching contributors: {e}")
        return []
