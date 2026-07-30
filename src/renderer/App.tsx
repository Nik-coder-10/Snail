import React, { useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useStore } from './store/useStore';
import { SnailContainer } from './components/shell/SnailContainer';
import { DialoguePanel } from './components/dialogue/DialoguePanel';
import { ContextMenu } from './components/ui/ContextMenu';
import { NotificationOverlay } from './components/overlays/NotificationOverlay';
import { TodoPanel } from './components/panels/TodoPanel';
import { NotesPanel } from './components/panels/NotesPanel';
import { ReminderPanel } from './components/panels/ReminderPanel';
import { PomodoroPanel } from './components/panels/PomodoroPanel';
import { HabitPanel } from './components/panels/HabitPanel';
import { CalendarPanel } from './components/panels/CalendarPanel';
import { SettingsPanel } from './components/panels/SettingsPanel';
import { AIService } from '../ai/service';
import { getBuiltInTools } from '../ai/service';
import type { ChatMessage, ToolCall } from '../shared/types';

const aiService = new AIService({
  apiKey: '',
  apiEndpoint: 'https://api.openai.com/v1',
  model: 'gpt-4o',
});

export default function App() {
  const {
    showChat, setShowChat,
    showContextMenu, setShowContextMenu,
    activePanel, setActivePanel,
    setSnailAnimation, setSnailEmotion,
    messages, addMessage,
    isStreaming, setIsStreaming,
    streamedContent, appendStreamedContent, setStreamedContent,
    preferences, setPreferences,
    isApiReady, setIsApiReady,
  } = useStore();

  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    loadPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await window.snailAPI.db.prefs.get();
      setPreferences(prefs);
      if (prefs.apiKey) {
        aiService.initialize({
          apiKey: prefs.apiKey,
          apiEndpoint: prefs.apiEndpoint,
          model: prefs.model,
        });
        setIsApiReady(true);
      }
    } catch {
      // Will use defaults
    }
  };

  const handleToolCall = useCallback(async (toolCall: ToolCall): Promise<string> => {
    try {
      switch (toolCall.name) {
        case 'create_todo': {
          const todo = await window.snailAPI.db.todos.create({
            title: toolCall.arguments.title as string,
            priority: (toolCall.arguments.priority as 'low' | 'medium' | 'high') || 'medium',
            dueDate: toolCall.arguments.dueDate ? new Date(toolCall.arguments.dueDate as string).getTime() : undefined,
            listId: (toolCall.arguments.listId as string) || 'default',
            completed: false,
          });
          return `Todo created: "${todo.title}"`;
        }
        case 'create_reminder': {
          const mins = toolCall.arguments.triggerInMinutes as number;
          const reminder = await window.snailAPI.db.reminders.create({
            title: toolCall.arguments.title as string,
            description: toolCall.arguments.description as string,
            triggerAt: Date.now() + mins * 60000,
            completed: false,
            recurring: toolCall.arguments.recurring && toolCall.arguments.recurring !== 'none'
              ? { pattern: toolCall.arguments.recurring as 'daily' | 'weekly' | 'monthly', interval: 1 }
              : undefined,
          });
          return `Reminder set for ${mins} minutes from now: "${reminder.title}"`;
        }
        case 'create_note': {
          const note = await window.snailAPI.db.notes.create({
            title: (toolCall.arguments.title as string) || '',
            content: toolCall.arguments.content as string,
            color: (toolCall.arguments.color as string) || '#fef3c7',
            position: { x: 100, y: 100 },
            size: { width: 250, height: 200 },
            pinned: false,
          });
          return `Note created: "${note.title || note.content.slice(0, 30)}"`;
        }
        case 'create_calendar_event': {
          const event = await window.snailAPI.db.calendar.create({
            title: toolCall.arguments.title as string,
            description: toolCall.arguments.description as string,
            startTime: new Date(toolCall.arguments.startTime as string).getTime(),
            endTime: new Date(toolCall.arguments.endTime as string).getTime(),
            location: toolCall.arguments.location as string,
            allDay: false,
          });
          return `Calendar event created: "${event.title}"`;
        }
        case 'start_pomodoro': {
          const duration = ((toolCall.arguments.duration as number) || 25) * 60 * 1000;
          const session = await window.snailAPI.db.pomodoro.create({
            startTime: Date.now(),
            duration,
            breakDuration: 5 * 60 * 1000,
            type: 'focus',
            completed: false,
            task: toolCall.arguments.task as string,
          });
          window.dispatchEvent(new CustomEvent('pomodoro:start', { detail: session }));
          return `Pomodoro timer started for ${(toolCall.arguments.duration as number) || 25} minutes`;
        }
        case 'create_habit': {
          const habit = await window.snailAPI.db.habits.create({
            name: toolCall.arguments.name as string,
            frequency: (toolCall.arguments.frequency as 'daily' | 'weekly' | 'monthly') || 'daily',
            target: (toolCall.arguments.target as number) || 1,
            color: '#22c55e',
            icon: 'check',
          });
          return `Habit created: "${habit.name}"`;
        }
        case 'open_app': {
          const name = toolCall.arguments.name as string;
          await window.snailAPI.openApp(name);
          return `Attempted to open: ${name}`;
        }
        case 'search_files': {
          const files = await window.snailAPI.openFileDialog();
          return `File search: ${files.length > 0 ? files.join(', ') : 'no files selected'}`;
        }
        case 'remember': {
          await window.snailAPI.db.memory.save(
            toolCall.arguments.content as string,
            (toolCall.arguments.category as string) || 'general'
          );
          return `I'll remember that!`;
        }
        case 'notify': {
          await window.snailAPI.showNotification(
            toolCall.arguments.title as string,
            toolCall.arguments.body as string
          );
          return 'Notification sent';
        }
        default:
          return `Unknown tool: ${toolCall.name}`;
      }
    } catch (err) {
      return `Error: ${(err as Error).message}`;
    }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setShowChat(true);
    setStreamedContent('');

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    addMessage(userMsg);

    setSnailAnimation('thinking');
    setSnailEmotion('thinking');

    try {
      if (aiService.isReady()) {
        const tools = getBuiltInTools();
        const allMessages = [...messages, userMsg];

        const { message, emotion } = await aiService.chat(allMessages, tools, handleToolCall);

        addMessage(message);
        setSnailEmotion(emotion);

        if (emotion === 'celebrating' || emotion === 'excited') {
          window.dispatchEvent(new CustomEvent('snail:celebrate'));
        }
      } else {
        const content = generateLocalResponse(text);

        setIsStreaming(true);
        let current = '';
        for (let i = 0; i < content.length; i++) {
          current += content[i];
          appendStreamedContent(content[i]);
          await new Promise(r => setTimeout(r, 15 + Math.random() * 20));
        }
        setIsStreaming(false);

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content,
          timestamp: Date.now(),
          emotion: 'happy',
        };
        addMessage(assistantMsg);
        setSnailEmotion('happy');
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Oops! I had a little snail slip. Could you try again?',
        timestamp: Date.now(),
        emotion: 'confused',
      };
      addMessage(errorMsg);
      setSnailEmotion('confused');
    }

    setIsStreaming(false);
    setStreamedContent('');
    setSnailAnimation('idle');
  }, [messages, addMessage, setIsStreaming, appendStreamedContent, setStreamedContent,
    setShowChat, setSnailAnimation, setSnailEmotion, handleToolCall]);

  const handleSnailDoubleClick = useCallback(() => {
    setShowChat(true);
    setActivePanel(null);
  }, [setShowChat, setActivePanel]);

  const handleSnailRightClick = useCallback((x: number, y: number) => {
    setShowContextMenu(true, { x, y });
  }, [setShowContextMenu]);

  return (
    <div
      className="w-full h-full fixed inset-0"
      style={{ background: 'transparent' }}
      onClick={() => setShowContextMenu(false)}
    >
      <SnailContainer
        onDoubleClick={handleSnailDoubleClick}
        onRightClick={handleSnailRightClick}
        onSendMessage={sendMessage}
      />

      <AnimatePresence>
        {showChat && (
          <DialoguePanel
            onSend={sendMessage}
            onClose={() => setShowChat(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showContextMenu && (
          <ContextMenu onClose={() => setShowContextMenu(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activePanel === 'todos' && <TodoPanel onClose={() => setActivePanel(null)} />}
        {activePanel === 'notes' && <NotesPanel onClose={() => setActivePanel(null)} />}
        {activePanel === 'reminders' && <ReminderPanel onClose={() => setActivePanel(null)} />}
        {activePanel === 'pomodoro' && <PomodoroPanel onClose={() => setActivePanel(null)} />}
        {activePanel === 'habits' && <HabitPanel onClose={() => setActivePanel(null)} />}
        {activePanel === 'calendar' && <CalendarPanel onClose={() => setActivePanel(null)} />}
        {activePanel === 'settings' && <SettingsPanel onClose={() => setActivePanel(null)} />}
      </AnimatePresence>

      <NotificationOverlay />
    </div>
  );
}

function generateLocalResponse(input: string): string {
  const lower = input.toLowerCase();

  if (lower.includes('hello') || lower.includes('hi')) {
    return "Hey there! I'm Shellby, your snail companion. Ready to help with anything you need! [happy]";
  }
  if (lower.includes('joke') || lower.includes('funny')) {
    return "Why did the snail cross the road? ...Actually, I'm still crossing it. Want to help me decide which side? [curious]";
  }
  if (lower.includes('remind') || lower.includes('reminder')) {
    return "I'd love to set a reminder for you! Just tell me what to remind you about and when. [listening]";
  }
  if (lower.includes('todo') || lower.includes('task')) {
    return "Let's get organized! Tell me what tasks you need to tackle and I'll help track them. [listening]";
  }
  if (lower.includes('note') || lower.includes('write')) {
    return "I can take notes for you. Just tell me what to write down! [listening]";
  }
  if (lower.includes('pomodoro') || lower.includes('focus')) {
    return "Time to focus! I can start a pomodoro timer for you. How many minutes? [excited]";
  }
  if (lower.includes('habit') || lower.includes('routine')) {
    return "Building habits is like my pace — slow and steady wins the race! What habit would you like to track? [curious]";
  }
  if (lower.includes('calendar') || lower.includes('schedule')) {
    return "Let's plan it out! Tell me what event you'd like to schedule. [listening]";
  }
  if (lower.includes('sleep') || lower.includes('tired') || lower.includes('night')) {
    return "Yawn... I know the feeling. Take a rest — I'll be right here when you wake up. [sleepy]";
  }
  if (lower.includes('bye') || lower.includes('goodbye')) {
    return "See you later! I'll be here on your desktop, ready whenever you need me. [happy]";
  }
  if (lower.includes('love') || lower.includes('like')) {
    return "Aww, that's so sweet! Having you as a friend makes my shell feel extra cozy. [grateful]";
  }
  if (lower.includes('help')) {
    return "I'm here to help! I can set reminders, create todos, take notes, start pomodoro timers, track habits, manage your calendar, and more. Just tell me what you need! [happy]";
  }

  return "I'm listening! I can help with reminders, todos, notes, pomodoro timers, habit tracking, and more. What can I do for you? [listening]";
}
