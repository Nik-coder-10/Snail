import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

const DB_DIR = '.';
let dataDir: string;

interface StoreData {
  todos: unknown[];
  todoLists: unknown[];
  stickyNotes: unknown[];
  reminders: unknown[];
  pomodoroSessions: unknown[];
  habits: unknown[];
  chatHistory: unknown[];
  preferences: Record<string, unknown>;
  calendarEvents: unknown[];
  memories: unknown[];
}

const defaultData: StoreData = {
  todos: [],
  todoLists: [],
  stickyNotes: [],
  reminders: [],
  pomodoroSessions: [],
  habits: [],
  chatHistory: [],
  preferences: {},
  calendarEvents: [],
  memories: [],
};

let store: StoreData = { ...defaultData };

function storePath(): string {
  return path.join(dataDir, 'snail-data.json');
}

function loadStore(): void {
  try {
    if (fs.existsSync(storePath())) {
      const raw = fs.readFileSync(storePath(), 'utf-8');
      const loaded = JSON.parse(raw);
      store = { ...defaultData, ...loaded };
    }
  } catch {
    store = { ...defaultData };
  }
}

function saveStore(): void {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(storePath(), JSON.stringify(store, null, 2), 'utf-8');
  } catch {
    // silently fail - data will be in memory
  }
}

export function initDatabase(): void {
  dataDir = app.getPath('userData');
  loadStore();
}

export function getDatabase() {
  return {
    get todos() { return store.todos; },
    set todos(v) { store.todos = v; saveStore(); },
    get todoLists() { return store.todoLists; },
    set todoLists(v) { store.todoLists = v; saveStore(); },
    get stickyNotes() { return store.stickyNotes; },
    set stickyNotes(v) { store.stickyNotes = v; saveStore(); },
    get reminders() { return store.reminders; },
    set reminders(v) { store.reminders = v; saveStore(); },
    get pomodoroSessions() { return store.pomodoroSessions; },
    set pomodoroSessions(v) { store.pomodoroSessions = v; saveStore(); },
    get habits() { return store.habits; },
    set habits(v) { store.habits = v; saveStore(); },
    get chatHistory() { return store.chatHistory; },
    set chatHistory(v) { store.chatHistory = v; saveStore(); },
    get preferences() { return store.preferences; },
    set preferences(v) { store.preferences = v; saveStore(); },
    get calendarEvents() { return store.calendarEvents; },
    set calendarEvents(v) { store.calendarEvents = v; saveStore(); },
    get memories() { return store.memories; },
    set memories(v) { store.memories = v; saveStore(); },
  };
}

export function closeDatabase(): void {
  // no-op with JSON storage
}
