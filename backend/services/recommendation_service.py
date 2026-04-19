def score_developer(dev_login, issue, commits, prs, all_issues):
    score = 0
    reasons = []
    
    # Extract keywords from issue
    issue_title = issue.get("title", "").lower()
    issue_body = (issue.get("body") or "").lower()
    issue_text = issue_title + " " + issue_body
    
    # Simple heuristics
    keywords = ["auth", "payment", "ui", "api", "database", "frontend", "backend", "test", "docker"]
    issue_keywords = [k for k in keywords if k in issue_text]
    
    # 1. File ownership/Domain (mocking file parsing by just using keywords in commit messages)
    dev_commits = [c for c in commits if c.get("author") and c["author"].get("login") == dev_login]
    keyword_matches = 0
    for c in dev_commits:
        msg = c.get("commit", {}).get("message", "").lower()
        if any(k in msg for k in issue_keywords):
            keyword_matches += 1
    
    if keyword_matches > 0:
        pts = min(keyword_matches * 5, 30)
        score += pts
        reasons.append(f"Strong domain expertise ({keyword_matches} related commits)")
        
    # 2. General activity (proxy for file ownership)
    activity_pts = min(len(dev_commits) * 2, 40)
    if activity_pts > 0:
        score += activity_pts
        reasons.append(f"Active contributor ({len(dev_commits)} recent commits)")
        
    # 3. Current workload penalty
    dev_open_prs = [pr for pr in prs if pr.get("state") == "open" and pr.get("user", {}).get("login") == dev_login]
    dev_assigned_issues = [i for i in all_issues if i.get("state") == "open" and any(a.get("login") == dev_login for a in i.get("assignees", []))]
    open_items = len(dev_open_prs) + len(dev_assigned_issues)
    
    if open_items > 0:
        penalty = min(open_items * 5, 20)
        score -= penalty
        reasons.append(f"Current workload penalty (-{penalty} pts, {open_items} open items)")
    else:
        reasons.append("Low current workload (0 open items)")
        
    # 4. Past resolution bonus
    dev_closed_issues = [i for i in all_issues if i.get("state") == "closed" and any(a.get("login") == dev_login for a in i.get("assignees", []))]
    if dev_closed_issues:
        bonus = min(len(dev_closed_issues) * 5, 20)
        score += bonus
        reasons.append(f"Past resolution bonus (+{bonus} pts, {len(dev_closed_issues)} closed issues)")
        
    return {"developer": dev_login, "score": max(score, 0), "reasons": reasons}

def get_recommendations(issue_id: int, issues: list, commits: list, prs: list, contributors: list):
    target_issue = next((i for i in issues if i.get("number") == issue_id), None)
    if not target_issue:
        # Fallback to first open issue if ID not found for demo purposes
        target_issue = next((i for i in issues if i.get("state") == "open"), None)
        
    if not target_issue:
        return []
        
    dev_scores = []
    for contrib in contributors:
        login = contrib.get("login")
        if not login: continue
        
        score_data = score_developer(login, target_issue, commits, prs, issues)
        dev_scores.append(score_data)
        
    # Sort by score descending
    dev_scores.sort(key=lambda x: x["score"], reverse=True)
    return dev_scores[:3]
