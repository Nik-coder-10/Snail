import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import type { PomodoroSession } from '../../../shared/types';

interface PomodoroPanelProps {
  onClose: () => void;
}

export const PomodoroPanel: React.FC<PomodoroPanelProps> = ({ onClose }) => {
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [task, setTask] = useState('');
  const [duration, setDuration] = useState(25);
  const [activeSession, setActiveSession] = useState<PomodoroSession | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadSessions();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleStart = (e: Event) => {
      const session = (e as CustomEvent).detail as PomodoroSession;
      setActiveSession(session);
      setTimeLeft(session.duration);
      setIsRunning(true);
    };
    window.addEventListener('pomodoro:start', handleStart);
    return () => window.removeEventListener('pomodoro:start', handleStart);
  }, []);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1000) {
            setIsRunning(false);
            window.snailAPI.showNotification('Pomodoro Complete!', 'Time for a break.');
            window.dispatchEvent(new CustomEvent('snail:celebrate'));
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeLeft]);

  const loadSessions = async () => {
    try {
      const s = await window.snailAPI.db.pomodoro.getAll();
      setSessions(s as PomodoroSession[]);
    } catch {
      // Handle
    }
  };

  const startPomodoro = useCallback(async () => {
    const durMs = duration * 60 * 1000;
    try {
      const session = await window.snailAPI.db.pomodoro.create({
        startTime: Date.now(),
        duration: durMs,
        breakDuration: 5 * 60 * 1000,
        type: 'focus',
        completed: false,
        task: task || undefined,
      });
      const s = session as PomodoroSession;
      setSessions((prev) => [s, ...prev]);
      setActiveSession(s);
      setTimeLeft(durMs);
      setIsRunning(true);
    } catch {
      // Handle
    }
  }, [duration, task]);

  const stopPomodoro = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(0);
    setActiveSession(null);
  }, []);

  const formatTime = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = activeSession ? timeLeft / activeSession.duration : 0;

  return (
    <motion.div
      className="absolute top-2 left-2 w-[340px] max-h-[260px] glass rounded-2xl flex flex-col overflow-hidden z-50"
      initial={{ opacity: 0, scale: 0.9, x: -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: -10 }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
        <span className="text-xs font-medium">Pomodoro Timer</span>
        <button onClick={onClose} className="w-5 h-5 glass-light rounded-full text-[10px]">x</button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-4 space-y-3">
        {activeSession ? (
          <>
            <div className="relative w-24 h-24">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke={isRunning ? '#4ade80' : '#fbbf24'}
                  strokeWidth="6"
                  strokeDasharray={`${(1 - progress) * 264} 264`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-2xl font-mono font-bold ${isRunning ? 'text-snail-400' : 'text-amber-400'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
            {activeSession.task && (
              <div className="text-xs text-white/50">{activeSession.task}</div>
            )}
            <button onClick={stopPomodoro} className="glass-btn text-xs px-4 py-1">
              {isRunning ? 'Stop' : 'Reset'}
            </button>
          </>
        ) : (
          <>
            <input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="What are you focusing on?"
              className="w-[240px] glass-input text-xs py-1.5"
            />
            <div className="flex gap-1.5">
              {[15, 25, 45, 60].map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`px-3 py-1 rounded-lg text-xs transition-all ${
                    duration === d
                      ? 'bg-snail-500/20 border border-snail-500/30 text-snail-400'
                      : 'glass-light text-white/50 hover:text-white/80'
                  }`}
                >
                  {d}m
                </button>
              ))}
            </div>
            <button onClick={startPomodoro} className="glass-btn-primary text-sm px-6 py-2">
              Start Focus
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
};
