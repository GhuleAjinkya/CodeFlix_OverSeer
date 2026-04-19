/* ============================================================
   dashboard.js — AI Project Intelligence
   ============================================================ */
import { getRepos, getHealthScore, getSummary, getRepoData, getRecommendation, getCurrentUser, getRiskTimeline } from './api.js';


/* ── Theme ── */
const tbtn = document.getElementById('themeToggle');

// Default is light mode — add D_lm unless explicitly saved as dark
if (localStorage.getItem('dashTheme') === 'dark') {
  document.body.classList.remove('D_lm');
  tbtn.textContent = '🌙';
} else {
  document.body.classList.add('D_lm');
  tbtn.textContent = '☀️';
}

tbtn.addEventListener('click', () => {
  document.body.classList.toggle('D_lm');
  const isLight = document.body.classList.contains('D_lm');
  tbtn.textContent = isLight ? '☀️' : '🌙';
  localStorage.setItem('dashTheme', isLight ? 'light' : 'dark');
  redraw();
});

/* ── Profile Dropdown ── */
const avBtn = document.getElementById('avatarBtn');
const ddEl  = document.getElementById('profileDropdown');

avBtn.addEventListener('click', e => { e.stopPropagation(); ddEl.classList.toggle('open'); });
document.addEventListener('click', () => ddEl.classList.remove('open'));
ddEl.addEventListener('click', e => e.stopPropagation());

/* ================================================================
   CHARTS
   ================================================================ */
const isLM     = () => document.body.classList.contains('D_lm');
const gridClr  = () => isLM() ? 'rgba(0,0,0,0.06)'  : 'rgba(255,255,255,0.05)';
const lblClr   = () => isLM() ? '#4a5270'             : '#7880a0';
const ttBg     = () => isLM() ? '#ffffff'             : '#1c2130';
const ttTitle  = () => isLM() ? '#181b2c'             : '#e8eaf2';
const ttBody   = () => isLM() ? '#4a5270'             : '#7880a0';

/* Last 14 days labels */
const days14 = Array.from({ length: 14 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - 13 + i);
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
});

let charts = {};

function makeOpts() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        labels: { color: lblClr(), font: { family: 'Inter', size: 11 }, boxWidth: 10, padding: 14 }
      },
      tooltip: {
        backgroundColor: ttBg(),
        titleColor: ttTitle(),
        bodyColor: ttBody(),
        borderColor: isLM() ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)',
        borderWidth: 1, padding: 11, cornerRadius: 9
      }
    },
    scales: {
      x: { grid: { color: gridClr() }, ticks: { color: lblClr(), font: { family: 'Inter', size: 10 }, maxRotation: 30 } },
      y: { grid: { color: gridClr() }, ticks: { color: lblClr(), font: { family: 'Inter', size: 10 } } }
    }
  };
}

function buildCharts() {
  Chart.defaults.font.family = 'Inter';
  Chart.defaults.color = lblClr();

  /* 1 — Commit Activity */
  const c1 = document.getElementById('commitChart').getContext('2d');
  const g1 = c1.createLinearGradient(0, 0, 0, 190);
  g1.addColorStop(0, 'rgba(90,84,238,0.30)');
  g1.addColorStop(1, 'rgba(90,84,238,0.00)');
  charts.commit = new Chart(c1, {
    type: 'line',
    data: {
      labels: days14,
      datasets: [{
        label: 'Commits',
        data: [8,12,7,15,19,11,23,17,14,20,25,18,22,30],
        borderColor: '#5a54ee', backgroundColor: g1,
        borderWidth: 2.5, pointRadius: 3.5, pointBackgroundColor: '#5a54ee',
        tension: 0.4, fill: true
      }]
    },
    options: makeOpts()
  });

  /* 2 — Issue Trend */
  const c2 = document.getElementById('issueChart').getContext('2d');
  const g2 = c2.createLinearGradient(0, 0, 0, 190);
  g2.addColorStop(0, 'rgba(238,68,102,0.25)');
  g2.addColorStop(1, 'rgba(238,68,102,0.00)');
  charts.issue = new Chart(c2, {
    type: 'line',
    data: {
      labels: days14,
      datasets: [
        {
          label: 'Opened',
          data: [3,5,4,6,9,7,5,8,10,12,11,9,14,16],
          borderColor: '#ee4466', backgroundColor: g2,
          borderWidth: 2.5, pointRadius: 3.5, pointBackgroundColor: '#ee4466',
          tension: 0.4, fill: true
        },
        {
          label: 'Closed',
          data: [2,4,3,5,7,6,4,7,8,9,10,8,11,12],
          borderColor: '#1dc998', backgroundColor: 'transparent',
          borderWidth: 2, pointRadius: 2.5, tension: 0.4, fill: false, borderDash: [6,3]
        }
      ]
    },
    options: makeOpts()
  });

  /* 3 — PR Aging */
  const barOpts = makeOpts();
  barOpts.plugins.legend = { display: false };
  charts.pr = new Chart(document.getElementById('prChart'), {
    type: 'bar',
    data: {
      labels: ['< 1 day','1–3 days','3–7 days','1–2 wks','> 2 wks'],
      datasets: [{
        label: 'Open PRs',
        data: [4,8,6,3,2],
        backgroundColor: [
          'rgba(90,84,238,.85)', 'rgba(0,201,190,.85)',
          'rgba(245,166,35,.85)', 'rgba(255,120,50,.85)', 'rgba(238,68,102,.85)'
        ],
        borderRadius: 7, borderSkipped: false
      }]
    },
    options: barOpts
  });

  /* 4 — Dev Workload */
  charts.dev = new Chart(document.getElementById('devChart'), {
    type: 'doughnut',
    data: {
      labels: ['@alex.k','@priya.m','@omar.r','@lisa.w','Others'],
      datasets: [{
        data: [38,22,18,12,10],
        backgroundColor: ['#5a54ee','#00c9be','#f5a623','#ee4466','#40466a'],
        borderWidth: 0, hoverOffset: 8
      }]
    },
    options: {
      cutout: '66%', responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: lblClr(), font: { family: 'Inter', size: 11 }, boxWidth: 11, padding: 12 }
        },
        tooltip: {
          backgroundColor: ttBg(), titleColor: ttTitle(), bodyColor: ttBody(),
          callbacks: { label: c => ` ${c.label}: ${c.parsed}%` }
        }
      },
      animation: { animateRotate: true, duration: 800 }
    }
  });

  /* 5 — Gantt Chart (Risk Timeline) */
  const ganttCanvas = document.getElementById('ganttChart');
  if (ganttCanvas) {
      charts.gantt = new Chart(ganttCanvas, {
        type: 'bar',
        data: {
          labels: [],
          datasets: [{
            data: [],
            backgroundColor: [],
            borderRadius: 4,
            barPercentage: 0.5
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: ttBg(), titleColor: ttTitle(), bodyColor: ttBody(),
              callbacks: {
                title: (ctx) => ctx[0].label,
                label: (ctx) => {
                   const raw = ctx.raw;
                   return [
                     `Start: ${new Date(raw[0]).toLocaleDateString()}`,
                     `End: ${new Date(raw[1]).toLocaleDateString()}`,
                     `Assignee: ${raw.taskInfo.assignee}`,
                     `Reason: ${raw.taskInfo.risk_reason}`
                   ];
                }
              }
            }
          },
          scales: {
            x: {
              type: 'time',
              time: { unit: 'day' },
              grid: { color: gridClr() },
              ticks: { color: lblClr(), font: { family: 'Inter', size: 11 } }
            },
            y: {
              grid: { display: false },
              ticks: { color: lblClr(), font: { family: 'Inter', size: 12, weight: '500' } }
            }
          }
        }
      });
  }
}

function redraw() {
  Object.values(charts).forEach(c => c.destroy());
  charts = {};
  buildCharts();
}

buildCharts();

/* ── Health Ring ── */
(function () {
  const r    = 23;
  const circ = 2 * Math.PI * r;
  const ring = document.getElementById('healthRing');
  ring.style.strokeDasharray  = circ;
  ring.style.strokeDashoffset = circ - (80 / 100) * circ;
})();

/* ── Activity Feed ── */
// Activity feed is now populated dynamically in loadRepoData

/* ================================================================
   SEARCHABLE REPO SELECTOR
   ================================================================ */
let repos = [];
let selectedRepo   = null;
let repoSearchVal  = '';
let repoOpen       = false;
let highlightedIdx = -1;

async function initDashboard() {
  try {
    const user = await getCurrentUser();
    document.querySelector('.D_ddname').textContent = user.username;
    if (user.email) {
      document.querySelector('.D_ddemail').textContent = user.email;
    }
    const initials = user.username.substring(0, 2).toUpperCase();
    document.querySelector('#avatarBtn').textContent = initials;
    document.querySelector('.D_ddav').textContent = initials;
  } catch(e) {
    console.error("Failed to load user", e);
  }

  try {
    const data = await getRepos();
    repos = data.map((r, i) => ({
      name: r.name,
      full_name: r.full_name,
      branch: 'main', // fallback
      org: r.full_name.split('/')[0],
      color: ['#5a54ee', '#00c9be', '#1dc998', '#f5a623', '#ee4466'][i % 5],
      stars: r.stars
    }));
    if (repos.length > 0) {
      selectRepo(repos[0]);
    }
    renderRepoList();
  } catch(e) {
    console.error('Failed to load repos', e);
  }
}


const rswrap   = document.getElementById('repoSelectorWrap');
const rsInput  = document.getElementById('repoInputBox');
const rsDrop   = document.getElementById('repoDropdown');
const rsSearch = document.getElementById('repoSearchInput');
const rsChosen = document.getElementById('repoChosen');
const rsClear  = document.getElementById('repoSearchClear');
const rsList   = document.getElementById('repoList');
const rsEmpty  = document.getElementById('repoEmpty');

function getInitials(name) {
  return name.split('-').map(w => w[0].toUpperCase()).join('').slice(0, 2);
}

function highlight(text, query) {
  if (!query) return text;
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(re, '<mark>$1</mark>');
}

function renderRepoList() {
  const q = repoSearchVal.toLowerCase();
  const filtered = repos.filter(r =>
    r.name.includes(q) || r.org.includes(q) || r.branch.includes(q)
  );

  rsList.innerHTML = '';
  rsEmpty.classList.toggle('show', filtered.length === 0);
  highlightedIdx = -1;

  filtered.forEach((r, i) => {
    const item = document.createElement('div');
    item.className = 'D_rsitem' + (r === selectedRepo ? ' active' : '');
    item.dataset.idx = i;
    item.innerHTML = `
      <div class="D_rsavatar" style="background:${r.color}">${getInitials(r.name)}</div>
      <div class="D_rsinfo">
        <span class="D_rsname">${highlight(r.org + ' / ' + r.name, q)}</span>
        <span class="D_rsbranch">⎇ ${r.branch}</span>
      </div>
      <svg class="D_rscheck" viewBox="0 0 16 16" fill="none">
        <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    item.addEventListener('mouseenter', () => {
      highlightedIdx = i;
      updateHighlight();
    });
    item.addEventListener('click', () => selectRepo(r));
    rsList.appendChild(item);
  });
}

function updateHighlight() {
  [...rsList.querySelectorAll('.D_rsitem')].forEach((el, i) => {
    el.style.background = i === highlightedIdx ? 'var(--D-bg3)' : '';
  });
}

function selectRepo(r) {
  selectedRepo = r;
  rsChosen.textContent = r.org + ' / ' + r.name;
  closeRepoDropdown();
  loadRepoData(r.full_name);
}

async function loadRepoData(fullName) {
  try {
    // Loading states
    document.querySelector('.D_sc4 .D_scval').innerHTML = '<span style="font-size: 14px">Loading...</span>';
    document.querySelector('.D_sc3 .D_scval').innerHTML = '<span style="font-size: 14px">Loading...</span>';
    document.querySelector('.D_sc1 .D_scval').innerHTML = '<span style="font-size: 14px">...</span>';
    document.querySelector('.D_sc1 .D_rnum').textContent = '--';
    
    const insightsContainer = document.querySelector('.D_sb .D_sbc');
    if (insightsContainer) {
        insightsContainer.innerHTML = `
          <div class="D_sbtitle">
            <span class="D_dot"></span>AI Project Summary
          </div>
          <div class="D_ins" style="font-size: 13px; color: var(--D-fg2); padding: 20px;">
            Analyzing repository data...
          </div>
        `;
    }

    const [data, health, summary, recsResponse, riskTimeline] = await Promise.all([
      getRepoData(fullName),
      getHealthScore(fullName),
      getSummary(fullName),
      getRecommendation(fullName),
      getRiskTimeline(fullName)
    ]);
    
    // Update metrics
    document.querySelector('.D_sc1 .D_scval').textContent = health.grade;
    document.querySelector('.D_sc1 .D_rnum').textContent = Math.round(health.score);
    const ring = document.getElementById('healthRing');
    if (ring) {
      const circ = 2 * Math.PI * 23;
      ring.style.strokeDashoffset = circ - (health.score / 100) * circ;
    }

    // Health score badge
    const healthBadge = document.getElementById('healthBadge');
    if (healthBadge) {
        const change = health.health_score_change || 0;
        if (change > 0) {
            healthBadge.className = 'D_bdg D_bdgg';
            healthBadge.textContent = '↑ +' + change;
            healthBadge.style.display = 'inline-flex';
        } else if (change < 0) {
            healthBadge.className = 'D_bdg D_bdgr';
            healthBadge.textContent = '↓ ' + change;
            healthBadge.style.display = 'inline-flex';
        } else {
            healthBadge.style.display = 'none';
        }
    }
    
    // Risk Level
    const riskLevelVal = document.getElementById('riskLevelVal');
    if (riskLevelVal) {
        riskLevelVal.textContent = health.risk_level || 'Unknown';
        riskLevelVal.className = 'D_scval ' + (health.risk_level === 'Low' ? 'D_successclr' : health.risk_level === 'Medium' ? 'D_warnclr' : 'D_errclr');
    }
    const riskLevelSub = document.getElementById('riskLevelSub');
    if (riskLevelSub) riskLevelSub.textContent = `${health.risk_factors_count || 0} active risk factors`;
    
    const riskBadge = document.getElementById('riskBadge');
    if (riskBadge) {
        riskBadge.textContent = health.risk_level === 'Low' ? 'Safe' : health.risk_level === 'Medium' ? 'Review' : 'Critical';
        riskBadge.className = 'D_bdg ' + (health.risk_level === 'Low' ? 'D_bdgg' : health.risk_level === 'Medium' ? 'D_bdgw' : 'D_bdgr');
    }

    // Active Devs
    const activeDevsVal = document.getElementById('activeDevsVal');
    if (activeDevsVal) activeDevsVal.textContent = data.contributors_count;
    
    const devSub = document.getElementById('devSub');
    if (devSub) devSub.textContent = `${data.active_devs_sprint || 0} this sprint`;
    
    const devBadge = document.getElementById('devBadge');
    if (devBadge) devBadge.style.display = 'none';

    // Open Issues
    const openIssuesVal = document.getElementById('openIssuesVal');
    if (openIssuesVal) openIssuesVal.textContent = data.issues_count;
    
    const issueSub = document.getElementById('issueSub');
    if (issueSub) issueSub.textContent = `${data.high_priority_issues || 0} high priority`;
    
    const issueBadge = document.getElementById('issueBadge');
    if (issueBadge) issueBadge.style.display = 'none';

    // Update Charts
    if (charts.commit && data.commits_per_day) {
      charts.commit.data.labels = data.commits_per_day.map(d => {
         // Create local date correctly without timezone shifting issues if parsing ISO
         const date = new Date(d.date + "T12:00:00Z"); 
         return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
      });
      charts.commit.data.datasets[0].data = data.commits_per_day.map(d => d.count);
      charts.commit.update();
    }

    if (charts.issue && data.issues_per_day) {
      charts.issue.data.labels = data.issues_per_day.opened.map(d => {
         const date = new Date(d.date + "T12:00:00Z");
         return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
      });
      charts.issue.data.datasets[0].data = data.issues_per_day.opened.map(d => d.count);
      charts.issue.data.datasets[1].data = data.issues_per_day.closed.map(d => d.count);
      charts.issue.update();
    }
    
    // PR chart
    if (charts.pr && data.pr_aging) {
        charts.pr.data.datasets[0].data = data.pr_aging;
        charts.pr.update();
    }
    
    // Dev workload chart
    if (charts.dev && data.dev_workload) {
        charts.dev.data.labels = data.dev_workload.map(d => '@' + d.name);
        charts.dev.data.datasets[0].data = data.dev_workload.map(d => d.commits);
        
        // Dynamically assign colors to match the number of devs
        const colors = ['#5a54ee','#00c9be','#f5a623','#ee4466','#40466a', '#1dc998'];
        charts.dev.data.datasets[0].backgroundColor = data.dev_workload.map((_, i) => colors[i % colors.length]);
        
        charts.dev.update();
    }
    
    // Update Activity Feed
    if (data.activity_feed) {
        const feed = document.getElementById('activityFeed');
        if (feed) {
            feed.innerHTML = ''; // clear
            const dotMap = { pr: 'D_dpr', issue: 'D_dis', commit: 'D_dcm' };
            data.activity_feed.forEach(a => {
              const el = document.createElement('div');
              el.className = 'D_ai';
              
              // Calculate relative time
              const date = new Date(a.timestamp);
              const now = new Date();
              const diffSecs = Math.floor((now - date) / 1000);
              let timeStr = 'just now';
              if (diffSecs > 86400) timeStr = Math.floor(diffSecs/86400) + 'd ago';
              else if (diffSecs > 3600) timeStr = Math.floor(diffSecs/3600) + 'h ago';
              else if (diffSecs > 60) timeStr = Math.floor(diffSecs/60) + 'm ago';
              
              el.innerHTML = `
                <span class="D_aidot ${dotMap[a.type] || 'D_dcm'}"></span>
                <div>
                  <span class="D_aitxt">${a.text}</span>
                  <span class="D_aitm">${timeStr}</span>
                </div>`;
              feed.appendChild(el);
            });
            if (data.activity_feed.length === 0) {
               feed.innerHTML = '<div class="D_ai"><span class="D_aitxt">No recent activity</span></div>';
            }
        }
    }
    
    // Update Gantt chart
    if (charts.gantt && riskTimeline && riskTimeline.tasks) {
        charts.gantt.data.labels = riskTimeline.tasks.map(t => t.task);
        
        const colors = {
            "on_track": "#1dc998",
            "at_risk": "#f5a623",
            "delayed": "#ee4466"
        };
        
        charts.gantt.data.datasets[0].data = riskTimeline.tasks.map(t => {
            const arr = [new Date(t.start_date).getTime(), new Date(t.end_date).getTime()];
            arr.taskInfo = t;
            return arr;
        });
        
        charts.gantt.data.datasets[0].backgroundColor = riskTimeline.tasks.map(t => colors[t.status] || colors.on_track);
        charts.gantt.update();
    }
    
    // Update AI Insights & Recommendations
    if (insightsContainer) {
        let recsHtml = '';
        if (recsResponse && recsResponse.recommendations && recsResponse.recommendations.length > 0) {
            recsHtml = `
              <div class="D_sbtitle" style="margin-top: 24px;">
                <span class="D_dot D_dotg"></span>AI Recommendations
              </div>
            `;
            recsResponse.recommendations.forEach(r => {
               const reasons = r.reasons.map(reason => `• ${reason}`).join('<br/>');
               recsHtml += `
                 <div class="D_ins">
                   <span class="D_insico">💡</span>
                   <div class="D_insbody">
                     <span class="D_insh">Assign @${r.developer}</span>
                     <span class="D_inst" style="margin-top: 4px;">Score: ${r.score}<br/>${reasons}</span>
                   </div>
                 </div>
               `;
            });
        } else {
            recsHtml = `
              <div class="D_sbtitle" style="margin-top: 24px;">
                <span class="D_dot D_dotg"></span>AI Recommendations
              </div>
              <div class="D_ins"><div class="D_insbody"><span class="D_inst">No recommendations available.</span></div></div>
            `;
        }

        insightsContainer.innerHTML = `
          <div class="D_sbtitle">
            <span class="D_dot"></span>AI Project Summary
          </div>
          <div class="D_ins" style="white-space: pre-wrap; font-size: 13px; color: var(--D-fg2); line-height: 1.5; align-items: start;">
            ${summary.summary}
          </div>
          ${recsHtml}
        `;
    }
    
  } catch(e) {
    console.error("Error loading repo data", e);
    const insightsContainer = document.querySelector('.D_sb .D_sbc');
    if (insightsContainer) {
        insightsContainer.innerHTML = `
          <div class="D_sbtitle">
            <span class="D_dot"></span>AI Project Summary
          </div>
          <div class="D_ins" style="color: #ee4466; padding: 20px;">
            Failed to load data. See console for details.
          </div>
        `;
    }
  }
}


function openRepoDropdown() {
  repoOpen = true;
  rswrap.classList.add('open');
  rsSearch.value = '';
  repoSearchVal  = '';
  rsClear.classList.remove('visible');
  renderRepoList();
  setTimeout(() => rsSearch.focus(), 50);
}

function closeRepoDropdown() {
  repoOpen = false;
  rswrap.classList.remove('open');
  rsSearch.blur();
}

/* Toggle */
rsInput.addEventListener('click', e => {
  e.stopPropagation();
  repoOpen ? closeRepoDropdown() : openRepoDropdown();
});

/* Stop dropdown from closing when clicking inside it */
rsDrop.addEventListener('click', e => e.stopPropagation());

/* Search input */
rsSearch.addEventListener('input', () => {
  repoSearchVal = rsSearch.value.trim();
  rsClear.classList.toggle('visible', repoSearchVal.length > 0);
  renderRepoList();
});

/* Clear button */
rsClear.addEventListener('click', () => {
  rsSearch.value = '';
  repoSearchVal  = '';
  rsClear.classList.remove('visible');
  rsSearch.focus();
  renderRepoList();
});

/* Keyboard navigation */
rsSearch.addEventListener('keydown', e => {
  const items = [...rsList.querySelectorAll('.D_rsitem')];
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    highlightedIdx = Math.min(highlightedIdx + 1, items.length - 1);
    updateHighlight();
    items[highlightedIdx]?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    highlightedIdx = Math.max(highlightedIdx - 1, 0);
    updateHighlight();
    items[highlightedIdx]?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    if (highlightedIdx >= 0 && items[highlightedIdx]) {
      const idx = parseInt(items[highlightedIdx].dataset.idx);
      const q   = repoSearchVal.toLowerCase();
      const filtered = repos.filter(r =>
        r.name.includes(q) || r.org.includes(q) || r.branch.includes(q)
      );
      if (filtered[idx]) selectRepo(filtered[idx]);
    }
  } else if (e.key === 'Escape') {
    closeRepoDropdown();
  }
});

/* Close when clicking outside */
document.addEventListener('click', () => {
  if (repoOpen) closeRepoDropdown();
});

/* Initial render */
initDashboard();