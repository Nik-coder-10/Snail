import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Target, Check, Flame } from 'lucide-react';
import type { Habit } from '../../../shared/types';

interface HabitPanelProps {
  onClose: () => void;
}

const FREQUENCY_OPTIONS = ['daily', 'weekly', 'monthly'] as const;
const HABIT_COLORS = ['#22c55e', '#60a5fa', '#fbbf24', '#f472b6', '#a78bfa', '#34d399'];

export const HabitPanel: React.FC<HabitPanelProps> = ({ onClose }) => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');

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
        target: 1,
        color: HABIT_COLORS[Math.floor(Math.random() * HABIT_COLORS.length)],
        icon: 'check',
      });
      setHabits((prev) => [habit as Habit, ...prev]);
      setName('');
    } catch {
      // Handle
    }
  }, [name, frequency]);

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
      className="fixed top-3 left-3 w-[360px] max-h-[380px] glass rounded-2xl flex flex-col overflow-hidden z-50 shadow-2xl"
      initial={{ opacity: 0, scale: 0.92, x: -8 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.92, x: -8 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-orange-400/10 flex items-center justify-center">
            <Target size={14} className="text-orange-400" />
          </div>
          <span className="text-sm font-medium text-white/80">Habit Tracker</span>
        </div>
        <button onClick={onClose} className="close-btn">
          <X size={14} />
        </button>
      </div>

      <div className="px-3 py-2.5 border-b border-white/5 space-y-2">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addHabit()}
            placeholder="New habit..."
            className="flex-1 glass-input text-xs py-2"
          />
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
            className="glass-select text-xs py-2 w-24"
          >
            {FREQUENCY_OPTIONS.map((f) => (
              <option key={f} value={f} className="bg-gray-800">{f}</option>
            ))}
          </select>
        </div>
        <button onClick={addHabit} className="glass-btn-primary text-xs w-full py-2 flex items-center justify-center gap-1.5">
          <Plus size={12} />
          Add Habit
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin space-y-1.5">
        <AnimatePresence>
          {habits.length === 0 && (
            <div className="empty-state">
              <Target size={28} />
              <p className="empty-state-text">No habits yet. Start tracking one!</p>
            </div>
          )}
          {habits.map((habit) => (
            <motion.div
              key={habit.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex items-center gap-3 px-3 py-2.5 glass-light rounded-xl group"
            >
              <button
                onClick={() => completeHabit(habit.id)}
                className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                  habit.streak > 0
                    ? 'bg-snail-500/15 border border-snail-500/25'
                    : 'border border-white/10 hover:border-white/20 hover:bg-white/5'
                }`}
                style={{ borderColor: habit.streak > 0 ? habit.color + '40' : undefined }}
              >
                {habit.streak > 0 ? (
                  <Check size={12} style={{ color: habit.color }} />
                ) : null}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/70 truncate">{habit.name}</div>
                <div className="text-[10px] text-white/30 capitalize">{habit.frequency}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <Flame size={12} className={habit.streak > 0 ? 'text-orange-400' : 'text-white/20'} />
                <span className={`text-xs font-mono ${habit.streak > 0 ? 'text-orange-400' : 'text-white/20'}`}>
                  {habit.streak}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
