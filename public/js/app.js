// ─── API BASE (auto-detect local vs production) ───────────────────────────
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? (window.location.port === '5000' ? '' : 'http://localhost:5000')
  : (window.location.protocol === 'file:' ? 'http://localhost:5000' : '');

let token = localStorage.getItem('token') || '';
let chart = null;

// ─── CORE FETCH HELPER ────────────────────────────────────────────────────
const api = async (url, method = 'GET', body) => {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ...data, _error: true };
    return data;
  } catch (e) {
    return { message: `Network error: ${e?.message || 'unknown'}`, _error: true };
  }
};

// ─── MESSAGE DISPLAY ──────────────────────────────────────────────────────
function showMsg(id, content, type) {
  const el = document.getElementById(id);
  if (!el) return;
  if (Array.isArray(content)) {
    el.innerHTML = content.map(e => `• ${e}`).join('<br>');
  } else {
    el.textContent = content;
  }
  el.className = 'msg show ' + (type || 'error');
}

// Auth-specific message display (landing page)
function showAuthMsg(msg, type) {
  const el = document.getElementById('authMsg');
  if (!el) return;
  el.textContent = msg;
  el.className = 'msg show ' + (type || 'error');
}

// ─── CRISIS BANNER ────────────────────────────────────────────────────────
const CRISIS_KEYWORDS = [
  'suicide','self-harm','self harm','kill myself','i want to die',
  'end my life','hurt myself','harm myself','overdose','end it',
  "can't go on",'cant go on','not worth living','hopeless','no reason to live',
];
function checkForCrisis(text) {
  const lower = String(text || '').toLowerCase();
  if (CRISIS_KEYWORDS.some(k => lower.includes(k))) {
    const banner = document.getElementById('crisisBanner');
    if (banner) banner.classList.add('show');
  }
}

// ─── AUTH: REGISTER ───────────────────────────────────────────────────────
async function register() {
  const name     = document.getElementById('name')?.value?.trim();
  const email    = document.getElementById('email')?.value?.trim();
  const password = document.getElementById('password')?.value;

  if (!name || !email || !password) return showAuthMsg('Please fill in all fields.', 'error');

  showAuthMsg('Creating your account...', 'info');
  const data = await api('/api/auth/register', 'POST', { name, email, password });

  if (data.token) {
    token = data.token;
    localStorage.setItem('token', token);
    localStorage.setItem('userName', data.user?.name || name);
    localStorage.setItem('userEmail', data.user?.email || email);
    showAuthMsg('Account created! Redirecting...', 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
  } else {
    const errors = data.errors || (data.message ? [data.message] : ['Registration failed.']);
    const el = document.getElementById('authMsg');
    if (el) { el.innerHTML = errors.map(e => `• ${e}`).join('<br>'); el.className = 'msg show error'; }
  }
}

// ─── AUTH: LOGIN ──────────────────────────────────────────────────────────
async function login() {
  const email    = document.getElementById('email')?.value?.trim();
  const password = document.getElementById('password')?.value;

  if (!email || !password) return showAuthMsg('Please enter email and password.', 'error');

  showAuthMsg('Signing you in...', 'info');
  const data = await api('/api/auth/login', 'POST', { email, password });

  if (data.token) {
    token = data.token;
    localStorage.setItem('token', token);
    localStorage.setItem('userName', data.user?.name || '');
    localStorage.setItem('userEmail', data.user?.email || email);
    showAuthMsg('Logged in! Redirecting...', 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
  } else {
    const errors = data.errors || (data.message ? [data.message] : ['Login failed.']);
    const el = document.getElementById('authMsg');
    if (el) { el.innerHTML = errors.map(e => `• ${e}`).join('<br>'); el.className = 'msg show error'; }
  }
}

// ─── CHECK-IN: SUBMIT ─────────────────────────────────────────────────────
async function submitCheckin() {
  const moodVal    = document.getElementById('mood')?.value;
  const energyVal  = document.getElementById('energy')?.value;
  const sleepVal   = document.getElementById('sleep')?.value;
  const stressVal  = document.getElementById('stress')?.value;
  const anxietyVal = document.getElementById('anxiety')?.value;
  const socialVal  = document.getElementById('social')?.value;
  const focusVal   = document.getElementById('focus')?.value;

  if (!moodVal || !energyVal || !sleepVal)
    return showMsg('checkinMsg', 'Please select at least Mood, Energy, and Sleep Quality.', 'error');

  const symptomsRaw = document.getElementById('symptoms')?.value || '';
  const payload = {
    moodScore:    Number(moodVal),
    stressScore:  Number(stressVal) || 3,
    anxietyScore: Number(anxietyVal) || 3,
    sleepScore:   Number(sleepVal),
    energyScore:  Number(energyVal),
    socialScore:  Number(socialVal) || 3,
    focusScore:   Number(focusVal) || 3,
    physicalSymptoms: symptomsRaw ? symptomsRaw.split(',').map(s => s.trim()).filter(Boolean) : [],
    date:   document.getElementById('checkinDate')?.value || undefined,
  };

  showMsg('checkinMsg', 'Saving your check-in...', 'info');
  const data = await api('/api/checkins', 'POST', payload);

  if (data.checkin) {
    const insight = data.checkin.dailyInsight || 'Check-in saved! Keep it up.';
    showMsg('checkinMsg', '✅ ' + insight, 'success');
    // Reset
    ['mood','energy','sleep','social','focus'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
    document.querySelectorAll('.emoji-opt').forEach(b => b.classList.remove('sel'));
    ['symptoms','checkinDate'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
    ['stress','anxiety'].forEach(id => {
      const e = document.getElementById(id);
      if (e) { e.value = 3; e.style.setProperty('--pct', '50%'); }
    });
    document.getElementById('stressLbl') && (document.getElementById('stressLbl').textContent = '3');
    document.getElementById('anxietyLbl') && (document.getElementById('anxietyLbl').textContent = '3');
    loadReport();
  } else {
    const errors = data.errors || (data.message ? [data.message] : ['Could not save check-in.']);
    showMsg('checkinMsg', errors, 'error');
  }
}

// ─── REPORT / TRENDS ──────────────────────────────────────────────────────
async function loadReport() {
  if (!token) return;
  const days = document.getElementById('days')?.value || 7;
  const data = await api(`/api/reports?days=${days}`);

  if (!data.report) {
    const el = document.getElementById('latestInsight');
    if (el) el.textContent = data.message || 'No data yet. Submit your first check-in!';
    const ta = document.getElementById('trendAnalysisBox');
    if (ta) ta.textContent = 'Submit your first check-in to see a comprehensive analysis here.';
    ['tAvgMood','tAvgStress','tAvgSleep','tAvgEnergy'].forEach(id => {
      const e = document.getElementById(id); if (e) e.textContent = '—';
    });
    return;
  }

  const report = data.report;
  if (typeof updateStatsBar === 'function') updateStatsBar(report);

  const entriesEl = document.getElementById('entriesLbl');
  if (entriesEl) entriesEl.textContent = `${report.totalDays || 0} entries in this period`;

  // Populate trend avg cards
  const setAvg = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val ? val.toFixed(1) : '—'; };
  setAvg('tAvgMood', report.avgMood);
  setAvg('tAvgStress', report.avgStress);
  setAvg('tAvgSleep', report.avgSleep);
  setAvg('tAvgEnergy', report.avgEnergy);

  drawChart(report.series || []);

  const insightEl = document.getElementById('latestInsight');
  if (insightEl) insightEl.textContent = report.latestInsight || 'Keep checking in to see your insights here.';

  // Populate AI trend analysis
  const taBox = document.getElementById('trendAnalysisBox');
  if (taBox) {
    if (report.trendAnalysis) {
      taBox.textContent = report.trendAnalysis;
    } else {
      taBox.textContent = report.totalDays ? 'AI analysis is being generated...' : 'Submit check-ins to see analysis.';
    }
  }

  setRiskUI(report.risk);
}

// ─── CHART ────────────────────────────────────────────────────────────────
function drawChart(series) {
  const ctx = document.getElementById('trendChart');
  if (!ctx || !series.length) return;
  if (chart) { chart.destroy(); chart = null; }

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const tooltipBg = isDark ? '#1e293b' : '#ffffff';
  const tooltipColor = isDark ? '#f1f5f9' : '#0f172a';
  const tooltipBorder = isDark ? '#2d3f5a' : '#e2e8f0';

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: series.map(x => x.date),
      datasets: [
        { label: 'Mood',   data: series.map(x => x.mood),   borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.08)', tension: 0.4, fill: true, pointBackgroundColor: '#7c3aed', pointRadius: 4, pointHoverRadius: 7, borderWidth: 2 },
        { label: 'Stress', data: series.map(x => x.stress), borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,0.04)', tension: 0.4, fill: false, pointBackgroundColor: '#dc2626', pointRadius: 3, borderWidth: 2 },
        { label: 'Sleep',  data: series.map(x => x.sleep),  borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.04)', tension: 0.4, fill: false, pointBackgroundColor: '#2563eb', pointRadius: 3, borderWidth: 2 },
        { label: 'Energy', data: series.map(x => x.energy), borderColor: '#d97706', backgroundColor: 'rgba(217,119,6,0.04)', tension: 0.4, fill: false, pointBackgroundColor: '#d97706', pointRadius: 3, borderWidth: 2 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { usePointStyle: true, pointStyleWidth: 8, font: { family: "'Inter', sans-serif", size: 12 } } },
        tooltip: { backgroundColor: tooltipBg, titleColor: tooltipColor, bodyColor: tooltipColor, borderColor: tooltipBorder, borderWidth: 1, padding: 12, cornerRadius: 10 },
      },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 11 } } },
        y: { grid: { color: gridColor }, ticks: { color: tickColor, stepSize: 1, font: { size: 11 } }, min: 0, max: 5 },
      },
    },
  });
}

// ─── RISK UI ──────────────────────────────────────────────────────────────
function setRiskUI(risk) {
  const block = document.getElementById('riskBlock');
  const empty = document.getElementById('riskEmpty');
  if (!block) return;
  if (!risk) {
    block.style.display = 'none';
    if (empty) empty.style.display = 'block';
    return;
  }
  block.style.display = 'block';
  if (empty) empty.style.display = 'none';
  const level = risk.level || 'Low';
  const pill = document.getElementById('riskPill');
  pill.textContent = `Risk: ${level}`;
  pill.className = 'risk-pill ' + (level === 'High' ? 'risk-high' : level === 'Moderate' ? 'risk-moderate' : 'risk-low');
  document.getElementById('riskScoreLbl').textContent = typeof risk.riskScore === 'number' ? `Score: ${risk.riskScore.toFixed(2)} / 1.00` : '';
  document.getElementById('riskSummary').textContent = risk.summary || '';
  document.getElementById('riskRecs').innerHTML = (risk.recommendations || []).map(r => `<li>${r}</li>`).join('');
  document.getElementById('riskHelp').textContent = risk.whenToSeekHelp || '';
}

// ─── CHAT ─────────────────────────────────────────────────────────────────
function addBubble(text, isUser) {
  const el = document.getElementById('chatBody');
  if (!el) return;
  const d = document.createElement('div');
  d.className = 'bubble ' + (isUser ? 'bubble-user' : 'bubble-ai');
  d.textContent = text;
  el.appendChild(d);
  el.scrollTop = el.scrollHeight;
}

function addTyping() {
  const el = document.getElementById('chatBody');
  if (!el) return;
  const d = document.createElement('div');
  d.className = 'typing-bubble'; d.id = 'typingBbl';
  d.innerHTML = '<span></span><span></span><span></span>';
  el.appendChild(d);
  el.scrollTop = el.scrollHeight;
  return d;
}

async function sendChat() {
  const inp = document.getElementById('chatIn');
  if (!inp) return;
  const msg = inp.value.trim();
  if (!msg) return;
  checkForCrisis(msg);
  addBubble(msg, true);
  inp.value = ''; inp.style.height = 'auto';
  const t = addTyping();
  const data = await api('/api/chat', 'POST', { message: msg });
  if (t) t.remove();
  addBubble(data.reply || data.message || 'I\'m currently unavailable. Please try again.', false);
}

// ─── BOOKINGS ─────────────────────────────────────────────────────────────
async function requestBooking() {
  if (!token) return;
  const loc = document.getElementById('bookLoc')?.value?.trim();
  const phone = document.getElementById('bookPhone')?.value?.trim();
  if (!loc) return showMsg('bookingMsg', 'Location is required.', 'error');
  if (!phone) return showMsg('bookingMsg', 'Phone number is required.', 'error');

  const payload = {
    requestType: document.getElementById('bookType')?.value,
    location: loc, phone,
    preferredTime: document.getElementById('bookTime')?.value || '',
    message: document.getElementById('bookMsg')?.value || '',
  };

  showMsg('bookingMsg', 'Submitting...', 'info');
  const data = await api('/api/bookings/request', 'POST', payload);

  if (data.booking?.id) {
    showMsg('bookingMsg', '✅ Request submitted!', 'success');
    ['bookLoc','bookPhone','bookTime','bookMsg'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
    fetchAppointments();
  } else {
    showMsg('bookingMsg', data.errors || (data.message ? [data.message] : ['Request failed.']), 'error');
  }
}

async function fetchAppointments() {
  if (!token) return;
  const data = await api('/api/bookings');
  const el = document.getElementById('bookList');
  if (!el) return;
  if (!data.bookings || !data.bookings.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div>No appointments yet.</div>';
    return;
  }
  el.innerHTML = data.bookings.map(b => `
    <div class="appt-item">
      <div class="appt-top">
        <span class="appt-type">${b.requestType}</span>
        <span class="badge ${b.status === 'requested' ? 'badge-requested' : 'badge-confirmed'}">${b.status}</span>
      </div>
      <div class="appt-meta">
        <span>📍 ${b.location}</span>
        ${b.phone ? `<span>📞 ${b.phone}</span>` : ''}
        ${b.preferredTime ? `<span>🕐 ${b.preferredTime}</span>` : ''}
      </div>
      <div class="appt-date">${new Date(b.createdAt).toLocaleString()}</div>
    </div>
  `).join('');
}

// ─── LOGOUT ───────────────────────────────────────────────────────────────
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userName');
  localStorage.removeItem('userEmail');
  token = '';
  window.location.href = 'index.html';
}
