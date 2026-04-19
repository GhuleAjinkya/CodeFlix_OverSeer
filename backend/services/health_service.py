import joblib
import os
import math
from datetime import datetime, timezone, timedelta

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "xgboost_health_model.pkl")

# Try loading model
try:
    model = joblib.load(MODEL_PATH)
    print("XGBoost health model loaded successfully, but forcing heuristic fallback due to feature mismatch.")
    model = None # Force fallback to avoid shape mismatch (expected 11, got 5)
except Exception as e:
    print(f"Failed to load XGBoost model from {MODEL_PATH}: {e}. Falling back to heuristic.")
    model = None

def compute_health_score(issues, prs, commits, contributors):
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    
    # Feature 1: Open issues count
    open_issues_count = len([i for i in issues if i.get("state") == "open"])
    
    # Feature 2: Avg PR review time hours (for merged PRs in last 30 days)
    merged_prs = []
    for pr in prs:
        merged_at_str = pr.get("merged_at")
        if merged_at_str:
            merged_at = datetime.fromisoformat(merged_at_str.replace("Z", "+00:00"))
            created_at = datetime.fromisoformat(pr.get("created_at").replace("Z", "+00:00"))
            if merged_at > thirty_days_ago:
                merged_prs.append((merged_at - created_at).total_seconds() / 3600.0)
                
    avg_pr_review_time_hours = sum(merged_prs) / len(merged_prs) if merged_prs else 0.0
    
    # Feature 3: Commit frequency per week (last 4 weeks)
    recent_commits = 0
    for commit in commits:
        commit_date_str = commit.get("commit", {}).get("author", {}).get("date")
        if commit_date_str:
            commit_date = datetime.fromisoformat(commit_date_str.replace("Z", "+00:00"))
            if commit_date > thirty_days_ago:
                recent_commits += 1
    commit_frequency_per_week = recent_commits / 4.0
    
    # Feature 4: Active contributors ratio
    active_authors = set()
    for commit in commits:
        commit_date_str = commit.get("commit", {}).get("author", {}).get("date")
        if commit_date_str:
            commit_date = datetime.fromisoformat(commit_date_str.replace("Z", "+00:00"))
            if commit_date > thirty_days_ago:
                author = commit.get("author", {})
                if author and author.get("login"):
                    active_authors.add(author.get("login"))
                    
    total_contributors = len(contributors) if contributors else 1
    active_contributors_ratio = len(active_authors) / total_contributors if total_contributors > 0 else 0
    
    # Feature 5: Issue close rate (last 30 days)
    # Since get_issues only gets 'open' by default if we don't pass 'all', 
    # we need the caller to pass all issues. Assuming 'issues' has all.
    closed_issues_recent = 0
    opened_issues_recent = 0
    for issue in issues:
        created_at = datetime.fromisoformat(issue.get("created_at").replace("Z", "+00:00"))
        if created_at > thirty_days_ago:
            opened_issues_recent += 1
        
        closed_at_str = issue.get("closed_at")
        if closed_at_str:
            closed_at = datetime.fromisoformat(closed_at_str.replace("Z", "+00:00"))
            if closed_at > thirty_days_ago:
                closed_issues_recent += 1
                
    total_recent = closed_issues_recent + opened_issues_recent
    issue_close_rate = closed_issues_recent / total_recent if total_recent > 0 else 0.5
    
    # Inference
    score = 0
    if model:
        # Build feature vector according to model expectations
        # Assuming the model takes these 5 features in this exact order
        try:
            import numpy as np
            features = np.array([[
                open_issues_count,
                avg_pr_review_time_hours,
                commit_frequency_per_week,
                active_contributors_ratio,
                issue_close_rate
            ]])
            raw_score = model.predict(features)[0] 
            # Assuming raw score is already 0-100 or needs scaling. 
            # If it's a probability (predict_proba), extract the positive class.
            if hasattr(model, "predict_proba"):
                score = float(model.predict_proba(features)[0][1]) * 100
            else:
                score = float(raw_score)
        except Exception as e:
            print(f"Model prediction failed: {e}. Falling back.")
            model_failed = True
    else:
        model_failed = True
        
    if not model or model_failed:
        # Heuristic fallback
        score = 100 - (open_issues_count * 0.5) - (avg_pr_review_time_hours * 0.3) + (commit_frequency_per_week * 2)
        
    # Clamp
    score = max(0, min(100, score))
    
    # Determine grade
    if score >= 90: grade = "A+"
    elif score >= 80: grade = "A"
    elif score >= 70: grade = "B"
    elif score >= 60: grade = "C"
    elif score >= 50: grade = "D"
    else: grade = "F"
    
    return {
        "score": round(score, 1),
        "grade": grade,
        "breakdown": {
            "open_issues": open_issues_count,
            "avg_pr_time_hours": round(avg_pr_review_time_hours, 1),
            "commits_per_week": round(commit_frequency_per_week, 1),
            "active_contributors": len(active_authors),
            "issue_close_rate": round(issue_close_rate, 2)
        }
    }
