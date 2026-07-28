import { Database } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './database';
import type {
  TodoItem, TodoList, StickyNote, Reminder,
  PomodoroSession, Habit, ChatMessage, UserPreferences,
  CalendarEvent
} from '../shared/types';

function db(): Database { return getDatabase(); }

// --- Todo ---
export function getTodos(listId?: string): TodoItem[] {
  const sql = listId
    ? 'SELECT * FROM todos WHERE list_id = ? ORDER BY created_at DESC'
    : 'SELECT * FROM todos ORDER BY created_at DESC';
  return db().prepare(sql).all(...(listId ? [listId] : [])) as TodoItem[];
}

export function createTodo(todo: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'>): TodoItem {
  const id = uuidv4();
  const now = Date.now();
  db().prepare(`INSERT INTO todos (id, title, completed, priority, due_date, list_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, todo.title, todo.completed ? 1 : 0, todo.priority, todo.dueDate, todo.listId, now, now);
  return { ...todo, id, createdAt: now, updatedAt: now };
}

export function updateTodo(id: string, updates: Partial<TodoItem>): void {
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(updates)) {
    const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    fields.push(`${col} = ?`);
    values.push(key === 'completed' ? (value ? 1 : 0) : value);
  }
  fields.push('updated_at = ?');
  values.push(Date.now());
  values.push(id);
  db().prepare(`UPDATE todos SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteTodo(id: string): void {
  db().prepare('DELETE FROM todos WHERE id = ?').run(id);
}

export function getTodoLists(): TodoList[] {
  return db().prepare('SELECT * FROM todo_lists').all() as TodoList[];
}

export function createTodoList(list: Omit<TodoList, 'id'>): TodoList {
  const id = uuidv4();
  db().prepare('INSERT INTO todo_lists (id, name, color, icon) VALUES (?, ?, ?, ?)').run(id, list.name, list.color, list.icon);
  return { ...list, id };
}

// --- Notes ---
export function getNotes(): StickyNote[] {
  return db().prepare('SELECT * FROM sticky_notes ORDER BY updated_at DESC').all() as StickyNote[];
}

export function createNote(note: Omit<StickyNote, 'id' | 'createdAt' | 'updatedAt'>): StickyNote {
  const id = uuidv4();
  const now = Date.now();
  db().prepare(`INSERT INTO sticky_notes (id, title, content, color, pos_x, pos_y, width, height, created_at, updated_at, pinned)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, note.title, note.content, note.color, note.position.x, note.position.y, note.size.width, note.size.height, now, now, note.pinned ? 1 : 0);
  return { ...note, id, createdAt: now, updatedAt: now };
}

export function updateNote(id: string, updates: Partial<StickyNote>): void {
  const flatten = flattenStickyNote(updates);
  const fields = Object.keys(flatten).map(k => `${k} = ?`).join(', ');
  const values = Object.values(flatten);
  values.push(id);
  db().prepare(`UPDATE sticky_notes SET ${fields} WHERE id = ?`).run(...values);
}

export function deleteNote(id: string): void {
  db().prepare('DELETE FROM sticky_notes WHERE id = ?').run(id);
}

function flattenStickyNote(note: Partial<StickyNote>): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  if (note.title !== undefined) flat.title = note.title;
  if (note.content !== undefined) flat.content = note.content;
  if (note.color !== undefined) flat.color = note.color;
  if (note.position) { flat.pos_x = note.position.x; flat.pos_y = note.position.y; }
  if (note.size) { flat.width = note.size.width; flat.height = note.size.height; }
  if (note.pinned !== undefined) flat.pinned = note.pinned ? 1 : 0;
  flat.updated_at = Date.now();
  return flat;
}

// --- Reminders ---
export function getReminders(): Reminder[] {
  return db().prepare('SELECT * FROM reminders ORDER BY trigger_at ASC').all() as Reminder[];
}

export function createReminder(reminder: Omit<Reminder, 'id' | 'createdAt'>): Reminder {
  const id = uuidv4();
  const now = Date.now();
  db().prepare(`INSERT INTO reminders (id, title, description, trigger_at, recurring_pattern, recurring_interval, completed, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, reminder.title, reminder.description, reminder.triggerAt, reminder.recurring?.pattern, reminder.recurring?.interval, reminder.completed ? 1 : 0, now);
  return { ...reminder, id, createdAt: now };
}

export function deleteReminder(id: string): void {
  db().prepare('DELETE FROM reminders WHERE id = ?').run(id);
}

// --- Pomodoro ---
export function getPomodoroSessions(): PomodoroSession[] {
  return db().prepare('SELECT * FROM pomodoro_sessions ORDER BY start_time DESC LIMIT 50').all() as PomodoroSession[];
}

export function createPomodoroSession(session: Omit<PomodoroSession, 'id'>): PomodoroSession {
  const id = uuidv4();
  db().prepare(`INSERT INTO pomodoro_sessions (id, start_time, end_time, duration, break_duration, type, completed, task)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, session.startTime, session.endTime, session.duration, session.breakDuration, session.type, session.completed ? 1 : 0, session.task);
  return { ...session, id };
}

export function updatePomodoroSession(id: string, updates: Partial<PomodoroSession>): void {
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(updates)) {
    const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    fields.push(`${col} = ?`);
    values.push(key === 'completed' ? (value ? 1 : 0) : value);
  }
  values.push(id);
  db().prepare(`UPDATE pomodoro_sessions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

// --- Habits ---
export function getHabits(): Habit[] {
  return db().prepare('SELECT * FROM habits ORDER BY created_at ASC').all() as Habit[];
}

export function createHabit(habit: Omit<Habit, 'id' | 'streak' | 'completions' | 'createdAt'>): Habit {
  const id = uuidv4();
  const now = Date.now();
  db().prepare(`INSERT INTO habits (id, name, description, frequency, target, streak, completions, color, icon, created_at)
    VALUES (?, ?, ?, ?, ?, 0, '{}', ?, ?, ?)`)
    .run(id, habit.name, habit.description, habit.frequency, habit.target, habit.color, habit.icon, now);
  return { ...habit, id, streak: 0, completions: {}, createdAt: now };
}

export function completeHabit(id: string, date: string): void {
  const habit = db().prepare('SELECT completions, streak FROM habits WHERE id = ?').get(id) as { completions: string; streak: number } | undefined;
  if (!habit) return;
  const completions = JSON.parse(habit.completions);
  completions[date] = true;
  const streak = habit.streak + 1;
  db().prepare('UPDATE habits SET completions = ?, streak = ? WHERE id = ?').run(JSON.stringify(completions), streak, id);
}

// --- Chat ---
export function getChatHistory(limit = 100): ChatMessage[] {
  return db().prepare('SELECT * FROM chat_history ORDER BY timestamp ASC LIMIT ?').all(limit) as ChatMessage[];
}

export function saveChatMessage(msg: ChatMessage): void {
  db().prepare('INSERT OR REPLACE INTO chat_history (id, role, content, timestamp, emotion) VALUES (?, ?, ?, ?, ?)')
    .run(msg.id, msg.role, msg.content, msg.timestamp, msg.emotion || null);
}

export function clearChatHistory(): void {
  db().prepare('DELETE FROM chat_history').run();
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

  const rows = db().prepare('SELECT key, value FROM preferences').all() as { key: string; value: string }[];
  const stored: Record<string, unknown> = {};
  for (const row of rows) {
    try { stored[row.key] = JSON.parse(row.value); } catch { stored[row.key] = row.value; }
  }
  return { ...defaults, ...stored } as UserPreferences;
}

export function setPreference(key: string, value: unknown): void {
  db().prepare('INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
}

// --- Calendar ---
export function getCalendarEvents(start?: number, end?: number): CalendarEvent[] {
  let sql = 'SELECT * FROM calendar_events';
  const params: number[] = [];
  if (start !== undefined && end !== undefined) {
    sql += ' WHERE start_time >= ? AND end_time <= ?';
    params.push(start, end);
  }
  sql += ' ORDER BY start_time ASC';
  return db().prepare(sql).all(...params) as CalendarEvent[];
}

export function createCalendarEvent(event: Omit<CalendarEvent, 'id'>): CalendarEvent {
  const id = uuidv4();
  db().prepare(`INSERT INTO calendar_events (id, title, description, start_time, end_time, location, all_day, reminder, recurrence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, event.title, event.description, event.startTime, event.endTime, event.location, event.allDay ? 1 : 0, event.reminder, event.recurrence);
  return { ...event, id };
}

export function deleteCalendarEvent(id: string): void {
  db().prepare('DELETE FROM calendar_events WHERE id = ?').run(id);
}

// --- Memories ---
export function saveMemory(content: string, category = 'general', importance = 0.5): void {
  const id = uuidv4();
  const now = Date.now();
  db().prepare('INSERT INTO memories (id, content, category, importance, created_at, last_accessed) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, content, category, importance, now, now);
}

export function searchMemories(query: string, limit = 5): { content: string; category: string }[] {
  return db().prepare('SELECT content, category FROM memories WHERE content LIKE ? ORDER BY importance DESC LIMIT ?')
    .all(`%${query}%`, limit) as { content: string; category: string }[];
}
