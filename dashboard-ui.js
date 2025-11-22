// src/js/dashboard-ui.js
// Timora Dashboard v5.1 (ES Module) - Fixed navigation and auth display

import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut as firebaseSignOut
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

/* ----------------- Config & Init ----------------- */
const firebaseConfig = {
  apiKey: "AIzaSyDsZ2luMQAqmnwk0y6-vJ1gzKkMd1NKFuc",
  authDomain: "timora-2680a.firebaseapp.com",
  projectId: "timora-2680a",
  storageBucket: "timora-2680a.firebasestorage.app",
  messagingSenderId: "1036436572315",
  appId: "1:1036436572315:web:58b1ecb4cb84045aaa5e3e"
};

let app;
try {
  app = getApp();
} catch (e) {
  app = initializeApp(firebaseConfig);
}

const auth = getAuth(app);
const db = getFirestore(app);

window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDB = db;

/* ----------------- Helpers ----------------- */
// Ask for notification permission at startup
if ("Notification" in window && Notification.permission === "default") {
  Notification.requestPermission().then((p) => {
    console.log("Notification permission:", p);
  });
}

const $ = (s) => document.querySelector(s);
const $all = (s) => Array.from(document.querySelectorAll(s));
const setText = (id, text) => {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
};
const toast = (msg, ttl = 2500) => {
  const el = document.createElement("div");
  el.className = 'fixed right-6 top-6 bg-white/95 backdrop-blur px-4 py-2 rounded-lg shadow-xl text-slate-800 font-medium z-[9999]';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ttl);
};

/* ----------------- Default state ----------------- */
const defaultPomSettings = {
  focus: 25,
  short: 5,
  long: 15,
  soundType: "chime",
  sound: null,
  notifications: true,
  sessionsBeforeLong: 4,
  autoStart: false
};

let state = {
  user: {},
  focusHours: 0,
  streak: 0,
  pending: 0,
  leaderboard: [],
  projects: [],
  water: { goal: "3L", cups: 0 },
  pomSettings: { ...defaultPomSettings },
  tasks: {
    pending: 0,
    completed: 0,
    list: []
  }
};


/* ----------------- Sound presets ----------------- */
const soundMap = {
  none: null,
  chime: 'chime.mp3',
  'kitchen-bell': 'kitchen-bell.mp3',
  'digital-clock': 'digital-clock.mp3',
  'soft-ding': 'soft-ding.mp3'
};

window.soundMap = soundMap;

/* ----------------- Audio Manager ----------------- */
const AudioManager = (() => {
  let current = null;
  let currentSrc = null;
  let isPaused = false;

  function _createAudio(src, opts = {}) {
    const a = new Audio(src);
    a.loop = !!opts.loop;
    a.preload = 'auto';
    a.volume = typeof opts.volume === 'number' ? opts.volume : 1;
    return a;
  }

  return {
    play: (src, opts = {}) => {
      try {
        if (current) {
          try { current.pause(); } catch (e) {}
        }
        if (!src) return null;
        current = _createAudio(src, opts);
        currentSrc = src;
        isPaused = false;
        current.play().catch(err => {
          console.warn('Audio play blocked:', err);
        });
        return current;
      } catch (e) {
        console.warn('AudioManager.play error', e);
        return null;
      }
    },
    pause: () => {
      if (!current) return;
      try {
        current.pause();
        isPaused = true;
      } catch (e) {}
    },
    resume: () => {
      if (!current) return;
      try {
        current.play();
        isPaused = false;
      } catch (e) {}
    },
    stop: () => {
      if (!current) return;
      try {
        current.pause();
        current.currentTime = 0;
      } catch (e) {}
      current = null;
      currentSrc = null;
      isPaused = false;
    },
    isPlaying: () => !!current && !isPaused,
    currentSrc: () => currentSrc
  };
})();

/* ----------------- DOM Elements ----------------- */
let pomTimerEl, pomSessionCountEl, pomTotalFocusEl, pomHistoryWrap;
let pomStartBtn, pomPauseBtn, pomResetBtn, pomPauseIcon;
let playTestSoundBtn, pauseTestSoundBtn, resumeTestSoundBtn, stopTestSoundBtn;
let focusTimeInput, shortBreakInput, longBreakInput, autoStartToggle, longBreakFreq;
let soundSelect, soundFileInput, testSoundBtn, notifToggle;
let saveSettingsBtn, resetStateBtn;

/* ----------------- Initialize DOM references ----------------- */
function initDOMReferences() {
  pomTimerEl = $('#pom-timer');
  pomSessionCountEl = $('#PomodoroSessionsToday');
  pomTotalFocusEl = $('#pomTotalFocus');
  pomHistoryWrap = $('#pomHistory');

  pomStartBtn = $('#pomStart');
  pomPauseBtn = $('#pomPause');
  pomResetBtn = $('#pomReset');
  pomPauseIcon = $('#pomPauseIcon');

  playTestSoundBtn = $('#playTestSound');
  pauseTestSoundBtn = $('#pauseTestSound');
  resumeTestSoundBtn = $('#resumeTestSound');
  stopTestSoundBtn = $('#stopTestSound');

  focusTimeInput = $('#focusTimeInput');
  shortBreakInput = $('#shortBreakInput');
  longBreakInput = $('#longBreakInput');
  soundSelect = $('#soundSelect');
  soundFileInput = $('#soundFileInput');
  autoStartToggle = $('#autoStartToggle');
  longBreakFreq = $('#longBreakFreq');
  testSoundBtn = $('#testSoundBtn');
  notifToggle = $('#notifToggle');
  saveSettingsBtn = $('#saveSettingsBtn');
  resetStateBtn = $('#resetStateBtn');
}

/* ----------------- Firestore helpers ----------------- */
const userDocRef = (uid) => doc(db, 'users', uid);

function todayStatsRef(uid) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return doc(db, "users", uid, "dailyStats", today);
}


async function loadTodayStats(uid) {
  try {
    const statsRef = todayStatsRef(uid);
    const snap = await getDoc(statsRef);

    if (!snap.exists()) {
      console.warn("Today stats doc does NOT exist — will be created only when a session completes.");
      return;
    }

    const data = snap.data();
    state.sessionsToday = data.sessionsCompleted || 0;
    state.focusHoursToday = (data.focusMinutes || 0) / 60;

    setText('PomodoroSessionsToday', state.sessionsToday);
    if (pomTotalFocusEl)
      pomTotalFocusEl.textContent = `${state.focusHoursToday.toFixed(1)}h`;

  } catch (e) {
    console.error('loadTodayStats failed', e);
  }
}


/* ----------------- Load user data ----------------- */
async function loadUserDataOnce(uid) {
  try {
    const ref = userDocRef(uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      console.warn('User doc missing, creating base doc...');
      await setDoc(ref, {
        name: auth.currentUser?.displayName || 'User',
        email: auth.currentUser?.email || '',
        photoURL: auth.currentUser?.photoURL || '',
        coins: 0,
        subscription: 'Free',
        totalFocusHours: 0,
        currentStreak: 0,
        state: { pomSettings: defaultPomSettings },
        water: { cups: 0, goal: "3L" },
        tasks: state.tasks,
      }, { merge: true });
      return loadUserDataOnce(uid);
    }
    const d = snap.data();
    state.user = {
      uid,
      name: d.name || auth.currentUser?.displayName || 'User',
      email: d.email || auth.currentUser?.email || '',
      photoURL: d.photoURL || auth.currentUser?.photoURL || '',
      coins: d.coins || 0,
      sub: d.subscription || d.sub || 'Free'
    };
    state.focusHours = d.totalFocusHours || 0;
    state.streak = d.currentStreak || 0;
    if (d.state && d.state.pomSettings) state.pomSettings = { ...state.pomSettings, ...d.state.pomSettings };
    if (d.water) state.water = { ...state.water, ...d.water };
    if (d.tasks) state.tasks = d.tasks;
    if (Array.isArray(d.projects)) state.projects = d.projects;
    
    updateProfileUI();
    updateKpis();
    populateProjects();
    populateMerch();
    populateWaterTracker();
    updatePomUI();
  } catch (e) {
    console.error('loadUserDataOnce failed', e);
  }
}

/* ----------------- Save user state ----------------- */
async function saveUserState() {
  const user = auth.currentUser;
  if (!user) return;
  const ref = userDocRef(user.uid);
  try {
    await setDoc(ref, {
      coins: state.user.coins,
      totalFocusHours: state.focusHours,
      currentStreak: state.streak,
      state: { pomSettings: state.pomSettings },
      water: state.water,
      tasks: state.tasks,   // ← ★★ THE MISSING LINE
      lastActive: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.warn('saveUserState failed', e);
  }
}


// Universal UI update function
function updateSessionStatsUI() {
  const sessionCount = state.sessionsToday || 0;
  const focusHours = (state.focusHoursToday || 0).toFixed(1);
  
  console.log(`🔄 updateSessionStatsUI called: ${sessionCount} sessions`);
  
  // Update Pomodoro section
  const pomEl = document.getElementById('PomodoroSessionsToday');
  if (pomEl) {
    pomEl.textContent = sessionCount;
    console.log('✅ Pomodoro section updated');
  }
  
  // Update focus hours
  if (pomTotalFocusEl) {
    pomTotalFocusEl.textContent = `${focusHours}h`;
  }
  
  if (pomSessionCountEl) {
    pomSessionCountEl.textContent = sessionCount;
  }
  
  console.log(`✅ All UIs updated to: ${sessionCount} sessions`);
}

/* ----------------- Profile & KPI UI ----------------- */
function updateProfileUI() {
  setText('ui-username', state.user.name || 'User');
  setText('ui-email', state.user.email || '');
  setText('ui-coins', (typeof state.user.coins === 'number' ? state.user.coins : 0));
  setText('ui-coins-small', `${state.user.coins || 0} coins`);
  
  const subEl = document.getElementById('subStatus');
  if (subEl) subEl.textContent = state.user.sub || 'Free';
  
const photoContainer = document.getElementById('profilePhoto');

if (photoContainer && state.user.photoURL) {
  photoContainer.style.backgroundImage = `url(${state.user.photoURL})`;
 photoContainer.style.backgroundSize = "contain";
photoContainer.style.backgroundColor = "#e5e7eb";

  photoContainer.style.backgroundPosition = "center";
}


}

function updateKpis() {
  const fhEl = document.querySelector('#ui-focus-hours');
  if (fhEl) fhEl.textContent = `${state.focusHours.toFixed(1)}h`;

  setText('ui-streak', state.streak || 0);

  // Show today’s focus hours only
  if (pomTotalFocusEl)
    pomTotalFocusEl.textContent = `${(state.focusHoursToday || 0).toFixed(1)}h`;
}


async function loadRecentSessions() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const qSnap = await getDocs(
      query(
        collection(db, "users", user.uid, "sessions"),
        orderBy("timestamp", "desc"),
        limit(5)
      )
    );

    const wrap = document.getElementById("recentSessionsList");
    if (!wrap) return;
    wrap.innerHTML = "";

    if (qSnap.empty) {
      wrap.innerHTML = `
        <div class="text-center text-slate-400 text-sm py-4">
          No sessions yet. Complete your first focus session!
        </div>
      `;
      return;
    }

    qSnap.forEach(docSnap => {
      const d = docSnap.data();
      const date = new Date(d.timestamp);
      const isToday = date.toDateString() === new Date().toDateString();
      const timeStr = isToday 
        ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString([], { month: 'short', day: 'numeric' });

      const item = document.createElement("div");
      item.className = "flex items-center justify-between text-sm mb-2 p-2 rounded-lg hover:bg-slate-50 transition";

      const typeColor = d.type === 'focus' ? 'bg-[var(--primary)]' : 'bg-blue-500';
      const typeName = d.type === 'focus' ? 'Focus' : 'Break';

      item.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-2 h-2 rounded-full ${typeColor}"></div>
          <span class="text-slate-700 font-medium">${typeName} — ${d.minutes}m</span>
          ${d.taskName ? `<span class="text-xs text-slate-400">• ${escapeHtml(d.taskName)}</span>` : ''}
        </div>
        <span class="text-slate-400">${timeStr}</span>
      `;

      wrap.appendChild(item);
    });
  } catch (e) {
    console.error("loadRecentSessions failed:", e);
  }
}

function updateOverviewTasks() {
  setText("pendingTasksCount", state.tasks.pending);
  setText("completedTasksCount", state.tasks.completed);
}


/* ----------------- Section switching (FIXED) ----------------- */
const sections = {};
let navBtns = [];
let appEl;

function initNavigation() {
  console.log('Initializing navigation...');
  
  // Get all sections
  $all("article[id^='sect-']").forEach(sec => {
    sections[sec.id.replace("sect-", "")] = sec;
  });
  
  console.log('Found sections:', Object.keys(sections));
  
  // Get all nav buttons
  navBtns = $all(".nav-btn");
  console.log('Found nav buttons:', navBtns.length);
  
  appEl = $('#app');
  
  // Add click listeners to nav buttons
  navBtns.forEach(btn => {
    const section = btn.dataset.section;
    console.log('Attaching listener to:', section);
    
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Nav clicked:', section);
      if (section) {
        showSection(section);
      }
    });
  });
  
  // Show overview by default
  showSection('overview');
  console.log('Navigation initialized');
}

function showSection(name) {
  Object.entries(sections).forEach(([k, v]) => {
    if (v) {
      v.classList.toggle('hidden', k !== name);
    }
  });
  navBtns.forEach(b => {
    b.classList.toggle('active-nav', b.dataset.section === name);
  });
  if (window.innerWidth < 1024 && appEl) {
    appEl.classList.add('sidebar-hidden');
  }
}

/* ----------------- Projects ----------------- */
function populateProjects() {
  const wrap = $('#projectsList');
  if (!wrap) return;
  wrap.innerHTML = '';
  (state.projects || []).forEach(p => {
    const card = document.createElement('div');
    card.className = 'glass-card rounded-2xl p-6 hover-lift';
    card.innerHTML = `
      <h3 class="text-xl font-bold mb-2">${escapeHtml(p.title || 'Untitled')}</h3>
      <p class="text-sm text-slate-500 mb-4">${escapeHtml(p.desc || '')}</p>
      <div class="flex justify-between text-sm mb-2">
        <span>${p.tasks || 0} tasks</span>
        <span class="font-medium ${p.status === 'In Progress' ? 'text-green-600' : 'text-slate-500'}">${escapeHtml(p.status || 'Pending')}</span>
      </div>
      <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div class="progress-bar" style="width:${Number(p.progress || 0)}%"></div>
      </div>
    `;
    wrap.appendChild(card);
  });
}

function escapeHtml(s = '') {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/* ----------------- Leaderboard ----------------- */
async function populateLeaderboard() {
  const table = $('#leaderboardTable');
  if (!table) return;
  try {
    const q = query(collection(db, 'users'), orderBy('totalFocusHours', 'desc'), limit(10));
    const snaps = await getDocs(q);
    table.innerHTML = '';
    let rank = 1;
    snaps.forEach(docSnap => {
      const d = docSnap.data();
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="py-2 px-3">${rank++}</td>
        <td class="py-2 px-3 font-semibold">${escapeHtml(d.name || 'User')}</td>
        <td class="py-2 px-3">${escapeHtml(d.subscription || 'Free')}</td>
        <td class="py-2 px-3">${(d.totalFocusHours || 0).toFixed(1)}h</td>
        <td class="py-2 px-3">${d.coins || 0}</td>
      `;
      table.appendChild(row);
    });
  } catch (e) {
    console.warn('populateLeaderboard failed', e);
  }
}

/* ----------------- Merch ----------------- */
function populateMerch() {
  const grid = $('#merchGrid');
  if (!grid) return;
  const merchItems = [
    { name: "Study Diary", price: 8000, img: "diary.png" },
    { name: "Timora Hoodie", price: 12000, img: "hoodie.png" },
    { name: "Water Bottle", price: 5000, img: "bottle.png" }
  ];
  grid.innerHTML = merchItems.map(m => `
    <div class="glass-card rounded-2xl p-6 text-center hover:scale-[1.02] transition-all">
      <img src="${m.img}" class="mx-auto w-28 h-28 mb-4 object-contain" alt="${escapeHtml(m.name)}">
      <h4 class="font-semibold text-lg mb-1">${escapeHtml(m.name)}</h4>
      <p class="text-slate-500 mb-3">${m.price} coins</p>
      <button class="buyMerchBtn bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl"
        data-price="${m.price}" data-name="${escapeHtml(m.name)}">Redeem</button>
    </div>
  `).join('');
}

/* ----------------- Global click delegation ----------------- */
document.addEventListener('click', async (e) => {
  const el = e.target;
  
  if (el.closest && el.closest('.buyMerchBtn')) {
    const btn = el.closest('.buyMerchBtn');
    const price = Number(btn.dataset.price || 0);
    const name = btn.dataset.name || 'Item';
    if ((state.user.coins || 0) < price) {
      toast('Not enough coins!');
      return;
    }
    state.user.coins -= price;
    await saveUserState();
    updateProfileUI();
    toast(`Redeemed ${name}!`);
    return;
  }

  if (el.id === 'openSidebar') {
    $('#app')?.classList.remove('sidebar-hidden');
  } else if (el.id === 'closeSidebar') {
    $('#app')?.classList.add('sidebar-hidden');
  }

  if (el.classList.contains('importTaskBtn')) {
    toast('Added to projects (demo)');
  }
});

/* ----------------- Water tracker ----------------- */
function populateWaterTracker() {
  const cups = $all('.cup');
  cups.forEach((cup, i) => {
    const filled = i < (state.water.cups || 0);
    cup.style.background = filled ? "linear-gradient(180deg, rgba(114,89,236,0.12), rgba(198,102,247,0.06))" : "";
  });
  setText('waterProgressText', `${state.water.cups || 0}/8 cups completed`);
}

function initWaterTracker() {
  $all('.cup').forEach((cup, i) => {
    cup.addEventListener('click', async () => {
      state.water.cups = i + 1;
      await saveUserState();
      populateWaterTracker();
    });
  });
}

/* ----------------- Pomodoro Engine ----------------- */
let pomTimerId = null;
const pomState = {
  mode: 'focus',
  remaining: 0,
  running: false,
  sessionsCompleted: 0
  
};

let pomTotalSeconds = 0;


function msToMMSS(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function updatePomUI() {
  if (pomTimerEl) 
    pomTimerEl.textContent = msToMMSS(pomState.remaining);

  // ❌ DO NOT OVERRIDE SESSIONS TODAY HERE
  // Firestore realtime listener updates this automatically

  if (pomTotalFocusEl) 
    pomTotalFocusEl.textContent = `${(state.focusHoursToday || 0).toFixed(1)}h`;
}


function setPomMode(mode) {
  pomState.mode = mode;
  const mins = mode === 'focus' ? state.pomSettings.focus : (mode === 'short' ? state.pomSettings.short : state.pomSettings.long);
  pomState.remaining = Math.max(1, Number(mins || 1)) * 60;
    pomTotalSeconds = pomState.remaining;   // ← ★ ADD THIS LINE
  updatePomUI();
}

function pomTick() {
  if (!pomState.running) return;

  // ==== IF ALREADY ZERO, END IMMEDIATELY ====
  if (pomState.remaining <= 0) {
    pomState.remaining = 0;
    setRingProgress(0); 
    updatePomUI();
    stopPomInternal();
    handleSessionComplete();
    return;
  }

  // Count down
  pomState.remaining--;

  // ==== HIT ZERO THIS TICK → END SESSION ====
  if (pomState.remaining <= 0) {
    pomState.remaining = 0;
    setRingProgress(0);
    updatePomUI();
    stopPomInternal();
    handleSessionComplete();
    return;
  }

  // Update UI
  updatePomUI();

  // ==== RING PROGRESS ====
  let percent = pomState.remaining / pomTotalSeconds;
  if (percent < 0) percent = 0;
  setRingProgress(percent);

  // ==== 30s NOTIFICATION ====
  if (pomState.remaining === 30 && state.pomSettings.notifications) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("⏳ 30 seconds left!", {
        body: "Your session is about to end.",
        icon: state.user.photoURL || "logo.png"
      });
    }
    try { AudioManager.play("soft-ding.mp3"); } catch (_) {}
  }

  // ==== TASK TIME TRACKING ====
  if (pomState.mode === "focus" && pomState.remaining % 60 === 59) {
    incrementTaskTime();
  }
}



// RING PROGRESS SETUP
let ring;
let circumference; // ⭐ ADD THIS LINE

function initRing() {
  ring = document.getElementById("pomProgressRing");
  if (!ring) {
    console.error("❌ Ring element not found!");
    return;
  }
  const radius = 140;
  circumference = 2 * Math.PI * radius; // ⭐ REMOVE 'const' so it's accessible globally
  ring.style.strokeDasharray = `${circumference}`;
  ring.style.strokeDashoffset = `${circumference}`;
}

function setRingProgress(percentage) {
  if (!ring || !circumference) return; // ⭐ ADD SAFETY CHECK
  const offset = circumference - (percentage * circumference);
  ring.style.strokeDashoffset = offset;
}

function stopPomInternal() {
  if (pomTimerId) {
    clearInterval(pomTimerId);
    pomTimerId = null;
  }
  pomState.running = false;
}

function startPom() {
  if (pomState.running) return;
  pomState.running = true;
  pomTimerId = setInterval(pomTick, 1000);
  if (pomStartBtn) pomStartBtn.textContent = 'Running...';
  if (pomPauseBtn) pomPauseBtn.disabled = false;
  toast('Pomodoro started');
}

function togglePausePom() {
  if (!pomState.running) {
    startPom();
    if (pomPauseIcon) pomPauseIcon.innerHTML = `<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>`;
    return;
  }
  stopPomInternal();
  if (pomStartBtn) pomStartBtn.textContent = 'Resume';
  if (pomPauseIcon) pomPauseIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
  toast('Pomodoro paused');
}

function resetPom() {
  stopPomInternal();
  setPomMode(pomState.mode);
  if (pomStartBtn) pomStartBtn.textContent = 'Start Session';
  if (pomPauseBtn) pomPauseBtn.disabled = true;
  if (pomPauseIcon) pomPauseIcon.innerHTML = `<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>`;
  toast('Pomodoro reset');
}

function initPomodoroControls() {
  setPomMode('focus');
  pomStartBtn?.addEventListener('click', startPom);
  pomPauseBtn?.addEventListener('click', togglePausePom);
  pomResetBtn?.addEventListener('click', resetPom);
  
  // Mode switchers
  $all('.pom-mode').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      if (mode === 'focus') setPomMode('focus');
      else if (mode === 'short') setPomMode('short');
      else if (mode === 'long') setPomMode('long');
      
      $all('.pom-mode').forEach(b => {
        if (b.dataset.mode === mode) {
          b.className = 'pom-mode px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white font-semibold shadow-lg';
        } else {
          b.className = 'pom-mode px-6 py-3 rounded-xl bg-white border-2 border-slate-200 font-semibold hover:border-[var(--primary)] transition-all';
        }
      });
    });
  });
}

async function handleSessionComplete() {
  console.log("🎉 SESSION COMPLETE - START");

  // FORCE STOP TIMER
  if (pomTimerId) {
    clearInterval(pomTimerId);
    pomTimerId = null;
  }
  pomState.running = false;

  const isFocus = pomState.mode === "focus";
  console.log("Is Focus:", isFocus);

  if (isFocus) {
    const user = auth.currentUser;
    if (!user) return;

    // UPDATE COINS
    const oldCoins = state.user.coins || 0;
    state.user.coins = oldCoins + 10;
    console.log(`Coins: ${oldCoins} → ${state.user.coins}`);

    // UPDATE FOCUS HOURS
    const mins = state.pomSettings.focus || 25;
    state.focusHours = (state.focusHours || 0) + (mins / 60);

    try {
      const statsRef = todayStatsRef(user.uid);
      const statsSnap = await getDoc(statsRef);
      
      let newSessionCount = 1;
      let newFocusMinutes = mins;
      
      if (statsSnap.exists()) {
        const currentData = statsSnap.data();
        newSessionCount = (currentData.sessionsCompleted || 0) + 1;
        newFocusMinutes = (currentData.focusMinutes || 0) + mins;
      }
      
      console.log('💾 Saving stats:', {
        sessions: newSessionCount,
        minutes: newFocusMinutes
      });

      // ⭐ UPDATE LOCAL STATE **FIRST**
      state.sessionsToday = newSessionCount;
      state.focusHoursToday = newFocusMinutes / 60;

           updateSessionStatsUI();

      // Save to dailyStats
      await setDoc(statsRef, {
        date: new Date().toISOString().split("T")[0],
        sessionsCompleted: newSessionCount,
        focusMinutes: newFocusMinutes,
        lastUpdated: Date.now()
      }, { merge: true });

 

      // ⭐ NOW UPDATE UI (after state is updated)
      const coinsEl = document.getElementById('ui-coins');
      if (coinsEl) coinsEl.textContent = state.user.coins;
      
      const sessionsEl = document.getElementById('PomodoroSessionsToday');
      if (sessionsEl) {
        sessionsEl.textContent = state.sessionsToday;
        console.log('✅ UI updated to:', state.sessionsToday);
      }
      
      const focusEl = document.getElementById('pomTotalFocus');
      if (focusEl) focusEl.textContent = `${state.focusHoursToday.toFixed(1)}h`;

      // Update user document (all-time stats)
      await updateDoc(doc(db, 'users', user.uid), {
        coins: state.user.coins,
        totalFocusHours: state.focusHours
      });

      // Add session history entry
      await addDoc(collection(db, "users", user.uid, "sessions"), {
        type: "focus",
        minutes: mins,
        timestamp: Date.now(),
        taskId: state.currentTaskId || null,
        taskName: state.currentTaskId ? tasks.find(t => t.id === state.currentTaskId)?.text : null
      });

      console.log("✅ Saved to Firestore");
      
      // Reload recent sessions
      await loadRecentSessions();
      
    } catch (err) {
      console.error("Firestore error:", err);
    }
  }

  // PLAY SOUND
  const soundType = state.pomSettings?.soundType || 'chime';
  let soundFile = soundMap[soundType] || 'chime.mp3';

  try {
    const audio = new Audio(soundFile);
    audio.volume = 1.0;
    audio.play().catch(err => console.error("Audio play failed:", err));
  } catch (err) {
    console.error("Audio error:", err);
  }

  // SET NEXT MODE
  if (isFocus) {
    setPomMode("short");
    toast("🎉 Session complete! Take a break.");
    
    // Confetti celebration
    if (window.confetti) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  } else {
    setPomMode("focus");
    toast("✅ Break over! Ready to focus.");
  }

  // RESET BUTTON
  if (pomStartBtn) pomStartBtn.textContent = 'Start Session';
  if (pomPauseBtn) pomPauseBtn.disabled = true;

  console.log("🏁 SESSION COMPLETE - END");
}


/* ----------------- Settings UI ----------------- */
function loadSettingsUI() {
  if (focusTimeInput) focusTimeInput.value = state.pomSettings.focus || defaultPomSettings.focus;
  if (shortBreakInput) shortBreakInput.value = state.pomSettings.short || defaultPomSettings.short;
  if (longBreakInput) longBreakInput.value = state.pomSettings.long || defaultPomSettings.long;
  if (soundSelect) soundSelect.value = state.pomSettings.soundType || defaultPomSettings.soundType;
  if (autoStartToggle)
  autoStartToggle.checked = !!state.pomSettings.autoStart;
}

function initSettingsControls() {
  focusTimeInput?.addEventListener('change', (e) => {
    const v = Number(e.target.value || defaultPomSettings.focus);
    state.pomSettings.focus = Math.max(1, v);
    setPomMode(pomState.mode);
  });
  
  shortBreakInput?.addEventListener('change', (e) => {
    const v = Number(e.target.value || defaultPomSettings.short);
    state.pomSettings.short = Math.max(1, v);
    setPomMode(pomState.mode);
  });
  
  longBreakInput?.addEventListener('change', (e) => {
    const v = Number(e.target.value || defaultPomSettings.long);
    state.pomSettings.long = Math.max(1, v);
    setPomMode(pomState.mode);
  });

  // ⭐ MOVED OUTSIDE - was nested incorrectly
  autoStartToggle?.addEventListener('change', (e) => {
    state.pomSettings.autoStart = e.target.checked;
    toast(`Auto-start ${e.target.checked ? "enabled" : "disabled"}`);
  });

  soundSelect?.addEventListener('change', (e) => {
    const val = e.target.value;
    state.pomSettings.soundType = val;
    if (val !== 'custom') state.pomSettings.sound = null;
    toast(`Selected sound: ${val}`);
  });

  soundFileInput?.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    state.pomSettings.soundType = 'custom';
    state.pomSettings.sound = url;
    toast('Custom sound loaded (local only)');
  });

  testSoundBtn?.addEventListener('click', () => {
    const { soundType, sound } = state.pomSettings || {};
    const src = (soundType === 'custom' && sound) ? sound : (soundMap[soundType] || null);
    if (!src) { toast('No sound selected'); return; }
    AudioManager.play(src, { loop: false });
  });

  notifToggle?.addEventListener('click', async () => {
    if (!("Notification" in window)) {
      toast("Notifications not supported");
      return;
    }
    if (Notification.permission === "granted") {
      state.pomSettings.notifications = !state.pomSettings.notifications;
      toast(`Notifications ${state.pomSettings.notifications ? 'enabled' : 'disabled'}`);
    } else {
      const permission = await Notification.requestPermission();
      state.pomSettings.notifications = permission === 'granted';
      toast(`Notifications ${state.pomSettings.notifications ? 'enabled' : 'denied'}`);
    }
  });

  saveSettingsBtn?.addEventListener('click', async () => {
    try {
      await saveUserState();
      toast('Settings saved');
    } catch (e) {
      console.warn(e);
      toast('Save failed');
    }
  });

  resetStateBtn?.addEventListener('click', async () => {
    if (!confirm('Reset local state? This will not delete your account.')) return;
    state = {
      ...state,
      focusHours: 0,
      streak: 0,
      pending: 0,
      projects: [],
      water: { goal: "3L", cups: 0 },
      pomSettings: { ...defaultPomSettings }
    };
    try { await saveUserState(); } catch (e) { console.warn(e); }
    updateProfileUI();
    updateKpis();
    populateProjects();
    populateMerch();
    populateWaterTracker();
    loadSettingsUI();
    toast('State reset (demo)');
  });
}

function renderPlan(plan) {
  const container = $('#plannerResult');
  if (!container) return;
  container.innerHTML = '';

  // Header
  container.innerHTML = `
    <div class="text-sm text-slate-600 mb-4 font-medium">
      Generated ${plan.meta.days}-day plan for ${plan.meta.subjects.join(', ')} — ${plan.meta.hoursPerDay}h/day
    </div>
  `;

  // MAIN WRAPPER – FULL WIDTH
  const main = document.createElement('div');
  main.className = "w-full flex flex-col gap-10";

  // LOOP DAYS
  plan.days.forEach((day) => {
    const dayWrap = document.createElement('div');
    dayWrap.className = "w-full";

    // Day Header + Buttons
    dayWrap.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-slate-800 text-xl">Day ${day.day}</h3>
      </div>
    `;

    // GRID – MULTI-COLUMN – AUTO WRAP – MAX 6 PER COL
    const grid = document.createElement('div');
    grid.className =
      "grid gap-4 " +
      "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

    // Process slots
    day.slots.forEach((slot) => {
      const subjectLower = slot.subject.toLowerCase();
      const topicLower = (slot.topic || "").toLowerCase();

      const isBreak =
        subjectLower.includes("break") ||
        subjectLower.includes("rest") ||
        subjectLower.includes("free") ||
        subjectLower.includes("lunch") ||
        subjectLower.includes("dinner") ||
        subjectLower.includes("nap") ||
        subjectLower.includes("meal") ||
        topicLower.includes("break") ||
        topicLower.includes("rest") ||
        topicLower.includes("free") ||
        topicLower.includes("lunch") ||
        topicLower.includes("dinner") ||
        topicLower.includes("meal") ||
        topicLower.includes("nap");

      const card = document.createElement('div');

      // UNIFIED CARD STYLE
      card.className =
        "timetable-card p-5 rounded-xl shadow-sm border transition-all hover:shadow-md hover:-translate-y-[1px]";

      // Break styling
      if (isBreak) {
        card.classList.add("bg-yellow-50", "border-yellow-300", "border-dashed");
      } else {
        card.classList.add("bg-white", "border-slate-200");
      }

      card.innerHTML = `
        <div class="font-semibold text-slate-700 mb-1">
          ${slot.time} • ${escapeHtml(slot.subject)}
        </div>
        <div class="text-xs text-slate-500 leading-snug">
          ${escapeHtml(slot.topic || '')}
        </div>
      `;

      grid.appendChild(card);
    });

    dayWrap.appendChild(grid);
    main.appendChild(dayWrap);
  });

  container.appendChild(main);
}


async function plannerToPDF() {
  const container = document.getElementById("plannerResult");
  if (!container || !container.querySelector('.timetable-card')) {
    return toast("Generate a plan first!");
  }

  // Check if jsPDF is available
  const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
  if (!jsPDF) {
    return toast("PDF library not loaded. Please refresh the page.");
  }

  const pdf = new jsPDF('p', 'pt', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let y = 60;

  // ========== HEADER SECTION ==========
  // Gradient background (simulated with rectangles)
  pdf.setFillColor(114, 89, 236); // Purple
  pdf.rect(0, 0, pageWidth, 100, 'F');
  
  pdf.setFillColor(198, 102, 247); // Pink gradient
  pdf.rect(0, 60, pageWidth, 40, 'F');

  // Title
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(28);
  pdf.text("Timora Study Plan", pageWidth / 2, 45, { align: 'center' });
  
  // Subtitle
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  const date = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  pdf.text(`Generated on ${date}`, pageWidth / 2, 75, { align: 'center' });

  y = 130;

  // ========== CONTENT SECTION ==========
  const dayWrappers = container.querySelectorAll('div.w-full');
  let dayCount = 0;
  
  dayWrappers.forEach((dayWrap) => {
    const dayHeader = dayWrap.querySelector('h3');
    if (!dayHeader) return;
    
    dayCount++;

    // Check if we need a new page
    if (y > pageHeight - 100) {
      pdf.addPage();
      y = 40;
    }

    // ===== DAY HEADER BOX =====
    pdf.setFillColor(245, 247, 250); // Light gray background
    pdf.roundedRect(30, y - 5, pageWidth - 60, 35, 5, 5, 'F');
    
    // Day number circle
    pdf.setFillColor(114, 89, 236);
    pdf.circle(50, y + 12, 15, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text(dayCount.toString(), 50, y + 16, { align: 'center' });

    // Day text
    pdf.setTextColor(30, 41, 59);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(dayHeader.textContent.trim(), 75, y + 16);

    y += 50;

    // ===== TASK CARDS =====
    const cards = dayWrap.querySelectorAll('.timetable-card');
    
    if (cards.length === 0) {
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(10);
      pdf.setTextColor(148, 163, 184);
      pdf.text("No tasks scheduled for this day", 50, y);
      y += 30;
    } else {
      cards.forEach((card, index) => {
        const semiboldDiv = card.querySelector('.font-semibold');
        const textXsDiv = card.querySelector('.text-xs');
        
        const header = semiboldDiv ? semiboldDiv.textContent.trim() : '';
        const topic = textXsDiv ? textXsDiv.textContent.trim() : '';
        
        if (!header) return;

        // Check for break
        const isBreak = header.toLowerCase().includes('break') || 
                       header.toLowerCase().includes('lunch') ||
                       header.toLowerCase().includes('dinner') ||
                       topic.toLowerCase().includes('break');
        
        // Check if we need a new page
        if (y > pageHeight - 80) {
          pdf.addPage();
          y = 40;
        }

        // ===== TASK CARD DESIGN =====
        // Card background with shadow effect
        pdf.setFillColor(250, 250, 250);
        pdf.roundedRect(45, y - 3, pageWidth - 90, 52, 4, 4, 'F');
        
        // Left border (color coded)
        if (isBreak) {
          pdf.setFillColor(251, 191, 36); // Yellow for breaks
        } else {
          // Alternate colors for subjects
          const colors = [
            [139, 92, 246],  // Purple
            [59, 130, 246],  // Blue
            [16, 185, 129],  // Green
            [239, 68, 68]    // Red
          ];
          const color = colors[index % colors.length];
          pdf.setFillColor(color[0], color[1], color[2]);
        }
        pdf.roundedRect(45, y - 3, 6, 52, 2, 2, 'F');

        // Task icon (bullet point)
        pdf.setFillColor(100, 116, 139);
        pdf.circle(62, y + 12, 3, 'F');

        // Task header (time + subject)
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(30, 41, 59);
        
        const headerLines = pdf.splitTextToSize(header, pageWidth - 130);
        pdf.text(headerLines, 72, y + 14);
        
        let textHeight = headerLines.length * 12;

        // Task description
        if (topic) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.setTextColor(100, 116, 139);
          
          const topicLines = pdf.splitTextToSize(topic, pageWidth - 130);
          pdf.text(topicLines, 72, y + 14 + textHeight);
        }
        
        y += 60;
      });
    }
    
    // Space between days
    y += 15;
  });

  // ========== FOOTER ==========
  const totalPages = pdf.internal.getNumberOfPages();
  
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    
    // Footer line
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(1);
    pdf.line(30, pageHeight - 40, pageWidth - 30, pageHeight - 40);
    
    // Footer text
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 25, { align: 'center' });
    pdf.text('Generated by Timora', pageWidth - 35, pageHeight - 25, { align: 'right' });
    pdf.text('timora.app', 35, pageHeight - 25);
  }

  pdf.save("Timora_Study_Plan.pdf");
  toast("✅ Premium PDF downloaded!");
}

async function sharePlannerPDF() {
  const container = document.getElementById("plannerResult");
  if (!container || !container.querySelector('.timetable-card')) {
    return toast("Generate a plan first!");
  }

  // Show modal
  const modal = $('#shareModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  $('#shareLoading').classList.remove('hidden');
  $('#shareSuccess').classList.add('hidden');

  try {
    const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
    if (!jsPDF) throw new Error("PDF library not loaded");

    // 📌 GENERATE THE PREMIUM PDF EXACTLY LIKE plannerToPDF()
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let y = 60;

    pdf.setFillColor(114, 89, 236);
    pdf.rect(0, 0, pageWidth, 100, 'F');

    pdf.setFillColor(198, 102, 247);
    pdf.rect(0, 60, pageWidth, 40, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(28);
    pdf.text("Timora Study Plan", pageWidth / 2, 45, { align: 'center' });

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");

    const date = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });

    pdf.text(`Generated on ${date}`, pageWidth / 2, 75, { align: 'center' });

    y = 130;

    const dayWrappers = container.querySelectorAll('div.w-full');
    let dayCount = 0;

    dayWrappers.forEach((dayWrap) => {
      const dayHeader = dayWrap.querySelector("h3");
      if (!dayHeader) return;

      dayCount++;

      if (y > pageHeight - 100) {
        pdf.addPage();
        y = 40;
      }

      pdf.setFillColor(245, 247, 250);
      pdf.roundedRect(30, y - 5, pageWidth - 60, 35, 5, 5, 'F');

      pdf.setFillColor(114, 89, 236);
      pdf.circle(50, y + 12, 15, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text(dayCount.toString(), 50, y + 16, { align: "center" });

      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(16);
      pdf.text(dayHeader.textContent.trim(), 75, y + 16);

      y += 50;

      const cards = dayWrap.querySelectorAll(".timetable-card");

      cards.forEach((card, index) => {
        const header = card.querySelector(".font-semibold")?.textContent.trim() || "";
        const topic = card.querySelector(".text-xs")?.textContent.trim() || "";

        if (!header) return;

        if (y > pageHeight - 80) {
          pdf.addPage();
          y = 40;
        }

        const isBreak = header.toLowerCase().includes("break") ||
                        header.toLowerCase().includes("lunch") ||
                        header.toLowerCase().includes("dinner") ||
                        topic.toLowerCase().includes("break");

        pdf.setFillColor(250, 250, 250);
        pdf.roundedRect(45, y - 3, pageWidth - 90, 52, 4, 4, "F");

        if (isBreak) {
          pdf.setFillColor(251, 191, 36);
        } else {
          const colors = [
            [139, 92, 246],
            [59, 130, 246],
            [16, 185, 129],
            [239, 68, 68]
          ];
          const c = colors[index % colors.length];
          pdf.setFillColor(c[0], c[1], c[2]);
        }

        pdf.roundedRect(45, y - 3, 6, 52, 2, 2, "F");

        pdf.setFillColor(100, 116, 139);
        pdf.circle(62, y + 12, 3, "F");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(30, 41, 59);

        const headerLines = pdf.splitTextToSize(header, pageWidth - 130);
        pdf.text(headerLines, 72, y + 14);

        let textH = headerLines.length * 12;

        if (topic) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.setTextColor(100, 116, 139);

          const topicLines = pdf.splitTextToSize(topic, pageWidth - 130);
          pdf.text(topicLines, 72, y + 14 + textH);
        }

        y += 60;
      });

      y += 15;
    });

    // FOOTER
    const totalPages = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setDrawColor(226, 232, 240);
      pdf.line(30, pageHeight - 40, pageWidth - 30, pageHeight - 40);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 25, { align: "center" });
      pdf.text("Generated by Timora", pageWidth - 35, pageHeight - 25, { align: "right" });
      pdf.text("timora.app", 35, pageHeight - 25);
    }

    // PDF → Blob
    const pdfBlob = pdf.output("blob");

    // Convert to Base64
    const base64 = await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.readAsDataURL(pdfBlob);
    });

    const user = auth.currentUser;
    if (!user) throw new Error("Login required");

    // Upload to Firestore
    const shareDoc = await addDoc(collection(db, "shared-plans"), {
      userId: user.uid,
      userName: user.displayName || "Anonymous",
      pdfData: base64,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

    const shareLink = `${window.location.origin}/view-plan.html?id=${shareDoc.id}`;

    $('#shareLoading').classList.add('hidden');
    $('#shareSuccess').classList.remove('hidden');
    $('#shareLink').value = shareLink;

    toast("Share link generated!");
    
  } catch (err) {
    console.error(err);
    toast("PDF share failed");
    modal.classList.add('hidden');
  }
}


// Copy link function
function copyShareLink() {
  const input = $('#shareLink');
  input.select();
  document.execCommand('copy');
  
  const btn = $('#copyLinkBtn');
  btn.textContent = 'Copied!';
  btn.classList.add('bg-green-500');
  
  setTimeout(() => {
    btn.textContent = 'Copy';
    btn.classList.remove('bg-green-500');
  }, 2000);
  
  toast('📋 Link copied to clipboard!');
}

// Social share functions
function shareViaWhatsApp() {
  const link = $('#shareLink').value;
  const text = encodeURIComponent(`Check out my Timora Study Plan: ${link}`);
  window.open(`https://wa.me/?text=${text}`, '_blank');
}

function shareViaEmail() {
  const link = $('#shareLink').value;
  const subject = encodeURIComponent('My Study Plan from Timora');
  const body = encodeURIComponent(`Hi,\n\nCheck out my study plan created with Timora:\n\n${link}\n\nBest regards`);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function shareViaTwitter() {
  const link = $('#shareLink').value;
  const text = encodeURIComponent(`Just created my study plan with @Timora 📚✨ Check it out:`);
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${link}`, '_blank');
}

async function importPlannerToPomodoro() {
  const user = firebaseAuth.currentUser;
  if (!user) return toast("Login required");

  const container = document.getElementById("plannerResult");
  if (!container || !container.querySelector('.timetable-card')) {
    return toast("Generate a plan first!");
  }

  let added = 0;

  container.querySelectorAll(".timetable-card").forEach(card => {
    const header = card.querySelector("div.font-semibold")?.innerText || "";
    const topic = card.querySelector("div.text-xs")?.innerText || "";

    // Skip breaks
    const isBreak = 
      header.toLowerCase().includes("break") || 
      header.toLowerCase().includes("rest") ||
      header.toLowerCase().includes("lunch") ||
      header.toLowerCase().includes("dinner") ||
      header.toLowerCase().includes("nap") ||
      topic.toLowerCase().includes("break");

    if (isBreak) return;

    // Add task
    addTask(`${header} — ${topic}`);
    added++;
  });

  if (added > 0) {
    toast(`✅ Imported ${added} tasks to Pomodoro!`);
    // Optional: switch to Pomodoro section
    setTimeout(() => showSection('pomodoro'), 500);
  } else {
    toast("No tasks to import");
  }
}



function initPlanner() {
  const btn = document.getElementById('genAIPlan');
  const result = document.getElementById('plannerResult');
  
  // Add PDF download listener
  $('#plannerPdfBtn')?.addEventListener('click', plannerToPDF);
  
  // Add import to Pomodoro listener
  $('#plannerImportBtn')?.addEventListener('click', importPlannerToPomodoro);

  $('#plannerShareBtn')?.addEventListener('click', sharePlannerPDF);
  
  // NEW: Share modal listeners
  $('#closeShareModal')?.addEventListener('click', () => {
    $('#shareModal').classList.add('hidden');
    $('#shareModal').classList.remove('flex');
  });
  
  $('#copyLinkBtn')?.addEventListener('click', copyShareLink);
  $('#shareWhatsapp')?.addEventListener('click', shareViaWhatsApp);
  $('#shareEmail')?.addEventListener('click', shareViaEmail);
  $('#shareTwitter')?.addEventListener('click', shareViaTwitter);

  btn?.addEventListener('click', async (ev) => {
    ev.preventDefault();

    const subjects = ($('#plannerSubjects')?.value || '')
      .split(',')
      .map(s => s.trim()).filter(Boolean);

    const hours = Number($('#plannerHours')?.value) || 3;
    const days = Number($('#plannerDays')?.value) || 7;
    const goal = ($('#plannerGoal')?.value || '').trim() || 'General goal';

    if (subjects.length === 0) {
      toast('Add at least ONE subject');
      return;
    }

    // Loading UI
    result.innerHTML = `
      <div class="text-sm text-slate-600 mb-2">Contacting AI... standby</div>
    `;

 

    // Try AI
    try {
      const aiPlan = await fetchAIPlan(subjects, hours, days, goal);

      if (aiPlan && aiPlan.days && aiPlan.days.length > 0) {
        renderPlan(aiPlan);
        toast("AI Study Plan Generated!");
      } else {
        renderPlan(generateLocalPlan(subjects, hours, days, goal));
      }
    } catch (err) {
      console.error(err);
      toast("AI failed — fallback only");
    }
  });
}


// ---------- super simple local non-AI planner (fast fallback) ----------
function generateLocalPlan(subjects, hoursPerDay, days, goal) {
  // create `days` days, divide hours into 1-hr slots across subjects round-robin
  const totalSlotsPerDay = Math.max(1, Math.floor(hoursPerDay)); // 1-hour slots for simplicity
  const plan = { meta: { subjects, hoursPerDay, days, goal }, days: [] };
  for (let d = 1; d <= days; d++) {
    const slots = [];
    for (let s = 0; s < totalSlotsPerDay; s++) {
      const subj = subjects[(s + (d-1)) % subjects.length];
      const start = 9 + s; // 9:00, 10:00...
      const end = start + 1;
      slots.push({
        time: `${String(start).padStart(2,'0')}:00 - ${String(end).padStart(2,'0')}:00`,
        subject: subj,
        topic: `Focus on ${subj} — ${['Practice', 'Revision', 'Theory'][s % 3]}`
      });
    }
    plan.days.push({ day: d, slots });
  }
  return plan;
}



async function fetchAIPlan(subjects, hours, days, goal) {
  try {
    console.log("🔄 Attempting to reach AI server...");
    
    const requestBody = {
      subjects,
      hours: Number(hours),
      days: Number(days),
      goal: goal || 'General study goal'
    };

    console.log("Request payload:", requestBody);

    const resp = await fetch("/api/generate-plan", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    console.log("Response status:", resp.status);
    console.log("Response ok:", resp.ok);

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error("Server error response:", errorText);
      toast(`AI server error: ${resp.status}`);
      return null;
    }

    const data = await resp.json();
    console.log("AI response received:", data);
    
    if (!data.plan) {
      console.warn("No plan in response:", data);
      toast("AI returned empty plan");
      return null;
    }

    return data.plan;

  } catch (err) {
    console.error("❌ AI fetch failed:", err);
    console.error("Error details:", err.message);
    toast("Failed to reach AI server - check console");
    return null;
  }
}


/* -------------------------------- TASK SYSTEM -------------------------------- */

function renderTasks() {
  const box = $("#tasksList");
  box.innerHTML = "";

  tasks
    .filter(t => !t.completed)
    .forEach(t => {
      const item = document.createElement("div");
      item.id = `task-${t.id}`;
      item.className =
        "flex justify-between items-center p-3 bg-slate-100 rounded-lg hover:bg-slate-200 transition";

      item.innerHTML = `
        <div class="flex flex-col flex-1 cursor-pointer taskFocusTarget" data-id="${t.id}">
          <div class="font-medium text-slate-800">${escapeHtml(t.text)}</div>
          <div class="text-xs text-slate-500">
  ${t.timeSpent || 0} min spent
</div>
        </div>

        <button data-id="${t.id}" 
          class="completeTaskBtn text-sm px-3 py-1 bg-green-600 text-white rounded-lg ml-3">
          Complete
        </button>
      `;

      box.appendChild(item);
    });
}


function tasksColRef(uid) {
  return collection(db, "users", uid, "tasks");
}

let tasks = []; // local cache

async function loadTasks() {
  const user = auth.currentUser;
  if (!user) return;

  const snaps = await getDocs(tasksColRef(user.uid));
  tasks = snaps.docs.map(d => ({
  id: d.id,
  timeSpent: d.data().timeSpent || 0,  
  ...d.data()
}));

  renderTasks();
  updateTaskCounters();
}

async function addTask(text) {
  const user = auth.currentUser;
  if (!user) return;

  const docRef = await addDoc(tasksColRef(user.uid), {
  text,
  completed: false,
  timeSpent: 0,  
  createdAt: Date.now()
});


  tasks.push({ id: docRef.id, text, completed: false });
  renderTasks();
  updateTaskCounters();
}

async function completeTask(taskId) {
  const user = auth.currentUser;
  if (!user) return;

  // Confetti
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 }
  });

  // Slide animation
  const el = document.querySelector(`#task-${taskId}`);
  el.style.transition = "all 0.4s";
  el.style.opacity = "0";
  el.style.transform = "translateX(40px)";

  setTimeout(async () => {
    await updateDoc(doc(db, "users", user.uid, "tasks", taskId), {
      completed: true
    });
    tasks = tasks.filter(t => t.id !== taskId);
    renderTasks();
    updateTaskCounters();
  }, 350);
}



function updateTaskCounters() {
  const pending = tasks.filter(t => !t.completed).length;
const done = tasks.filter(t => t.completed).length;

// Update Firebase root counters too
state.tasks.pending = pending;
state.tasks.completed = done;

saveUserState();

setText("pendingTasksCount", pending);
setText("completedTasksCount", done);

}

async function incrementTaskTime() {
  const user = auth.currentUser;
  if (!user || !state.currentTaskId) return;

  const task = tasks.find(t => t.id === state.currentTaskId);
  if (!task) return;

  task.timeSpent = (task.timeSpent || 0) + 1;

  // Update Firestore
  await updateDoc(doc(db, "users", user.uid, "tasks", state.currentTaskId), {
    timeSpent: task.timeSpent
  });

  // Update UI
  renderTasks();
}



/* ----------------- Projects ----------------- */
function initProjects() {
  $('#newProjectBtn')?.addEventListener('click', async () => {
    const title = prompt('Project title?') || `Project ${Date.now()}`;
    const desc = prompt('Short description?') || '';
    const user = auth.currentUser;
    if (!user) return toast('Login required');
    try {
      const projectsCol = collection(db, 'users', user.uid, 'projects');
      await addDoc(projectsCol, {
        title, desc, tasks: 0, progress: 0, status: 'Pending', createdAt: new Date().toISOString()
      });
      const snaps = await getDocs(collection(db, 'users', user.uid, 'projects'));
      state.projects = snaps.docs.map(d => ({ id: d.id, ...d.data() }));
      populateProjects();
      toast('Project created');
    } catch (e) {
      console.warn('newProject failed', e);
      toast('Project create failed');
    }
  });
}



/* ----------------- Subscriptions ----------------- */
function initSubscriptions() {
  $all('.subscribeBtn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const plan = btn.dataset.plan;
      const user = auth.currentUser;
      if (!user) return toast('Login required');
      try {
        await updateDoc(userDocRef(user.uid), { subscription: plan });
        toast(`Subscribed to ${plan}`);
      } catch (e) {
        console.warn(e);
        toast('Subscribe failed');
      }
    });
  });
}

/* ----------------- Order modal ----------------- */
function initOrderModal() {
  $('#confirmOrderBtn')?.addEventListener('click', async () => {
    const user = auth.currentUser;
    const name = $('#orderName')?.value || 'Customer';
    if (!user) return toast('Login required');
    $('#orderModal')?.classList.add('hidden');
    toast('Order placed (demo)');
  });
  
  $('#cancelOrderBtn')?.addEventListener('click', () => {
    $('#orderModal')?.classList.add('hidden');
  });
}

// Add this near the top with other helper functions
function unlockAudio() {
  const unlock = () => {
    const audio = new Audio();
    audio.play().then(() => audio.pause()).catch(() => {});
    document.removeEventListener('click', unlock);
    document.removeEventListener('touchstart', unlock);
    console.log('Audio unlocked');
  };
  document.addEventListener('click', unlock, { once: true });
  document.addEventListener('touchstart', unlock, { once: true });
}

/* ----------------- Quick Actions ----------------- */
function initQuickActions() {
  $('#pomQuickStart')?.addEventListener('click', () => {
    showSection('pomodoro');
    setTimeout(() => startPom(), 300);
  });
  
  $('#createTask')?.addEventListener('click', () => {
    showSection('projects');
  });
  
  $('#genPlan')?.addEventListener('click', () => {
    showSection('planner');
  });
}

/* ----------------- Logout ----------------- */
function initLogout() {
  $('#logoutBtn')?.addEventListener('click', async () => {
    try {
      await firebaseSignOut(auth);
      toast('Signed out');
      window.location.href = 'login.html';
    } catch (e) {
      console.error(e);
      toast('Sign out failed');
    }
  });
}

/* ----------------- Auth State Management ----------------- */
let userUnsub = null;

function setupAuthListener() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      console.log('No user logged in');
      // Uncomment to redirect to login
      // window.location.href = '/login.html';
      return;
    }

    console.log('User authenticated:', user.email);

    // Load user data initially
    await loadUserDataOnce(user.uid);

        // await loadTodayStats(user.uid);

            await loadRecentSessions();

    // Setup realtime listener
    const ref = userDocRef(user.uid);
    if (userUnsub) {
      try { userUnsub(); } catch (e) {}
    }

    try {
      userUnsub = onSnapshot(ref, (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        
        // Update state
        state.user = state.user || {};
        state.user.name = d.name || state.user.name || user.displayName || 'User';
        state.user.email = d.email || state.user.email || user.email || '';
        state.user.photoURL = d.photoURL || state.user.photoURL || user.photoURL || '';
        state.user.coins = (typeof d.coins !== 'undefined') ? d.coins : (state.user.coins || 0);
        state.user.sub = d.subscription || state.user.sub || 'Free';
        state.focusHours = (typeof d.totalFocusHours !== 'undefined') ? d.totalFocusHours : state.focusHours;
        state.streak = (typeof d.currentStreak !== 'undefined') ? d.currentStreak : state.streak;
        
        if (d.state && d.state.pomSettings) {
          state.pomSettings = { ...state.pomSettings, ...d.state.pomSettings };
        }
        if (d.water) {
          state.water = { ...state.water, ...d.water };
        }
        
        // Update UI
        updateProfileUI();
        updateKpis();
        loadSettingsUI();
        populateProjects();
        populateLeaderboard();
        populateMerch();
        populateWaterTracker();
        updatePomUI();
      });
    } catch (e) {
      console.warn('Realtime listener error', e);
    }
// Setup realtime listener for today's stats
const statsRef = todayStatsRef(user.uid);
console.log('🔊 Setting up stats listener for:', statsRef.path);

const unsubStats = onSnapshot(statsRef, (snap) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`\n🔔 [${timestamp}] STATS SNAPSHOT FIRED`);
  console.log('   Exists:', snap.exists());
  
  if (!snap.exists()) {
    console.log('   ⚠️ Doc does not exist, keeping current state');
    console.log('   Current state.sessionsToday:', state.sessionsToday);
    return;
  }
  
  const data = snap.data();
  console.log('   📦 Raw data:', JSON.stringify(data, null, 2));
  console.log('   📊 sessionsCompleted:', data.sessionsCompleted);
  console.log('   📊 focusMinutes:', data.focusMinutes);
  
  // BEFORE update
  console.log('   ⏪ BEFORE - state.sessionsToday:', state.sessionsToday);
  
  // Update state
  if (typeof data.sessionsCompleted === 'number') {
    state.sessionsToday = data.sessionsCompleted;
    console.log('   ✅ AFTER - state.sessionsToday:', state.sessionsToday);
  } else {
    console.log('   ❌ sessionsCompleted is NOT a number!');
  }
  
  if (typeof data.focusMinutes === 'number') {
    state.focusHoursToday = data.focusMinutes / 60;
    console.log('   ✅ focusHoursToday set to:', state.focusHoursToday);
  }

  updateSessionStatsUI();
  
  /// Update ALL session count elements across ALL sections
console.log('   🎯 Updating UI elements...');

// Update Pomodoro section
const sessionsEl = document.getElementById('PomodoroSessionsToday');
if (sessionsEl) {
  console.log('   📍 Pomodoro element before:', sessionsEl.textContent);
  sessionsEl.textContent = String(state.sessionsToday);
  console.log('   ✅ Pomodoro element after:', sessionsEl.textContent);
}

// Update pomSessionCountEl (if it's different)
if (pomSessionCountEl && pomSessionCountEl !== sessionsEl) {
 
  console.log('   ✅ pomSessionCountEl updated');
}

// Update focus hours
if (pomTotalFocusEl) {
  pomTotalFocusEl.textContent = `${state.focusHoursToday.toFixed(1)}h`;
  console.log('   ✅ Focus hours updated');
}

console.log('   🏁 All UI elements updated');
  
  console.log('   🏁 Snapshot processing complete\n');
}, (error) => {
  console.error('❌ Stats listener error:', error);
});
    // Load projects from subcollection
   // Load projects
try {
  const snaps = await getDocs(collection(db, 'users', user.uid, 'projects'));
  state.projects = snaps.docs.map(d => ({ id: d.id, ...d.data() }));
  populateProjects();
} catch (e) {
  console.warn('fetch projects failed', e);
}

await loadTasks();  // load tasks first

// AFTER loading tasks, restore active task
const savedTaskId = localStorage.getItem("currentPomTaskId");
if (savedTaskId) {
  state.currentTaskId = savedTaskId;
  const task = tasks.find(t => t.id === savedTaskId);
  if (task) setText("currentPomTask", task.text);
}


  });
}



function init() {
  console.log('Initializing dashboard...');
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDashboard);  // ← Changed
  } else {
    initializeDashboard();  // ← Changed
  }
}

function initializeDashboard() {  // ← Changed name
  console.log('DOM ready, initializing app components...');
  
   unlockAudio();  // ← Add this line
  // Initialize DOM references
  initDOMReferences();

  // ⭐ ADD THIS LINE:
  initRing();
  
  // Initialize navigation
  initNavigation();
  
  // Initialize all components
  initWaterTracker();
  initPomodoroControls();
  initSettingsControls();
  initPlanner();
  initProjects();
  initSubscriptions();
 
  initOrderModal();
  initQuickActions();
  initLogout();
  
  // Initial UI population
  updateProfileUI();
  updateKpis();
  populateProjects();
  populateMerch();
  populateWaterTracker();
  updatePomUI();
  updateOverviewTasks();
  
  // Setup auth listener
  setupAuthListener();
  
  // Load leaderboard
  populateLeaderboard().catch(e => console.warn('leaderboard fetch failed', e));

    // ← ADD THIS HERE
  loadRecentSessions();
  
  toast('Dashboard ready — live with Firebase');
  console.log('Dashboard initialization complete');

  $("#addTaskBtn")?.addEventListener("click", () => {
  const input = $("#taskInput");
  const val = input.value.trim();
  if (!val) return toast("Task cannot be empty");
  addTask(val);

  input.value = ""
  
});

document.addEventListener("click", (e) => {
  const el = e.target;
  // If user clicks a task, set it as active Pomodoro task
if (el.closest && el.closest('.taskFocusTarget')) {
  const id = el.closest('.taskFocusTarget').dataset.id;
  state.currentTaskId = id;

  setText('currentPomTask', tasks.find(t => t.id === id)?.text || 'None');

  localStorage.setItem("currentPomTaskId", id);   // ← ADD THIS EXACT LINE (FIX #3)  

  toast("Now focusing on: " + (tasks.find(t => t.id === id)?.text || 'Task'));
  return;
}

  if (el.classList.contains("completeTaskBtn")) {
    const id = el.dataset.id;
    completeTask(id);
    state.tasks.pending--;
state.tasks.completed++;
saveUserState();
updateOverviewTasks();

  }
});

loadTasks();  // load tasks on dashboard load

}

// Start initialization
window.addEventListener("load", init);



/* ----------------- Debug API ----------------- */
window.Timora = {
  state,
  saveUserState,
  setMode: setPomMode,
  pomControl: { start: startPom, pause: togglePausePom, reset: resetPom },
  stopMusic: () => { AudioManager.stop(); },
  forceComplete: handleSessionComplete,
  showSection
};
