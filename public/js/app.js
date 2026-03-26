let token = localStorage.getItem("token") || "";
let chart;

let API_BASE = (document.querySelector('meta[name="api-base"]')?.getAttribute("content") || "").replace(/\/$/, "");

const api = async (url, method = "GET", body) => {
  const fullUrl = API_BASE && !url.startsWith("http") ? `${API_BASE}${url}` : url;
  try {
    const res = await fetch(fullUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return data?.message ? data : { message: data.message || `Request failed (${res.status})` };
    return data;
  } catch (e) {
    return { message: `Network error: ${e?.message || "unknown"}` };
  }
};

function showMessage(id, msg, isError = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerText = msg;
  if (id === 'authMsg') {
    el.className = `mt-4 text-center text-sm font-medium p-3 rounded-3 ${isError ? 'bg-danger/20 text-red-200 border border-red-500/30' : 'bg-success/20 text-green-200 border border-green-500/30'}`;
  } else {
    el.style.display = 'block';
    el.className = `mt-3 text-sm text-center fw-medium p-2 rounded-3 ${isError ? 'text-red-300 bg-red-900/30' : 'text-green-300 bg-green-900/30'}`;
  }
}

function setRiskUI(risk) {
  const section = document.getElementById("riskSection");
  if (!section) return;
  const badge = document.getElementById("riskBadge");
  const scoreEl = document.getElementById("riskScore");
  const summaryEl = document.getElementById("riskSummary");
  const recsEl = document.getElementById("riskRecs");
  const helpEl = document.getElementById("riskHelp");

  if (!risk) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";
  const level = risk.level || "Low";
  scoreEl.innerText = typeof risk.riskScore === "number" ? `Score: ${risk.riskScore}` : "";

  badge.className = "badge px-3 py-2 rounded-pill font-medium border text-xs tracking-wide ";
  if (level === "High") {
    badge.classList.add("bg-danger", "border-danger");
  } else if (level === "Moderate") {
    badge.classList.add("bg-warning", "text-dark", "border-warning");
  } else {
    badge.classList.add("bg-success", "border-success");
  }
  badge.innerText = `Risk: ${level}`;

  summaryEl.innerText = risk.summary || "";
  recsEl.innerHTML = "";
  (risk.recommendations || []).forEach((r) => {
    const li = document.createElement("li");
    li.innerText = r;
    recsEl.appendChild(li);
  });
  helpEl.innerText = risk.whenToSeekHelp || "";
}

async function register() {
  const name = document.getElementById("name")?.value;
  const email = document.getElementById("email")?.value;
  const password = document.getElementById("password")?.value;
  
  if (!name || !email || !password) {
    return showMessage("authMsg", "Please fill all fields.", true);
  }

  const payload = { name, email, password };
  showMessage("authMsg", "Registering...", false);
  
  const data = await api("/api/auth/register", "POST", payload);
  if (data.token) {
    token = data.token;
    localStorage.setItem("token", token);
    showMessage("authMsg", "Registered and logged in. Redirecting...", false);
    setTimeout(() => { window.location.href = "dashboard.html"; }, 800);
  } else {
    showMessage("authMsg", data.message || "Registration failed.", true);
  }
}

async function login() {
  const email = document.getElementById("email")?.value;
  const password = document.getElementById("password")?.value;
  
  if (!email || !password) {
    return showMessage("authMsg", "Please enter email and password.", true);
  }

  const payload = { email, password };
  showMessage("authMsg", "Logging in...", false);

  const data = await api("/api/auth/login", "POST", payload);
  if (data.token) {
    token = data.token;
    localStorage.setItem("token", token);
    showMessage("authMsg", "Logged in. Redirecting...", false);
    setTimeout(() => { window.location.href = "dashboard.html"; }, 800);
  } else {
    showMessage("authMsg", data.message || "Login failed.", true);
  }
}

async function submitCheckin() {
  const dateEl = document.getElementById("checkinDate");
  const dateValue = dateEl?.value || "";
  const symptomsEl = document.getElementById("symptoms");
  
  const payload = {
    moodScore: Number(document.getElementById("mood").value) || 0,
    stressScore: Number(document.getElementById("stress").value) || 0,
    anxietyScore: Number(document.getElementById("anxiety").value) || 0,
    sleepScore: Number(document.getElementById("sleep").value) || 0,
    energyScore: Number(document.getElementById("energy").value) || 0,
    date: dateValue ? dateValue : undefined,
    physicalSymptoms: symptomsEl.value ? symptomsEl.value.split(",").map((s) => s.trim()).filter(Boolean) : [],
    notes: document.getElementById("notes").value,
  };
  
  const data = await api("/api/checkins", "POST", payload);
  
  if (data.checkin?.id || data.message === "Checkin parsed correctly") {
     showMessage("checkinMsg", "Success! " + (data.checkin?.dailyInsight || "Check-in safely saved."), false);
     // Clear the forms
     ['mood', 'stress', 'anxiety', 'sleep', 'energy', 'checkinDate', 'symptoms', 'notes'].forEach(id => {
       document.getElementById(id).value = "";
     });
     // Refresh charts automatically
     loadReport();
  } else {
     showMessage("checkinMsg", data.message || "Could not save.", true);
  }
}

async function loadReport() {
  if (!token) return;
  const daysEl = document.getElementById("days");
  const days = daysEl ? daysEl.value : 7;
  const data = await api(`/api/reports?days=${days}`);
  
  if (!data.report) {
    const el = document.getElementById("latestInsight");
    if (el) el.innerText = data.message || "No report available.";
    return;
  }
  
  drawChart(data.report.series);
  document.getElementById("latestInsight").innerText = data.report.latestInsight || "Gathering insights based on recent data...";
  setRiskUI(data.report.risk);
  
  const label = document.getElementById("totalDaysLabel");
  if (label) label.innerText = `${data.report.totalDays || 0} entries`;
}

function drawChart(series) {
  const ctx = document.getElementById("trendChart");
  if (!ctx || series.length === 0) return;
  if (chart) chart.destroy();
  
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: series.map((x) => x.date),
      datasets: [
        { 
          label: "Mood", 
          data: series.map((x) => x.mood), 
          borderColor: "#a855f7",
          backgroundColor: "rgba(168, 85, 247, 0.1)",
          tension: 0.3, fill: true
        },
        { 
          label: "Stress", 
          data: series.map((x) => x.stress), 
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.0)",
          tension: 0.3
        },
        { 
          label: "Sleep", 
          data: series.map((x) => x.sleep), 
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.0)",
          tension: 0.3
        },
      ],
    },
    options: { 
      responsive: true, 
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { color: 'rgba(255, 255, 255, 0.8)' } } },
      scales: {
        x: { grid: { color: 'rgba(255, 255, 255, 0.05)'}, ticks: { color: 'rgba(255, 255, 255, 0.6)' } },
        y: { 
          grid: { color: 'rgba(255, 255, 255, 0.05)'}, 
          ticks: { color: 'rgba(255, 255, 255, 0.6)', stepSize: 1 },
          min: 0, max: 5 
        }
      }
    },
  });
}

function appendChatBubble(text, isUser) {
  const historyEl = document.getElementById("chatHistory");
  const bubble = document.createElement("div");
  bubble.className = `text-sm shadow-sm ${isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}`;
  bubble.innerText = text;
  historyEl.appendChild(bubble);
  historyEl.scrollTop = historyEl.scrollHeight;
}

function handleChatEnter(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    sendChat();
  }
}

async function sendChat() {
  const inputEl = document.getElementById("chatInput");
  const message = inputEl.value.trim();
  if (!message) return;
  
  // Update UI instantly
  appendChatBubble(message, true);
  inputEl.value = "";
  
  // Loading placeholder
  const historyEl = document.getElementById("chatHistory");
  const loadingBubble = document.createElement("div");
  loadingBubble.className = "text-sm shadow-sm chat-bubble-ai text-white/50 fst-italic";
  loadingBubble.id = "chatLoading";
  loadingBubble.innerText = "ai is typing...";
  historyEl.appendChild(loadingBubble);
  historyEl.scrollTop = historyEl.scrollHeight;
  
  const data = await api("/api/chat", "POST", { message });
  
  // Remove loading and append real reply
  document.getElementById("chatLoading")?.remove();
  appendChatBubble(data.reply || data.message || "I am currently unavailable due to maintenance.", false);
}

async function requestBooking() {
  if (!token) return;

  const payload = {
    requestType: document.getElementById("bookingType").value,
    location: document.getElementById("bookingLocation").value,
    preferredTime: document.getElementById("preferredTime").value,
    message: document.getElementById("bookingMessage").value,
  };

  const data = await api("/api/bookings/request", "POST", payload);
  if (data.booking?.id) {
    showMessage("bookingMsg", "Appointment recorded successfully.", false);
    // Clear inputs
    ['bookingLocation', 'preferredTime', 'bookingPhone', 'bookingMessage'].forEach(id => {
       const el = document.getElementById(id);
       if (el) el.value = "";
    });
    fetchAppointments(); // Refresh the list
  } else {
    showMessage("bookingMsg", data.message || "Request failed.", true);
  }
}

async function fetchAppointments() {
  if (!token) return;
  const data = await api("/api/bookings");
  const listEl = document.getElementById("bookingList");
  
  if (!listEl) return;
  listEl.innerHTML = "";
  
  if (!data.bookings || data.bookings.length === 0) {
    listEl.innerHTML = '<div class="text-white/50 text-center text-sm py-5">No appointments requested yet.</div>';
    return;
  }
  
  data.bookings.forEach(b => {
    const statusColor = b.status === 'requested' ? 'bg-warning text-dark' : 'bg-success text-white';
    listEl.innerHTML += `
      <div class="p-3 bg-white/5 border border-white/10 rounded-3 d-flex flex-column gap-2 hover:bg-white/10 transition-colors">
        <div class="d-flex justify-content-between align-items-center">
          <span class="font-bold text-blue-300 text-sm">${b.requestType}</span>
          <span class="badge ${statusColor} text-xs rounded-pill">${b.status}</span>
        </div>
        <div class="text-sm text-white/80">
          <span class="text-white/60">Location:</span> ${b.location}
        </div>
        ${b.preferredTime ? `<div class="text-xs text-white/70">Preferred: ${b.preferredTime}</div>` : ''}
        <div class="text-[10px] text-white/40 mt-1">${new Date(b.createdAt).toLocaleString()}</div>
      </div>
    `;
  });
}

function logout() {
  localStorage.removeItem("token");
  token = "";
  window.location.href = "index.html";
}
