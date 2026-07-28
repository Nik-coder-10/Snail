import { create } from 'zustand';
import type {
  SnailState, EmotionalState, AnimationState,
  Direction, Edge, Position, ChatMessage,
  TodoItem, TodoList, StickyNote, Reminder,
  PomodoroSession, Habit, UserPreferences, CalendarEvent
} from '../../shared/types';

interface AppStore {
  // Snail state
  snail: SnailState;
  setSnailPosition: (pos: Position) => void;
  setSnailAnimation: (anim: AnimationState) => void;
  setSnailEmotion: (emotion: EmotionalState) => void;
  setSnailDirection: (dir: Direction) => void;
  setSnailEdge: (edge: Edge) => void;
  setSnailVisible: (visible: boolean) => void;
  setSnailDragging: (dragging: boolean) => void;
  setSnailSleeping: (sleeping: boolean) => void;
  setSnailScale: (scale: number) => void;
  setSnailSkin: (skin: string) => void;

  // UI state
  showChat: boolean;
  setShowChat: (show: boolean) => void;
  showContextMenu: boolean;
  contextMenuPos: Position;
  setShowContextMenu: (show: boolean, pos?: Position) => void;
  activePanel: string | null;
  setActivePanel: (panel: string | null) => void;

  // Chat
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  streamedContent: string;
  setStreamedContent: (content: string) => void;
  appendStreamedContent: (chunk: string) => void;

  // User input
  userInput: string;
  setUserInput: (input: string) => void;

  // Data
  todos: TodoItem[];
  setTodos: (todos: TodoItem[]) => void;
  todoLists: TodoList[];
  setTodoLists: (lists: TodoList[]) => void;
  notes: StickyNote[];
  setNotes: (notes: StickyNote[]) => void;
  reminders: Reminder[];
  setReminders: (reminders: Reminder[]) => void;
  pomodoroSessions: PomodoroSession[];
  setPomodoroSessions: (sessions: PomodoroSession[]) => void;
  habits: Habit[];
  setHabits: (habits: Habit[]) => void;
  calendarEvents: CalendarEvent[];
  setCalendarEvents: (events: CalendarEvent[]) => void;

  // Preferences
  preferences: UserPreferences;
  setPreferences: (prefs: UserPreferences) => void;

  // API readiness
  isApiReady: boolean;
  setIsApiReady: (ready: boolean) => void;

  // Pomodoro active
  activePomodoro: PomodoroSession | null;
  setActivePomodoro: (session: PomodoroSession | null) => void;
  pomodoroTimeLeft: number;
  setPomodoroTimeLeft: (time: number) => void;
  pomodoroRunning: boolean;
  setPomodoroRunning: (running: boolean) => void;
}

const defaultSnailState: SnailState = {
  position: { x: 200, y: 150 },
  animation: 'spawning',
  emotion: 'happy',
  direction: 'right',
  currentEdge: 'bottom',
  isVisible: true,
  isDragging: false,
  isSleeping: false,
  lastInteraction: Date.now(),
  scale: 1,
  opacity: 1,
  skin: 'classic',
  personality: {
    name: 'Shellby',
    traits: ['friendly', 'curious', 'helpful'],
    speechStyle: 'playful',
    responseSpeed: 1,
    humorLevel: 0.7,
  },
};

const defaultPreferences: UserPreferences = {
  apiKey: '',
  apiEndpoint: 'https://api.openai.com/v1',
  model: 'gpt-4o',
  skin: 'classic',
  autoSpawn: true,
  idleTimeout: 300,
  speechEnabled: false,
  personality: defaultSnailState.personality,
  theme: 'auto',
  movementSpeed: 1,
  soundEnabled: true,
  notificationsEnabled: true,
};

export const useStore = create<AppStore>((set) => ({
  snail: { ...defaultSnailState },
  setSnailPosition: (pos) => set((s) => ({ snail: { ...s.snail, position: pos } })),
  setSnailAnimation: (anim) => set((s) => ({ snail: { ...s.snail, animation: anim } })),
  setSnailEmotion: (emotion) => set((s) => ({ snail: { ...s.snail, emotion } })),
  setSnailDirection: (dir) => set((s) => ({ snail: { ...s.snail, direction: dir } })),
  setSnailEdge: (edge) => set((s) => ({ snail: { ...s.snail, currentEdge: edge } })),
  setSnailVisible: (visible) => set((s) => ({
    snail: { ...s.snail, isVisible: visible, opacity: visible ? 1 : 0 }
  })),
  setSnailDragging: (dragging) => set((s) => ({
    snail: { ...s.snail, isDragging: dragging }
  })),
  setSnailSleeping: (sleeping) => set((s) => ({
    snail: { ...s.snail, isSleeping: sleeping }
  })),
  setSnailScale: (scale) => set((s) => ({ snail: { ...s.snail, scale } })),
  setSnailSkin: (skin) => set((s) => ({ snail: { ...s.snail, skin } })),

  showChat: false,
  setShowChat: (show) => set({ showChat: show }),
  showContextMenu: false,
  contextMenuPos: { x: 0, y: 0 },
  setShowContextMenu: (show, pos) => set({
    showContextMenu: show,
    contextMenuPos: pos || { x: 0, y: 0 }
  }),
  activePanel: null,
  setActivePanel: (panel) => set({ activePanel: panel }),

  messages: [],
  addMessage: (msg) => set((s) => ({
    messages: [...s.messages, msg]
  })),
  clearMessages: () => set({ messages: [] }),
  isStreaming: false,
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  streamedContent: '',
  setStreamedContent: (content) => set({ streamedContent: content }),
  appendStreamedContent: (chunk) => set((s) => ({
    streamedContent: s.streamedContent + chunk
  })),

  userInput: '',
  setUserInput: (input) => set({ userInput: input }),

  todos: [],
  setTodos: (todos) => set({ todos }),
  todoLists: [],
  setTodoLists: (lists) => set({ todoLists: lists }),
  notes: [],
  setNotes: (notes) => set({ notes }),
  reminders: [],
  setReminders: (reminders) => set({ reminders }),
  pomodoroSessions: [],
  setPomodoroSessions: (sessions) => set({ pomodoroSessions: sessions }),
  habits: [],
  setHabits: (habits) => set({ habits }),
  calendarEvents: [],
  setCalendarEvents: (events) => set({ calendarEvents: events }),

  preferences: defaultPreferences,
  setPreferences: (prefs) => set({ preferences: prefs }),

  isApiReady: false,
  setIsApiReady: (ready) => set({ isApiReady: ready }),

  activePomodoro: null,
  setActivePomodoro: (session) => set({ activePomodoro: session }),
  pomodoroTimeLeft: 0,
  setPomodoroTimeLeft: (time) => set({ pomodoroTimeLeft: time }),
  pomodoroRunning: false,
  setPomodoroRunning: (running) => set({ pomodoroRunning: running }),
}));
