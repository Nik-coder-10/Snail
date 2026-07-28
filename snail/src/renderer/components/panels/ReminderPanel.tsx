import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Reminder } from '../../../shared/types';

interface ReminderPanelProps {
  onClose: () => void;
}

export const ReminderPanel: React.FC<ReminderPanelProps> = ({ onClose }) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState(5);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      const r = await window.snailAPI.db.reminders.getAll();
      setReminders(r as Reminder[]);
    } catch {
      // Handle
    }
  };

  const addReminder = useCallback(async () => {
    if (!title.trim()) return;
    try {
      const reminder = await window.snailAPI.db.reminders.create({
        title,
        triggerAt: Date.now() + minutes * 60000,
        completed: false,
      });
      setReminders((prev) => [reminder as Reminder, ...prev]);
      setTitle('');
    } catch {
      // Handle
    }
  }, [title, minutes]);

  const deleteReminder = useCallback(async (id: string) => {
    try {
      await window.snailAPI.db.reminders.delete(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // Handle
    }
  }, []);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div
      className="absolute top-2 left-2 w-[340px] max-h-[260px] glass rounded-2xl flex flex-col overflow-hidden z-50"
      initial={{ opacity: 0, scale: 0.9, x: -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: -10 }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
        <span className="text-xs font-medium">Reminders</span>
        <button onClick={onClose} className="w-5 h-5 glass-light rounded-full text-[10px]">x</button>
      </div>

      <div className="px-3 py-2 space-y-1.5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addReminder()}
          placeholder="What should I remind you about?"
          className="w-full glass-input text-xs py-1.5"
        />
        <div className="flex gap-1.5 items-center">
          <span className="text-[10px] text-white/40">In</span>
          <input
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-14 glass-input text-xs py-1 px-2 text-center"
          />
          <span className="text-[10px] text-white/40">min</span>
          <button onClick={addReminder} className="ml-auto glass-btn-primary text-xs px-3">Set</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-2 scrollbar-thin space-y-1">
        <AnimatePresence>
          {reminders.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 5 }}
              className="flex items-center gap-2 px-2 py-2 glass-light rounded-lg group"
            >
              <div className="w-8 h-8 rounded-lg bg-snail-500/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs">{'\u23F0'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs truncate">{r.title}</div>
                <div className="text-[10px] text-white/40">{formatTime(r.triggerAt)}</div>
              </div>
              <button
                onClick={() => deleteReminder(r.id)}
                className="opacity-0 group-hover:opacity-100 text-[10px] text-red-400/60 transition-all"
              >
                x
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
