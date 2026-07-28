import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Habit } from '../../../shared/types';

interface HabitPanelProps {
  onClose: () => void;
}

const FREQUENCY_OPTIONS = ['daily', 'weekly', 'monthly'];
const HABIT_COLORS = ['#22c55e', '#60a5fa', '#fbbf24', '#f472b6', '#a78bfa', '#34d399'];

export const HabitPanel: React.FC<HabitPanelProps> = ({ onClose }) => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [target, setTarget] = useState(1);

  useEffect(() => {
    loadHabits();
  }, []);

  const loadHabits = async () => {
    try {
      const h = await window.snailAPI.db.habits.getAll();
      setHabits(h as Habit[]);
    } catch {
      // Handle
    }
  };

  const addHabit = useCallback(async () => {
    if (!name.trim()) return;
    try {
      const habit = await window.snailAPI.db.habits.create({
        name,
        frequency,
        target,
        color: HABIT_COLORS[Math.floor(Math.random() * HABIT_COLORS.length)],
        icon: 'check',
      });
      setHabits((prev) => [habit as Habit, ...prev]);
      setName('');
    } catch {
      // Handle
    }
  }, [name, frequency, target]);

  const completeHabit = useCallback(async (id: string) => {
    try {
      const date = new Date().toISOString().split('T')[0];
      await window.snailAPI.db.habits.complete(id, date);
      setHabits((prev) =>
        prev.map((h) =>
          h.id === id
            ? { ...h, streak: h.streak + 1, completions: { ...h.completions, [date]: true } }
            : h
        )
      );
    } catch {
      // Handle
    }
  }, []);

  return (
    <motion.div
      className="absolute top-2 left-2 w-[340px] max-h-[260px] glass rounded-2xl flex flex-col overflow-hidden z-50"
      initial={{ opacity: 0, scale: 0.9, x: -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: -10 }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
        <span className="text-xs font-medium">Habit Tracker</span>
        <button onClick={onClose} className="w-5 h-5 glass-light rounded-full text-[10px]">x</button>
      </div>

      <div className="px-3 py-2 space-y-1.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addHabit()}
          placeholder="New habit..."
          className="w-full glass-input text-xs py-1.5"
        />
        <div className="flex gap-1.5">
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
            className="flex-1 glass-input text-xs py-1.5 bg-transparent"
          >
            {FREQUENCY_OPTIONS.map((f) => (
              <option key={f} value={f} className="bg-gray-800">{f}</option>
            ))}
          </select>
          <button onClick={addHabit} className="glass-btn-primary text-xs px-3">Add</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-2 scrollbar-thin space-y-1.5">
        <AnimatePresence>
          {habits.map((habit) => (
            <motion.div
              key={habit.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex items-center gap-2 px-3 py-2 glass-light rounded-lg group"
            >
              <button
                onClick={() => completeHabit(habit.id)}
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs flex-shrink-0 transition-all ${
                  habit.streak > 0
                    ? 'bg-snail-500/20 border border-snail-500/30'
                    : 'border border-white/10 hover:border-white/20'
                }`}
                style={{ backgroundColor: habit.streak > 0 ? habit.color + '20' : undefined }}
              >
                {habit.streak > 0 ? <span>{'\u2713'}</span> : null}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-xs truncate">{habit.name}</div>
                <div className="text-[10px] text-white/30">{habit.frequency}</div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-amber-400/80 font-mono">
                  {habit.streak}
                </span>
                <span className="text-[10px] text-white/20">day streak</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
