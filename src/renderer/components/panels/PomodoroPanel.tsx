import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Square, Timer } from 'lucide-react';
import type { PomodoroSession } from '../../../shared/types';

const panelSpring = { type: 'spring' as const, stiffness: 380, damping: 28, mass: 0.6 };

interface PomodoroPanelProps { onClose: () => void }

export const PomodoroPanel: React.FC<PomodoroPanelProps> = ({ onClose }) => {
  const [task, setTask] = useState('');
  const [duration, setDuration] = useState(25);
  const [activeSession, setActiveSession] = useState<PomodoroSession | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

  useEffect(() => {
    const handleStart = (e: Event) => { const session = (e as CustomEvent).detail as PomodoroSession; setActiveSession(session); setTimeLeft(session.duration); setIsRunning(true); };
    window.addEventListener('pomodoro:start', handleStart);
    return () => window.removeEventListener('pomodoro:start', handleStart);
  }, []);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1000) { setIsRunning(false); window.snailAPI.showNotification('Pomodoro Complete!', 'Time for a break.'); window.dispatchEvent(new CustomEvent('snail:celebrate')); return 0; }
          return prev - 1000;
        });
      }, 1000);
    } else if (timerRef.current) { clearInterval(timerRef.current); }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, timeLeft]);

  const startPomodoro = useCallback(async () => {
    const durMs = duration * 60 * 1000;
    try {
      const session = { startTime: Date.now(), duration: durMs, breakDuration: 5 * 60 * 1000, type: 'focus' as const, completed: false, task: task || undefined };
      const created = await window.snailAPI.db.pomodoro.create(session);
      const s = created as PomodoroSession; setActiveSession(s); setTimeLeft(durMs); setIsRunning(true);
    } catch {}
  }, [duration, task]);

  const stopPomodoro = useCallback(() => { setIsRunning(false); setTimeLeft(0); setActiveSession(null); if (timerRef.current) clearInterval(timerRef.current); }, []);

  const formatTime = (ms: number) => { const m = Math.floor(ms / 60000); const s = Math.floor((ms % 60000) / 1000); return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`; };
  const progress = activeSession && activeSession.duration ? 1 - timeLeft / activeSession.duration : 0;

  return (
    <motion.div className="fixed top-3 left-3 w-[360px] max-h-[400px] panel-container glass flex flex-col overflow-hidden z-50"
      initial={{ opacity: 0, scale: 0.94, x: -8 }} animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.94, x: -8 }} transition={panelSpring}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-red-400/10 flex items-center justify-center"><Timer size={15} className="text-red-400" /></div>
          <span className="text-sm font-semibold text-white/85 tracking-tight">Pomodoro Timer</span>
        </div>
        <button onClick={onClose} className="close-btn"><X size={14} /></button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-6 space-y-5">
        {activeSession ? (
          <AnimatePresence mode="wait">
            <motion.div key="active" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center space-y-4">
              <div className="relative w-28 h-28">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
                  <circle cx="50" cy="50" r="42" fill="none"
                    stroke={isRunning ? '#4ade80' : '#fbbf24'} strokeWidth="6"
                    strokeDasharray={`${(1 - progress) * 264} 264`} strokeLinecap="round"
                    className="transition-all duration-1000"
                    style={{ filter: 'drop-shadow(0 0 8px rgba(74,222,128,0.25))' }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-3xl font-mono font-bold tracking-wider ${isRunning ? 'text-snail-400' : 'text-amber-400'}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </div>
              {activeSession.task && <div className="text-xs text-white/35">{activeSession.task}</div>}
              <motion.button onClick={stopPomodoro} className="btn-secondary text-xs px-5 py-2 flex items-center gap-2"
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                <Square size={12} /> {isRunning ? 'Stop' : 'Reset'}
              </motion.button>
            </motion.div>
          </AnimatePresence>
        ) : (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center space-y-4">
            <div className="flex gap-2">
              {[15, 25, 45, 60].map((d) => (
                <motion.button key={d} onClick={() => setDuration(d)}
                  className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                    duration === d ? 'bg-snail-500/12 border border-snail-500/22 text-snail-400' : 'glass-light text-white/35 hover:text-white/65 hover:bg-white/5'
                  }`}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  {d}m
                </motion.button>
              ))}
            </div>
            <input value={task} onChange={(e) => setTask(e.target.value)} placeholder="What are you focusing on?"
              className="w-[220px] glass-input text-xs py-2 text-center" />
            <motion.button onClick={startPomodoro} className="btn-primary text-sm px-8 py-2.5 flex items-center gap-2"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
              <Play size={14} /> Start Focus
            </motion.button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
