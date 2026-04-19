const API_BASE = 'http://localhost:8000';

async function apiFetch(path, options = {}) {
  const session_id = localStorage.getItem('session_id');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session_id ? { 'Authorization': `Bearer ${session_id}` } : {}),
      ...options.headers
    }
  });
  
  if (res.status === 401) {
    // Unauthorized - redirect to login
    localStorage.removeItem('session_id');
    window.location.href = 'login.html';
    return;
  }
  
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getCurrentUser() { return apiFetch('/auth/me'); }
export async function getRepos() { return apiFetch('/repos'); }
export async function getHealthScore(repo) { return apiFetch(`/health-score?repo=${repo}`); }
export async function getSummary(repo) { return apiFetch(`/summary?repo=${repo}`); }
export async function getRecommendation(repo, issueId = null) { 
  const url = issueId ? `/recommendations?repo=${repo}&issue_id=${issueId}` : `/recommendations?repo=${repo}`;
  return apiFetch(url); 
}
export async function getRiskTimeline(repo) { return apiFetch(`/risk-timeline?repo=${repo}`); }
export async function getKnowledgeGaps(repo) { return apiFetch(`/knowledge-gaps?repo=${repo}`); }
export async function getRepoData(repo) { return apiFetch(`/repo-data?repo=${repo}`); }
