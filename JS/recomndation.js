/* ================================================================
   recommendation.js — AI Project Intelligence
   ================================================================ */

/* ── Theme ── */
const tbtn = document.getElementById('themeToggle');
tbtn.addEventListener('click', () => {
  document.body.classList.toggle('R_lm');
  tbtn.textContent = document.body.classList.contains('R_lm') ? '☀️' : '🌙';
});

/* ── Profile Dropdown ── */
const avBtn = document.getElementById('avatarBtn');
const ddEl  = document.getElementById('profileDropdown');
avBtn.addEventListener('click', e => { e.stopPropagation(); ddEl.classList.toggle('open'); });
document.addEventListener('click', () => ddEl.classList.remove('open'));
ddEl.addEventListener('click', e => e.stopPropagation());

/* ── Refresh button ── */
const refreshBtn = document.getElementById('refreshBtn');
refreshBtn.addEventListener('click', () => {
  refreshBtn.classList.add('spinning');
  setTimeout(() => {
    refreshBtn.classList.remove('spinning');
    showToast('✅', 'AI recommendations refreshed');
  }, 1200);
});

/* ================================================================
   DATA
   ================================================================ */
const developers = [
  { id: 'd1', name: 'Alex Kim',   initials: 'AK', color: '#5a54ee', skills: ['payments', 'backend', 'api'],    commits: 142, resolved: 28 },
  { id: 'd2', name: 'Sara Lee',   initials: 'SL', color: '#00c9be', skills: ['auth', 'security', 'backend'],   commits: 98,  resolved: 21 },
  { id: 'd3', name: 'Dev Patel',  initials: 'DP', color: '#1dc998', skills: ['backend', 'api', 'database'],    commits: 87,  resolved: 19 },
  { id: 'd4', name: 'Priya M.',   initials: 'PM', color: '#f5a623', skills: ['frontend', 'ui', 'react'],       commits: 76,  resolved: 15 },
  { id: 'd5', name: 'Omar R.',    initials: 'OR', color: '#ee4466', skills: ['devops', 'infra', 'ci'],         commits: 65,  resolved: 12 },
  { id: 'd6', name: 'Lisa W.',    initials: 'LW', color: '#9b59b6', skills: ['mobile', 'react-native', 'ios'], commits: 54,  resolved: 9  },
];

const issues = [
  {
    id: 'ISS-245',
    title: 'Fix Payment API Timeout',
    priority: 'critical',
    status: 'open',
    description: 'API requests to the payment service are taking over 8 seconds to respond during peak hours. This is causing checkout failures and significant revenue loss. Needs urgent optimization of the payment gateway integration.',
    recommendations: [
      { devId: 'd1', score: 94, reason: 'Payments module expert', tags: ['14 commits in payments/', 'Fixed 3 similar bugs'] },
      { devId: 'd3', score: 82, reason: 'Backend API contributor', tags: ['API optimization exp.', 'Database tuning'] },
      { devId: 'd2', score: 71, reason: 'Fixed related auth flows', tags: ['Backend contributor'] },
    ],
    assignedTo: null
  },
  {
    id: 'ISS-251',
    title: 'Login Token Refresh Bug',
    priority: 'high',
    status: 'open',
    description: 'Users are randomly receiving invalid token errors during session refresh, forcing unexpected logouts. Issue appears in auth-service after the recent JWT library upgrade. Reproducible under high concurrency.',
    recommendations: [
      { devId: 'd2', score: 91, reason: 'Auth module owner', tags: ['JWT specialist', '19 commits in auth/'] },
      { devId: 'd1', score: 79, reason: 'Recent auth-service commits', tags: ['Backend contributor'] },
      { devId: 'd3', score: 68, reason: 'Security implementation exp.', tags: ['Backend'] },
    ],
    assignedTo: null
  },
  {
    id: 'ISS-263',
    title: 'Dashboard Load Performance',
    priority: 'medium',
    status: 'open',
    description: 'The main dashboard takes 6–9 seconds to load for accounts with more than 500 repositories. Profiling shows N+1 query issues in the repo listing API and unoptimized chart data aggregation on the frontend.',
    recommendations: [
      { devId: 'd4', score: 88, reason: 'Frontend performance expert', tags: ['React optimization', 'Lazy loading impl.'] },
      { devId: 'd3', score: 76, reason: 'API query optimization', tags: ['Database indexing'] },
      { devId: 'd1', score: 63, reason: 'Contributed to data pipeline', tags: ['API contributor'] },
    ],
    assignedTo: null
  },
  {
    id: 'ISS-271',
    title: 'CI Pipeline Failing on Merge',
    priority: 'high',
    status: 'open',
    description: 'GitHub Actions pipeline is intermittently failing on merge to main with cryptic Docker build errors. Issue started after the base image was updated to Node 20. Affects 30% of merges and blocks deployments.',
    recommendations: [
      { devId: 'd5', score: 96, reason: 'DevOps & CI pipeline owner', tags: ['Docker expert', '8 pipeline fixes this month'] },
      { devId: 'd3', score: 74, reason: 'Infra contributor', tags: ['Node.js expertise'] },
    ],
    assignedTo: null
  },
  {
    id: 'ISS-279',
    title: 'Mobile Push Notifications Failing',
    priority: 'medium',
    status: 'open',
    description: 'iOS push notifications are not delivered for 15% of users since the FCM token rotation update. Android is unaffected. The issue is isolated to the notification-service and appears to be a token caching problem.',
    recommendations: [
      { devId: 'd6', score: 93, reason: 'Mobile & iOS specialist', tags: ['FCM integration', '11 commits in notifications/'] },
      { devId: 'd2', score: 58, reason: 'Backend service contributor', tags: ['Token management exp.'] },
    ],
    assignedTo: null
  },
  {
    id: 'ISS-284',
    title: 'UI Accessibility — Missing ARIA Labels',
    priority: 'low',
    status: 'open',
    description: 'Screen readers cannot properly navigate several dashboard components due to missing or incorrect ARIA labels and roles. Affects sidebar navigation, chart elements, and modal dialogs. Needs audit and remediation.',
    recommendations: [
      { devId: 'd4', score: 85, reason: 'Frontend & UI contributor', tags: ['ARIA / a11y exp.', 'Component library owner'] },
      { devId: 'd6', score: 61, reason: 'Mobile UI experience', tags: ['Accessibility knowledge'] },
    ],
    assignedTo: null
  },
];

/* ================================================================
   STATE
   ================================================================ */
let activeFilter  = 'all';
let searchQuery   = '';
let pendingAssign = null; // { issueId, devId }

/* ================================================================
   RENDER
   ================================================================ */
function priorityLabel(p) {
  return { critical: '🔴 Critical', high: '🟠 High', medium: '🟡 Medium', low: '🟢 Low' }[p] || p;
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
}

function buildDevRow(rec, issue, rank) {
  const dev        = developers.find(d => d.id === rec.devId);
  if (!dev) return '';
  const isAssigned = issue.assignedTo === rec.devId;
  const rankClass  = ['', 'R_rank1', 'R_rank2', 'R_rank3'][rank] || '';

  return `
  <div class="R_devrow ${isAssigned ? 'R_assigned' : ''}" data-dev="${rec.devId}" data-issue="${issue.id}">
    <div class="R_rank ${rankClass}">${rank}</div>
    <div class="R_devav" style="background:${dev.color}">${dev.initials}</div>
    <div class="R_devinfo">
      <span class="R_devname">${dev.name}</span>
      <div class="R_devreason">
        <span>${rec.reason}</span>
        ${rec.tags.map(t => `<span class="R_devtag">${t}</span>`).join('')}
      </div>
    </div>
    <div class="R_scorewrap">
      <div class="R_scorebar"><div class="R_scorefill" style="width:${rec.score}%"></div></div>
      <span class="R_scorenum">${rec.score}%</span>
    </div>
    <div class="R_assignrow">
      <div class="R_checkmark">✓</div>
      <button class="R_abtn ${isAssigned ? 'R_done' : ''}" 
              data-dev="${rec.devId}" data-issue="${issue.id}"
              ${isAssigned ? 'disabled' : ''}>
        ${isAssigned ? '✓ Assigned' : 'Assign'}
      </button>
    </div>
  </div>`;
}

function buildIssueCard(issue, idx) {
  const assignedDev = issue.assignedTo ? developers.find(d => d.id === issue.assignedTo) : null;

  return `
  <div class="R_icard" data-id="${issue.id}" data-priority="${issue.priority}"
       style="animation-delay:${idx * 0.07}s">
    <div class="R_icardtop" data-toggle="${issue.id}">
      <div class="R_issuemeta">
        <span class="R_issueid">${issue.id}</span>
        <h3 class="R_issuetitle">${issue.title}</h3>
      </div>
      <div class="R_icardright">
        <span class="R_pri R_pri-${issue.priority}">${priorityLabel(issue.priority)}</span>
        <span class="R_status ${assignedDev ? 'assigned' : ''}">
          ${assignedDev ? '✓ Assigned to ' + assignedDev.name : 'Unassigned'}
        </span>
        <svg class="R_chev" viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
    </div>
    <div class="R_icardbody">
      <p class="R_issuedesc">${issue.description}</p>
      <div class="R_recho">
        <span class="R_aiicon">🤖</span>
        AI Recommended Developers
      </div>
      <div class="R_devlist">
        ${issue.recommendations.map((r, i) => buildDevRow(r, issue, i + 1)).join('')}
      </div>
    </div>
  </div>`;
}

function renderIssues() {
  const container = document.getElementById('issuesList');
  const filtered  = issues.filter(iss => {
    const matchFilter = activeFilter === 'all' || iss.priority === activeFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || iss.title.toLowerCase().includes(q) || iss.id.toLowerCase().includes(q) || iss.description.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="R_empty show">
        <div class="R_emptyico">🔍</div>
        <div>No issues match your search or filter.</div>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map((iss, i) => buildIssueCard(iss, i)).join('');
  attachCardEvents();
}

/* ================================================================
   EVENTS
   ================================================================ */
function attachCardEvents() {
  /* Collapse toggle */
  document.querySelectorAll('[data-toggle]').forEach(el => {
    el.addEventListener('click', () => {
      const card = document.querySelector(`.R_icard[data-id="${el.dataset.toggle}"]`);
      card.classList.toggle('open');
    });
  });

  /* Assign buttons */
  document.querySelectorAll('.R_abtn:not(.R_done)').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const { dev, issue } = btn.dataset;
      openModal(issue, dev);
    });
  });
}

/* ── Filter buttons ── */
document.getElementById('priorityFilters').addEventListener('click', e => {
  const btn = e.target.closest('.R_fbtn');
  if (!btn) return;
  document.querySelectorAll('.R_fbtn').forEach(b => b.classList.remove('R_fbtnactive'));
  btn.classList.add('R_fbtnactive');
  activeFilter = btn.dataset.filter;
  renderIssues();
});

/* ── Search ── */
document.getElementById('issueSearch').addEventListener('input', e => {
  searchQuery = e.target.value.trim();
  renderIssues();
});

/* ================================================================
   MODAL
   ================================================================ */
function openModal(issueId, devId) {
  const issue = issues.find(i => i.id === issueId);
  const dev   = developers.find(d => d.id === devId);
  const rec   = issue?.recommendations.find(r => r.devId === devId);
  if (!issue || !dev || !rec) return;

  pendingAssign = { issueId, devId };

  document.getElementById('modalTitle').textContent = 'Confirm Assignment';
  document.getElementById('modalBody').innerHTML = `
    <div class="R_modaldev">
      <div class="R_modaldevav" style="background:${dev.color}">${dev.initials}</div>
      <div>
        <span class="R_modaldevname">${dev.name}</span>
        <span class="R_modaldevscore">${rec.score}% match · ${rec.reason}</span>
      </div>
    </div>
    <p class="R_modalissue">
      Assign <strong>${dev.name}</strong> to <strong>${issue.id} — ${issue.title}</strong>?<br/>
      <span style="color:var(--R-text3);font-size:0.78rem">This action can be changed later from the issue settings.</span>
    </p>`;

  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  pendingAssign = null;
}

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalCancel').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});

document.getElementById('modalConfirm').addEventListener('click', () => {
  if (!pendingAssign) return;
  const { issueId, devId } = pendingAssign;
  const issue = issues.find(i => i.id === issueId);
  if (issue) issue.assignedTo = devId;

  /* ── Fire notification through the shared store ── */
  if (window.N) N.assign(issueId, devId, 'Alex Kumar (Manager)');

  closeModal();
  renderIssues();
  setTimeout(() => {
    const card = document.querySelector(`.R_icard[data-id="${issueId}"]`);
    if (card) card.classList.add('open');
  }, 50);
  const dev = developers.find(d => d.id === devId);
  showToast('✅', `${dev?.name} assigned — notification sent!`);
});

/* ================================================================
   TOAST
   ================================================================ */
let toastTimer;
function showToast(icon, msg) {
  const toast = document.getElementById('toast');
  toast.innerHTML = `<span class="R_toastico">${icon}</span><span>${msg}</span>`;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

/* ================================================================
   INIT
   ================================================================ */
renderIssues();