import { app, BrowserWindow, screen, ipcMain, globalShortcut, Tray, Menu, Notification, clipboard, shell, dialog } from 'electron';
import path from 'path';
import { initDatabase, closeDatabase } from '../db/database';
import * as repo from '../db/repository';
import type { Reminder } from '../shared/types';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let reminderTimer: ReturnType<typeof setInterval> | null = null;

function createWindow(): void {
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: screenW,
    height: screenH,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true);
  mainWindow.setIgnoreMouseEvents(false);

  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'bottom' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray(): void {
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
  try {
    tray = new Tray(iconPath);
  } catch {
    // Use nativeImage as fallback
    const { nativeImage } = require('electron');
    const img = nativeImage.createEmpty();
    tray = new Tray(img);
  }
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Snail', click: () => mainWindow?.show() },
    { label: 'Hide Snail', click: () => mainWindow?.hide() },
    { type: 'separator' },
    { label: 'Settings', click: () => mainWindow?.webContents.send('navigate', 'settings') },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setToolTip('Snail - Desktop Companion');
  tray.setContextMenu(contextMenu);
}

function registerIPC(): void {
  ipcMain.handle('notification:show', (_event, { title, body }: { title: string; body: string }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  });

  ipcMain.handle('reminder:create', (_event, reminder: Reminder) => {
    return repo.createReminder(reminder);
  });

  ipcMain.handle('reminder:delete', (_event, id: string) => {
    repo.deleteReminder(id);
  });

  ipcMain.handle('clipboard:read', () => {
    return clipboard.readText();
  });

  ipcMain.handle('clipboard:write', (_event, text: string) => {
    clipboard.writeText(text);
  });

  ipcMain.handle('file:open', async (_event, filePath: string) => {
    return shell.openPath(filePath);
  });

  ipcMain.handle('app:open', async (_event, appName: string) => {
    return shell.openPath(appName);
  });

  ipcMain.handle('url:open', async (_event, url: string) => {
    return shell.openExternal(url);
  });

  ipcMain.handle('dialog:open', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
    });
    return result.filePaths;
  });

  // Database operations
  ipcMain.handle('db:todos:getAll', () => repo.getTodos());
  ipcMain.handle('db:todos:create', (_e, todo) => repo.createTodo(todo));
  ipcMain.handle('db:todos:update', (_e, id, updates) => repo.updateTodo(id, updates));
  ipcMain.handle('db:todos:delete', (_e, id) => repo.deleteTodo(id));
  ipcMain.handle('db:lists:getAll', () => repo.getTodoLists());
  ipcMain.handle('db:lists:create', (_e, list) => repo.createTodoList(list));

  ipcMain.handle('db:notes:getAll', () => repo.getNotes());
  ipcMain.handle('db:notes:create', (_e, note) => repo.createNote(note));
  ipcMain.handle('db:notes:update', (_e, id, updates) => repo.updateNote(id, updates));
  ipcMain.handle('db:notes:delete', (_e, id) => repo.deleteNote(id));

  ipcMain.handle('db:reminders:getAll', () => repo.getReminders());
  ipcMain.handle('db:reminders:create', (_e, reminder) => repo.createReminder(reminder));
  ipcMain.handle('db:reminders:delete', (_e, id) => repo.deleteReminder(id));

  ipcMain.handle('db:pomodoro:getAll', () => repo.getPomodoroSessions());
  ipcMain.handle('db:pomodoro:create', (_e, session) => repo.createPomodoroSession(session));
  ipcMain.handle('db:pomodoro:update', (_e, id, updates) => repo.updatePomodoroSession(id, updates));

  ipcMain.handle('db:habits:getAll', () => repo.getHabits());
  ipcMain.handle('db:habits:create', (_e, habit) => repo.createHabit(habit));
  ipcMain.handle('db:habits:complete', (_e, id, date) => repo.completeHabit(id, date));

  ipcMain.handle('db:chat:getHistory', () => repo.getChatHistory());
  ipcMain.handle('db:chat:save', (_e, msg) => repo.saveChatMessage(msg));
  ipcMain.handle('db:chat:clear', () => repo.clearChatHistory());

  ipcMain.handle('db:calendar:getAll', (_e, start?, end?) => repo.getCalendarEvents(start, end));
  ipcMain.handle('db:calendar:create', (_e, event) => repo.createCalendarEvent(event));
  ipcMain.handle('db:calendar:delete', (_e, id) => repo.deleteCalendarEvent(id));

  ipcMain.handle('db:prefs:get', () => repo.getPreferences());
  ipcMain.handle('db:prefs:set', (_e, key, value) => repo.setPreference(key, value));

  ipcMain.handle('db:memory:save', (_e, content, category, importance) => repo.saveMemory(content, category, importance));
  ipcMain.handle('db:memory:search', (_e, query, limit) => repo.searchMemories(query, limit));

  // Window controls for dragging snail
  ipcMain.on('window:startDrag', () => {
    mainWindow?.webContents.send('dragging', true);
  });

  ipcMain.on('window:stopDrag', () => {
    mainWindow?.webContents.send('dragging', false);
  });

  ipcMain.on('window:hide', () => {
    mainWindow?.hide();
  });

  ipcMain.on('window:show', () => {
    mainWindow?.show();
  });

  ipcMain.handle('window:getScreenBounds', () => {
    return screen.getPrimaryDisplay().workArea;
  });
}

function startReminderChecker(): void {
  reminderTimer = setInterval(() => {
    const reminders = repo.getReminders();
    const now = Date.now();

    for (const reminder of reminders) {
      if (!reminder.completed && reminder.triggerAt <= now) {
        mainWindow?.webContents.send('reminder:trigger', reminder);

        if (reminder.recurring) {
          const next = (reminder.recurring.interval || 1) * getIntervalMs(reminder.recurring.pattern);
          repo.deleteReminder(reminder.id);
          const { id: _id, createdAt: _createdAt, ...rest } = { ...reminder, triggerAt: reminder.triggerAt + next };
          repo.createReminder(rest);
        } else {
          repo.deleteReminder(reminder.id);
        }
      }
    }
  }, 10000);
}

function getIntervalMs(pattern: string): number {
  switch (pattern) {
    case 'daily': return 86400000;
    case 'weekly': return 604800000;
    case 'monthly': return 2592000000;
    default: return 3600000;
  }
}

app.whenReady().then(() => {
  initDatabase();
  createWindow();
  createTray();
  registerIPC();
  startReminderChecker();

  globalShortcut.register('CommandOrControl+Shift+S', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', () => {
  if (reminderTimer) clearInterval(reminderTimer);
  globalShortcut.unregisterAll();
  closeDatabase();
});
