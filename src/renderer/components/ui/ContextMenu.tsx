import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import {
  MessageSquare, CheckSquare, StickyNote, Bell, Timer,
  Target, Calendar, Cookie, Heart, Settings, Eye, X
} from 'lucide-react';

const menuSpring = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 28,
  mass: 0.5,
};

const itemSpring = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 22,
};

export const ContextMenu: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const {
    contextMenuPos,
    setActivePanel,
    setShowChat,
  } = useStore();

  const menuItems = [
    { label: 'Chat', icon: MessageSquare, action: () => { setShowChat(true); onClose(); } },
    { type: 'separator' as const },
    { label: 'To-Do List', icon: CheckSquare, action: () => { setActivePanel('todos'); onClose(); } },
    { label: 'Sticky Notes', icon: StickyNote, action: () => { setActivePanel('notes'); onClose(); } },
    { label: 'Reminders', icon: Bell, action: () => { setActivePanel('reminders'); onClose(); } },
    { label: 'Pomodoro', icon: Timer, action: () => { setActivePanel('pomodoro'); onClose(); } },
    { label: 'Habits', icon: Target, action: () => { setActivePanel('habits'); onClose(); } },
    { label: 'Calendar', icon: Calendar, action: () => { setActivePanel('calendar'); onClose(); } },
    { type: 'separator' as const },
    { label: 'Feed Snail', icon: Cookie, action: () => { window.dispatchEvent(new CustomEvent('snail:feed')); onClose(); } },
    { label: 'Pet Snail', icon: Heart, action: () => { window.dispatchEvent(new CustomEvent('snail:pet')); onClose(); } },
    { type: 'separator' as const },
    { label: 'Settings', icon: Settings, action: () => { setActivePanel('settings'); onClose(); } },
    { label: 'Hide Snail', icon: Eye, action: () => { window.snailAPI.hideWindow(); onClose(); } },
  ];

  const x = Math.min(contextMenuPos.x, window.innerWidth - 200);
  const y = Math.min(contextMenuPos.y, window.innerHeight - 400);

  return (
    <motion.div
      className="fixed z-[100] w-[200px] py-1.5 glass rounded-2xl overflow-hidden"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, scale: 0.94, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: -6 }}
      transition={menuSpring}
      onClick={(e) => e.stopPropagation()}
    >
      {menuItems.map((item, i) => {
        if (item.type === 'separator') {
          return <div key={i} className="my-1 mx-3 border-t border-white/[0.04]" />;
        }
        const Icon = item.icon;
        return (
          <motion.button
            key={i}
            onClick={item.action}
            className="w-full px-3 py-2 text-left text-xs text-white/50 hover:text-white/85 transition-colors flex items-center gap-2.5 group"
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            transition={itemSpring}
          >
            <Icon size={14} className="opacity-30 group-hover:opacity-60 transition-opacity flex-shrink-0" />
            <span>{item.label}</span>
          </motion.button>
        );
      })}
    </motion.div>
  );
};
