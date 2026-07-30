import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Plus, Trash2, Clock } from 'lucide-react';
import type { Reminder } from '../../../shared/types';

const panelSpring = { type: 'spring' as const, stiffness: 380, damping: 28, mass: 0.6 };
const itemSpring = { type: 'spring' as const, stiffness: 400, damping: 30, mass: 0.5 };

interface ReminderPanelProps { onClose: () => void }

export const ReminderPanel: React.FC<ReminderPanelProps> = ({ onClose }) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState(5);

  useEffect(() => { loadReminders(); }, []);

  const loadReminders = async () => {
    try { const r = await window.snailAPI.db.reminders.getAll(); setReminders(r as Reminder[]); } catch {}
  };

  const addReminder = useCallback(async () => {
    if (!title.trim()) return;
    try {
      const reminder = await window.snailAPI.db.reminders.create({ title, triggerAt: Date.now() + minutes * 60000, completed: false });
      setReminders((prev) => [reminder as Reminder, ...prev]); setTitle('');
    } catch {}
  }, [title, minutes]);

  const deleteReminder = useCallback(async (id: string) => {
    try { await window.snailAPI.db.reminders.delete(id); setReminders((prev) => prev.filter((r) => r.id !== id)); } catch {}
  }, []);

  const formatTime = (ts: number) => {
    const d = new Date(ts); const now = new Date(); const diff = d.getTime() - now.getTime(); const mins = Math.round(diff / 60000);
    if (mins <= 0) return 'Now';
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div className="fixed top-3 left-3 w-[360px] max-h-[400px] panel-container glass flex flex-col overflow-hidden z-50"
      initial={{ opacity: 0, scale: 0.94, x: -8 }} animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.94, x: -8 }} transition={panelSpring}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-400/10 flex items-center justify-center"><Bell size={15} className="text-amber-400" /></div>
          <span className="text-sm font-semibold text-white/85 tracking-tight">Reminders</span>
        </div>
        <button onClick={onClose} className="close-btn"><X size={14} /></button>
      </div>

      <div className="px-3 py-2.5 border-b border-white/[0.04] space-y-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addReminder()}
          placeholder="What should I remind you about?" className="w-full glass-input text-xs py-2" />
        <div className="flex gap-2 items-center">
          <Clock size={12} className="text-white/20" />
          <span className="text-[10px] text-white/25 font-medium">In</span>
          <input type="number" value={minutes} onChange={(e) => setMinutes(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16 glass-input text-xs py-1.5 text-center" />
          <span className="text-[10px] text-white/25 font-medium">minutes</span>
          <motion.button onClick={addReminder} className="btn-primary text-xs px-3 py-1.5 ml-auto flex items-center gap-1"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <Plus size={12} /> Set
          </motion.button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin space-y-1">
        <AnimatePresence initial={false}>
          {reminders.length === 0 && (
            <div className="empty-state"><Bell size={28} className="empty-state-icon" /><p className="empty-state-text">No reminders set. Add one above!</p></div>
          )}
          {reminders.map((r) => (
            <motion.div key={r.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }} transition={itemSpring}
              className="flex items-center gap-3 px-3 py-2.5 glass-light rounded-xl group">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0"><Bell size={14} className="text-amber-400" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/65 truncate">{r.title}</div>
                <div className="text-[10px] text-white/25 mt-0.5">{formatTime(r.triggerAt)}</div>
              </div>
              <motion.button onClick={() => deleteReminder(r.id)}
                className="opacity-0 group-hover:opacity-100 text-red-400/40 hover:text-red-400 transition-opacity"
                whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}>
                <Trash2 size={12} />
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
