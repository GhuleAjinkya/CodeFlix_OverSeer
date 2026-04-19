import os
from dotenv import load_dotenv
load_dotenv()
import google.generativeai as genai
from datetime import datetime, timezone
from utils.cache import get_cached, set_cached

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
    # Instantiate the models
    model_lite = genai.GenerativeModel('gemini-2.0-flash-lite')
    model_8b = genai.GenerativeModel('gemini-1.5-flash-8b')
else:
    model_lite = None
    model_8b = None
    model = None

async def generate_summary(repo_full_name: str, commits: list, issues: list, prs: list):
    cache_key = f"summary:{repo_full_name}"
    cached = get_cached(cache_key)
    if cached:
        return {
            "summary": cached["summary"],
            "generated_at": cached["generated_at"],
            "cached": True
        }
        
    if not model_lite and not model_8b:
        # Fallback if no API key
        mock_summary = """**What Was Accomplished**
- Handled recent PR merges and resolved bug fixes.
- Updated core components based on recent commits.

**Current Risks**
- Several open issues remain unassigned.
- Watch out for stalled PRs pending review.

**Recommended Focus**
- Prioritize closing high-severity bugs.
- Review and merge pending PRs to unblock development."""
        return {
            "summary": mock_summary,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "cached": False,
            "note": "Mocked summary due to missing GEMINI_API_KEY"
        }

    # Extract recent data (last 7 days ideally, but we'll use whatever we fetched to keep it simple)
    commit_msgs = [f"- {c['commit']['message']} (by {c['commit']['author']['name']})" for c in commits[:20]]
    closed_issues = [f"- {i['title']}" for i in issues if i.get("state") == "closed"][:10]
    merged_prs = [f"- {pr['title']}: {pr.get('body', '')[:50]}..." for pr in prs if pr.get("merged_at")][:10]
    
    open_issues = [i for i in issues if i.get("state") == "open"]
    open_issue_titles = [f"- {i['title']} (created {i['created_at']})" for i in open_issues[:5]]
    
    prompt = f"""
    You are a senior engineering manager. Given the following GitHub repository activity from the last 7 days, write a concise project status summary in 3 sections:

    1. **What Was Accomplished** (bullet points of merged PRs and closed issues)
    2. **Current Risks** (open issues, stalled PRs, low activity signals)
    3. **Recommended Focus** (what the team should prioritize next)

    Write it as a briefing for a new project lead joining the team. Do not use markdown headers (##), just bold text for the section titles as requested.

    Data:
    - Recent commits:
    {chr(10).join(commit_msgs) if commit_msgs else "None"}
    
    - Closed issues this week:
    {chr(10).join(closed_issues) if closed_issues else "None"}
    
    - Merged PRs this week:
    {chr(10).join(merged_prs) if merged_prs else "None"}
    
    - Open issues ({len(open_issues)} total, top 5 by age):
    {chr(10).join(open_issue_titles) if open_issue_titles else "None"}
    """
    
    try:
        response = model_lite.generate_content(prompt)
        summary_text = response.text
    except Exception as e:
        print(f"Gemini 2.0 Flash Lite failed: {e}. Trying 1.5 Flash 8b...")
        try:
            response = model_8b.generate_content(prompt)
            summary_text = response.text
        except Exception as e2:
            print(f"Gemini 1.5 Flash 8b also failed: {e2}. Generating smart mock summary...")
            
            commit_count = len(commits)
            contributors = set()
            for c in commits:
                if isinstance(c, dict):
                    author = c.get('commit', {}).get('author', {}).get('name')
                    if author: contributors.add(author)
            contributor_count = len(contributors)
            
            bug_count = len([i for i in open_issues if any("bug" in l.get("name", "").lower() for l in i.get("labels", []) if isinstance(l, dict))])
            
            last_3_msgs = [c.get('commit', {}).get('message', '').split('\n')[0] for c in commits[:3] if isinstance(c, dict)]
            last_3_commit_messages = ", ".join(last_3_msgs) if last_3_msgs else "routine updates"
            
            highest_priority_issue_title = open_issues[0].get("title") if open_issues else "general improvements and backlog"
            
            summary_text = f"This week, the repository saw {commit_count} commits from {contributor_count} active developers. There are currently {len(open_issues)} open issues, with {bug_count} tagged as bugs. Recent activity includes: {last_3_commit_messages}. Recommended focus: {highest_priority_issue_title}."

    result = {
        "summary": summary_text,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }
    
    set_cached(cache_key, result, ttl_seconds=1800)  # 30 minutes
    result["cached"] = False
    return result
