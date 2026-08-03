export type EmotionalState =
  | 'idle'
  | 'happy'
  | 'curious'
  | 'sleepy'
  | 'thinking'
  | 'excited'
  | 'confused'
  | 'celebrating'
  | 'listening'
  | 'working'
  | 'surprised'
  | 'grateful'
  | 'focused'
  | 'hungry'
  | 'scared'
  | 'proud'
  | 'embarrassed'
  | 'relaxed'
  | 'playful';

export type AnimationState =
  | 'spawning'
  | 'idle'
  | 'walking'
  | 'turning'
  | 'climbing'
  | 'falling'
  | 'sleeping'
  | 'waving'
  | 'dancing'
  | 'celebrating'
  | 'thinking'
  | 'listening'
  | 'talking'
  | 'eating'
  | 'petting'
  | 'hiding'
  | 'happy';

export type Edge = 'bottom' | 'top' | 'left' | 'right';

export type Direction = 'left' | 'right' | 'up' | 'down';

export interface Position {
  x: number;
  y: number;
}

export interface MovementPath {
  from: Position;
  to: Position;
  edge: Edge;
  direction: Direction;
  duration: number;
  curve: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'sine-wave';
}

export interface SnailState {
  position: Position;
  animation: AnimationState;
  emotion: EmotionalState;
  direction: Direction;
  currentEdge: Edge;
  isVisible: boolean;
  isDragging: boolean;
  isSleeping: boolean;
  lastInteraction: number;
  scale: number;
  opacity: number;
  skin: string;
  personality: Personality;
}

export interface Personality {
  name: string;
  traits: string[];
  speechStyle: 'formal' | 'casual' | 'playful' | 'philosophical' | 'energetic';
  responseSpeed: number;
  humorLevel: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
  emotion?: EmotionalState;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: string;
}

export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: number;
  listId: string;
  createdAt: number;
  updatedAt: number;
}

export interface TodoList {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface StickyNote {
  id: string;
  title: string;
  content: string;
  color: string;
  position: Position;
  size: { width: number; height: number };
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  triggerAt: number;
  recurring?: {
    pattern: 'daily' | 'weekly' | 'monthly' | 'custom';
    interval: number;
  };
  completed: boolean;
  createdAt: number;
}

export interface PomodoroSession {
  id: string;
  startTime: number;
  endTime?: number;
  duration: number;
  breakDuration: number;
  type: 'focus' | 'short-break' | 'long-break';
  completed: boolean;
  task?: string;
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  target: number;
  streak: number;
  completions: Record<string, boolean>;
  color: string;
  icon: string;
  createdAt: number;
}

export interface UserPreferences {
  apiKey: string;
  apiEndpoint: string;
  model: string;
  skin: string;
  autoSpawn: boolean;
  idleTimeout: number;
  speechEnabled: boolean;
  personality: Personality;
  theme: 'light' | 'dark' | 'auto';
  movementSpeed: number;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: number;
  endTime: number;
  location?: string;
  allDay: boolean;
  reminder?: number;
  recurrence?: string;
}

export interface IPCChannels {
  'window:move': Position;
  'window:setSize': { width: number; height: number };
  'snail:setPosition': Position;
  'notification:show': { title: string; body: string };
  'reminder:create': Reminder;
  'reminder:trigger': Reminder;
  'db:query': { query: string; params?: unknown[] };
  'file:open': string;
  'app:open': string;
  'url:open': string;
  'clipboard:read': void;
  'clipboard:write': string;
  'preferences:get': void;
  'preferences:set': Partial<UserPreferences>;
}
