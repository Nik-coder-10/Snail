import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('snailAPI', {
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke('notification:show', { title, body }),

  readClipboard: () => ipcRenderer.invoke('clipboard:read'),
  writeClipboard: (text: string) => ipcRenderer.invoke('clipboard:write', text),

  openFile: (filePath: string) => ipcRenderer.invoke('file:open', filePath),
  openApp: (appName: string) => ipcRenderer.invoke('app:open', appName),
  openURL: (url: string) => ipcRenderer.invoke('url:open', url),

  openFileDialog: () => ipcRenderer.invoke('dialog:open'),

  getScreenBounds: () => ipcRenderer.invoke('window:getScreenBounds'),

  startDrag: () => ipcRenderer.send('window:startDrag'),
  stopDrag: () => ipcRenderer.send('window:stopDrag'),

  onDraggingChange: (callback: (dragging: boolean) => void) => {
    ipcRenderer.on('dragging', (_event, dragging) => callback(dragging));
  },

  onReminderTrigger: (callback: (reminder: unknown) => void) => {
    ipcRenderer.on('reminder:trigger', (_event, reminder) => callback(reminder));
  },

  onNavigate: (callback: (page: string) => void) => {
    ipcRenderer.on('navigate', (_event, page) => callback(page));
  },

  // Database API
  db: {
    todos: {
      getAll: () => ipcRenderer.invoke('db:todos:getAll'),
      create: (todo: unknown) => ipcRenderer.invoke('db:todos:create', todo),
      update: (id: string, updates: unknown) => ipcRenderer.invoke('db:todos:update', id, updates),
      delete: (id: string) => ipcRenderer.invoke('db:todos:delete', id),
    },
    lists: {
      getAll: () => ipcRenderer.invoke('db:lists:getAll'),
      create: (list: unknown) => ipcRenderer.invoke('db:lists:create', list),
    },
    notes: {
      getAll: () => ipcRenderer.invoke('db:notes:getAll'),
      create: (note: unknown) => ipcRenderer.invoke('db:notes:create', note),
      update: (id: string, updates: unknown) => ipcRenderer.invoke('db:notes:update', id, updates),
      delete: (id: string) => ipcRenderer.invoke('db:notes:delete', id),
    },
    reminders: {
      getAll: () => ipcRenderer.invoke('db:reminders:getAll'),
      create: (reminder: unknown) => ipcRenderer.invoke('db:reminders:create', reminder),
      delete: (id: string) => ipcRenderer.invoke('db:reminders:delete', id),
    },
    pomodoro: {
      getAll: () => ipcRenderer.invoke('db:pomodoro:getAll'),
      create: (session: unknown) => ipcRenderer.invoke('db:pomodoro:create', session),
      update: (id: string, updates: unknown) => ipcRenderer.invoke('db:pomodoro:update', id, updates),
    },
    habits: {
      getAll: () => ipcRenderer.invoke('db:habits:getAll'),
      create: (habit: unknown) => ipcRenderer.invoke('db:habits:create', habit),
      complete: (id: string, date: string) => ipcRenderer.invoke('db:habits:complete', id, date),
    },
    chat: {
      getHistory: () => ipcRenderer.invoke('db:chat:getHistory'),
      save: (msg: unknown) => ipcRenderer.invoke('db:chat:save', msg),
      clear: () => ipcRenderer.invoke('db:chat:clear'),
    },
    calendar: {
      getAll: (start?: number, end?: number) => ipcRenderer.invoke('db:calendar:getAll', start, end),
      create: (event: unknown) => ipcRenderer.invoke('db:calendar:create', event),
      delete: (id: string) => ipcRenderer.invoke('db:calendar:delete', id),
    },
    prefs: {
      get: () => ipcRenderer.invoke('db:prefs:get'),
      set: (key: string, value: unknown) => ipcRenderer.invoke('db:prefs:set', key, value),
    },
    memory: {
      save: (content: string, category?: string, importance?: number) =>
        ipcRenderer.invoke('db:memory:save', content, category, importance),
      search: (query: string, limit?: number) =>
        ipcRenderer.invoke('db:memory:search', query, limit),
    },
  },
});
