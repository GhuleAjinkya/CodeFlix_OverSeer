/* ============================================================
   dashboard.js — AI Project Intelligence
   ============================================================ */

/* ── Theme ── */
const tbtn = document.getElementById('themeToggle');
tbtn.addEventListener('click', () => {
  document.body.classList.toggle('D_lm');
  tbtn.textContent = document.body.classList.contains('D_lm') ? '☀️' : '🌙';
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
const activities = [
  { type: 'pr',     text: '<strong>PR #142</strong> merged — feat: auth token refresh',  time: '2 min ago'  },
  { type: 'issue',  text: '<strong>Issue #307</strong> opened — Bug in payment flow',     time: '11 min ago' },
  { type: 'commit', text: '<strong>@priya.m</strong> pushed 3 commits to main',           time: '24 min ago' },
  { type: 'pr',     text: '<strong>PR #141</strong> review requested — refactor/api',     time: '1 hr ago'   },
  { type: 'issue',  text: '<strong>Issue #306</strong> closed — Resolved null pointer',   time: '2 hr ago'   },
  { type: 'commit', text: '<strong>@omar.r</strong> pushed 1 commit to dev',              time: '3 hr ago'   },
  { type: 'pr',     text: '<strong>PR #140</strong> opened — chore: dependency updates',  time: '5 hr ago'   }
];

const dotMap = { pr: 'D_dpr', issue: 'D_dis', commit: 'D_dcm' };
const feed   = document.getElementById('activityFeed');

activities.forEach(a => {
  const el = document.createElement('div');
  el.className = 'D_ai';
  el.innerHTML = `
    <span class="D_aidot ${dotMap[a.type]}"></span>
    <div>
      <span class="D_aitxt">${a.text}</span>
      <span class="D_aitm">${a.time}</span>
    </div>`;
  feed.appendChild(el);
});

/* ================================================================
   SEARCHABLE REPO SELECTOR
   ================================================================ */
const repos = [
  { name: 'project-intelligence',  branch: 'main',    org: 'my-org',     color: '#5a54ee' },
  { name: 'backend-api',           branch: 'main',    org: 'my-org',     color: '#00c9be' },
  { name: 'frontend-app',          branch: 'develop', org: 'my-org',     color: '#1dc998' },
  { name: 'auth-service',          branch: 'main',    org: 'my-org',     color: '#f5a623' },
  { name: 'payments-gateway',      branch: 'main',    org: 'my-org',     color: '#ee4466' },
  { name: 'data-pipeline',         branch: 'staging', org: 'my-org',     color: '#9b59b6' },
  { name: 'mobile-app',            branch: 'main',    org: 'my-team',    color: '#e67e22' },
  { name: 'infra-terraform',       branch: 'main',    org: 'my-team',    color: '#27ae60' },
  { name: 'design-system',         branch: 'develop', org: 'my-team',    color: '#e74c3c' },
  { name: 'docs-site',             branch: 'main',    org: 'my-team',    color: '#3498db' },
];

let selectedRepo   = repos[0];
let repoSearchVal  = '';
let repoOpen       = false;
let highlightedIdx = -1;

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
renderRepoList();