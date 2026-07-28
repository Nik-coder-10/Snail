import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CalendarEvent } from '../../../shared/types';

interface CalendarPanelProps {
  onClose: () => void;
}

export const CalendarPanel: React.FC<CalendarPanelProps> = ({ onClose }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(60);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const now = Date.now();
      const e = await window.snailAPI.db.calendar.getAll(now - 86400000 * 7, now + 86400000 * 30);
      setEvents(e as CalendarEvent[]);
    } catch {
      // Handle
    }
  };

  const addEvent = useCallback(async () => {
    if (!title.trim() || !date) return;

    const [h, m] = (time || '09:00').split(':').map(Number);
    const startDate = new Date(date);
    startDate.setHours(h || 9, m || 0, 0, 0);
    const endDate = new Date(startDate.getTime() + duration * 60000);

    try {
      const event = await window.snailAPI.db.calendar.create({
        title,
        startTime: startDate.getTime(),
        endTime: endDate.getTime(),
        allDay: false,
      });
      setEvents((prev) => [event as CalendarEvent, ...prev]);
      setTitle('');
      setDate('');
      setTime('');
    } catch {
      // Handle
    }
  }, [title, date, time, duration]);

  const deleteEvent = useCallback(async (id: string) => {
    try {
      await window.snailAPI.db.calendar.delete(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch {
      // Handle
    }
  }, []);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatTimeRange = (start: number, end: number) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <motion.div
      className="absolute top-2 left-2 w-[340px] max-h-[260px] glass rounded-2xl flex flex-col overflow-hidden z-50"
      initial={{ opacity: 0, scale: 0.9, x: -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: -10 }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
        <span className="text-xs font-medium">Calendar</span>
        <button onClick={onClose} className="w-5 h-5 glass-light rounded-full text-[10px]">x</button>
      </div>

      <div className="px-3 py-2 space-y-1.5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event title"
          className="w-full glass-input text-xs py-1.5"
        />
        <div className="flex gap-1.5">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 glass-input text-xs py-1.5"
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-24 glass-input text-xs py-1.5"
          />
        </div>
        <div className="flex gap-1.5 items-center">
          <span className="text-[10px] text-white/40">Duration:</span>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="flex-1 glass-input text-xs py-1.5 bg-transparent"
          >
            {[15, 30, 60, 90, 120].map((d) => (
              <option key={d} value={d} className="bg-gray-800">{d} min</option>
            ))}
          </select>
          <button onClick={addEvent} className="glass-btn-primary text-xs px-3">Add</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-2 scrollbar-thin space-y-1">
        <AnimatePresence>
          {events.map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 5 }}
              className="flex items-center gap-2 px-2 py-2 glass-light rounded-lg group"
            >
              <div className="w-10 h-10 rounded-lg bg-snail-500/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs">{'\uD83D\uDCC5'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs truncate">{event.title}</div>
                <div className="text-[10px] text-white/40">
                  {formatDate(event.startTime)} - {formatTimeRange(event.startTime, event.endTime)}
                </div>
              </div>
              <button
                onClick={() => deleteEvent(event.id)}
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
