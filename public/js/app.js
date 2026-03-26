let token = localStorage.getItem("token") || "";
let chart;

const api = async (url, method = "GET", body) => {
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
};

function setRiskUI(risk) {
  const section = document.getElementById("riskSection");
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

  badge.className = "badge ";
  if (level === "High") badge.classList.add("bg-danger");
  else if (level === "Moderate") badge.classList.add("bg-warning");
  else badge.classList.add("bg-success");
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
  const payload = {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    password: document.getElementById("password").value,
  };
  const data = await api("/api/auth/register", "POST", payload);
  if (data.token) {
    token = data.token;
    localStorage.setItem("token", token);
    document.getElementById("authMsg").innerText = "Registered and logged in.";
    loadReport();
  } else {
    document.getElementById("authMsg").innerText = data.message || "Register failed.";
  }
}

async function login() {
  const payload = {
    email: document.getElementById("email").value,
    password: document.getElementById("password").value,
  };
  const data = await api("/api/auth/login", "POST", payload);
  if (data.token) {
    token = data.token;
    localStorage.setItem("token", token);
    document.getElementById("authMsg").innerText = "Logged in.";
    loadReport();
  } else {
    document.getElementById("authMsg").innerText = data.message || "Login failed.";
  }
}

async function submitCheckin() {
  const payload = {
    moodScore: Number(document.getElementById("mood").value),
    stressScore: Number(document.getElementById("stress").value),
    anxietyScore: Number(document.getElementById("anxiety").value),
    sleepScore: Number(document.getElementById("sleep").value),
    energyScore: Number(document.getElementById("energy").value),
    physicalSymptoms: document
      .getElementById("symptoms")
      .value.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    notes: document.getElementById("notes").value,
  };
  const data = await api("/api/checkins", "POST", payload);
  document.getElementById("checkinMsg").innerText =
    data.checkin?.dailyInsight || data.message || "Could not save.";
  loadReport();
}

async function loadReport() {
  if (!token) return;
  const days = document.getElementById("days").value;
  const data = await api(`/api/reports?days=${days}`);
  if (!data.report) return;
  drawChart(data.report.series);
  document.getElementById("latestInsight").innerText = data.report.latestInsight || "";
  setRiskUI(data.report.risk);
}

function drawChart(series) {
  const ctx = document.getElementById("trendChart");
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: series.map((x) => x.date),
      datasets: [
        { label: "Mood", data: series.map((x) => x.mood), borderColor: "#16a34a" },
        { label: "Stress", data: series.map((x) => x.stress), borderColor: "#dc2626" },
        { label: "Sleep", data: series.map((x) => x.sleep), borderColor: "#2563eb" },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

async function sendChat() {
  const message = document.getElementById("chatInput").value;
  const data = await api("/api/chat", "POST", { message });
  document.getElementById("chatReply").innerText = data.reply || data.message || "No reply";
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
  document.getElementById("bookingMsg").innerText =
    data.booking?.id ? "Appointment request saved. We'll notify you (demo)." : data.message || "Request failed.";
}
