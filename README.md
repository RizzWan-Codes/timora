# 🎯 Timora - AI-Powered Study Planner & Productivity Platform

<div align="center">

![Timora Banner](https://via.placeholder.com/800x200/8b5cf6/ffffff?text=Timora+-+Study+Smarter)

**Plan smarter. Study better. Stay consistent.**

[![Firebase](https://img.shields.io/badge/Firebase-11.0.0-orange?style=flat-square&logo=firebase)](https://firebase.google.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-06b6d4?style=flat-square&logo=tailwind-css)](https://tailwindcss.com)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--3.5-412991?style=flat-square&logo=openai)](https://openai.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Live Demo](#) • [Documentation](#documentation) • [Report Bug](#issues) • [Request Feature](#issues)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Screenshots](#-screenshots)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Architecture](#-architecture)
- [Usage Guide](#-usage-guide)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [Roadmap](#-roadmap)
- [License](#-license)

---

## 🌟 Overview

**Timora** is a comprehensive AI-powered study and productivity platform designed to help students and professionals plan their study schedules, maintain focus, and track progress through gamification. Built with modern web technologies, Timora combines intelligent planning, time management, and motivational features to create a complete learning ecosystem.

### Why Timora?

- 🤖 **AI-Powered Planning** - Generate personalized study timetables with OpenAI
- ⏱️ **Pomodoro Timer** - Built-in focus timer with task tracking
- 🎮 **Gamification** - Earn coins, climb leaderboards, unlock achievements
- 📊 **Analytics Dashboard** - Track your progress with detailed statistics
- 🏆 **Community Features** - Compete in weekly leagues and share plans
- 💎 **Rewards System** - Redeem coins for exclusive merchandise

---

## ✨ Features

### 🎨 Core Features

#### 1. **AI Study Planner**
- Generate balanced study schedules based on subjects, hours, and goals
- Smart time allocation with built-in breaks
- Multi-day planning (1-30 days)
- PDF export and sharing capabilities
- Import tasks directly to Pomodoro timer

#### 2. **Advanced Pomodoro Timer**
- Customizable focus, short break, and long break durations
- Visual circular progress indicator
- Task-based time tracking
- Session history and analytics
- Sound notifications (multiple themes)
- Auto-start option for consecutive sessions

#### 3. **Task Management**
- Create and organize daily tasks
- Track time spent on each task
- Mark tasks as complete with celebration animations
- View pending and completed task counts
- Integrate tasks with Pomodoro sessions

#### 4. **Progress Analytics**
- Daily session tracking
- Weekly focus hour charts
- Completion rate statistics
- Streak monitoring
- Session history logs
- Performance trends

#### 5. **Gamification System**
- **Coins System**: Earn 10 coins per completed focus session
- **Daily Streaks**: Track consecutive study days
- **Leaderboards**: Global rankings based on focus hours
- **League System**: Weekly competitions with promotions
- **Achievements**: Unlock badges for milestones

#### 6. **Rewards & Merch Store**
- Redeem coins for exclusive merchandise
- Study diaries, hoodies, water bottles
- Lucky spin feature (Premium)
- Limited-edition items

#### 7. **Water Tracker**
- Visual hydration tracking (8 cups goal)
- Daily progress monitoring
- Health reminders

#### 8. **User Profile System**
- Google OAuth integration
- Email/password authentication
- Profile customization with avatars
- Subscription management (Free, Standard, Premium)

---

## 📸 Screenshots

### Landing Page
Beautiful gradient-based design with feature highlights and pricing tiers.

### Dashboard Overview
- Real-time statistics
- Quick action buttons
- Recent activity feed
- Focus metrics

### AI Planner Interface
- Input form for subjects and preferences
- Day-by-day preview cards
- Export and import options
- Share functionality

### Pomodoro Timer
- Large countdown display
- Task list integration
- Session statistics
- Mode switcher (Focus/Short/Long)

---

## 🛠️ Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Tailwind CSS for styling
- **JavaScript (ES6+)** - Modular architecture
- **Firebase SDK** - Authentication and database

### Backend & Services
- **Firebase Authentication** - User management
- **Cloud Firestore** - Real-time NoSQL database
- **Vercel Edge Functions** - API endpoints
- **OpenAI API** - AI-powered study planning

### Libraries & Tools
- **Canvas Confetti** - Celebration animations
- **jsPDF** - PDF generation
- **Google Fonts (Inter)** - Typography
- **DiceBear Avatars** - Profile picture generation

### Development
- **Git** - Version control
- **ES Modules** - Modern JavaScript imports
- **CDN Delivery** - Fast asset loading

---

## 🚀 Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Firebase project with Authentication and Firestore enabled
- OpenAI API key (for AI Planner feature)
- Vercel account (for deployment)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/timora.git
cd timora
```

2. **Firebase Setup**

Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)

Enable Authentication methods:
- Email/Password
- Google Sign-In

Enable Firestore Database with these collections:
```
users/
  {userId}/
    - name, email, coins, subscription, etc.
    dailyStats/
      {date}/
        - sessionsCompleted, focusMinutes
    sessions/
      {sessionId}/
        - type, minutes, timestamp, taskName
    tasks/
      {taskId}/
        - text, completed, timeSpent
    projects/
      {projectId}/
        - title, desc, progress, status

shared-plans/
  {planId}/
    - userId, userName, pdfData, createdAt
```

3. **Update Firebase Configuration**

Replace the config in all HTML files and `dashboard-ui.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

4. **Set up OpenAI API**

Create a `.env` file in your project root:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

5. **Deploy API Endpoint**

Deploy the `api/generate-plan.js` to Vercel:
```bash
npm install -g vercel
vercel deploy
```

6. **Add Sound Files**

Place audio files in the root directory:
- `chime.mp3`
- `kitchen-bell.mp3`
- `digital-clock.mp3`
- `soft-ding.mp3`

7. **Run Locally**

Use a local server (required for ES modules):
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server -p 8000

# Using PHP
php -S localhost:8000
```

Visit `http://localhost:8000` in your browser.

---

## 🏗️ Architecture

### File Structure

```
timora/
├── index.html              # Landing page
├── login.html              # Authentication page
├── dashboard.html          # Main application
├── view-plan.html          # Shared plan viewer
├── dashboard-ui.js         # Core application logic
├── api/
│   └── generate-plan.js    # Vercel Edge Function for AI
├── sounds/
│   ├── chime.mp3
│   ├── kitchen-bell.mp3
│   ├── digital-clock.mp3
│   └── soft-ding.mp3
├── vercel.json            # Vercel configuration
├── package.json           # Dependencies
└── README.md              # This file
```

### Data Flow

```
User Action → Frontend (dashboard-ui.js)
              ↓
          Firebase Auth (Authentication)
              ↓
          Cloud Firestore (Data Storage)
              ↓
          Real-time Updates (onSnapshot listeners)
              ↓
          UI Updates (Reactive state management)

AI Planning Flow:
User Input → Vercel Edge Function → OpenAI API
                                      ↓
                                  JSON Response
                                      ↓
                              Rendered UI + PDF Export
```

### State Management

Global state object:
```javascript
state = {
  user: { uid, name, email, coins, sub },
  focusHours: 0,
  streak: 0,
  sessionsToday: 0,
  focusHoursToday: 0,
  tasks: { pending: 0, completed: 0, list: [] },
  pomSettings: { focus: 25, short: 5, long: 15, ... },
  currentTaskId: null
}
```

---

## 📚 Usage Guide

### For Students

1. **Sign Up**
   - Create account with email or Google
   - Verify your email address

2. **Generate Study Plan**
   - Navigate to AI Planner
   - Enter subjects (comma-separated)
   - Set hours per day and total days
   - Add your study goal
   - Click "Generate Plan"

3. **Start Studying**
   - Import tasks from planner to Pomodoro
   - Select a task to focus on
   - Click "Start Session"
   - Take breaks when prompted

4. **Track Progress**
   - View Analytics dashboard
   - Check your daily streaks
   - Monitor focus hours

5. **Earn Rewards**
   - Complete sessions to earn coins
   - Check leaderboard rankings
   - Redeem coins in Merch Store

### For Developers

#### Adding New Features

1. **Create a new section**
```html
<article id="sect-newsection" class="hidden section-card">
  <!-- Your content -->
</article>
```

2. **Add navigation button**
```html
<button class="nav-btn" data-section="newsection">
  New Section
</button>
```

3. **Initialize in JavaScript**
```javascript
function initNewSection() {
  // Your initialization code
}
```

#### Customizing Pomodoro Timer

```javascript
const defaultPomSettings = {
  focus: 25,        // Focus duration in minutes
  short: 5,         // Short break in minutes
  long: 15,         // Long break in minutes
  soundType: "chime",
  notifications: true,
  sessionsBeforeLong: 4,  // Long break after X sessions
  autoStart: false
};
```

#### Adding Sound Themes

```javascript
const soundMap = {
  'your-theme': 'path/to/sound.mp3'
};
```

---

## 🔌 API Documentation

### Generate Study Plan

**Endpoint:** `/api/generate-plan`

**Method:** POST

**Request Body:**
```json
{
  "subjects": ["Math", "Physics", "Chemistry"],
  "hours": 3,
  "days": 7,
  "goal": "Complete JEE preparation"
}
```

**Response:**
```json
{
  "plan": {
    "meta": {
      "subjects": ["Math", "Physics", "Chemistry"],
      "hoursPerDay": 3,
      "days": 7,
      "goal": "Complete JEE preparation",
      "generatedAt": "2025-01-15T10:30:00Z"
    },
    "days": [
      {
        "day": 1,
        "date": "Day 1",
        "slots": [
          {
            "time": "09:00 - 10:30",
            "subject": "Mathematics",
            "topic": "Integration - Practice Problems",
            "type": "study"
          }
        ]
      }
    ]
  }
}
```

### Firebase Collections

#### Users Collection
```javascript
users/{userId}
{
  uid: string,
  name: string,
  email: string,
  coins: number,
  subscription: "Free" | "Standard" | "Premium",
  totalFocusHours: number,
  currentStreak: number,
  state: {
    pomSettings: object
  }
}
```

#### Daily Stats
```javascript
users/{userId}/dailyStats/{date}
{
  date: "YYYY-MM-DD",
  sessionsCompleted: number,
  focusMinutes: number,
  lastUpdated: timestamp
}
```

#### Sessions
```javascript
users/{userId}/sessions/{sessionId}
{
  type: "focus" | "break",
  minutes: number,
  timestamp: number,
  taskId: string,
  taskName: string
}
```

---

## 🚢 Deployment

### Vercel (Recommended)

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Login and Deploy**
```bash
vercel login
vercel deploy --prod
```

3. **Set Environment Variables**
```bash
vercel env add OPENAI_API_KEY
```

### Firebase Hosting

1. **Install Firebase CLI**
```bash
npm install -g firebase-tools
```

2. **Initialize**
```bash
firebase init hosting
```

3. **Deploy**
```bash
firebase deploy
```

### GitHub Pages

1. Push code to GitHub
2. Go to Settings → Pages
3. Select branch and folder
4. Save and wait for deployment

**Note:** API endpoints won't work on GitHub Pages. Use Vercel for API.

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Contribution Guidelines

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open a Pull Request**

### Code Style

- Use ES6+ features
- Follow existing naming conventions
- Comment complex logic
- Test before submitting

### Bug Reports

Include:
- Browser and version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)

---

## 🗺️ Roadmap

### Version 2.0 (Q2 2025)
- [ ] Mobile app (React Native)
- [ ] AI Teacher integration
- [ ] Voice commands
- [ ] Collaborative study rooms
- [ ] Advanced analytics with ML insights

### Version 2.1 (Q3 2025)
- [ ] Calendar integration (Google, Outlook)
- [ ] Study groups and teams
- [ ] Flashcard system
- [ ] Spaced repetition algorithm
- [ ] Dark mode

### Version 2.2 (Q4 2025)
- [ ] Offline mode with sync
- [ ] Browser extension
- [ ] API for third-party integrations
- [ ] Custom achievement system
- [ ] Advanced reporting

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 Timora

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

---

## 👥 Team

- **Lead Developer** - [Your Name]
- **UI/UX Designer** - [Designer Name]
- **Backend Engineer** - [Engineer Name]

---

## 📞 Support

- **Email:** hello@timora.app
- **Discord:** [Join our community](#)
- **Twitter:** [@TimoraApp](#)
- **Documentation:** [docs.timora.app](#)

---

## 🙏 Acknowledgments

- [OpenAI](https://openai.com) for AI capabilities
- [Firebase](https://firebase.google.com) for backend infrastructure
- [Tailwind CSS](https://tailwindcss.com) for styling
- [Canvas Confetti](https://www.kirilv.com/canvas-confetti/) for celebrations
- [DiceBear](https://dicebear.com) for avatars

---

## 📊 Stats

![GitHub stars](https://img.shields.io/github/stars/yourusername/timora?style=social)
![GitHub forks](https://img.shields.io/github/forks/yourusername/timora?style=social)
![GitHub watchers](https://img.shields.io/github/watchers/yourusername/timora?style=social)

---

<div align="center">

**Made with ❤️ by the Timora Team**

[Website](#) • [Twitter](#) • [Discord](#)

</div>
