import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  body: string;
  timestamp: number;
}

export const NotificationOverlay: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const handler = (reminder: { title: string; description?: string; id: string }) => {
      addNotification(reminder.title, reminder.description || '');
    };

    window.snailAPI.onReminderTrigger(handler);
    return () => {
      // Cleanup managed by preload
    };
  }, []);

  const addNotification = useCallback((title: string, body: string) => {
    const id = crypto.randomUUID();
    setNotifications((prev) => [...prev, { id, title, body, timestamp: Date.now() }]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 6000);
  }, []);

  return (
    <div className="fixed bottom-3 right-3 space-y-2 z-[60] pointer-events-none">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="pointer-events-auto w-[240px] p-3.5 glass rounded-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-snail-500/10 flex items-center justify-center flex-shrink-0">
                <Bell size={14} className="text-snail-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white/70 truncate">{n.title}</div>
                {n.body && (
                  <div className="text-[10px] text-white/40 mt-0.5 line-clamp-2 leading-relaxed">{n.body}</div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
