
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
  limit,
  where,
  increment,
  deleteDoc,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {

/* ============================================================================
   CONFIGURATION & INITIALIZATION
   ============================================================================ */

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

/* ============================================================================
   UTILITY HELPERS
   ============================================================================ */

const $ = (s) => document.querySelector(s);
const $all = (s) => Array.from(document.querySelectorAll(s));
const setText = (id, text) => {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
};

const setHtml = (id, html) => {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
};

const toast = (msg, ttl = 2500) => {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();
  
  const el = document.createElement("div");
  el.className = 'toast-notification fixed right-6 top-6 bg-white/95 backdrop-blur px-5 py-3 rounded-xl shadow-2xl text-slate-800 font-medium z-[9999] transform transition-all duration-300';
  el.style.animation = 'slideIn 0.3s ease-out';
  el.textContent = msg;
  document.body.appendChild(el);
  
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(100px)';
    setTimeout(() => el.remove(), 300);
  }, ttl);
};

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ============================================================================
   LOADING SCREEN
   ============================================================================ */
const LoadingScreen = {
  element: null,
  progressBar: null,
  textEl: null,
  progress: 0,

  init() {
    this.element = $('#loadingScreen');
    this.progressBar = $('#loadingProgress');
    this.textEl = $('#loadingText');
    console.log('LoadingScreen initialized:', !!this.element);
  },

  setProgress(percent, text) {
    this.progress = percent;
    if (this.progressBar) {
      this.progressBar.style.width = `${percent}%`;
    }
    if (this.textEl && text) {
      this.textEl.textContent = text;
    }
    console.log(`Loading progress: ${percent}% - ${text}`);
  },

  hide() {
    console.log('LoadingScreen.hide() called');
    if (!this.element) {
      console.warn('LoadingScreen element not found!');
      return;
    }
    
    // Force progress to 100%
    this.setProgress(100, 'Ready!');
    
    // Immediately start fade out
    this.element.style.transition = 'opacity 0.5s ease-out';
    this.element.style.opacity = '0';
    
    // Remove from DOM after animation
    setTimeout(() => {
      if (this.element) {
        this.element.style.display = 'none';
        // Also remove it completely as backup
        this.element.remove();
        console.log('✅ LoadingScreen hidden and removed');
      }
    }, 500);
  },

  show() {
    if (!this.element) return;
    this.element.style.display = 'flex';
    this.element.style.opacity = '1';
    this.setProgress(0, 'Loading your dashboard...');
  }
};

function formatNumber(num) {
  if (typeof num !== 'number') num = Number(num) || 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatHours(minutes) {
  return (minutes / 60).toFixed(1);
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function getGreeting() {
  const greetings = {
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening'
  };
  return greetings[getTimeOfDay()];
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function getYesterdayDate() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff)).toISOString().split("T")[0];
}

function getDayName(index) {
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index];
}

/* ============================================================================
   DEFAULT STATE & SETTINGS
   ============================================================================ */

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

const defaultUserData = {
  name: 'User',
  email: '',
  photoURL: '',
  coins: 0,
  subscription: 'Free',
  totalFocusMinutes: 0,
  totalSessions: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastActiveDate: null,
  createdAt: null,
  level: 1,
  xp: 0
};

const defaultDailyStats = {
  date: getTodayDate(),
  sessionsCompleted: 0,
  focusMinutes: 0,
  tasksCompleted: 0,
  coinsEarned: 0,
  breakMinutes: 0
};

const defaultWeeklyStats = {
  weekStart: getWeekStart(),
  totalMinutes: 0,
  totalSessions: 0,
  dailyBreakdown: {}
};

// Main application state - ALL dynamic from Firebase
let state = {
  user: { ...defaultUserData },
  dailyStats: { ...defaultDailyStats },
  weeklyStats: { ...defaultWeeklyStats },
  pomSettings: { ...defaultPomSettings },
  tasks: [],
  projects: [],
  sessions: [],
  water: { cups: 0, goal: 8, lastUpdated: null },
  analytics: {
    weeklyHours: 0,
    avgSession: 0,
    completionRate: 0,
    bestStreak: 0,
    weeklyData: [0, 0, 0, 0, 0, 0, 0],
    topSubjects: []
  },
  currentTaskId: null,
  currentTaskName: null,

    aiTeacher: {
    messages: [],
    questionsToday: 0,
    questionsLimit: 20,
    selectedSubject: null,
    recentTopics: [],
    lastReset: null
  },
  
  // Referrals state
  referrals: {
    code: null,
    totalReferrals: 0,
    pendingReferrals: 0,
    coinsEarned: 0,
    history: [],
    milestones: [
      { count: 5, reward: '200 bonus coins', unlocked: false },
      { count: 10, reward: 'Free month Standard', unlocked: false },
      { count: 25, reward: 'Exclusive merch', unlocked: false },
      { count: 50, reward: 'Lifetime Premium!', unlocked: false }
    ]
  }

};

// Active listeners for cleanup
let activeListeners = [];

/* ============================================================================
   SOUND SYSTEM
   ============================================================================ */

const soundMap = {
  none: null,
  chime: 'chime.mp3',
  'kitchen-bell': 'kitchen-bell.mp3',
  'digital-clock': 'digital-clock.mp3',
  'soft-ding': 'soft-ding.mp3'
};

window.soundMap = soundMap;

const AudioManager = (() => {
  let current = null;
  let isPaused = false;
  let isUnlocked = false;

  const unlock = () => {
    if (isUnlocked) return;
    const audio = new Audio();
    audio.play().then(() => audio.pause()).catch(() => {});
    isUnlocked = true;
  };

  document.addEventListener('click', unlock, { once: true });
  document.addEventListener('touchstart', unlock, { once: true });

  return {
    play: (src, opts = {}) => {
      try {
        if (current) current.pause();
        if (!src) return null;
        current = new Audio(src);
        current.loop = !!opts.loop;
        current.volume = opts.volume ?? 1;
        isPaused = false;
        current.play().catch(e => console.warn('Audio play blocked:', e));
        return current;
      } catch (e) {
        console.warn('AudioManager.play error', e);
        return null;
      }
    },
    pause: () => {
      if (current) { current.pause(); isPaused = true; }
    },
    resume: () => {
      if (current) { current.play().catch(() => {}); isPaused = false; }
    },
    stop: () => {
      if (current) { current.pause(); current.currentTime = 0; }
      current = null;
      isPaused = false;
    },
    isPlaying: () => !!current && !isPaused
  };
})();

/* ============================================================================
   DOM ELEMENT REFERENCES
   ============================================================================ */

let pomTimerEl, pomSessionCountEl, pomTotalFocusEl;
let pomStartBtn, pomPauseBtn, pomResetBtn, pomPauseIcon;
let focusTimeInput, shortBreakInput, longBreakInput, autoStartToggle, longBreakFreq;
let soundSelect, soundFileInput, testSoundBtn, notifToggle;
let saveSettingsBtn, resetStateBtn;
let ring, circumference;

function initDOMReferences() {
  pomTimerEl = $('#pom-timer');
  pomSessionCountEl = $('#PomodoroSessionsToday');
  pomTotalFocusEl = $('#pomTotalFocus');

  pomStartBtn = $('#pomStart');
  pomPauseBtn = $('#pomPause');
  pomResetBtn = $('#pomReset');
  pomPauseIcon = $('#pomPauseIcon');

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

/* ============================================================================
   FIREBASE DOCUMENT REFERENCES
   ============================================================================ */

const userDocRef = (uid) => doc(db, 'users', uid);
const dailyStatsRef = (uid, date = getTodayDate()) => doc(db, 'users', uid, 'dailyStats', date);
const weeklyStatsRef = (uid, weekStart = getWeekStart()) => doc(db, 'users', uid, 'weeklyStats', weekStart);
const tasksColRef = (uid) => collection(db, 'users', uid, 'tasks');
const projectsColRef = (uid) => collection(db, 'users', uid, 'projects');
const sessionsColRef = (uid) => collection(db, 'users', uid, 'sessions');
// Add after existing document references (around line 220)
const aiMessagesColRef = (uid) => collection(db, 'users', uid, 'aiMessages');
const aiUsageRef = (uid, date = getTodayDate()) => doc(db, 'users', uid, 'aiUsage', date);
const referralsColRef = (uid) => collection(db, 'users', uid, 'referrals');
const referralCodesRef = () => collection(db, 'referralCodes');

/* ============================================================================
   REAL-TIME DATA LOADING & SYNCING
   ============================================================================ */

async function initializeUserDocument(uid, user) {
  try {
    const ref = userDocRef(uid);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) {
      console.log('Creating new user document...');
      const newUserData = {
        ...defaultUserData,
        name: user.displayName || 'User',
        email: user.email || '',
        photoURL: user.photoURL || '',
        createdAt: new Date().toISOString(),
        lastActiveDate: getTodayDate()
      };
      await setDoc(ref, newUserData);
      return newUserData;
    }
    
    return snap.data();
  } catch (e) {
    console.error('initializeUserDocument error:', e);
    throw e;
  }
}

async function initializeDailyStats(uid) {
  const ref = dailyStatsRef(uid);
  const snap = await getDoc(ref);
  
  if (!snap.exists()) {
    console.log('Creating daily stats document...');
    const newStats = { ...defaultDailyStats, date: getTodayDate() };
    await setDoc(ref, newStats);
    return newStats;
  }
  
  return snap.data();
}

async function initializeWeeklyStats(uid) {
  const ref = weeklyStatsRef(uid);
  const snap = await getDoc(ref);
  
  if (!snap.exists()) {
    console.log('Creating weekly stats document...');
    const newStats = { ...defaultWeeklyStats, weekStart: getWeekStart() };
    await setDoc(ref, newStats);
    return newStats;
  }
  
  return snap.data();
}

// Reset water tracker if it's a new day
async function checkAndResetWater(uid, userData) {
  const today = getTodayDate();
  if (userData.water?.lastUpdated && userData.water.lastUpdated !== today) {
    console.log('New day - resetting water tracker');
    await updateDoc(userDocRef(uid), {
      'water.cups': 0,
      'water.lastUpdated': today
    });
    return { cups: 0, goal: userData.water?.goal || 8, lastUpdated: today };
  }
  return userData.water || { cups: 0, goal: 8, lastUpdated: today };
}

// Setup all real-time listeners
function setupRealtimeListeners(uid) {
  console.log('Setting up realtime listeners for:', uid);
  
  // Clear existing listeners
  activeListeners.forEach(unsub => {
    try { unsub(); } catch (e) {}
  });
  activeListeners = [];

  // 1. User document listener (coins, streak, total stats, settings)
  const userUnsub = onSnapshot(userDocRef(uid), async (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    
    console.log('User data updated:', data.coins, 'coins');
    
    state.user = {
      uid,
      name: data.name || 'User',
      email: data.email || '',
      photoURL: data.photoURL || '',
      coins: data.coins || 0,
      subscription: data.subscription || 'Free',
      totalFocusMinutes: data.totalFocusMinutes || 0,
      totalSessions: data.totalSessions || 0,
      currentStreak: data.currentStreak || 0,
      bestStreak: data.bestStreak || 0,
      level: data.level || 1,
      xp: data.xp || 0,
      lastActiveDate: data.lastActiveDate
    };
    
    if (data.pomSettings) {
      state.pomSettings = { ...defaultPomSettings, ...data.pomSettings };
    }
    
    if (data.water) {
      state.water = await checkAndResetWater(uid, data);
    }
    
    updateAllUI();
  }, (err) => console.error('User listener error:', err));
  activeListeners.push(userUnsub);

  // 2. Daily stats listener
  const dailyUnsub = onSnapshot(dailyStatsRef(uid), (snap) => {
    console.log('Daily stats updated');
    if (!snap.exists()) {
      state.dailyStats = { ...defaultDailyStats };
    } else {
      state.dailyStats = { ...defaultDailyStats, ...snap.data() };
    }
    updateDailyStatsUI();
  }, (err) => console.error('Daily stats listener error:', err));
  activeListeners.push(dailyUnsub);

  // 3. Weekly stats listener
  const weeklyUnsub = onSnapshot(weeklyStatsRef(uid), (snap) => {
    console.log('Weekly stats updated');
    if (!snap.exists()) {
      state.weeklyStats = { ...defaultWeeklyStats };
    } else {
      state.weeklyStats = { ...defaultWeeklyStats, ...snap.data() };
    }
    updateWeeklyStatsUI();
  }, (err) => console.error('Weekly stats listener error:', err));
  activeListeners.push(weeklyUnsub);

  // 4. Tasks listener
  const tasksUnsub = onSnapshot(
    query(tasksColRef(uid), orderBy('createdAt', 'desc')),
    (snap) => {
      console.log('Tasks updated:', snap.size, 'tasks');
      state.tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderTasks();
      updateTaskCounters();
    },
    (err) => console.error('Tasks listener error:', err)
  );
  activeListeners.push(tasksUnsub);

  // 5. Projects listener
  const projectsUnsub = onSnapshot(
    query(projectsColRef(uid), orderBy('createdAt', 'desc')),
    (snap) => {
      console.log('Projects updated:', snap.size, 'projects');
      state.projects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      populateProjects();
    },
    (err) => console.error('Projects listener error:', err)
  );
  activeListeners.push(projectsUnsub);

  // 6. Recent sessions listener
  const sessionsUnsub = onSnapshot(
    query(sessionsColRef(uid), orderBy('timestamp', 'desc'), limit(20)),
    (snap) => {
      console.log('Sessions updated:', snap.size, 'sessions');
      state.sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderRecentActivity();
      renderRecentSessions();
    },
    (err) => console.error('Sessions listener error:', err)
  );
  activeListeners.push(sessionsUnsub);

  // 7. Load analytics data
  loadAnalyticsData(uid);

  // Add inside setupRealtimeListeners function, after other listeners:

// 8. Referrals listener
const referralsUnsub = onSnapshot(
  query(referralsColRef(uid), orderBy('timestamp', 'desc'), limit(20)),
  (snap) => {
    console.log('Referrals updated:', snap.size, 'referrals');
    state.referrals.history = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderReferralHistory();
  },
  (err) => console.error('Referrals listener error:', err)
);
activeListeners.push(referralsUnsub);
}

async function loadAnalyticsData(uid) {
  try {
    const today = new Date();
    const weekData = [0, 0, 0, 0, 0, 0, 0];
    let totalMinutes = 0;
    let totalSessions = 0;

    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      try {
        const snap = await getDoc(dailyStatsRef(uid, dateStr));
        if (snap.exists()) {
          const data = snap.data();
          weekData[6 - i] = data.focusMinutes || 0;
          totalMinutes += data.focusMinutes || 0;
          totalSessions += data.sessionsCompleted || 0;
        }
      } catch (e) {}
    }

    // Calculate completion rate from tasks
    const completedTasks = state.tasks.filter(t => t.completed).length;
    const totalTasks = state.tasks.length;

    state.analytics = {
      weeklyHours: Math.round(totalMinutes / 60 * 10) / 10,
      avgSession: totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      bestStreak: state.user.bestStreak || 0,
      weeklyData: weekData
    };

    updateAnalyticsUI();
    console.log('Analytics loaded:', state.analytics);
  } catch (e) {
    console.error('loadAnalyticsData error:', e);
  }
}

/* ============================================================================
   UI UPDATE FUNCTIONS - ALL DYNAMIC
   ============================================================================ */

function updateAllUI() {
  updateProfileUI();
  updateHeaderUI();
  updateOverviewStats();
  updateDailyStatsUI();
  updatePomodoroStatsUI();
  updateSettingsUI();
  populateWaterTracker();
  populateMerch();
}

function updateProfileUI() {
  // Update name, email, coins, subscription
  setText('ui-username', state.user.name || 'User');
  setText('ui-email', state.user.email || '');
  setText('ui-coins', formatNumber(state.user.coins || 0));
  setText('subStatus', state.user.subscription || 'Free');

  // === PHOTO FIX - THIS IS THE MAGIC ===
  const photoEl = $('#profilePhoto');
  if (!photoEl) return;

  // Priority order: Google Auth photo > Firestore photo > Handsome default
  let photoUrl = firebaseAuth.currentUser?.photoURL?.trim();
  
  if (!photoUrl || photoUrl === 'null' || photoUrl === '') {
    photoUrl = state.user.photoURL?.trim();
  }
  
  if (!photoUrl || photoUrl === '' || photoUrl === 'null') {
    photoUrl = 'https://i.imgur.com/7v1F8kZ.jpeg'; // cool default boy with headphones
  }

  // Apply the photo
  photoEl.style.backgroundImage = `url(${photoUrl})`;
  photoEl.style.backgroundColor = 'transparent';
  photoEl.style.backgroundSize = 'cover';
  photoEl.style.backgroundPosition = 'center';
  photoEl.removeAttribute('data-initials');

  // Optional: fallback initials if image fails to load
  const img = new Image();
  img.onload = () => { /* all good */ };
  img.onerror = () => {
    const initials = (state.user.name || 'T').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
    photoEl.style.backgroundImage = '';
    photoEl.style.backgroundColor = '#e5e7eb';
    photoEl.setAttribute('data-initials', initials);
  };
  img.src = photoUrl;
}

function updateHeaderUI() {
  // Dynamic greeting with user's name
  const greetingEl = $('h1.text-xl');
  if (greetingEl) {
    const firstName = state.user.name ? state.user.name.split(' ')[0] : '';
    greetingEl.textContent = `${getGreeting()}${firstName ? ', ' + firstName : ''}! 👋`;
  }
  
  // Streak in header
  const streakContainer = $('.px-4.py-2.rounded-lg.bg-gradient-to-r');
  if (streakContainer) {
    const streakSpan = streakContainer.querySelector('.font-bold');
    if (streakSpan) {
      streakSpan.innerHTML = `🔥 ${state.user.currentStreak || 0} days`;
    }
  }
}

function updateOverviewStats() {
  const overviewSection = $('#sect-overview');
  if (!overviewSection) return;

  // Get task counts
  const pendingCount = state.tasks.filter(t => !t.completed).length;
  const completedCount = state.tasks.filter(t => t.completed).length;

  // Update the small cards at top (pendingTasksCount, completedTasksCount)
  setText('pendingTasksCount', pendingCount);
  setText('completedTasksCount', completedCount);

  // Update the main stat cards
  const statCards = overviewSection.querySelectorAll('.glass-card.rounded-2xl.p-6.hover-lift');
  
  statCards.forEach(card => {
    const labelEl = card.querySelector('.text-sm.text-slate-500');
    const valueEl = card.querySelector('.text-3xl.font-bold');
    const badgeEl = card.querySelector('.text-xs.font-semibold');
    
    if (!labelEl || !valueEl) return;
    
    const label = labelEl.textContent.toLowerCase();
    
    // Focus Hours card
    if (label.includes('focus')) {
      const hours = formatHours(state.dailyStats.focusMinutes || 0);
      valueEl.innerHTML = `${hours}<span class="text-lg">h</span>`;
      
      const progressBar = card.querySelector('.progress-bar');
      if (progressBar) {
        const goal = 4 * 60;
        const percent = Math.min(((state.dailyStats.focusMinutes || 0) / goal) * 100, 100);
        progressBar.style.width = `${percent}%`;
      }
    }
    
    // Streak card
    if (label.includes('streak')) {
      valueEl.textContent = state.user.currentStreak || 0;
    }
    
    // Pending Tasks card - THIS IS THE FIX
    if (label.includes('pending') || label.includes('task')) {
      valueEl.textContent = pendingCount;
      
      // Update the badge that says "X Active"
      if (badgeEl) {
        badgeEl.textContent = `${pendingCount} Active`;
      }
    }
    
    // Coins card
    if (label.includes('coin')) {
      valueEl.textContent = formatNumber(state.user.coins || 0);
    }
  });
}

function updateDailyStatsUI() {
  const stats = state.dailyStats;
  
  // Sessions today
  setText('PomodoroSessionsToday', stats.sessionsCompleted || 0);
  if (pomSessionCountEl) pomSessionCountEl.textContent = stats.sessionsCompleted || 0;
  
  // Focus time today
  const focusHours = formatHours(stats.focusMinutes || 0);
  setText('pomTotalFocus', `${focusHours}h`);
  if (pomTotalFocusEl) pomTotalFocusEl.textContent = `${focusHours}h`;
  
  // Update overview
  updateOverviewStats();
  
  console.log('Daily stats UI updated:', stats.sessionsCompleted, 'sessions,', stats.focusMinutes, 'min');
}

function updateWeeklyStatsUI() {
  const stats = state.weeklyStats;
  
  // Weekly hours in analytics
  const weeklyHours = formatHours(stats.totalMinutes || 0);
  setText('weeklyHours', `${weeklyHours}h`);
  
  // Rebuild weekly data from dailyBreakdown
  if (stats.dailyBreakdown) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    state.analytics.weeklyData = days.map(day => stats.dailyBreakdown[day] || 0);
  }
  
  updateWeeklyChart();
}

function updatePomodoroStatsUI() {
  // Update all stats in Pomodoro section
  const stats = state.dailyStats;
  
  setText('PomodoroSessionsToday', stats.sessionsCompleted || 0);
  
  const focusHours = formatHours(stats.focusMinutes || 0);
  if (pomTotalFocusEl) pomTotalFocusEl.textContent = `${focusHours}h`;
  
  // Coins display in pomodoro section
  setText('ui-coins-small', `+10 coins per session`);
}

function updateWeeklyChart() {
  const chartEl = $('#chart');
  if (!chartEl) return;
  
  const data = state.analytics.weeklyData || [0, 0, 0, 0, 0, 0, 0];
  const maxVal = Math.max(...data, 60); // Minimum 1 hour for scale
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  chartEl.innerHTML = data.map((val, i) => {
    const height = Math.max((val / maxVal) * 100, 5);
    const hours = (val / 60).toFixed(1);
    const isToday = i === (new Date().getDay() + 6) % 7;
    
    return `
      <div class="flex-1 flex flex-col items-center gap-2">
        <div class="w-full bg-gradient-to-t from-[var(--primary)] to-[var(--secondary)] rounded-t-lg transition-all duration-500 cursor-pointer hover:opacity-80 ${isToday ? 'ring-2 ring-purple-300' : ''}"
             style="height: ${height}%"
             title="${hours}h on ${days[i]}">
        </div>
        <span class="text-xs ${isToday ? 'font-bold text-purple-600' : 'text-slate-500'}">${days[i]}</span>
      </div>
    `;
  }).join('');
}

function updateAnalyticsUI() {
  const a = state.analytics;
  
  // Main stats
  setText('weeklyHours', `${a.weeklyHours}h`);
  setText('avgSession', `${a.avgSession}m`);
  setText('completionRate', `${a.completionRate}%`);
  setText('bestStreak', `${state.user.bestStreak || 0}d`);
  
  // Update chart
  updateWeeklyChart();
  
  // Update progress bar for focus vs break
  const totalFocus = state.weeklyStats.totalMinutes || 0;
  const totalBreak = Math.round(totalFocus * 0.2); // Estimate breaks
  const focusPercent = totalFocus + totalBreak > 0 
    ? Math.round((totalFocus / (totalFocus + totalBreak)) * 100) 
    : 70;
  
  const progressEl = $('.bg-gradient-to-r.from-\\[var\\(--primary\\)\\]');
  if (progressEl) {
    progressEl.style.width = `${focusPercent}%`;
  }
  
  // Update distribution text
  const distText = $all('.text-xs.text-slate-500').find(el => el.textContent.includes('focus'));
  if (distText) {
    distText.textContent = `${focusPercent}% focus • ${100 - focusPercent}% breaks`;
  }

  // Top subjects (from sessions)
  updateTopSubjects();
}

function updateTopSubjects() {
  const subjectMinutes = {};
  
  state.sessions.forEach(s => {
    if (s.type === 'focus' && s.taskName) {
      const subject = s.taskName.split(':')[0].trim();
      subjectMinutes[subject] = (subjectMinutes[subject] || 0) + (s.minutes || 0);
    }
  });
  
  const sorted = Object.entries(subjectMinutes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  const subjectsList = $('#sect-analytics ul.space-y-2');
  if (subjectsList && sorted.length > 0) {
    subjectsList.innerHTML = sorted.map(([name, mins]) => 
      `<li>• ${escapeHtml(name)} — ${formatHours(mins)}h</li>`
    ).join('');
  }
}

function updateSettingsUI() {
  if (focusTimeInput && !focusTimeInput.matches(':focus')) 
    focusTimeInput.value = state.pomSettings.focus || 25;
  if (shortBreakInput && !shortBreakInput.matches(':focus')) 
    shortBreakInput.value = state.pomSettings.short || 5;
  if (longBreakInput && !longBreakInput.matches(':focus')) 
    longBreakInput.value = state.pomSettings.long || 15;
  if (soundSelect && !soundSelect.matches(':focus')) 
    soundSelect.value = state.pomSettings.soundType || 'chime';
  if (autoStartToggle) 
    autoStartToggle.checked = state.pomSettings.autoStart || false;
  if (longBreakFreq && !longBreakFreq.matches(':focus')) 
    longBreakFreq.value = state.pomSettings.sessionsBeforeLong || 4;
}

/* ============================================================================
   RECENT ACTIVITY & SESSIONS
   ============================================================================ */

function renderRecentActivity() {
  const container = $('#sect-overview .lg\\:col-span-2 .space-y-4');
  if (!container) return;
  
  if (state.sessions.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-slate-400">
        <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p>No recent activity</p>
        <p class="text-sm mt-1">Start a focus session to see your activity here!</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = state.sessions.slice(0, 5).map(session => {
    const date = new Date(session.timestamp);
    const isToday = date.toDateString() === new Date().toDateString();
    const timeStr = isToday 
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    
    const isFocus = session.type === 'focus';
    const bgClass = isFocus 
      ? 'from-green-50 to-emerald-50 border-green-100' 
      : 'from-blue-50 to-cyan-50 border-blue-100';
    const iconBg = isFocus ? 'bg-green-500' : 'bg-blue-500';
    const icon = isFocus 
      ? '<path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
      : '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    
    return `
      <div class="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r ${bgClass} border transition-all hover:shadow-md">
        <div class="p-2 rounded-lg ${iconBg} text-white">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none">${icon}</svg>
        </div>
        <div class="flex-1">
          <div class="font-semibold text-slate-800">${isFocus ? 'Focus Session' : 'Break'} Completed</div>
          <div class="text-sm text-slate-500">${session.minutes} minutes${session.taskName ? ' • ' + escapeHtml(session.taskName) : ''}</div>
        </div>
        <div class="text-sm ${isFocus ? 'font-medium text-green-600' : 'text-slate-400'}">
          ${isFocus ? `+${session.coinsEarned || 10} coins` : timeStr}
        </div>
      </div>
    `;
  }).join('');
}

function renderRecentSessions() {
  const wrap = $('#recentSessionsList');
  if (!wrap) return;
  
  if (state.sessions.length === 0) {
    wrap.innerHTML = `
      <div class="text-center text-slate-400 text-sm py-4">
        No sessions yet. Complete your first focus session!
      </div>
    `;
    return;
  }
  
  wrap.innerHTML = state.sessions.slice(0, 5).map(session => {
    const date = new Date(session.timestamp);
    const isToday = date.toDateString() === new Date().toDateString();
    const isYesterday = date.toDateString() === new Date(Date.now() - 86400000).toDateString();
    
    let timeStr;
    if (isToday) {
      timeStr = `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (isYesterday) {
      timeStr = 'Yesterday';
    } else {
      timeStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    const dotColor = session.type === 'focus' ? 'bg-green-500' : 'bg-blue-500';
    const typeLabel = session.type === 'focus' ? 'Focus' : 'Break';
    
    return `
      <div class="flex items-center justify-between text-sm py-2 px-2 rounded-lg hover:bg-slate-50 transition">
        <div class="flex items-center gap-3">
          <div class="w-2 h-2 rounded-full ${dotColor}"></div>
          <span class="text-slate-700 font-medium">${typeLabel} — ${session.minutes}m</span>
          ${session.taskName ? `<span class="text-xs text-slate-400 truncate max-w-[120px]">• ${escapeHtml(session.taskName)}</span>` : ''}
        </div>
        <span class="text-slate-400 text-xs">${timeStr}</span>
      </div>
    `;
  }).join('');
}

/* ============================================================================
   TASKS SYSTEM - FULLY DYNAMIC
   ============================================================================ */

function renderTasks() {
  const box = $("#tasksList");
  if (!box) return;
  
  const pendingTasks = state.tasks.filter(t => !t.completed);
  
  if (pendingTasks.length === 0) {
    box.innerHTML = `
      <div class="text-center py-8 text-slate-400">
        <svg class="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <p>No tasks yet</p>
        <p class="text-sm mt-1">Add a task above to get started!</p>
      </div>
    `;
    return;
  }
  
  box.innerHTML = pendingTasks.map(t => {
    const isActive = t.id === state.currentTaskId;
    return `
      <div id="task-${t.id}" 
           class="flex justify-between items-center p-3 rounded-lg transition-all cursor-pointer
                  ${isActive ? 'bg-purple-100 border-2 border-purple-300' : 'bg-slate-100 hover:bg-slate-200'}">
        <div class="flex flex-col flex-1 taskFocusTarget" data-id="${t.id}">
          <div class="font-medium text-slate-800 ${isActive ? 'text-purple-700' : ''}">${escapeHtml(t.text)}</div>
          <div class="text-xs text-slate-500">
            ${t.timeSpent || 0} min spent
            ${isActive ? '<span class="ml-2 text-purple-600 font-medium">• Currently focusing</span>' : ''}
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button data-id="${t.id}" 
                  class="completeTaskBtn text-sm px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
            ✓
          </button>
          <button data-id="${t.id}" 
                  class="deleteTaskBtn text-sm px-2 py-1 text-slate-400 hover:text-red-500 transition">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function updateTaskCounters() {
  const pending = state.tasks.filter(t => !t.completed).length;
  const completed = state.tasks.filter(t => t.completed).length;
  
  setText("pendingTasksCount", pending);
  setText("completedTasksCount", completed);
}

async function addTask(text) {
  const user = auth.currentUser;
  if (!user) return toast('Login required');
  if (!text.trim()) return toast('Task cannot be empty');

  try {
    await addDoc(tasksColRef(user.uid), {
      text: text.trim(),
      completed: false,
      timeSpent: 0,
      createdAt: Date.now()
    });
    toast('✅ Task added!');
  } catch (e) {
    console.error('addTask error:', e);
    toast('Failed to add task');
  }
}

async function completeTask(taskId) {
  const user = auth.currentUser;
  if (!user) return;

  // Find the task before deleting
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  // Confetti celebration
  if (window.confetti) {
    confetti({ 
      particleCount: 100, 
      spread: 70, 
      origin: { y: 0.6 },
      colors: ['#7259ec', '#c666f7', '#06b6d4']
    });
  }

  // Slide out animation
  const el = $(`#task-${taskId}`);
  if (el) {
    el.style.transition = "all 0.4s ease-out";
    el.style.opacity = "0";
    el.style.transform = "translateX(50px)";
  }

  try {
    const batch = writeBatch(db);
    const coinsAwarded = 5;
    
    // Mark task complete
    batch.update(doc(db, "users", user.uid, "tasks", taskId), {
      completed: true,
      completedAt: Date.now()
    });

    // Update daily stats
    batch.set(dailyStatsRef(user.uid), {
      tasksCompleted: increment(1),
      coinsEarned: increment(coinsAwarded)
    }, { merge: true });

    // Award coins
    batch.update(userDocRef(user.uid), {
      coins: increment(coinsAwarded)
    });

    // ✅ ADD TO SESSIONS/ACTIVITY LOG - This makes it show in Recent Activity!
    const activityRef = doc(sessionsColRef(user.uid));
    batch.set(activityRef, {
      type: 'task_complete',
      taskId: taskId,
      taskName: task.text,
      coinsEarned: coinsAwarded,
      timestamp: Date.now()
    });

    await batch.commit();
    
    // Clear current task if it was completed
    if (state.currentTaskId === taskId) {
      state.currentTaskId = null;
      state.currentTaskName = null;
      localStorage.removeItem('currentPomTaskId');
      setText('currentPomTask', 'None');
    }
    
    toast(`🎉 Task completed! +${coinsAwarded} coins`);
  } catch (e) {
    console.error('completeTask error:', e);
    toast('Failed to complete task');
  }
}

async function deleteTask(taskId) {
  const user = auth.currentUser;
  if (!user) return;

  const el = $(`#task-${taskId}`);
  if (el) {
    el.style.transition = "all 0.3s ease-out";
    el.style.opacity = "0";
    el.style.transform = "scale(0.9)";
  }

  try {
    await deleteDoc(doc(db, "users", user.uid, "tasks", taskId));
    
    if (state.currentTaskId === taskId) {
      state.currentTaskId = null;
      state.currentTaskName = null;
      localStorage.removeItem('currentPomTaskId');
      setText('currentPomTask', 'None');
    }
    
    toast('Task deleted');
  } catch (e) {
    console.error('deleteTask error:', e);
    toast('Failed to delete task');
  }
}

async function incrementTaskTime(taskId, minutes = 1) {
  const user = auth.currentUser;
  if (!user || !taskId) return;

  try {
    await updateDoc(doc(db, "users", user.uid, "tasks", taskId), {
      timeSpent: increment(minutes)
    });
  } catch (e) {
    console.warn('incrementTaskTime error:', e);
  }
}

function setCurrentTask(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  
  state.currentTaskId = taskId;
  state.currentTaskName = task.text;
  localStorage.setItem('currentPomTaskId', taskId);
  
  setText('currentPomTask', task.text);
  renderTasks(); // Re-render to show active state
  
  toast(`Now focusing on: ${task.text}`);
}

/* ============================================================================
   POMODORO ENGINE - FULLY DYNAMIC
   ============================================================================ */

let pomTimerId = null;
let pomTotalSeconds = 0;

const pomState = {
  mode: 'focus',
  remaining: 0,
  running: false,
  paused: false,
  consecutiveSessions: 0
};

function initRing() {
  ring = $('#pomProgressRing');
  if (!ring) {
    console.warn('Ring element not found');
    return;
  }
  const radius = 140;
  circumference = 2 * Math.PI * radius;
  ring.style.strokeDasharray = `${circumference}`;
  ring.style.strokeDashoffset = '0';
  console.log('Ring initialized');
}

function setRingProgress(percentage) {
  if (!ring || !circumference) return;
  const offset = circumference - (percentage * circumference);
  ring.style.strokeDashoffset = offset;
}

function updatePomTimerDisplay() {
  if (!pomTimerEl) return;
  const mins = Math.floor(pomState.remaining / 60);
  const secs = pomState.remaining % 60;
  pomTimerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function setPomMode(mode) {
  pomState.mode = mode;
  const mins = mode === 'focus' ? state.pomSettings.focus : 
               mode === 'short' ? state.pomSettings.short : 
               state.pomSettings.long;
  pomState.remaining = Math.max(1, Number(mins)) * 60;
  pomTotalSeconds = pomState.remaining;
  
  setRingProgress(1);
  updatePomTimerDisplay();
  
  // Update mode label
  const modeLabel = pomTimerEl?.parentElement?.querySelector('.text-slate-500');
  if (modeLabel) {
    modeLabel.textContent = mode === 'focus' ? 'Focus Time' : 
                            mode === 'short' ? 'Short Break' : 'Long Break';
  }
  
  // Update mode button styles
  $all('.pom-mode').forEach(btn => {
    const isActive = btn.dataset.mode === mode;
    btn.className = `pom-mode px-6 py-3 rounded-xl font-semibold transition-all ${
      isActive 
        ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white shadow-lg'
        : 'bg-white border-2 border-slate-200 hover:border-[var(--primary)]'
    }`;
  });
  
  console.log(`Pomodoro mode set to: ${mode} (${mins} min)`);
}

function startPom() {
  if (pomState.running) return;
  
  pomState.running = true;
  pomState.paused = false;
  pomTimerId = setInterval(pomTick, 1000);
  
  if (pomStartBtn) pomStartBtn.textContent = 'Running...';
  if (pomPauseBtn) pomPauseBtn.disabled = false;
  if (pomPauseIcon) pomPauseIcon.innerHTML = `<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>`;
  
  toast(`${pomState.mode === 'focus' ? '🎯 Focus' : '☕ Break'} session started!`);
  console.log('Pomodoro started');
}

function pomTick() {
  if (!pomState.running || pomState.paused) return;

  if (pomState.remaining <= 0) {
    stopPomInternal();
    handleSessionComplete();
    return;
  }

  pomState.remaining--;
  updatePomTimerDisplay();

  // Update ring progress
  const percent = pomState.remaining / pomTotalSeconds;
  setRingProgress(percent);

  // 30-second warning notification
  if (pomState.remaining === 30 && state.pomSettings.notifications) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("⏳ 30 seconds left!", {
        body: `Your ${pomState.mode} session is about to end.`,
        icon: state.user.photoURL || "/logo.png",
        silent: false
      });
    }
    AudioManager.play("soft-ding.mp3", { volume: 0.5 });
  }

  // Track task time every minute during focus
  if (pomState.mode === "focus" && state.currentTaskId && pomState.remaining % 60 === 0) {
    incrementTaskTime(state.currentTaskId, 1);
  }
}

function stopPomInternal() {
  if (pomTimerId) {
    clearInterval(pomTimerId);
    pomTimerId = null;
  }
  pomState.running = false;
}

function togglePausePom() {
  if (!pomState.running && !pomState.paused) {
    // Start fresh
    startPom();
    return;
  }
  
  if (pomState.paused) {
    // Resume
    pomState.paused = false;
    pomState.running = true;
    pomTimerId = setInterval(pomTick, 1000);
    if (pomStartBtn) pomStartBtn.textContent = 'Running...';
    if (pomPauseIcon) pomPauseIcon.innerHTML = `<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>`;
    toast('▶️ Resumed');
  } else {
    // Pause
    stopPomInternal();
    pomState.paused = true;
    if (pomStartBtn) pomStartBtn.textContent = 'Resume';
    if (pomPauseIcon) pomPauseIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
    toast('⏸️ Paused');
  }
}

function resetPom() {
  stopPomInternal();
  pomState.paused = false;
  setPomMode(pomState.mode);
  
  if (pomStartBtn) pomStartBtn.textContent = 'Start Session';
  if (pomPauseBtn) pomPauseBtn.disabled = true;
  if (pomPauseIcon) pomPauseIcon.innerHTML = `<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>`;
  
  setRingProgress(1);
  toast('🔄 Timer reset');
}

async function handleSessionComplete() {
  console.log('Session complete! Mode:', pomState.mode);
  
  const isFocus = pomState.mode === 'focus';
  const user = auth.currentUser;
  
  // Play completion sound
  const soundFile = soundMap[state.pomSettings.soundType] || 'chime.mp3';
  AudioManager.play(soundFile, { volume: 1 });
  
  // Browser notification
  if (state.pomSettings.notifications && "Notification" in window && Notification.permission === "granted") {
    new Notification(isFocus ? "🎉 Focus Session Complete!" : "☕ Break Over!", {
      body: isFocus ? "Great work! Take a short break." : "Ready to focus again?",
      icon: state.user.photoURL || "/logo.png"
    });
  }
  
  if (!user) {
    toast('Session complete! (Login to save progress)');
    setPomMode(isFocus ? 'short' : 'focus');
    if (pomStartBtn) pomStartBtn.textContent = 'Start Session';
    return;
  }

  try {
    const mins = isFocus ? state.pomSettings.focus : 
                 pomState.mode === 'short' ? state.pomSettings.short : 
                 state.pomSettings.long;
    
    const coinsEarned = isFocus ? 10 : 0;
    const batch = writeBatch(db);
    const today = getTodayDate();
    const dayOfWeek = getDayName((new Date().getDay() + 6) % 7);

    // 1. Add session to history
    const sessionRef = doc(sessionsColRef(user.uid));
    batch.set(sessionRef, {
      type: pomState.mode,
      minutes: mins,
      timestamp: Date.now(),
      taskId: state.currentTaskId || null,
      taskName: state.currentTaskName || null,
      coinsEarned
    });

    if (isFocus) {
      // 2. Update daily stats
      batch.set(dailyStatsRef(user.uid), {
        date: today,
        sessionsCompleted: increment(1),
        focusMinutes: increment(mins),
        coinsEarned: increment(coinsEarned)
      }, { merge: true });

      // 3. Update weekly stats
      batch.set(weeklyStatsRef(user.uid), {
        weekStart: getWeekStart(),
        totalMinutes: increment(mins),
        totalSessions: increment(1),
        [`dailyBreakdown.${dayOfWeek}`]: increment(mins)
      }, { merge: true });

      // 4. Update user totals
      batch.update(userDocRef(user.uid), {
        coins: increment(coinsEarned),
        totalFocusMinutes: increment(mins),
        totalSessions: increment(1),
        lastActiveDate: today
      });

      pomState.consecutiveSessions++;
      
      // 5. Update streak
      await updateStreak(user.uid);
    } else {
      // Break session stats
      batch.set(dailyStatsRef(user.uid), {
        breakMinutes: increment(mins)
      }, { merge: true });
    }

    await batch.commit();
    console.log('Session saved to Firestore');

    // Confetti for focus sessions
    if (isFocus && window.confetti) {
      confetti({ 
        particleCount: 150, 
        spread: 80, 
        origin: { y: 0.6 },
        colors: ['#7259ec', '#c666f7', '#06b6d4', '#10b981']
      });
    }

    // Determine next mode
    let nextMode = 'focus';
    if (isFocus) {
      const sessionsBeforeLong = state.pomSettings.sessionsBeforeLong || 4;
      if (pomState.consecutiveSessions >= sessionsBeforeLong) {
        nextMode = 'long';
        pomState.consecutiveSessions = 0;
        toast(`🎉 Great work! +${coinsEarned} coins. Time for a long break!`);
      } else {
        nextMode = 'short';
        toast(`🎉 Session complete! +${coinsEarned} coins`);
      }
    } else {
      toast('✅ Break over! Ready to focus.');
    }

    setPomMode(nextMode);

    // Auto-start if enabled
    if (state.pomSettings.autoStart) {
      setTimeout(() => {
        toast('Auto-starting next session...');
        startPom();
      }, 3000);
    }

  } catch (e) {
    console.error('handleSessionComplete error:', e);
    toast('Session complete (save error)');
  }

  if (pomStartBtn) pomStartBtn.textContent = 'Start Session';
  if (pomPauseBtn) pomPauseBtn.disabled = true;
}

async function updateStreak(uid) {
  try {
    const userSnap = await getDoc(userDocRef(uid));
    if (!userSnap.exists()) return;
    
    const userData = userSnap.data();
    const lastActive = userData.lastActiveDate;
    const today = getTodayDate();
    const yesterday = getYesterdayDate();
    
    let newStreak = userData.currentStreak || 0;
    
    if (lastActive === yesterday) {
      // Continuing streak
      newStreak++;
    } else if (lastActive !== today) {
      // Streak broken or first day
      newStreak = 1;
    }
    
    const bestStreak = Math.max(newStreak, userData.bestStreak || 0);
    
    await updateDoc(userDocRef(uid), {
      currentStreak: newStreak,
      bestStreak: bestStreak
    });
    
    console.log(`Streak updated: ${newStreak} days (best: ${bestStreak})`);
    
    // Achievement for streak milestones
    if (newStreak === 7 || newStreak === 30 || newStreak === 100) {
      toast(`🏆 ${newStreak}-day streak achievement!`);
      if (window.confetti) {
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
      }
    }
  } catch (e) {
    console.error('updateStreak error:', e);
  }
}

function initPomodoroControls() {
  initRing();
  setPomMode('focus');
  
  pomStartBtn?.addEventListener('click', startPom);
  pomPauseBtn?.addEventListener('click', togglePausePom);
  pomResetBtn?.addEventListener('click', resetPom);
  
  // Mode switchers
  $all('.pom-mode').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      if (mode && !pomState.running) {
        setPomMode(mode);
      } else if (pomState.running) {
        toast('Stop the timer first to change mode');
      }
    });
  });
  
  // Restore current task from localStorage
  const savedTaskId = localStorage.getItem('currentPomTaskId');
  if (savedTaskId) {
    state.currentTaskId = savedTaskId;
    setTimeout(() => {
      const task = state.tasks.find(t => t.id === savedTaskId);
      if (task) {
        state.currentTaskName = task.text;
        setText('currentPomTask', task.text);
        renderTasks();
      }
    }, 1000);
  }
}

/* ============================================================================
   PROJECTS - FULLY DYNAMIC
   ============================================================================ */

function populateProjects() {
  const wrap = $('#projectsList');
  if (!wrap) return;
  
  if (state.projects.length === 0) {
    wrap.innerHTML = `
      <div class="col-span-full glass-card rounded-2xl p-12 text-center">
        <svg class="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <h3 class="text-xl font-semibold text-slate-600 mb-2">No projects yet</h3>
        <p class="text-slate-400 mb-4">Create your first project to organize your study tasks</p>
      </div>
    `;
    return;
  }
  
  const statusColors = {
    'Pending': 'text-slate-500 bg-slate-100',
    'In Progress': 'text-green-600 bg-green-100',
    'Completed': 'text-blue-600 bg-blue-100',
    'On Hold': 'text-yellow-600 bg-yellow-100'
  };
  
  wrap.innerHTML = state.projects.map(p => {
    const statusClass = statusColors[p.status] || statusColors['Pending'];
    return `
      <div class="glass-card rounded-2xl p-6 hover-lift transition-all" data-id="${p.id}">
        <div class="flex items-start justify-between mb-4">
          <h3 class="text-xl font-bold text-slate-800">${escapeHtml(p.title || 'Untitled')}</h3>
          <button class="deleteProjectBtn p-1 text-slate-400 hover:text-red-500 transition" data-id="${p.id}" title="Delete project">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
        <p class="text-sm text-slate-500 mb-4 line-clamp-2">${escapeHtml(p.desc || 'No description')}</p>
        <div class="flex justify-between items-center text-sm mb-3">
          <span class="text-slate-600">${p.tasksCount || 0} tasks</span>
          <span class="px-2 py-1 rounded-full text-xs font-medium ${statusClass}">
            ${escapeHtml(p.status || 'Pending')}
          </span>
        </div>
        <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div class="progress-bar h-full transition-all duration-500" style="width:${Number(p.progress || 0)}%"></div>
        </div>
        <div class="text-xs text-slate-400 mt-2 text-right">${p.progress || 0}% complete</div>
      </div>
    `;
  }).join('');
}

async function createProject() {
  const user = auth.currentUser;
  if (!user) return toast('Login required');

  const title = prompt('Project title:');
  if (!title?.trim()) return;
  
  const desc = prompt('Description (optional):') || '';

  try {
    await addDoc(projectsColRef(user.uid), {
      title: title.trim(),
      desc: desc.trim(),
      tasksCount: 0,
      progress: 0,
      status: 'Pending',
      createdAt: new Date().toISOString()
    });
    toast('📁 Project created!');
  } catch (e) {
    console.error('createProject error:', e);
    toast('Failed to create project');
  }
}

async function deleteProject(projectId) {
  const user = auth.currentUser;
  if (!user) return;
  
  if (!confirm('Delete this project?')) return;

  try {
    await deleteDoc(doc(db, 'users', user.uid, 'projects', projectId));
    toast('Project deleted');
  } catch (e) {
    console.error('deleteProject error:', e);
    toast('Failed to delete project');
  }
}

/* ============================================================================
   LEADERBOARD - FULLY DYNAMIC
   ============================================================================ */

async function populateLeaderboard() {
  const table = $('#leaderboardTable');
  if (!table) return;

  table.innerHTML = `
    <tr>
      <td colspan="5" class="text-center py-8">
        <div class="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
        <p class="text-slate-400 mt-2">Loading leaderboard...</p>
      </td>
    </tr>
  `;

  try {
    // Changed from totalFocusMinutes to totalFocusHours
    const q = query(
      collection(db, 'users'), 
      orderBy('totalFocusHours', 'desc'), 
      limit(50)
    );
    const snaps = await getDocs(q);
    
    console.log('Leaderboard users found:', snaps.size); // Debug log
    
    if (snaps.empty) {
      table.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-8 text-slate-400">No users on leaderboard yet</td>
        </tr>
      `;
      return;
    }

    let rank = 1;
    const currentUid = auth.currentUser?.uid;
    let userRank = null;

    const rows = snaps.docs.map(docSnap => {
      const d = docSnap.data();
      const isCurrentUser = docSnap.id === currentUid;
      if (isCurrentUser) userRank = rank;
      
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
      const rowClass = isCurrentUser ? 'bg-purple-50' : 'hover:bg-slate-50';
      
      // Use totalFocusHours instead of totalFocusMinutes
      const hours = (d.totalFocusHours || 0).toFixed(1);
      
      const subBadge = d.subscription === 'Premium' 
        ? '<span class="ml-1 text-xs">👑</span>' 
        : d.subscription === 'Standard' 
        ? '<span class="ml-1 text-xs">⭐</span>' 
        : '';
      
      return `
  <tr class="${rowClass} transition hover:bg-purple-50/50">
    <td class="py-3 px-3 font-medium">${medal} ${rank++}</td>
    
    <td class="py-3 px-3">
      <div class="flex items-center gap-2">
        <span class="font-semibold ${isCurrentUser ? 'text-purple-600' : 'text-slate-800'}">
          ${escapeHtml(d.name || 'Anonymous')}
        </span>
        
        ${subBadge}
        
        ${isCurrentUser ? `
          <span class="px-2.5 py-0.5 text-xs font-bold text-purple-700 bg-purple-100 rounded-full animate-pulse">
            You
          </span>
        ` : ''}
      </div>
    </td>
    
    <td class="py-3 px-3">
      <span class="px-2 py-1 rounded-full text-xs font-medium ${
        d.subscription === 'Premium' ? 'bg-yellow-100 text-yellow-700' :
        d.subscription === 'Standard' ? 'bg-purple-100 text-purple-700' :
        'bg-slate-100 text-slate-600'
      }">
        ${escapeHtml(d.subscription || 'Free')}
      </span>
    </td>
    
    <td class="py-3 px-3 font-medium">${hours}h</td>
    
    <td class="py-3 px-3">
      <span class="text-yellow-600">🪙</span> ${formatNumber(d.coins || 0)}
    </td>
  </tr>
`;
    }).join('');

    table.innerHTML = rows;
    setText('userRank', userRank ? `#${userRank}` : '#--');
    
  } catch (e) {
    console.error('populateLeaderboard error:', e);
    table.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-8 text-red-400">Failed to load leaderboard</td>
      </tr>
    `;
  }
}

/* ============================================================================
   MERCH STORE - FULLY DYNAMIC
   ============================================================================ */

const merchItems = [
  { id: 'diary', name: "Study Diary", price: 8000, emoji: "📔", desc: "Premium study planner" },
  { id: 'hoodie', name: "Timora Hoodie", price: 12000, emoji: "🧥", desc: "Comfortable & stylish" },
  { id: 'bottle', name: "Water Bottle", price: 5000, emoji: "🍶", desc: "Stay hydrated!" },
  { id: 'stickers', name: "Sticker Pack", price: 2000, emoji: "🎨", desc: "Motivational stickers" },
  { id: 'mousepad', name: "Mousepad", price: 3500, emoji: "🖱️", desc: "Ergonomic design" },
  { id: 'notebook', name: "Notebook Set", price: 4500, emoji: "📚", desc: "3 premium notebooks" }
];

function populateMerch() {
  const grid = $('#merchGrid');
  if (!grid) return;

  grid.innerHTML = merchItems.map(m => {
    const canAfford = (state.user.coins || 0) >= m.price;
    return `
      <div class="glass-card rounded-2xl p-6 text-center hover-lift transition-all ${!canAfford ? 'opacity-70' : ''}">
        <div class="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center text-5xl">
          ${m.emoji}
        </div>
        <h4 class="font-bold text-lg mb-1">${escapeHtml(m.name)}</h4>
        <p class="text-sm text-slate-500 mb-2">${m.desc}</p>
        <p class="text-slate-700 font-semibold mb-3">
          <span class="text-yellow-500">🪙</span> ${formatNumber(m.price)}
        </p>
        <button 
          class="buyMerchBtn w-full py-2.5 rounded-xl font-medium transition-all ${
            canAfford 
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:scale-105' 
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }"
          data-id="${m.id}"
          data-price="${m.price}" 
          data-name="${escapeHtml(m.name)}"
          ${!canAfford ? 'disabled' : ''}
        >
          ${canAfford ? 'Redeem' : `Need ${formatNumber(m.price - (state.user.coins || 0))} more`}
        </button>
      </div>
    `;
  }).join('');
}

async function redeemMerch(itemId, price, name) {
  const user = auth.currentUser;
  if (!user) return toast('Login required');
  
  if ((state.user.coins || 0) < price) {
    return toast('Not enough coins!');
  }

  if (!confirm(`Redeem ${name} for ${formatNumber(price)} coins?`)) return;

  try {
    const batch = writeBatch(db);
    
    // Deduct coins
    batch.update(userDocRef(user.uid), {
      coins: increment(-price)
    });

    // Log redemption
    batch.set(doc(collection(db, 'users', user.uid, 'redemptions')), {
      itemId,
      itemName: name,
      price,
      redeemedAt: new Date().toISOString()
    });

    await batch.commit();
    
    // Celebration
    if (window.confetti) {
      confetti({ particleCount: 100, spread: 60, origin: { y: 0.7 } });
    }
    
    toast(`🎉 Redeemed ${name}!`);
    
    // Show order modal
    const modal = $('#orderModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

  } catch (e) {
    console.error('redeemMerch error:', e);
    toast('Redemption failed');
  }
}

/* ============================================================================
   WATER TRACKER - FULLY DYNAMIC
   ============================================================================ */

function populateWaterTracker() {
  const cups = $all('.cup');
  const filledCount = state.water.cups || 0;
  const goal = state.water.goal || 8;
  
  cups.forEach((cup, i) => {
    const filled = i < filledCount;
    cup.style.background = filled 
      ? "linear-gradient(180deg, rgba(59, 130, 246, 0.4), rgba(6, 182, 212, 0.3))" 
      : "";
    cup.style.borderColor = filled ? '#3b82f6' : '';
    cup.style.transform = filled ? 'scale(1.05)' : '';
  });
  
  const progressText = $('#waterProgressText');
  if (progressText) {
    if (filledCount >= goal) {
      progressText.innerHTML = `🎉 Goal reached! <span class="font-bold text-green-600">${filledCount}/${goal}</span> cups`;
    } else {
      progressText.textContent = `${filledCount}/${goal} cups completed`;
    }
  }
  
  const goalDisplay = $('#waterGoal');
  if (goalDisplay) {
    goalDisplay.textContent = `${Math.round((goal * 250) / 1000)}L`;
  }
}

async function updateWaterCups(cups) {
  const user = auth.currentUser;
  if (!user) return toast('Login required');

  const previousCups = state.water.cups || 0;
  const goal = state.water.goal || 8;
  state.water.cups = cups;
  populateWaterTracker();

  try {
    const updates = {
      'water.cups': cups,
      'water.lastUpdated': getTodayDate()
    };
    
    // Award coins for completing goal (only once per day)
    if (cups >= goal && previousCups < goal) {
      updates.coins = increment(5);
      toast('💧 Hydration goal reached! +5 coins');
      if (window.confetti) {
        confetti({ particleCount: 50, spread: 40, origin: { y: 0.8 } });
      }
    }
    
    await updateDoc(userDocRef(user.uid), updates);
  } catch (e) {
    console.error('updateWaterCups error:', e);
    state.water.cups = previousCups;
    populateWaterTracker();
  }
}

function initWaterTracker() {
  $all('.cup').forEach((cup, i) => {
    cup.addEventListener('click', () => {
      // Toggle: if clicking filled cup, unfill from that point
      const newCups = (state.water.cups === i + 1) ? i : i + 1;
      updateWaterCups(newCups);
    });
  });
}

/* ============================================================================
   SUBSCRIPTIONS - FULLY DYNAMIC
   ============================================================================ */

async function subscribeToPlan(plan) {
  const user = auth.currentUser;
  if (!user) return toast('Login required');

  const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
  
  if (plan === 'free') {
    toast('You are on the Free plan');
    return;
  }

  // In production, this would redirect to payment
  if (!confirm(`Subscribe to ${planName} plan?`)) return;

  try {
    await updateDoc(userDocRef(user.uid), {
      subscription: planName,
      subscriptionUpdatedAt: new Date().toISOString()
    });
    
    toast(`🎉 Subscribed to ${planName}!`);
    
    if (window.confetti) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  } catch (e) {
    console.error('subscribeToPlan error:', e);
    toast('Subscription failed');
  }
}

function initSubscriptions() {
  $all('.subscribeBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const plan = btn.dataset.plan;
      if (plan) subscribeToPlan(plan);
    });
  });
}

/* ============================================================================
   AI PLANNER - FULLY DYNAMIC
   ============================================================================ */

let generatedPlan = null;
let currentPlanDay = 0;

function renderPlanDay(dayIndex) {
  if (!generatedPlan || !generatedPlan.days[dayIndex]) return;

  const day = generatedPlan.days[dayIndex];
  const container = $('#timetable');
  if (!container) return;

  setText('plannerDayLabel', day.day);
  currentPlanDay = dayIndex;

  const gradients = [
    'from-purple-500 to-pink-500',
    'from-blue-500 to-cyan-500',
    'from-green-500 to-emerald-500',
    'from-orange-500 to-red-500',
    'from-indigo-500 to-purple-500',
    'from-teal-500 to-green-500'
  ];

  container.innerHTML = day.slots.map((slot, i) => {
    const isBreak = slot.subject.toLowerCase().includes('break') || 
                   slot.topic?.toLowerCase().includes('break') ||
                   slot.subject.toLowerCase().includes('lunch') ||
                   slot.subject.toLowerCase().includes('rest');
    
    const gradient = isBreak ? 'from-yellow-500 to-orange-500' : gradients[i % gradients.length];
    
    return `
      <div class="p-6 rounded-2xl bg-gradient-to-br ${gradient} text-white hover-lift shadow-lg transition-all">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-semibold bg-white/20 px-3 py-1 rounded-full">${escapeHtml(slot.time)}</span>
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h4 class="text-xl font-bold mb-2">${escapeHtml(slot.subject)}</h4>
        <p class="text-sm opacity-90 mb-4">${escapeHtml(slot.topic || '')}</p>
        ${!isBreak ? `
          <button class="importTaskBtn w-full py-2 rounded-lg bg-white/20 hover:bg-white/30 font-medium transition-all"
                  data-subject="${escapeHtml(slot.subject)}" 
                  data-topic="${escapeHtml(slot.topic || '')}"
                  data-time="${escapeHtml(slot.time)}">
            Add to Tasks →
          </button>
        ` : `
          <div class="w-full py-2 rounded-lg bg-white/10 font-medium text-center opacity-70">
            Break Time 🧘
          </div>
        `}
      </div>
    `;
  }).join('');
}

function generateLocalPlan(subjects, hoursPerDay, days, goal) {
  const plan = { 
    meta: { subjects, hoursPerDay, days, goal }, 
    days: [] 
  };
  
  const topics = {
    'Math': ['Calculus', 'Algebra', 'Trigonometry', 'Statistics', 'Geometry', 'Number Theory'],
    'Physics': ['Mechanics', 'Thermodynamics', 'Electromagnetism', 'Optics', 'Waves', 'Modern Physics'],
    'Chemistry': ['Organic', 'Inorganic', 'Physical Chemistry', 'Reactions', 'Bonding', 'Equilibrium'],
    'Biology': ['Cell Biology', 'Genetics', 'Ecology', 'Physiology', 'Evolution', 'Anatomy'],
    'English': ['Grammar', 'Vocabulary', 'Reading', 'Writing', 'Literature', 'Comprehension'],
    'History': ['Ancient', 'Medieval', 'Modern', 'World Wars', 'Civilizations', 'Revolutions'],
    'default': ['Theory', 'Practice', 'Revision', 'Problems', 'Notes', 'Review']
  };

  for (let d = 1; d <= days; d++) {
    const slots = [];
    let currentHour = 9;
    
    for (let h = 0; h < hoursPerDay; h++) {
      const subj = subjects[h % subjects.length];
      const topicList = topics[subj] || topics['default'];
      const topic = topicList[(d + h) % topicList.length];
      
      slots.push({
        time: `${String(currentHour).padStart(2, '0')}:00 - ${String(currentHour + 1).padStart(2, '0')}:00`,
        subject: subj,
        topic: `${topic} - ${goal || 'Study Session'}`
      });
      
      currentHour++;
      
      // Add break every 2 hours
      if ((h + 1) % 2 === 0 && h < hoursPerDay - 1) {
        slots.push({
          time: `${String(currentHour).padStart(2, '0')}:00 - ${String(currentHour).padStart(2, '0')}:15`,
          subject: 'Break',
          topic: 'Rest & Recharge 🧘'
        });
        currentHour++;
      }
    }
    
    plan.days.push({ day: d, slots });
  }
  
  return plan;
}

async function fetchAIPlan(subjects, hours, days, goal) {
  try {
    console.log('Fetching AI plan...');
    const resp = await fetch("/api/generate-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjects, hours, days, goal })
    });

    if (!resp.ok) {
      console.warn('AI API returned error:', resp.status);
      return null;
    }
    
    const data = await resp.json();
    console.log('AI plan received:', data);
    return data.plan || null;
  } catch (e) {
    console.error('AI plan fetch error:', e);
    return null;
  }
}

async function plannerToPDF() {
  if (!generatedPlan) return toast('Generate a plan first!');

  const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
  if (!jsPDF) return toast('PDF library not loaded. Please refresh.');

  try {
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let y = 60;

    // Header gradient effect
    pdf.setFillColor(114, 89, 236);
    pdf.rect(0, 0, pageWidth, 100, 'F');
    pdf.setFillColor(198, 102, 247);
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
      year: 'numeric', month: 'long', day: 'numeric' 
    });
    pdf.text(`Generated on ${date} | ${generatedPlan.days.length} days | ${generatedPlan.meta.subjects.join(', ')}`, pageWidth / 2, 75, { align: 'center' });

    y = 130;

    // Content
    generatedPlan.days.forEach((day, dayIdx) => {
      if (y > pageHeight - 100) {
        pdf.addPage();
        y = 40;
      }

      // Day header
      pdf.setFillColor(245, 247, 250);
      pdf.roundedRect(30, y - 5, pageWidth - 60, 35, 5, 5, 'F');
      pdf.setFillColor(114, 89, 236);
      pdf.circle(50, y + 12, 15, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text((dayIdx + 1).toString(), 50, y + 16, { align: 'center' });
      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(16);
      pdf.text(`Day ${day.day}`, 75, y + 16);

      y += 50;

      // Slots
      day.slots.forEach((slot, i) => {
        if (y > pageHeight - 80) {
          pdf.addPage();
          y = 40;
        }

        const isBreak = slot.subject.toLowerCase().includes('break');
        
        pdf.setFillColor(250, 250, 250);
        pdf.roundedRect(45, y - 3, pageWidth - 90, 52, 4, 4, 'F');

        // Color bar
        if (isBreak) {
          pdf.setFillColor(251, 191, 36);
        } else {
          const colors = [[139, 92, 246], [59, 130, 246], [16, 185, 129], [239, 68, 68]];
          const c = colors[i % colors.length];
          pdf.setFillColor(c[0], c[1], c[2]);
        }
        pdf.roundedRect(45, y - 3, 6, 52, 2, 2, 'F');

        // Bullet
        pdf.setFillColor(100, 116, 139);
        pdf.circle(62, y + 12, 3, 'F');

        // Text
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(30, 41, 59);
        pdf.text(`${slot.time} • ${slot.subject}`, 72, y + 14);

        if (slot.topic) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.setTextColor(100, 116, 139);
          const topicLines = pdf.splitTextToSize(slot.topic, pageWidth - 130);
          pdf.text(topicLines, 72, y + 32);
        }

        y += 60;
      });

      y += 15;
    });

    // Footer on all pages
    const totalPages = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setDrawColor(226, 232, 240);
      pdf.line(30, pageHeight - 40, pageWidth - 30, pageHeight - 40);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 25, { align: 'center' });
      pdf.text('Generated by Timora', pageWidth - 35, pageHeight - 25, { align: 'right' });
      pdf.text('timora.app', 35, pageHeight - 25);
    }

    pdf.save("Timora_Study_Plan.pdf");
    toast('📄 PDF downloaded!');
  } catch (e) {
    console.error('PDF generation error:', e);
    toast('PDF generation failed');
  }
}

async function importPlannerToPomodoro() {
  if (!generatedPlan) return toast('Generate a plan first!');

  let added = 0;
  const currentDay = generatedPlan.days[currentPlanDay];
  
  if (!currentDay) return toast('No day selected');

  for (const slot of currentDay.slots) {
    if (slot.subject.toLowerCase().includes('break')) continue;
    await addTask(`${slot.subject}: ${slot.topic || 'Study session'}`);
    added++;
  }

  if (added > 0) {
    toast(`✅ Imported ${added} tasks from Day ${currentDay.day}!`);
    setTimeout(() => showSection('pomodoro'), 500);
  } else {
    toast('No tasks to import');
  }
}

async function sharePlannerPDF() {
  if (!generatedPlan) return toast('Generate a plan first!');

  const modal = $('#shareModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
  
  $('#shareLoading')?.classList.remove('hidden');
  $('#shareSuccess')?.classList.add('hidden');

  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Login required');

    // Create share document with plan data
    const shareDoc = await addDoc(collection(db, 'shared-plans'), {
      userId: user.uid,
      userName: state.user.name,
      plan: generatedPlan,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

    const shareLink = `${window.location.origin}/view-plan.html?id=${shareDoc.id}`;
    
    $('#shareLoading')?.classList.add('hidden');
    $('#shareSuccess')?.classList.remove('hidden');
    
    const linkInput = $('#shareLink');
    if (linkInput) linkInput.value = shareLink;

    toast('🔗 Share link created!');
  } catch (e) {
    console.error('Share error:', e);
    toast('Failed to create share link');
    modal?.classList.add('hidden');
  }
}

function initPlanner() {
  const genBtn = $('#genAIPlan');
  const result = $('#plannerResult');
  
  // PDF download
  $('#plannerPdfBtn')?.addEventListener('click', plannerToPDF);
  
  // Import to Pomodoro
  $('#plannerImportBtn')?.addEventListener('click', importPlannerToPomodoro);
  
  // Share
  $('#plannerShareBtn')?.addEventListener('click', sharePlannerPDF);
  
  // Day navigation
  $('#plannerPrevBtn')?.addEventListener('click', () => {
    if (currentPlanDay > 0) {
      renderPlanDay(currentPlanDay - 1);
    } else {
      toast('Already at first day');
    }
  });
  
  $('#plannerNextBtn')?.addEventListener('click', () => {
    if (generatedPlan && currentPlanDay < generatedPlan.days.length - 1) {
      renderPlanDay(currentPlanDay + 1);
    } else {
      toast('Already at last day');
    }
  });

  // Share modal controls
  $('#closeShareModal')?.addEventListener('click', () => {
    $('#shareModal')?.classList.add('hidden');
    $('#shareModal')?.classList.remove('flex');
  });
  
  $('#copyLinkBtn')?.addEventListener('click', () => {
    const input = $('#shareLink');
    if (input) {
      input.select();
      document.execCommand('copy');
      toast('📋 Link copied!');
      
      const btn = $('#copyLinkBtn');
      if (btn) {
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy', 2000);
      }
    }
  });

  // Social sharing
  $('#shareWhatsapp')?.addEventListener('click', () => {
    const link = $('#shareLink')?.value;
    if (link) {
      window.open(`https://wa.me/?text=${encodeURIComponent(`Check out my Timora Study Plan: ${link}`)}`, '_blank');
    }
  });

  $('#shareEmail')?.addEventListener('click', () => {
    const link = $('#shareLink')?.value;
    if (link) {
      const subject = encodeURIComponent('My Study Plan from Timora');
      const body = encodeURIComponent(`Hi,\n\nCheck out my study plan:\n${link}\n\nCreated with Timora`);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }
  });

  $('#shareTwitter')?.addEventListener('click', () => {
    const link = $('#shareLink')?.value;
    if (link) {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just created my study plan with @Timora 📚✨`)}&url=${encodeURIComponent(link)}`, '_blank');
    }
  });

  // Generate plan button
  genBtn?.addEventListener('click', async () => {
    const subjects = ($('#plannerSubjects')?.value || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const hours = Number($('#plannerHours')?.value) || 3;
    const days = Number($('#plannerDays')?.value) || 7;
    const goal = $('#plannerGoal')?.value?.trim() || 'Study Goal';

    if (subjects.length === 0) {
      return toast('Add at least one subject');
    }

    if (result) {
      result.innerHTML = `
        <div class="flex items-center gap-3 text-slate-600 p-4">
          <div class="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full"></div>
          <span>Generating your personalized study plan...</span>
        </div>
      `;
    }

    try {
      // Try AI first, fallback to local
      const aiPlan = await fetchAIPlan(subjects, hours, days, goal);
      generatedPlan = aiPlan || generateLocalPlan(subjects, hours, days, goal);
      
      if (result) {
        result.innerHTML = `
          <div class="p-4 rounded-xl bg-green-50 border border-green-200">
            <div class="flex items-center gap-2 text-green-700 font-medium mb-1">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
              </svg>
              Plan Generated!
            </div>
            <p class="text-sm text-green-600">
              ${generatedPlan.days.length}-day plan for ${subjects.join(', ')} • ${hours}h/day
            </p>
          </div>
        `;
      }
      
      renderPlanDay(0);
      toast('✨ Study plan generated!');
      
      if (window.confetti) {
        confetti({ particleCount: 50, spread: 40, origin: { y: 0.7 } });
      }
    } catch (e) {
      console.error('Plan generation error:', e);
      generatedPlan = generateLocalPlan(subjects, hours, days, goal);
      renderPlanDay(0);
      toast('Plan generated (offline mode)');
    }
  });

  // Import individual task from timetable
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('importTaskBtn')) {
      const subject = e.target.dataset.subject;
      const topic = e.target.dataset.topic;
      const time = e.target.dataset.time;
      
      if (subject) {
        addTask(`${subject}: ${topic || 'Study session'} (${time || ''})`);
      }
    }
  });
}

/* ============================================================================
   SETTINGS - FULLY DYNAMIC
   ============================================================================ */

async function saveSettings() {
  const user = auth.currentUser;
  if (!user) return toast('Login required');

  const newSettings = {
    focus: Number(focusTimeInput?.value) || 25,
    short: Number(shortBreakInput?.value) || 5,
    long: Number(longBreakInput?.value) || 15,
    soundType: soundSelect?.value || 'chime',
    autoStart: autoStartToggle?.checked || false,
    sessionsBeforeLong: Number(longBreakFreq?.value) || 4,
    notifications: state.pomSettings.notifications
  };

  // Validate
  if (newSettings.focus < 1 || newSettings.focus > 120) {
    return toast('Focus time must be 1-120 minutes');
  }
  if (newSettings.short < 1 || newSettings.short > 60) {
    return toast('Short break must be 1-60 minutes');
  }
  if (newSettings.long < 1 || newSettings.long > 90) {
    return toast('Long break must be 1-90 minutes');
  }

  try {
    await updateDoc(userDocRef(user.uid), {
      pomSettings: newSettings,
      name: $('#editName')?.value?.trim() || state.user.name,
      email: $('#editEmail')?.value?.trim() || state.user.email
    });

    state.pomSettings = newSettings;
    
    // Update timer if not running
    if (!pomState.running) {
      setPomMode(pomState.mode);
    }
    
    toast('✅ Settings saved!');
  } catch (e) {
    console.error('saveSettings error:', e);
    toast('Failed to save settings');
  }
}

async function resetAllState() {
  if (!confirm('Reset all your data? This will clear:\n• Focus time & sessions\n• Streak\n• Tasks\n• Projects\n\nThis cannot be undone!')) return;

  const user = auth.currentUser;
  if (!user) return toast('Login required');

  try {
    // Reset main user doc
    await updateDoc(userDocRef(user.uid), {
      coins: 0,
      totalFocusMinutes: 0,
      totalSessions: 0,
      currentStreak: 0,
      bestStreak: 0,
      pomSettings: defaultPomSettings,
      water: { cups: 0, goal: 8 },
      lastActiveDate: getTodayDate()
    });

    // Reset daily stats
    await setDoc(dailyStatsRef(user.uid), { ...defaultDailyStats, date: getTodayDate() });

    // Reset weekly stats
    await setDoc(weeklyStatsRef(user.uid), { ...defaultWeeklyStats, weekStart: getWeekStart() });

    // Delete all tasks
    const tasksSnap = await getDocs(tasksColRef(user.uid));
    const batch = writeBatch(db);
    tasksSnap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();

    // Reset local state
    state.pomSettings = { ...defaultPomSettings };
    state.water = { cups: 0, goal: 8 };
    state.currentTaskId = null;
    state.currentTaskName = null;
    localStorage.removeItem('currentPomTaskId');
    
    setPomMode('focus');
    updateAllUI();
    
    toast('🔄 All data reset');
  } catch (e) {
    console.error('resetAllState error:', e);
    toast('Reset failed');
  }
}

function initSettingsControls() {
  // Save button
  saveSettingsBtn?.addEventListener('click', saveSettings);
  
  // Reset button
  resetStateBtn?.addEventListener('click', resetAllState);

  // Sound select change
  soundSelect?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      soundFileInput?.classList.remove('hidden');
    } else {
      soundFileInput?.classList.add('hidden');
    }
  });

  // Custom sound file upload
  soundFileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('audio/')) {
      toast('Please select an audio file');
      return;
    }
    
    const url = URL.createObjectURL(file);
    state.pomSettings.soundType = 'custom';
    state.pomSettings.sound = url;
    toast('Custom sound loaded');
  });

  // Test sound
  testSoundBtn?.addEventListener('click', () => {
    const { soundType, sound } = state.pomSettings || {};
    const src = (soundType === 'custom' && sound) ? sound : (soundMap[soundType] || 'chime.mp3');
    
    if (!src) {
      toast('No sound selected');
      return;
    }
    
    AudioManager.play(src, { loop: false });
    toast('🔊 Playing test sound');
  });

  // Notifications toggle
  notifToggle?.addEventListener('click', async () => {
    if (!("Notification" in window)) {
      toast("Notifications not supported in this browser");
      return;
    }
    
    if (Notification.permission === "granted") {
      state.pomSettings.notifications = !state.pomSettings.notifications;
      toast(`Notifications ${state.pomSettings.notifications ? 'enabled' : 'disabled'}`);
      notifToggle.textContent = state.pomSettings.notifications ? 'Disable Notifications' : 'Enable Notifications';
    } else if (Notification.permission === "denied") {
      toast("Notifications blocked. Please enable in browser settings.");
    } else {
      const permission = await Notification.requestPermission();
      state.pomSettings.notifications = permission === 'granted';
      toast(`Notifications ${state.pomSettings.notifications ? 'enabled' : 'denied'}`);
    }
  });

  // Real-time input validation
  focusTimeInput?.addEventListener('input', (e) => {
    let val = Number(e.target.value);
    if (val > 120) e.target.value = 120;
    if (val < 1 && e.target.value !== '') e.target.value = 1;
  });

  shortBreakInput?.addEventListener('input', (e) => {
    let val = Number(e.target.value);
    if (val > 60) e.target.value = 60;
    if (val < 1 && e.target.value !== '') e.target.value = 1;
  });

  longBreakInput?.addEventListener('input', (e) => {
    let val = Number(e.target.value);
    if (val > 90) e.target.value = 90;
    if (val < 1 && e.target.value !== '') e.target.value = 1;
  });
}

/* ============================================================================
   NAVIGATION - SECTION SWITCHING
   ============================================================================ */

const sections = {};
let navBtns = [];

function initNavigation() {
  console.log('Initializing navigation...');
  
  // Collect all sections
  $all("article[id^='sect-']").forEach(sec => {
    const name = sec.id.replace("sect-", "");
    sections[name] = sec;
  });
  
  console.log('Sections found:', Object.keys(sections));
  
  // Get nav buttons
  navBtns = $all(".nav-btn");
  console.log('Nav buttons found:', navBtns.length);
  
  // Add click handlers
  navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const section = btn.dataset.section;
      if (section) {
        showSection(section);
        
        // Close sidebar on mobile
        if (window.innerWidth < 1024) {
          $('#app')?.classList.add('sidebar-hidden');
        }
      }
    });
  });
  
  // Show default section
  showSection('overview');
}

function showSection(name) {
  console.log('Showing section:', name);
  
  // Hide all, show target
  Object.entries(sections).forEach(([key, el]) => {
    if (el) {
      el.classList.toggle('hidden', key !== name);
    }
  });
  
  // Update nav button states
  navBtns.forEach(btn => {
    const isActive = btn.dataset.section === name;
    btn.classList.toggle('active-nav', isActive);
    btn.classList.toggle('bg-gradient-to-r', isActive);
    btn.classList.toggle('from-purple-50', isActive);
    btn.classList.toggle('to-blue-50', isActive);
  });

  // Load section-specific data
  if (name === 'leaderboard') {
    populateLeaderboard();
  }
  if (name === 'analytics') {
    loadAnalyticsData(auth.currentUser?.uid);
  }
  // ADD THESE:
  if (name === 'ai-teacher') {
    initAITeacher();
  }
  if (name === 'referrals') {
    initReferrals();
  }
}

/* ============================================================================
   GLOBAL EVENT DELEGATION
   ============================================================================ */

function initGlobalEventListeners() {
  // Sidebar toggle
  $('#openSidebar')?.addEventListener('click', () => {
    $('#app')?.classList.remove('sidebar-hidden');
  });

  $('#closeSidebar')?.addEventListener('click', () => {
    $('#app')?.classList.add('sidebar-hidden');
  });

  // Task input
  $('#addTaskBtn')?.addEventListener('click', () => {
    const input = $('#taskInput');
    const val = input?.value?.trim();
    if (val) {
      addTask(val);
      input.value = '';
    }
  });

  // Task input enter key
  $('#taskInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const val = e.target.value?.trim();
      if (val) {
        addTask(val);
        e.target.value = '';
      }
    }
  });

  // Global click delegation
  document.addEventListener('click', (e) => {
    const target = e.target;

    // Task focus target (select task for pomodoro)
    if (target.closest('.taskFocusTarget')) {
      const id = target.closest('.taskFocusTarget').dataset.id;
      if (id) setCurrentTask(id);
      return;
    }

    // Complete task
    if (target.classList.contains('completeTaskBtn')) {
      const id = target.dataset.id;
      if (id) completeTask(id);
      return;
    }

    // Delete task
    if (target.classList.contains('deleteTaskBtn') || target.closest('.deleteTaskBtn')) {
      const btn = target.classList.contains('deleteTaskBtn') ? target : target.closest('.deleteTaskBtn');
      const id = btn?.dataset.id;
      if (id) deleteTask(id);
      return;
    }

    // Delete project
    if (target.classList.contains('deleteProjectBtn') || target.closest('.deleteProjectBtn')) {
      const btn = target.classList.contains('deleteProjectBtn') ? target : target.closest('.deleteProjectBtn');
      const id = btn?.dataset.id;
      if (id) deleteProject(id);
      return;
    }

    // Buy merch
    if (target.classList.contains('buyMerchBtn')) {
      const id = target.dataset.id;
      const price = Number(target.dataset.price);
      const name = target.dataset.name;
      if (id && price && name) {
        redeemMerch(id, price, name);
      }
      return;
    }

    // Subscribe button
    if (target.classList.contains('subscribeBtn')) {
      const plan = target.dataset.plan;
      if (plan) subscribeToPlan(plan);
      return;
    }
  });

  // New project button
  $('#newProjectBtn')?.addEventListener('click', createProject);

  // Order modal
  $('#confirmOrderBtn')?.addEventListener('click', () => {
    const name = $('#orderName')?.value;
    const address = $('#orderAddress')?.value;
    
    if (!name || !address) {
      toast('Please fill in all fields');
      return;
    }
    
    $('#orderModal')?.classList.add('hidden');
    $('#orderModal')?.classList.remove('flex');
    toast('🎉 Order placed! (Demo)');
  });

  $('#cancelOrderBtn')?.addEventListener('click', () => {
    $('#orderModal')?.classList.add('hidden');
    $('#orderModal')?.classList.remove('flex');
  });

  // Quick actions
  $('#pomQuickStart')?.addEventListener('click', () => {
    showSection('pomodoro');
    setTimeout(startPom, 300);
  });

  $('#createTask')?.addEventListener('click', () => {
    showSection('pomodoro');
    setTimeout(() => $('#taskInput')?.focus(), 300);
  });

  $('#genPlan')?.addEventListener('click', () => {
    showSection('planner');
  });

  // Logout
  $('#logoutBtn')?.addEventListener('click', async () => {
    try {
      // Cleanup listeners
      activeListeners.forEach(unsub => {
        try { unsub(); } catch (e) {}
      });
      activeListeners = [];
      
      await firebaseSignOut(auth);
      toast('Signed out');
      window.location.href = 'login.html';
    } catch (e) {
      console.error('Logout error:', e);
      toast('Sign out failed');
    }
  });
}

/* ============================================================================
   AUTH STATE LISTENER
   ============================================================================ */

function setupAuthListener() {
  console.log('Setting up auth listener...');
  
  onAuthStateChanged(auth, async (user) => {
    console.log('Auth state changed:', user ? user.email : 'no user');
    
    if (!user) {
      console.log('No user logged in - redirecting');
      LoadingScreen.setProgress(100, 'Redirecting to login...');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 500);
      return;
    }

    console.log('User authenticated:', user.email);
    LoadingScreen.setProgress(20, 'User authenticated...');

    try {
      // Initialize user documents
      console.log('Initializing user document...');
      LoadingScreen.setProgress(30, 'Loading profile...');
      const userData = await initializeUserDocument(user.uid, user);
      console.log('User document loaded:', userData);
      
      LoadingScreen.setProgress(40, 'Loading daily stats...');
      const dailyData = await initializeDailyStats(user.uid);
      console.log('Daily stats loaded:', dailyData);
      
      LoadingScreen.setProgress(50, 'Loading weekly stats...');
      const weeklyData = await initializeWeeklyStats(user.uid);
      console.log('Weekly stats loaded:', weeklyData);

      LoadingScreen.setProgress(60, 'Loading tasks...');
      try {
        const tasksSnap = await getDocs(query(tasksColRef(user.uid), orderBy('createdAt', 'desc')));
        state.tasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log('Tasks loaded:', state.tasks.length);
      } catch (e) {
        console.warn('Tasks load failed:', e);
        state.tasks = [];
      }

      LoadingScreen.setProgress(70, 'Loading projects...');
      try {
        const projectsSnap = await getDocs(query(projectsColRef(user.uid), orderBy('createdAt', 'desc')));
        state.projects = projectsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log('Projects loaded:', state.projects.length);
      } catch (e) {
        console.warn('Projects load failed:', e);
        state.projects = [];
      }

      LoadingScreen.setProgress(80, 'Loading sessions...');
      try {
        const sessionsSnap = await getDocs(query(sessionsColRef(user.uid), orderBy('timestamp', 'desc'), limit(20)));
        state.sessions = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log('Sessions loaded:', state.sessions.length);
      } catch (e) {
        console.warn('Sessions load failed:', e);
        state.sessions = [];
      }

      LoadingScreen.setProgress(90, 'Setting up real-time sync...');
      console.log('Setting up realtime listeners...');
      setupRealtimeListeners(user.uid);

      // Request notification permission
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().then(result => {
          console.log('Notification permission:', result);
        });
      }

      LoadingScreen.setProgress(95, 'Rendering UI...');
      console.log('Updating UI...');
      
      // Update all UI
      updateAllUI();
      renderTasks();
      populateProjects();
      renderRecentActivity();
      renderRecentSessions();

      console.log('✅ User data initialized successfully');
      
      // IMPORTANT: Set to 100% BEFORE hiding
      LoadingScreen.setProgress(100, 'Ready!');
      
      // Small delay then hide
      setTimeout(() => {
        LoadingScreen.hide();
        toast('Welcome back! 👋');
      }, 300);

    } catch (e) {
      console.error('❌ Auth initialization error:', e);
      console.error('Error stack:', e.stack);
      
      LoadingScreen.setProgress(100, 'Error loading data...');
      setTimeout(() => {
        LoadingScreen.hide();
        toast('Failed to load some data. Please refresh the page.');
      }, 1000);
    }
  }, (error) => {
    console.error('❌ Auth listener error:', error);
    LoadingScreen.hide();
    toast('Authentication error. Please try logging in again.');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 2000);
  });
}

/* ============================================================================
   INITIALIZATION
   ============================================================================ */

   /* ============================================================================
   AI TEACHER - FULLY DYNAMIC
   ============================================================================ */

const AI_SUBJECTS = [
  { id: 'math', name: 'Math', color: 'purple' },
  { id: 'physics', name: 'Physics', color: 'blue' },
  { id: 'chemistry', name: 'Chemistry', color: 'green' },
  { id: 'biology', name: 'Biology', color: 'orange' },
  { id: 'english', name: 'English', color: 'pink' },
  { id: 'history', name: 'History', color: 'cyan' },
  { id: 'computer', name: 'Computer Science', color: 'indigo' },
  { id: 'economics', name: 'Economics', color: 'yellow' }
];

const AI_TIER_LIMITS = {
  'Free': 20,
  'Standard': 100,
  'Premium': Infinity
};

async function initAITeacher() {
  const user = auth.currentUser;
  if (!user) return;

  // Load AI usage for today
  await loadAIUsage(user.uid);
  
  // Load recent messages
  await loadAIMessages(user.uid);
  
  // Render subjects
  renderAISubjects();
  
  // Render recent topics
  renderAIRecentTopics();
  
  // Update usage UI
  updateAIUsageUI();
  
  // Setup event listeners
  setupAITeacherEvents();
}

async function loadAIUsage(uid) {
  try {
    const today = getTodayDate();
    const usageSnap = await getDoc(aiUsageRef(uid, today));
    
    if (usageSnap.exists()) {
      const data = usageSnap.data();
      state.aiTeacher.questionsToday = data.questionsCount || 0;
      state.aiTeacher.lastReset = data.date;
    } else {
      // New day, reset counter
      state.aiTeacher.questionsToday = 0;
      state.aiTeacher.lastReset = today;
    }
    
    // Set limit based on subscription
    state.aiTeacher.questionsLimit = AI_TIER_LIMITS[state.user.subscription] || 20;
    
  } catch (e) {
    console.error('loadAIUsage error:', e);
  }
}

async function loadAIMessages(uid) {
  try {
    const q = query(
      aiMessagesColRef(uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    
    state.aiTeacher.messages = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .reverse();
    
    // Extract recent topics
    const topics = new Map();
    state.aiTeacher.messages.forEach(msg => {
      if (msg.role === 'user' && msg.subject) {
        const key = `${msg.subject}:${msg.content.substring(0, 30)}`;
        if (!topics.has(key)) {
          topics.set(key, {
            subject: msg.subject,
            preview: msg.content.substring(0, 40) + '...',
            timestamp: msg.timestamp
          });
        }
      }
    });
    
    state.aiTeacher.recentTopics = Array.from(topics.values()).slice(0, 5);
    
    renderAIMessages();
    renderAIRecentTopics();
    
  } catch (e) {
    console.error('loadAIMessages error:', e);
  }
}

function renderAIMessages() {
  const container = $('#aiChatMessages');
  if (!container) return;
  
  if (state.aiTeacher.messages.length === 0) {
    container.innerHTML = `
      <div class="flex gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-lg flex-shrink-0">
          🤖
        </div>
        <div class="flex-1 bg-white rounded-2xl rounded-tl-none p-4 shadow-sm">
          <p class="text-slate-700">Hello! I'm your AI Teacher. I can help you with:</p>
          <ul class="mt-2 text-sm text-slate-600 space-y-1">
            <li>• Explaining complex concepts</li>
            <li>• Solving math problems step-by-step</li>
            <li>• Creating study summaries</li>
            <li>• Quiz practice & test prep</li>
          </ul>
          <p class="mt-3 text-slate-700">What would you like to learn today? 📚</p>
        </div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = state.aiTeacher.messages.map(msg => {
    if (msg.role === 'user') {
      return `
        <div class="flex gap-3 justify-end">
          <div class="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl rounded-tr-none p-4 max-w-[80%] shadow-sm">
            ${msg.subject ? `<div class="text-xs opacity-80 mb-1">${escapeHtml(msg.subject)}</div>` : ''}
            <p>${escapeHtml(msg.content)}</p>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="flex gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-lg flex-shrink-0">
            🤖
          </div>
          <div class="flex-1 bg-white rounded-2xl rounded-tl-none p-4 shadow-sm">
            <div class="text-slate-700 whitespace-pre-wrap">${escapeHtml(msg.content)}</div>
          </div>
        </div>
      `;
    }
  }).join('');
  
  container.scrollTop = container.scrollHeight;
}

function renderAISubjects() {
  const grid = $('#aiSubjectGrid');
  if (!grid) return;
  
  const colorMap = {
    purple: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
    blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
    green: 'bg-green-100 text-green-700 hover:bg-green-200',
    orange: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
    pink: 'bg-pink-100 text-pink-700 hover:bg-pink-200',
    cyan: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200',
    indigo: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200',
    yellow: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
  };
  
  grid.innerHTML = AI_SUBJECTS.map(subj => {
    const isActive = state.aiTeacher.selectedSubject === subj.id;
    const baseClass = colorMap[subj.color] || colorMap.purple;
    const activeClass = isActive ? 'ring-2 ring-offset-2 ring-cyan-500' : '';
    
    return `
      <button class="subject-btn px-3 py-2 rounded-lg ${baseClass} ${activeClass} text-sm font-medium transition-all"
              data-subject="${subj.id}" data-name="${subj.name}">
        ${subj.name}
      </button>
    `;
  }).join('');
}

function renderAIRecentTopics() {
  const container = $('#aiRecentTopics');
  if (!container) return;
  
  if (state.aiTeacher.recentTopics.length === 0) {
    container.innerHTML = `
      <div class="text-sm text-slate-400 text-center py-4">
        No recent topics yet
      </div>
    `;
    return;
  }
  
  container.innerHTML = state.aiTeacher.recentTopics.map(topic => {
    const date = new Date(topic.timestamp);
    const timeAgo = getTimeAgo(date);
    
    return `
      <div class="p-3 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition-all ai-topic-item"
           data-subject="${escapeHtml(topic.subject)}" data-preview="${escapeHtml(topic.preview)}">
        <div class="text-sm font-medium text-slate-700 truncate">${escapeHtml(topic.preview)}</div>
        <div class="text-xs text-slate-500">${escapeHtml(topic.subject)} • ${timeAgo}</div>
      </div>
    `;
  }).join('');
}

function updateAIUsageUI() {
  const used = state.aiTeacher.questionsToday;
  const limit = state.aiTeacher.questionsLimit;
  const isUnlimited = limit === Infinity;
  
  setText('aiQuestionsUsed', used);
  setText('aiQuestionsLimit', isUnlimited ? '∞' : limit);
  
  const bar = $('#aiUsageBar');
  if (bar) {
    const percent = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
    bar.style.width = `${percent}%`;
    
    if (percent >= 90) {
      bar.classList.add('from-red-500', 'to-orange-500');
      bar.classList.remove('from-cyan-500', 'to-blue-500');
    } else {
      bar.classList.remove('from-red-500', 'to-orange-500');
      bar.classList.add('from-cyan-500', 'to-blue-500');
    }
  }
  
  const tierText = $('#aiUsageTierText');
  if (tierText) {
    if (isUnlimited) {
      tierText.textContent = 'Premium: Unlimited questions!';
      tierText.classList.add('text-purple-600', 'font-medium');
    } else {
      tierText.textContent = `${state.user.subscription} tier: ${limit} questions/day`;
    }
  }
  
  const upgradeBtn = $('#aiUpgradeBtn');
  if (upgradeBtn) {
    upgradeBtn.style.display = state.user.subscription === 'Premium' ? 'none' : 'block';
  }
}

async function sendAIMessage(content, subject = null) {
  const user = auth.currentUser;
  if (!user) return toast('Login required');
  
  if (!content.trim()) return toast('Please enter a question');
  
  // Check usage limit
  const limit = AI_TIER_LIMITS[state.user.subscription] || 20;
  if (state.aiTeacher.questionsToday >= limit && limit !== Infinity) {
    toast('Daily limit reached! Upgrade to continue.');
    return;
  }
  
  const selectedSubject = subject || state.aiTeacher.selectedSubject;
  const subjectName = AI_SUBJECTS.find(s => s.id === selectedSubject)?.name || 'General';
  
  // Add user message to state and UI immediately
  const userMessage = {
    role: 'user',
    content: content.trim(),
    subject: subjectName,
    timestamp: Date.now()
  };
  
  state.aiTeacher.messages.push(userMessage);
  renderAIMessages();
  
  // Clear input
  const input = $('#aiTeacherInput');
  if (input) input.value = '';
  
  // Show typing indicator
  const container = $('#aiChatMessages');
  if (container) {
    container.innerHTML += `
      <div id="aiTyping" class="flex gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-lg flex-shrink-0">
          🤖
        </div>
        <div class="flex-1 bg-white rounded-2xl rounded-tl-none p-4 shadow-sm">
          <div class="flex items-center gap-2 text-slate-400">
            <div class="animate-bounce">●</div>
            <div class="animate-bounce" style="animation-delay: 0.1s">●</div>
            <div class="animate-bounce" style="animation-delay: 0.2s">●</div>
          </div>
        </div>
      </div>
    `;
    container.scrollTop = container.scrollHeight;
  }
  
  try {
    // Save user message to Firebase
    await addDoc(aiMessagesColRef(user.uid), userMessage);
    
    // Update usage count
    await setDoc(aiUsageRef(user.uid), {
      date: getTodayDate(),
      questionsCount: increment(1)
    }, { merge: true });
    
    state.aiTeacher.questionsToday++;
    updateAIUsageUI();
    
    // Call AI API (or use fallback)
    let aiResponse;
    try {
      const response = await fetch('/api/ai-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          subject: subjectName,
          userId: user.uid
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        aiResponse = data.response;
      } else {
        throw new Error('API error');
      }
    } catch (e) {
      // Fallback response
      aiResponse = generateFallbackResponse(content, subjectName);
    }
    
    // Remove typing indicator
    $('#aiTyping')?.remove();
    
    // Add AI response
    const aiMessage = {
      role: 'assistant',
      content: aiResponse,
      timestamp: Date.now()
    };
    
    state.aiTeacher.messages.push(aiMessage);
    renderAIMessages();
    
    // Save AI response to Firebase
    await addDoc(aiMessagesColRef(user.uid), aiMessage);
    
    // Award coins for asking questions (1 coin per 5 questions)
    if (state.aiTeacher.questionsToday % 5 === 0) {
      await updateDoc(userDocRef(user.uid), {
        coins: increment(2)
      });
      toast('🪙 +2 coins for learning!');
    }
    
  } catch (e) {
    console.error('sendAIMessage error:', e);
    $('#aiTyping')?.remove();
    toast('Failed to get response. Please try again.');
  }
}

function generateFallbackResponse(question, subject) {
  const responses = {
    'Math': `Great question about ${subject}! Here's a helpful approach:

1. First, identify the key concepts involved
2. Break down the problem into smaller steps
3. Apply relevant formulas or methods
4. Check your work by substituting back

Would you like me to explain any specific formula or concept in more detail?`,
    
    'Physics': `Interesting physics question! Let me help you understand this:

• Start by identifying the physical principles involved
• Draw a diagram if it helps visualize the problem
• List the known quantities and what you need to find
• Apply the appropriate equations

Physics is all about understanding the relationships between quantities. What specific aspect would you like me to clarify?`,
    
    'default': `That's a great question! Here's my explanation:

Based on your question about "${question.substring(0, 50)}...", I'd recommend:

1. Breaking down the concept into fundamental parts
2. Understanding the underlying principles
3. Practicing with examples
4. Connecting it to what you already know

Would you like me to go deeper into any particular aspect of this topic?`
  };
  
  return responses[subject] || responses['default'];
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
}

function setupAITeacherEvents() {
  // Send message
  $('#aiTeacherSend')?.addEventListener('click', () => {
    const input = $('#aiTeacherInput');
    if (input?.value) sendAIMessage(input.value);
  });
  
  // Enter key
  $('#aiTeacherInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const input = e.target;
      if (input?.value) sendAIMessage(input.value);
    }
  });
  
  // Subject selection
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('subject-btn')) {
      const subjectId = e.target.dataset.subject;
      state.aiTeacher.selectedSubject = subjectId;
      renderAISubjects();
      toast(`Subject: ${e.target.dataset.name}`);
    }
  });
  
  // Quick action buttons
  $all('.ai-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.dataset.prompt;
      const input = $('#aiTeacherInput');
      if (input && prompt) {
        input.value = prompt + ' ';
        input.focus();
      }
    });
  });
  
  // Recent topic click
  document.addEventListener('click', (e) => {
    if (e.target.closest('.ai-topic-item')) {
      const item = e.target.closest('.ai-topic-item');
      const preview = item.dataset.preview;
      if (preview) {
        const input = $('#aiTeacherInput');
        if (input) {
          input.value = `Continue explaining: ${preview}`;
          input.focus();
        }
      }
    }
  });
  
  // Upgrade button
  $('#aiUpgradeBtn')?.addEventListener('click', () => {
    showSection('subscription');
  });
}

/* ============================================================================
   REFERRALS - FULLY DYNAMIC
   ============================================================================ */

/* ============================================================================
   REFERRALS - FULLY DYNAMIC (COMPLETE FIXED VERSION)
   ============================================================================ */

const REFERRAL_CONFIG = {
  coinsPerReferral: 100,
  bonusForFriend: 50,
  milestones: [
    { count: 5, reward: '200 bonus coins', icon: '🥉' },
    { count: 10, reward: 'Free month Standard', icon: '🥈' },
    { count: 25, reward: 'Exclusive merch', icon: '🥇' },
    { count: 50, reward: 'Lifetime Premium!', icon: '💎' }
  ]
};

// Track if events are already set up to prevent duplicate listeners
let referralEventsInitialized = false;

async function initReferrals() {
  const user = auth.currentUser;
  if (!user) {
    console.warn('initReferrals: No user logged in');
    return;
  }
  
  console.log('🔄 Initializing referrals for user:', user.uid);
  
  try {
    // Step 1: Get or generate referral code
    await initReferralCode(user.uid);
    console.log('✅ Referral code loaded:', state.referrals.code);
    
    // Step 2: Load referral history from subcollection
    await loadReferralHistory(user.uid);
    console.log('✅ Referral history loaded:', state.referrals.history.length, 'entries');
    
    // Step 3: Render all UI components
    renderReferralLink();
    renderReferralStats();
    renderReferralHistory();
    renderReferralMilestones();
    
    // Step 4: Setup event listeners (only once)
    setupReferralEvents();
    
    console.log('✅ Referrals fully initialized:', {
      code: state.referrals.code,
      totalReferrals: state.referrals.totalReferrals,
      pendingReferrals: state.referrals.pendingReferrals,
      coinsEarned: state.referrals.coinsEarned,
      historyCount: state.referrals.history.length
    });
    
  } catch (e) {
    console.error('❌ initReferrals error:', e);
    toast('Failed to load referral data');
  }
}

async function initReferralCode(uid) {
  try {
    const userSnap = await getDoc(userDocRef(uid));
    
    if (!userSnap.exists()) {
      console.warn('User document not found for referral code init');
      return;
    }
    
    const userData = userSnap.data();
    
    // Check if user already has a referral code
    if (userData?.referralCode) {
      state.referrals.code = userData.referralCode;
      console.log('Existing referral code found:', state.referrals.code);
    } else {
      // Generate new referral code
      const code = generateReferralCode(uid);
      state.referrals.code = code;
      console.log('Generated new referral code:', code);
      
      // Save to user document
      await updateDoc(userDocRef(uid), {
        referralCode: code,
        referralStats: {
          totalReferrals: 0,
          pendingReferrals: 0,
          coinsEarned: 0
        }
      });
      
      // Create entry in referralCodes collection for lookup
      await setDoc(doc(db, 'referralCodes', code), {
        userId: uid,
        createdAt: new Date().toISOString()
      });
      
      console.log('Referral code saved to Firestore');
    }
    
    // Load referral stats from user document
    if (userData?.referralStats) {
      state.referrals.totalReferrals = userData.referralStats.totalReferrals || 0;
      state.referrals.pendingReferrals = userData.referralStats.pendingReferrals || 0;
      state.referrals.coinsEarned = userData.referralStats.coinsEarned || 0;
    } else {
      // Initialize with defaults
      state.referrals.totalReferrals = 0;
      state.referrals.pendingReferrals = 0;
      state.referrals.coinsEarned = 0;
    }
    
  } catch (e) {
    console.error('initReferralCode error:', e);
    throw e;
  }
}

function generateReferralCode(uid) {
  const prefix = 'TIM';
  const suffix = uid.substring(0, 6).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}${suffix}${random}`;
}

async function loadReferralHistory(uid) {
  try {
    // Define the referrals subcollection reference
    const referralsRef = collection(db, 'users', uid, 'referrals');
    const q = query(
      referralsRef,
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    
    const snap = await getDocs(q);
    
    state.referrals.history = snap.docs.map(d => ({ 
      id: d.id, 
      ...d.data() 
    }));
    
    // Recalculate stats from actual history for accuracy
    const completedReferrals = state.referrals.history.filter(r => r.status === 'completed');
    const pendingReferrals = state.referrals.history.filter(r => r.status === 'pending');
    
    // Update state with accurate counts from history
    if (state.referrals.history.length > 0) {
      state.referrals.totalReferrals = completedReferrals.length;
      state.referrals.pendingReferrals = pendingReferrals.length;
      state.referrals.coinsEarned = completedReferrals.reduce(
        (sum, r) => sum + (r.coinsEarned || REFERRAL_CONFIG.coinsPerReferral), 
        0
      );
    }
    
    console.log('Referral history loaded:', {
      total: state.referrals.history.length,
      completed: completedReferrals.length,
      pending: pendingReferrals.length,
      coinsEarned: state.referrals.coinsEarned
    });
    
  } catch (e) {
    console.error('loadReferralHistory error:', e);
    state.referrals.history = [];
  }
}

function renderReferralLink() {
  const code = state.referrals.code || '---';
  const link = `${window.location.origin}/login.html?ref=${code}`;
  
  console.log('Rendering referral link:', link);
  
  // Update link input
  const linkInput = $('#referralLink');
  if (linkInput) {
    linkInput.value = link;
  }
  
  // Update code display
  const codeDisplay = $('#referralCode');
  if (codeDisplay) {
    codeDisplay.innerHTML = `Your code: <span class="font-mono font-bold text-emerald-600">${escapeHtml(code)}</span>`;
  }
  
  // Update reward amounts
  const coinsPerReferralEl = $('#coinsPerReferral');
  if (coinsPerReferralEl) {
    coinsPerReferralEl.textContent = REFERRAL_CONFIG.coinsPerReferral;
  }
  
  const bonusForFriendEl = $('#bonusForFriend');
  if (bonusForFriendEl) {
    bonusForFriendEl.textContent = REFERRAL_CONFIG.bonusForFriend;
  }
}

function renderReferralStats() {
  console.log('Rendering referral stats:', {
    total: state.referrals.totalReferrals,
    pending: state.referrals.pendingReferrals,
    earned: state.referrals.coinsEarned
  });
  
  // Total referrals
  const totalEl = $('#totalReferrals');
  if (totalEl) {
    totalEl.textContent = state.referrals.totalReferrals || 0;
  }
  
  // Pending referrals
  const pendingEl = $('#pendingReferrals');
  if (pendingEl) {
    pendingEl.textContent = state.referrals.pendingReferrals || 0;
  }
  
  // Coins earned
  const earnedEl = $('#earnedFromReferrals');
  if (earnedEl) {
    earnedEl.textContent = formatNumber(state.referrals.coinsEarned || 0);
  }
}

function renderReferralHistory() {
  const container = $('#referralHistory');
  const emptyState = $('#noReferrals');
  
  if (!container) {
    console.warn('Referral history container not found');
    return;
  }
  
  console.log('Rendering referral history:', state.referrals.history.length, 'items');
  
  // Show empty state if no history
  if (!state.referrals.history || state.referrals.history.length === 0) {
    container.innerHTML = '';
    if (emptyState) {
      emptyState.classList.remove('hidden');
    }
    return;
  }
  
  // Hide empty state
  if (emptyState) {
    emptyState.classList.add('hidden');
  }
  
  // Render history items
  container.innerHTML = state.referrals.history.map(ref => {
    // Handle different timestamp formats
    let timestamp;
    if (ref.timestamp) {
      timestamp = typeof ref.timestamp === 'number' ? ref.timestamp : ref.timestamp.toMillis?.() || Date.now();
    } else if (ref.createdAt) {
      timestamp = typeof ref.createdAt === 'number' ? ref.createdAt : ref.createdAt.toMillis?.() || Date.now();
    } else {
      timestamp = Date.now();
    }
    
    const date = new Date(timestamp);
    const timeAgo = getTimeAgo(date);
    const isCompleted = ref.status === 'completed';
    const initial = (ref.referredName || 'U').charAt(0).toUpperCase();
    
    // Styling based on status
    const bgClass = isCompleted 
      ? 'from-emerald-50 to-green-50 border-emerald-200'
      : 'from-amber-50 to-yellow-50 border-amber-200';
    
    const statusBadge = isCompleted
      ? '<span class="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">Completed</span>'
      : '<span class="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">Pending</span>';
    
    const coinsDisplay = isCompleted
      ? `<span class="text-emerald-600 font-semibold">+${ref.coinsEarned || REFERRAL_CONFIG.coinsPerReferral} coins</span>`
      : `<span class="text-amber-600 font-semibold">Pending...</span>`;
    
    const avatarColor = isCompleted 
      ? 'bg-emerald-200 text-emerald-700' 
      : 'bg-amber-200 text-amber-700';
    
    return `
      <div class="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r ${bgClass} border transition-all hover:shadow-sm">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center font-bold text-lg">
            ${initial}
          </div>
          <div>
            <div class="font-medium text-slate-800">${escapeHtml(ref.referredName || 'Friend')}</div>
            <div class="text-xs text-slate-500">${isCompleted ? 'Joined' : 'Invited'} ${timeAgo}</div>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          ${coinsDisplay}
          ${statusBadge}
        </div>
      </div>
    `;
  }).join('');
}

function renderReferralMilestones() {
  const container = $('#referralMilestones');
  if (!container) {
    console.warn('Referral milestones container not found');
    return;
  }
  
  const totalRefs = state.referrals.totalReferrals || 0;
  
  console.log('Rendering milestones, total referrals:', totalRefs);
  
  container.innerHTML = REFERRAL_CONFIG.milestones.map(milestone => {
    const unlocked = totalRefs >= milestone.count;
    const remaining = milestone.count - totalRefs;
    
    const borderClass = unlocked ? 'border-emerald-400' : 'border-slate-200';
    const bgClass = unlocked ? 'from-emerald-50 to-green-50' : 'from-slate-100 to-slate-50';
    
    const checkmark = unlocked ? `
      <div class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs shadow-md">✓</div>
    ` : '';
    
    const progressText = !unlocked && remaining > 0 
      ? `<div class="text-xs text-slate-400 mt-1">${remaining} more to go</div>` 
      : '';
    
    return `
      <div class="p-4 rounded-xl bg-gradient-to-br ${bgClass} border-2 ${borderClass} relative transition-all hover:shadow-sm ${unlocked ? 'ring-1 ring-emerald-200' : ''}">
        ${checkmark}
        <div class="text-2xl mb-2">${milestone.icon}</div>
        <div class="font-bold text-slate-800">${milestone.count} Referrals</div>
        <div class="text-sm text-slate-500">${milestone.reward}</div>
        ${progressText}
      </div>
    `;
  }).join('');
}

function setupReferralEvents() {
  // Prevent duplicate event listeners
  if (referralEventsInitialized) {
    console.log('Referral events already initialized, skipping');
    return;
  }
  
  referralEventsInitialized = true;
  console.log('Setting up referral event listeners');
  
  // Copy link button
  const copyBtn = $('#copyReferralBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const input = $('#referralLink');
      if (!input) return;
      
      try {
        // Try modern clipboard API first
        await navigator.clipboard.writeText(input.value);
        
        // Visual feedback
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.remove('bg-emerald-500');
        copyBtn.classList.add('bg-green-600');
        
        setTimeout(() => {
          copyBtn.textContent = 'Copy';
          copyBtn.classList.remove('bg-green-600');
          copyBtn.classList.add('bg-emerald-500');
        }, 2000);
        
        toast('📋 Referral link copied!');
        
      } catch (err) {
        // Fallback for older browsers
        input.select();
        input.setSelectionRange(0, 99999);
        document.execCommand('copy');
        
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy', 2000);
        
        toast('📋 Referral link copied!');
      }
    });
  }
  
  // WhatsApp share button
  const whatsappBtn = $('#shareRefWhatsapp');
  if (whatsappBtn) {
    whatsappBtn.addEventListener('click', () => {
      const code = state.referrals.code || '';
      const link = `${window.location.origin}/login.html?ref=${code}`;
      const message = `🎯 Join me on Timora - the best study companion app! 📚✨

Use my referral link to get ${REFERRAL_CONFIG.bonusForFriend} bonus coins when you sign up:
${link}

Let's study smarter together! 💪`;
      
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    });
  }
  
  // Twitter share button
  const twitterBtn = $('#shareRefTwitter');
  if (twitterBtn) {
    twitterBtn.addEventListener('click', () => {
      const code = state.referrals.code || '';
      const link = `${window.location.origin}/login.html?ref=${code}`;
      const message = `Level up your study game with @TimoraApp! 🚀📚 

Join me and get ${REFERRAL_CONFIG.bonusForFriend} bonus coins!`;
      
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(link)}`, '_blank');
    });
  }
  
  // Email share button
  const emailBtn = $('#shareRefEmail');
  if (emailBtn) {
    emailBtn.addEventListener('click', () => {
      const code = state.referrals.code || '';
      const link = `${window.location.origin}/login.html?ref=${code}`;
      
      const subject = 'Join me on Timora - Study smarter together! 📚';
      const body = `Hey!

I've been using Timora to boost my study productivity and thought you might like it too!

Features include:
✅ AI-powered study planning
✅ Pomodoro timer with stats
✅ Progress tracking & analytics
✅ Earn coins & rewards

Use my referral link to sign up and get ${REFERRAL_CONFIG.bonusForFriend} bonus coins:
${link}

Let's crush our study goals together! 💪📚

- Sent from Timora`;
      
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }
  
  console.log('✅ Referral event listeners initialized');
}

// Helper function for time ago display
function getTimeAgo(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return 'Recently';
  }
  
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 0) return 'Just now';
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
  
  return date.toLocaleDateString();
}

/* ============================================================================
   PROCESS REFERRAL - Called from login.html when new user signs up
   ============================================================================ */

async function processReferral(referralCode, newUserId, newUserName) {
  if (!referralCode || !referralCode.trim()) {
    console.log('processReferral: No referral code provided');
    return false;
  }
  
  const code = referralCode.trim().toUpperCase();
  console.log('🔄 Processing referral:', { code, newUserId, newUserName });
  
  try {
    // Step 1: Look up the referrer from referralCodes collection
    const codeDocRef = doc(db, 'referralCodes', code);
    const codeSnap = await getDoc(codeDocRef);
    
    if (!codeSnap.exists()) {
      console.warn('❌ Invalid referral code - not found in database:', code);
      return false;
    }
    
    const referrerId = codeSnap.data().userId;
    console.log('Found referrer ID:', referrerId);
    
    // Step 2: Prevent self-referral
    if (referrerId === newUserId) {
      console.warn('❌ Self-referral attempted - blocked');
      return false;
    }
    
    // Step 3: Verify referrer exists
    const referrerDocRef = userDocRef(referrerId);
    const referrerSnap = await getDoc(referrerDocRef);
    
    if (!referrerSnap.exists()) {
      console.warn('❌ Referrer user document not found:', referrerId);
      return false;
    }
    
    const referrerData = referrerSnap.data();
    console.log('Referrer found:', referrerData.name || referrerData.email);
    
    // Step 4: Use batch write for atomic operations
    const batch = writeBatch(db);
    
    // 4a. Award coins to REFERRER
    batch.update(referrerDocRef, {
      coins: increment(REFERRAL_CONFIG.coinsPerReferral),
      'referralStats.totalReferrals': increment(1),
      'referralStats.coinsEarned': increment(REFERRAL_CONFIG.coinsPerReferral)
    });
    console.log(`📝 Queued: Award ${REFERRAL_CONFIG.coinsPerReferral} coins to referrer`);
    
    // 4b. Award bonus coins to NEW USER
    const newUserDocRef = userDocRef(newUserId);
    batch.update(newUserDocRef, {
      coins: increment(REFERRAL_CONFIG.bonusForFriend),
      referredBy: referrerId
    });
    console.log(`📝 Queued: Award ${REFERRAL_CONFIG.bonusForFriend} bonus coins to new user`);
    
    // 4c. Create referral history entry in referrer's subcollection
    const referralHistoryRef = doc(collection(db, 'users', referrerId, 'referrals'));
    batch.set(referralHistoryRef, {
      referredUserId: newUserId,
      referredName: newUserName || 'New User',
      coinsEarned: REFERRAL_CONFIG.coinsPerReferral,
      status: 'completed',
      timestamp: Date.now(),
      createdAt: serverTimestamp()
    });
    console.log('📝 Queued: Create referral history entry');
    
    // Step 5: Commit all changes atomically
    await batch.commit();
    
    console.log('✅ Referral processed successfully!');
    console.log(`   → Referrer (${referrerId}) received +${REFERRAL_CONFIG.coinsPerReferral} coins`);
    console.log(`   → New user (${newUserId}) received +${REFERRAL_CONFIG.bonusForFriend} coins`);
    
    return true;
    
  } catch (e) {
    console.error('❌ processReferral error:', e);
    console.error('Error details:', e.message, e.code);
    return false;
  }
}

// Export for use in login.html signup flow
window.processReferral = processReferral;

// Also export config for consistency
window.REFERRAL_CONFIG = REFERRAL_CONFIG;

/* ============================================================================
   REALTIME LISTENER FOR REFERRALS (Optional - add to setupRealtimeListeners)
   ============================================================================ */

function setupReferralRealtimeListener(uid) {
  console.log('Setting up referral realtime listener for:', uid);
  
  const referralsRef = collection(db, 'users', uid, 'referrals');
  const q = query(referralsRef, orderBy('timestamp', 'desc'), limit(50));
  
  const unsubscribe = onSnapshot(q, (snap) => {
    console.log('📡 Referrals realtime update:', snap.size, 'documents');
    
    state.referrals.history = snap.docs.map(d => ({ 
      id: d.id, 
      ...d.data() 
    }));
    
    // Recalculate stats
    const completed = state.referrals.history.filter(r => r.status === 'completed');
    const pending = state.referrals.history.filter(r => r.status === 'pending');
    
    state.referrals.totalReferrals = completed.length;
    state.referrals.pendingReferrals = pending.length;
    state.referrals.coinsEarned = completed.reduce(
      (sum, r) => sum + (r.coinsEarned || REFERRAL_CONFIG.coinsPerReferral), 
      0
    );
    
    // Re-render UI
    renderReferralStats();
    renderReferralHistory();
    renderReferralMilestones();
    
  }, (err) => {
    console.error('Referrals realtime listener error:', err);
  });
  
  return unsubscribe;
}

function initializeDashboard() {
  console.log('Initializing Timora Dashboard...');

  // Initialize loading screen FIRST
  LoadingScreen.init();
  LoadingScreen.setProgress(10, 'Initializing...');

  // Initialize DOM references
  initDOMReferences();

  // Initialize navigation
  initNavigation();

  // Initialize all components
  initPomodoroControls();
  initWaterTracker();
  initSettingsControls();
  initPlanner();
  initSubscriptions();
  initGlobalEventListeners();

  // Setup auth listener (this triggers data loading and hides loader when done)
  setupAuthListener();

  setTimeout(() => {
    if (LoadingScreen.element && LoadingScreen.element.style.display !== 'none') {
      console.warn('Loading timeout - forcing hide');
      LoadingScreen.hide();
      toast('Loading took too long. Some data may not be synced.');
    }
  }, 10000);

  console.log('Dashboard initialization started');
}

/* ============================================================================
   DEBUG API (accessible via console)
   ============================================================================ */

window.Timora = {
  // State access
  getState: () => state,
  getUser: () => state.user,
  getDailyStats: () => state.dailyStats,
  getWeeklyStats: () => state.weeklyStats,
  getTasks: () => state.tasks,
  getSessions: () => state.sessions,
  
  // Pomodoro controls
  startPom,
  pausePom: togglePausePom,
  resetPom,
  setPomMode,
  
  // Manual triggers
  showSection,
  updateAllUI,
  populateLeaderboard,
  loadAnalyticsData: () => loadAnalyticsData(auth.currentUser?.uid),

  // AI Teacher
  getAIState: () => state.aiTeacher,
  sendAIMessage,
  
  // Referrals
  getReferralState: () => state.referrals,
  processReferral,
  
  // Force session complete (for testing)
  forceComplete: handleSessionComplete,
  
  // Audio
  stopAudio: () => AudioManager.stop(),
  playSound: (src) => AudioManager.play(src),
  
  // Firebase refs
  auth,
  db,
  
  // Version
  version: '6.0.0'
};

console.log('🚀 Timora Dashboard v6.0 loaded. Access debug API via window.Timora');

initializeDashboard();

}); // End DOMContentLoaded
