Snail - Interactive Desktop AI Assistant
A cross-platform desktop AI companion built with Electron, React, TypeScript, and PixiJS. Snail lives on your desktop as an animated virtual pet with the intelligence of ChatGPT.

Snail

Features
Desktop Companion
Animated snail that walks, climbs, and explores your desktop edges
Smooth PixiJS animations at 60+ FPS with particle effects and slime trails
Spawn/hide animations with magical cloud effects
Idle breathing, blinking, sleeping with ZZZ indicators
Emotional states that affect animations and dialogue
AI Assistant
OpenAI-compatible API support (GPT-4o, GPT-4o Mini, GPT-4 Turbo)
Streaming responses with real-time typing animation
Function calling for desktop actions (todos, reminders, notes, calendar, pomodoro, habits)
Local fallback responses when no API key is configured
Conversational memory and context persistence
Productivity Tools
To-do list manager with priorities and lists
Sticky notes with color coding
Reminder system with recurring support
Pomodoro timer with visual countdown
Habit tracker with streak counting
Calendar event management
Interaction
Drag Snail anywhere on screen
Double-click to open chat
Right-click for context menu
Pet and feed interactions trigger celebration animations
Global shortcut (Ctrl+Shift+S) to toggle visibility
System tray integration
Visual Design
Glassmorphism UI with blurred backdrops
Smooth Framer Motion transitions
macOS-inspired rounded design
8 snail skins (Classic, Golden, Ocean, Sunset, Forest, Midnight, Ruby, Amethyst)
5 personality modes
Tech Stack
Layer	Technology
Framework	Electron 30
Frontend	React 18 + TypeScript
Build	Vite 5
Styling	TailwindCSS 3
Animation	PixiJS 8, Framer Motion 11
State	Zustand 4
Database	SQLite via better-sqlite3
AI	OpenAI SDK v4
Getting Started
Prerequisites
Node.js 18+
npm 9+
Installation
# Clone the repository
git clone https://github.com/Nik-coder-10/Snail.git
cd Snail

# Install dependencies
npm install

# Generate tray icon
node scripts/generate-icon.js
Development
# Start in development mode
npm run dev
Building
# Production build
npm run build

# Package for macOS
npm run pack:mac

# Package for Windows
npm run pack:win
Configuration
Open Settings (right-click Snail > Settings) to configure:

AI API Key: Your OpenAI or compatible API key
API Endpoint: Custom endpoint for self-hosted models
Model: GPT-4o, GPT-4o Mini, or GPT-4 Turbo
Skin: Choose from 8 visual themes
Personality: Playful, Formal, Casual, Philosophical, or Energetic
Notifications: Enable/disable desktop notifications
Settings are persisted locally in SQLite and never leave your machine.

Project Structure
src/
├── main/
│   ├── index.ts              # Electron main process
│   └── preload.ts            # Context bridge API
├── renderer/
│   ├── main.tsx              # React entry
│   ├── App.tsx               # Root component
│   ├── components/
│   │   ├── shell/
│   │   │   ├── SnailEngine.ts     # PixiJS animation engine
│   │   │   └── SnailContainer.tsx  # React-PixiJS bridge
│   │   ├── dialogue/
│   │   │   └── DialoguePanel.tsx   # Chat UI
│   │   ├── ui/
│   │   │   └── ContextMenu.tsx     # Right-click menu
│   │   ├── panels/                # Feature panels
│   │   │   ├── TodoPanel.tsx
│   │   │   ├── NotesPanel.tsx
│   │   │   ├── ReminderPanel.tsx
│   │   │   ├── PomodoroPanel.tsx
│   │   │   ├── HabitPanel.tsx
│   │   │   ├── CalendarPanel.tsx
│   │   │   └── SettingsPanel.tsx
│   │   └── overlays/
│   │       └── NotificationOverlay.tsx
│   ├── store/
│   │   └── useStore.ts           # Zustand state
│   └── styles/
│       └── globals.css           # TailwindCSS + glassmorphism
├── shared/
│   └── types.ts                  # Shared TypeScript types
├── db/
│   ├── database.ts               # SQLite initialization
│   └── repository.ts             # Data access layer
└── ai/
    └── service.ts                # OpenAI API client
AI Tool Calling
Snail supports 10 built-in tools that the AI can invoke:

Tool	Description
create_todo	Create a to-do item
create_reminder	Set a reminder with recurrence
create_note	Create a sticky note
create_calendar_event	Schedule a calendar event
start_pomodoro	Start a focus timer
create_habit	Track a new habit
open_app	Launch an application
search_files	Open file dialog
remember	Save to memory
notify	Show desktop notification
License
MIT
