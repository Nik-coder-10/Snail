import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './database';
import type {
  TodoItem, TodoList, StickyNote, Reminder,
  PomodoroSession, Habit, ChatMessage, UserPreferences,
  CalendarEvent
} from '../shared/types';

function db() { return getDatabase(); }

// --- Todo ---
export function getTodos(listId?: string): TodoItem[] {
  const all = db().todos as TodoItem[];
  return listId
    ? all.filter(t => t.listId === listId)
    : all;
}

export function createTodo(todo: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'>): TodoItem {
  const id = uuidv4();
  const now = Date.now();
  const item: TodoItem = { ...todo, id, createdAt: now, updatedAt: now };
  db().todos = [...(db().todos as TodoItem[]), item];
  return item;
}

export function updateTodo(id: string, updates: Partial<TodoItem>): void {
  db().todos = (db().todos as TodoItem[]).map(t =>
    t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
  );
}

export function deleteTodo(id: string): void {
  db().todos = (db().todos as TodoItem[]).filter(t => t.id !== id);
}

export function getTodoLists(): TodoList[] {
  return db().todoLists as TodoList[];
}

export function createTodoList(list: Omit<TodoList, 'id'>): TodoList {
  const id = uuidv4();
  const item: TodoList = { ...list, id };
  db().todoLists = [...(db().todoLists as TodoList[]), item];
  return item;
}

// --- Notes ---
export function getNotes(): StickyNote[] {
  return (db().stickyNotes as StickyNote[]).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function createNote(note: Omit<StickyNote, 'id' | 'createdAt' | 'updatedAt'>): StickyNote {
  const id = uuidv4();
  const now = Date.now();
  const item: StickyNote = { ...note, id, createdAt: now, updatedAt: now };
  db().stickyNotes = [...(db().stickyNotes as StickyNote[]), item];
  return item;
}

export function updateNote(id: string, updates: Partial<StickyNote>): void {
  db().stickyNotes = (db().stickyNotes as StickyNote[]).map(n => {
    if (n.id !== id) return n;
    if (updates.position) { n.position = updates.position; }
    if (updates.size) { n.size = updates.size; }
    return { ...n, ...updates, updatedAt: Date.now() };
  });
}

export function deleteNote(id: string): void {
  db().stickyNotes = (db().stickyNotes as StickyNote[]).filter(n => n.id !== id);
}

// --- Reminders ---
export function getReminders(): Reminder[] {
  return (db().reminders as Reminder[]).sort((a, b) => a.triggerAt - b.triggerAt);
}

export function createReminder(reminder: Omit<Reminder, 'id' | 'createdAt'>): Reminder {
  const id = uuidv4();
  const now = Date.now();
  const item: Reminder = { ...reminder, id, createdAt: now };
  db().reminders = [...(db().reminders as Reminder[]), item];
  return item;
}

export function deleteReminder(id: string): void {
  db().reminders = (db().reminders as Reminder[]).filter(r => r.id !== id);
}

// --- Pomodoro ---
export function getPomodoroSessions(): PomodoroSession[] {
  return (db().pomodoroSessions as PomodoroSession[]).slice(0, 50);
}

export function createPomodoroSession(session: Omit<PomodoroSession, 'id'>): PomodoroSession {
  const id = uuidv4();
  const item: PomodoroSession = { ...session, id };
  db().pomodoroSessions = [item, ...(db().pomodoroSessions as PomodoroSession[])];
  return item;
}

export function updatePomodoroSession(id: string, updates: Partial<PomodoroSession>): void {
  db().pomodoroSessions = (db().pomodoroSessions as PomodoroSession[]).map(s =>
    s.id === id ? { ...s, ...updates } : s
  );
}

// --- Habits ---
export function getHabits(): Habit[] {
  return db().habits as Habit[];
}

export function createHabit(habit: Omit<Habit, 'id' | 'streak' | 'completions' | 'createdAt'>): Habit {
  const id = uuidv4();
  const now = Date.now();
  const item: Habit = { ...habit, id, streak: 0, completions: {}, createdAt: now };
  db().habits = [...(db().habits as Habit[]), item];
  return item;
}

export function completeHabit(id: string, date: string): void {
  db().habits = (db().habits as Habit[]).map(h => {
    if (h.id !== id) return h;
    const completions = { ...h.completions, [date]: true };
    return { ...h, completions, streak: h.streak + 1 };
  });
}

// --- Chat ---
export function getChatHistory(limit = 100): ChatMessage[] {
  return (db().chatHistory as ChatMessage[]).slice(-limit);
}

export function saveChatMessage(msg: ChatMessage): void {
  const history = db().chatHistory as ChatMessage[];
  const idx = history.findIndex(m => m.id === msg.id);
  if (idx >= 0) {
    history[idx] = msg;
  } else {
    history.push(msg);
  }
  db().chatHistory = history;
}

export function clearChatHistory(): void {
  db().chatHistory = [];
}

// --- Preferences ---
export function getPreferences(): UserPreferences {
  const defaults: UserPreferences = {
    apiKey: '',
    apiEndpoint: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    skin: 'classic',
    autoSpawn: true,
    idleTimeout: 300,
    speechEnabled: false,
    personality: {
      name: 'Shellby',
      traits: ['friendly', 'curious', 'helpful'],
      speechStyle: 'playful',
      responseSpeed: 1,
      humorLevel: 0.7,
    },
    theme: 'auto',
    movementSpeed: 1,
    soundEnabled: true,
    notificationsEnabled: true,
  };

  const stored = db().preferences as Record<string, string>;
  const result = { ...defaults };
  for (const [key, value] of Object.entries(stored)) {
    try {
      (result as Record<string, unknown>)[key] = JSON.parse(value);
    } catch {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

export function setPreference(key: string, value: unknown): void {
  const prefs = db().preferences as Record<string, string>;
  prefs[key] = JSON.stringify(value);
  db().preferences = prefs;
}

// --- Calendar ---
export function getCalendarEvents(start?: number, end?: number): CalendarEvent[] {
  let events = db().calendarEvents as CalendarEvent[];
  if (start !== undefined && end !== undefined) {
    events = events.filter(e => e.startTime >= start && e.endTime <= end);
  }
  return events.sort((a, b) => a.startTime - b.startTime);
}

export function createCalendarEvent(event: Omit<CalendarEvent, 'id'>): CalendarEvent {
  const id = uuidv4();
  const item: CalendarEvent = { ...event, id };
  db().calendarEvents = [...(db().calendarEvents as CalendarEvent[]), item];
  return item;
}

export function deleteCalendarEvent(id: string): void {
  db().calendarEvents = (db().calendarEvents as CalendarEvent[]).filter(e => e.id !== id);
}

// --- Memories ---
export function saveMemory(content: string, category = 'general', importance = 0.5): void {
  const id = uuidv4();
  const now = Date.now();
  const mem = { id, content, category, importance, createdAt: now, lastAccessed: now };
  db().memories = [...(db().memories as unknown[]), mem];
}

export function searchMemories(query: string, limit = 5): { content: string; category: string }[] {
  const memories = db().memories as Array<{ id: string; content: string; category: string; importance: number }>;
  return memories
    .filter(m => m.content.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, limit)
    .map(m => ({ content: m.content, category: m.category }));
}
