# 🐌 Snail – Interactive Desktop AI Assistant

> A beautiful cross-platform desktop AI companion that lives on your screen like a virtual pet while helping you stay productive.

Built with **Electron**, **React**, **TypeScript**, **PixiJS**, and **OpenAI-compatible APIs**.

---

## ✨ Overview

Snail is more than just another AI chatbot.

It is an animated desktop companion that explores your screen, reacts to your interactions, remembers conversations, manages tasks, and assists with daily productivity—all while feeling alive through expressive animations and personality.

---

# 🎬 Features

## 🐌 Interactive Desktop Companion

* Transparent always-on-top desktop overlay
* Smooth 60+ FPS animations
* Walks naturally across your desktop
* Climbs vertically on both screen edges
* Crawls upside-down along the top edge
* Smooth corner turning with easing
* Random exploration behavior
* Cursor tracking
* Drag-and-drop movement
* Idle breathing and blinking
* Sleeping animation with ZZZ particles
* Magical cloud spawn & disappear effects
* Celebration, dance, wave, and emotion animations
* Slime trail and particle effects

---

## 🤖 AI Assistant

Powered by **OpenAI-compatible APIs**

Supports:

* GPT-4o
* GPT-4o Mini
* GPT-4 Turbo
* Compatible self-hosted models

Capabilities:

* Natural conversations
* Streaming responses
* Function calling
* Persistent memory
* Context-aware replies
* Local fallback mode (works without API key)

---

## 📅 Productivity Suite

Everything built directly into Snail.

### ✅ Task Management

* To-do lists
* Priorities
* Categories
* Completion tracking

### 📝 Notes

* Sticky notes
* Color coding
* Rich organization

### ⏰ Reminders

* One-time reminders
* Recurring reminders
* Desktop notifications

### 🍅 Focus Mode

* Pomodoro timer
* Countdown
* Focus sessions

### 📆 Calendar

* Create events
* Schedule meetings
* Date reminders

### 🔥 Habit Tracker

* Daily habits
* Streak counting
* Progress tracking

---

## 🖱️ Interaction

Interact naturally with Snail.

* Drag anywhere
* Double-click to chat
* Right-click context menu
* Pet the snail
* Feed the snail
* Celebrate completed tasks
* Global shortcut

```
Ctrl + Shift + S
```

Toggle Snail instantly from anywhere.

---

# 🎨 Design

Inspired by modern macOS applications.

Features:

* Glassmorphism
* Rounded UI
* Soft shadows
* Smooth transitions
* Premium animations
* 8 beautiful snail skins
* 5 personality modes

---

# 🚀 Technology Stack

| Category         | Technology                  |
| ---------------- | --------------------------- |
| Desktop          | Electron 30                 |
| Frontend         | React 18                    |
| Language         | TypeScript                  |
| Build Tool       | Vite 5                      |
| Styling          | TailwindCSS 3               |
| Animation        | PixiJS 8 + Framer Motion 11 |
| State Management | Zustand                     |
| Database         | SQLite (better-sqlite3)     |
| AI               | OpenAI SDK v4               |

---

# 📦 Installation

## Prerequisites

* Node.js 18+
* npm 9+

Clone the repository

```bash
git clone https://github.com/Nik-coder-10/Snail.git
cd Snail
```

Install dependencies

```bash
npm install
```

Generate the tray icon

```bash
node scripts/generate-icon.js
```

---

# 💻 Development

Start the development environment

```bash
npm run dev
```

---

# 🏗️ Build

Production build

```bash
npm run build
```

Package for macOS

```bash
npm run pack:mac
```

Package for Windows

```bash
npm run pack:win
```

---

# ⚙️ Configuration

Configure Snail directly from **Settings**.

Available options:

* OpenAI API Key
* Custom API Endpoint
* AI Model Selection
* Theme / Skin
* Personality
* Notifications

All settings are stored locally using SQLite.

No personal data leaves your device unless an external AI provider is configured.

---

# 🧠 AI Tool Calling

Snail can perform desktop actions using built-in tools.

| Tool                    | Description                   |
| ----------------------- | ----------------------------- |
| `create_todo`           | Create a new to-do            |
| `create_reminder`       | Schedule reminders            |
| `create_note`           | Create sticky notes           |
| `create_calendar_event` | Add calendar events           |
| `start_pomodoro`        | Start a focus session         |
| `create_habit`          | Track habits                  |
| `open_app`              | Launch desktop applications   |
| `search_files`          | Browse local files            |
| `remember`              | Save memories                 |
| `notify`                | Display desktop notifications |

---

# 📂 Project Structure

```text
src
├── ai
│   └── service.ts
├── db
│   ├── database.ts
│   └── repository.ts
├── main
│   ├── index.ts
│   └── preload.ts
├── renderer
│   ├── components
│   │   ├── dialogue
│   │   ├── overlays
│   │   ├── panels
│   │   ├── shell
│   │   └── ui
│   ├── store
│   ├── styles
│   ├── App.tsx
│   └── main.tsx
└── shared
    └── types.ts
```

---

# 🌟 Highlights

* 🐌 Living animated desktop companion
* 🤖 AI-powered conversations
* 🎭 Expressive personality & emotions
* 🎨 Premium glassmorphism UI
* ⚡ Native desktop integration
* 📅 Complete productivity suite
* 💾 Local SQLite persistence
* 🧩 OpenAI-compatible architecture
* 🖥️ Cross-platform support
* 🚀 Built with modern web technologies

---

# 📜 License

Released under the **MIT License**.
