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
  sessionsBeforeLong: 4
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
let focusTimeInput, shortBreakInput, longBreakInput;
let soundSelect, soundFileInput, testSoundBtn, notifToggle;
let saveSettingsBtn, resetStateBtn;

/* ----------------- Initialize DOM references ----------------- */
function initDOMReferences() {
  pomTimerEl = $('#pom-timer');
  pomSessionCountEl = $('#pomSessionsToday');
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
  testSoundBtn = $('#testSoundBtn');
  notifToggle = $('#notifToggle');
  saveSettingsBtn = $('#saveSettingsBtn');
  resetStateBtn = $('#resetStateBtn');
}

/* ----------------- Firestore helpers ----------------- */
const userDocRef = (uid) => doc(db, 'users', uid);

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
  if (fhEl) fhEl.textContent = `${(state.focusHours || 0).toFixed(1)}h`;
  setText('ui-streak', state.streak || 0);
  if (pomTotalFocusEl) pomTotalFocusEl.textContent = `${(state.focusHours || 0).toFixed(1)}h`;
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

function msToMMSS(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function updatePomUI() {
  if (pomTimerEl) pomTimerEl.textContent = msToMMSS(pomState.remaining);
  if (pomSessionCountEl) pomSessionCountEl.textContent = pomState.sessionsCompleted;
  if (pomTotalFocusEl) pomTotalFocusEl.textContent = `${(state.focusHours || 0).toFixed(1)}h`;
}

function setPomMode(mode) {
  pomState.mode = mode;
  const mins = mode === 'focus' ? state.pomSettings.focus : (mode === 'short' ? state.pomSettings.short : state.pomSettings.long);
  pomState.remaining = Math.max(1, Number(mins || 1)) * 60;
  updatePomUI();
}

function pomTick() {
  if (!pomState.running) return;
  
  pomState.remaining--;

  // 🔔 30 seconds remaining notification
  if (pomState.remaining === 30 && state.pomSettings.notifications) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("⏳ 30 seconds left!", {
        body: "Your session is about to end. Wrap up your work!",
        icon: state.user.photoURL || "logo.png"
      });
    }

    // Optional tiny beep
    try {
      AudioManager.play("soft-ding.mp3");
    } catch (_) {}
  }

  updatePomUI();

  if (pomState.remaining <= 0) {
    stopPomInternal();
    handleSessionComplete();
  }

if (pomState.mode === "focus" && pomState.remaining > 0 && pomState.remaining % 60 === 59) {
    incrementTaskTime();
}


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
  AudioManager.stop();

  if (pomState.mode === 'focus') {
    state.user.coins = (state.user.coins || 0) + 10;
    state.focusHours = (state.focusHours || 0) + ((state.pomSettings?.focus || 25) / 60);
    pomState.sessionsCompleted++;
    
    const nowLabel = new Date().toLocaleString();
    const historyItem = document.createElement('div');
    historyItem.className = 'flex items-center justify-between text-sm';
    historyItem.innerHTML = `<div class="flex items-center gap-3"><div class="w-2 h-2 rounded-full bg-green-500"></div><span class="text-slate-600">Focus — ${(state.pomSettings?.focus || 25)}m</span></div><span class="text-slate-400">${nowLabel}</span>`;
    pomHistoryWrap?.prepend(historyItem);

    if (pomState.sessionsCompleted % (state.pomSettings.sessionsBeforeLong || 4) === 0) setPomMode('long');
    else setPomMode('short');
  } else {
    setPomMode('focus');
  }

  const { soundType, sound } = state.pomSettings || {};
  const src = (soundType === 'custom' && sound) ? sound : (soundMap[soundType] || null);
  if (src) {
    AudioManager.play(src, { loop: false });
  }

  try { await saveUserState(); } catch (e) { console.warn('saveUserState failed', e); }

  updateProfileUI();
  updateKpis();
  updatePomUI();
  toast('Session complete — well done!');
}

/* ----------------- Settings UI ----------------- */
function loadSettingsUI() {
  if (focusTimeInput) focusTimeInput.value = state.pomSettings.focus || defaultPomSettings.focus;
  if (shortBreakInput) shortBreakInput.value = state.pomSettings.short || defaultPomSettings.short;
  if (longBreakInput) longBreakInput.value = state.pomSettings.long || defaultPomSettings.long;
  if (soundSelect) soundSelect.value = state.pomSettings.soundType || defaultPomSettings.soundType;
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
  const header = document.createElement('div');
  header.className = 'text-sm text-slate-600 mb-4 font-medium';
  header.textContent = `Generated ${plan.meta.days}-day plan for ${plan.meta.subjects.join(', ')} — ${plan.meta.hoursPerDay}h/day`;
  container.appendChild(header);

  // Create grid container with columns
  const gridContainer = document.createElement('div');
  gridContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';
  
  // Flatten all slots from all days
  plan.days.forEach(d => {
    // Day header as a grid item
    const dayHeader = document.createElement('div');
    dayHeader.className = 'col-span-full pt-4 pb-2 border-b-2 border-slate-200';
    dayHeader.innerHTML = `<h3 class="text-lg font-bold text-slate-800">Day ${d.day}</h3>`;
    gridContainer.appendChild(dayHeader);

    // Add all slots for this day
    d.slots.forEach(slot => {
      const subjectLower = (slot.subject || "").toLowerCase();
      const topicLower = (slot.topic || slot.note || "").toLowerCase();

      const isBreak =
        subjectLower.includes("break") ||
        subjectLower.includes("rest") ||
        subjectLower.includes("free") ||
        subjectLower.includes("lunch") ||
        subjectLower.includes("dinner") ||
        subjectLower.includes("nap") ||
        subjectLower.includes("meal") ||
        subjectLower.includes("snack") ||
        subjectLower.includes("stretch") ||
        topicLower.includes("break") ||
        topicLower.includes("rest") ||
        topicLower.includes("free") ||
        topicLower.includes("lunch") ||
        topicLower.includes("dinner") ||
        topicLower.includes("nap") ||
        topicLower.includes("meal") ||
        topicLower.includes("snack") ||
        topicLower.includes("stretch");

      const slotEl = document.createElement('div');
      slotEl.className = 'p-4 rounded-xl shadow-sm border transition-all hover:shadow-md hover:-translate-y-[1px]';
      
      if (isBreak) {
        slotEl.style.background = "rgba(255, 220, 50, 0.15)";
        slotEl.style.border = "1px dashed #fbbf24";
      } else {
        slotEl.style.background = "#ffffff";
        slotEl.style.border = "1px solid #e2e8f0";
      }

      slotEl.innerHTML = `
        <div class="font-semibold text-slate-700 mb-1">
          ${slot.time} • ${escapeHtml(slot.subject)}
        </div>
        <div class="text-xs text-slate-500 leading-snug">
          ${escapeHtml(slot.topic || slot.note || '')}
        </div>
      `;

      gridContainer.appendChild(slotEl);
    });
  });

  container.appendChild(gridContainer);
}

async function plannerToPDF() {
  const timetable = document.getElementById("timetable");
  if (!timetable) return toast("No timetable to export");

  const pdf = new window.jsPDF('p', 'pt', 'a4');
  let y = 40;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("Timora Study Plan", 40, y);
  y += 30;

  timetable.querySelectorAll("div").forEach(block => {
    const text = block.innerText.trim();
    if (!text) return;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);

    const lines = pdf.splitTextToSize(text, 520);
    pdf.text(lines, 40, y);
    y += lines.length * 14 + 10;

    if (y > 750) {
      pdf.addPage();
      y = 40;
    }
  });

  pdf.save("Timora_Study_Plan.pdf");
  toast("PDF downloaded");
}

async function importPlannerToPomodoro() {
  const user = firebaseAuth.currentUser;
  if (!user) return toast("Login required");

  const timetable = document.getElementById("timetable");
  if (!timetable) return toast("No plan available");

  let added = 0;

  timetable.querySelectorAll(".p-6").forEach(card => {
    const subject = card.querySelector("h4")?.innerText || "Task";
    const isBreak =
      subject.toLowerCase().includes("break") ||
      subject.toLowerCase().includes("rest");

    if (isBreak) return;

    const topic = card.querySelector("p")?.innerText || "";
    const finalText = `${subject} — ${topic}`;

    addTask(finalText);
    added++;
  });

  toast(`Imported ${added} tasks into Pomodoro`);
}



function initPlanner() {
  const btn = document.getElementById('genAIPlan');
  const result = document.getElementById('plannerResult');

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
  
  toast('Dashboard ready — live with Firebase');
  console.log('Dashboard initialization complete');

  $("#addTaskBtn")?.addEventListener("click", () => {
  const input = $("#taskInput");
  const val = input.value.trim();
  if (!val) return toast("Task cannot be empty");
  addTask(val);

  input.value = "";

  document.getElementById("plannerPdfBtn")?.addEventListener("click", plannerToPDF);
document.getElementById("plannerImportBtn")?.addEventListener("click", importPlannerToPomodoro);

  
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
