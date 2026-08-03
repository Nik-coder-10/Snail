interface SnailAPI {
  showNotification: (title: string, body: string) => Promise<void>;
  readClipboard: () => Promise<string>;
  writeClipboard: (text: string) => Promise<void>;
  openFile: (filePath: string) => Promise<void>;
  openApp: (appName: string) => Promise<void>;
  openURL: (url: string) => Promise<void>;
  openFileDialog: () => Promise<string[]>;
  getScreenBounds: () => Promise<{ x: number; y: number; width: number; height: number }>;
  /** Cursor location only; no window or user-content inspection. */
  getCursorPoint: () => Promise<{ x: number; y: number }>;
  startDrag: () => void;
  stopDrag: () => void;
  hideWindow: () => void;
  showWindow: () => void;
  onDraggingChange: (callback: (dragging: boolean) => void) => void;
  onReminderTrigger: (callback: (reminder: { title: string; description?: string; id: string }) => void) => void;
  onNavigate: (callback: (page: string) => void) => void;

  db: {
    todos: {
      getAll: () => Promise<{ id: string; title: string; completed: boolean; priority: string; dueDate?: number; listId: string; createdAt: number; updatedAt: number }[]>;
      create: (todo: Record<string, unknown>) => Promise<{ id: string; title: string; completed: boolean; priority: string; dueDate?: number; listId: string; createdAt: number; updatedAt: number }>;
      update: (id: string, updates: Record<string, unknown>) => Promise<void>;
      delete: (id: string) => Promise<void>;
    };
    lists: {
      getAll: () => Promise<{ id: string; name: string; color: string; icon: string }[]>;
      create: (list: Record<string, unknown>) => Promise<{ id: string; name: string; color: string; icon: string }>;
    };
    notes: {
      getAll: () => Promise<{ id: string; title: string; content: string; color: string; position: { x: number; y: number }; size: { width: number; height: number }; createdAt: number; updatedAt: number; pinned: boolean }[]>;
      create: (note: Record<string, unknown>) => Promise<{ id: string; title: string; content: string; color: string; position: { x: number; y: number }; size: { width: number; height: number }; createdAt: number; updatedAt: number; pinned: boolean }>;
      update: (id: string, updates: Record<string, unknown>) => Promise<void>;
      delete: (id: string) => Promise<void>;
    };
    reminders: {
      getAll: () => Promise<{ id: string; title: string; description?: string; triggerAt: number; recurring?: { pattern: string; interval: number }; completed: boolean; createdAt: number }[]>;
      create: (reminder: Record<string, unknown>) => Promise<{ id: string; title: string; description?: string; triggerAt: number; recurring?: { pattern: string; interval: number }; completed: boolean; createdAt: number }>;
      delete: (id: string) => Promise<void>;
    };
    pomodoro: {
      getAll: () => Promise<{ id: string; startTime: number; endTime?: number; duration: number; breakDuration: number; type: string; completed: boolean; task?: string }[]>;
      create: (session: Record<string, unknown>) => Promise<{ id: string; startTime: number; endTime?: number; duration: number; breakDuration: number; type: string; completed: boolean; task?: string }>;
      update: (id: string, updates: Record<string, unknown>) => Promise<void>;
    };
    habits: {
      getAll: () => Promise<{ id: string; name: string; description?: string; frequency: string; target: number; streak: number; completions: Record<string, boolean>; color: string; icon: string; createdAt: number }[]>;
      create: (habit: Record<string, unknown>) => Promise<{ id: string; name: string; description?: string; frequency: string; target: number; streak: number; completions: Record<string, boolean>; color: string; icon: string; createdAt: number }>;
      complete: (id: string, date: string) => Promise<void>;
    };
    chat: {
      getHistory: () => Promise<unknown[]>;
      save: (msg: unknown) => Promise<void>;
      clear: () => Promise<void>;
    };
    calendar: {
      getAll: (start?: number, end?: number) => Promise<{ id: string; title: string; description?: string; startTime: number; endTime: number; location?: string; allDay: boolean; reminder?: number; recurrence?: string }[]>;
      create: (event: Record<string, unknown>) => Promise<{ id: string; title: string; description?: string; startTime: number; endTime: number; location?: string; allDay: boolean; reminder?: number; recurrence?: string }>;
      delete: (id: string) => Promise<void>;
    };
    prefs: {
      get: () => Promise<{
        apiKey: string;
        apiEndpoint: string;
        model: string;
        skin: string;
        autoSpawn: boolean;
        idleTimeout: number;
        speechEnabled: boolean;
        personality: { name: string; traits: string[]; speechStyle: 'formal' | 'casual' | 'playful' | 'philosophical' | 'energetic'; responseSpeed: number; humorLevel: number; };
        theme: 'light' | 'dark' | 'auto';
        movementSpeed: number;
        soundEnabled: boolean;
        notificationsEnabled: boolean;
      }>;
      set: (key: string, value: unknown) => Promise<void>;
    };
    memory: {
      save: (content: string, category?: string, importance?: number) => Promise<void>;
      search: (query: string, limit?: number) => Promise<unknown[]>;
    };
  };
}

declare global {
  interface Window {
    snailAPI: SnailAPI;
  }
}

export {};
