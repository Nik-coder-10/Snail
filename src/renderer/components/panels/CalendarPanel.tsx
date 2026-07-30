import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Plus, Trash2, Clock } from 'lucide-react';
import type { CalendarEvent } from '../../../shared/types';

const panelSpring = { type: 'spring' as const, stiffness: 380, damping: 28, mass: 0.6 };
const itemSpring = { type: 'spring' as const, stiffness: 400, damping: 30, mass: 0.5 };

interface CalendarPanelProps { onClose: () => void }

export const CalendarPanel: React.FC<CalendarPanelProps> = ({ onClose }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(60);

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    try {
      const now = Date.now();
      const e = await window.snailAPI.db.calendar.getAll(now - 86400000 * 7, now + 86400000 * 30);
      setEvents(e as CalendarEvent[]);
    } catch {}
  };

  const addEvent = useCallback(async () => {
    if (!title.trim() || !date) return;
    const [h, m] = (time || '09:00').split(':').map(Number);
    const startDate = new Date(date); startDate.setHours(h || 9, m || 0, 0, 0);
    const endDate = new Date(startDate.getTime() + duration * 60000);
    try {
      const event = await window.snailAPI.db.calendar.create({ title, startTime: startDate.getTime(), endTime: endDate.getTime(), allDay: false });
      setEvents((prev) => [event as CalendarEvent, ...prev]); setTitle(''); setDate(''); setTime('');
    } catch {}
  }, [title, date, time, duration]);

  const deleteEvent = useCallback(async (id: string) => {
    try { await window.snailAPI.db.calendar.delete(id); setEvents((prev) => prev.filter((e) => e.id !== id)); } catch {}
  }, []);

  const formatDate = (ts: number) => {
    const d = new Date(ts); const today = new Date(); const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatTimeRange = (start: number, end: number) => {
    const s = new Date(start); const e = new Date(end);
    return `${s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <motion.div className="fixed top-3 left-3 w-[360px] max-h-[400px] panel-container glass flex flex-col overflow-hidden z-50"
      initial={{ opacity: 0, scale: 0.94, x: -8 }} animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.94, x: -8 }} transition={panelSpring}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-400/10 flex items-center justify-center"><Calendar size={15} className="text-blue-400" /></div>
          <span className="text-sm font-semibold text-white/85 tracking-tight">Calendar</span>
        </div>
        <button onClick={onClose} className="close-btn"><X size={14} /></button>
      </div>

      <div className="px-3 py-2.5 border-b border-white/[0.04] space-y-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" className="w-full glass-input text-xs py-2" />
        <div className="flex gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1 glass-input text-xs py-2" />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-[100px] glass-input text-xs py-2" />
        </div>
        <div className="flex gap-2 items-center">
          <Clock size={12} className="text-white/20" />
          <span className="text-[10px] text-white/25 font-medium">Duration:</span>
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="flex-1 glass-select text-xs py-1.5">
            {[15, 30, 60, 90, 120].map((d) => (<option key={d} value={d} className="bg-gray-800">{d} min</option>))}
          </select>
          <motion.button onClick={addEvent} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <Plus size={12} /> Add
          </motion.button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin space-y-1">
        <AnimatePresence initial={false}>
          {events.length === 0 && (
            <div className="empty-state"><Calendar size={28} className="empty-state-icon" /><p className="empty-state-text">No events scheduled. Add one above!</p></div>
          )}
          {events.map((event) => (
            <motion.div key={event.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }} transition={itemSpring}
              className="flex items-center gap-3 px-3 py-2.5 glass-light rounded-xl group">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0"><Calendar size={14} className="text-blue-400" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/65 truncate">{event.title}</div>
                <div className="flex items-center gap-2 text-[10px] text-white/25 mt-0.5">
                  <span>{formatDate(event.startTime)}</span>
                  <span className="w-1 h-1 rounded-full bg-white/8" />
                  <span>{formatTimeRange(event.startTime, event.endTime)}</span>
                </div>
              </div>
              <motion.button onClick={() => deleteEvent(event.id)}
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
