import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';

export const ContextMenu: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const {
    contextMenuPos,
    setShowContextMenu,
    setActivePanel,
    setShowChat,
    snail,
    setSnailSkin,
  } = useStore();

  const menuItems = [
    {
      label: 'Chat',
      icon: '',
      action: () => { setShowChat(true); onClose(); },
    },
    { type: 'separator' as const },
    {
      label: 'To-Do List',
      icon: '',
      action: () => { setActivePanel('todos'); onClose(); },
    },
    {
      label: 'Sticky Notes',
      icon: '',
      action: () => { setActivePanel('notes'); onClose(); },
    },
    {
      label: 'Reminders',
      icon: '',
      action: () => { setActivePanel('reminders'); onClose(); },
    },
    {
      label: 'Pomodoro',
      icon: '',
      action: () => { setActivePanel('pomodoro'); onClose(); },
    },
    {
      label: 'Habits',
      icon: '',
      action: () => { setActivePanel('habits'); onClose(); },
    },
    {
      label: 'Calendar',
      icon: '',
      action: () => { setActivePanel('calendar'); onClose(); },
    },
    { type: 'separator' as const },
    {
      label: 'Feed Snail',
      icon: '',
      action: () => {
        window.dispatchEvent(new CustomEvent('snail:celebrate'));
        onClose();
      },
    },
    {
      label: 'Pet Snail',
      icon: '',
      action: () => {
        window.dispatchEvent(new CustomEvent('snail:celebrate'));
        onClose();
      },
    },
    { type: 'separator' as const },
    {
      label: 'Settings',
      icon: '',
      action: () => { setActivePanel('settings'); onClose(); },
    },
    {
      label: 'Hide Snail',
      icon: '',
      action: () => {
        window.snailAPI.hideWindow();
        onClose();
      },
    },
  ];

  const x = Math.min(contextMenuPos.x, window.innerWidth - 200);
  const y = Math.min(contextMenuPos.y, window.innerHeight - 350);

  return (
    <motion.div
      className="fixed z-[100] w-[180px] py-2 glass rounded-xl overflow-hidden"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      onClick={(e) => e.stopPropagation()}
    >
      {menuItems.map((item, i) => {
        if (item.type === 'separator') {
          return <div key={i} className="my-1 border-t border-white/5" />;
        }
        return (
          <button
            key={i}
            onClick={item.action}
            className="w-full px-4 py-1.5 text-left text-xs text-white/70 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
          >
            <span className="text-sm w-5 text-center">{item.icon}</span>
            {item.label}
          </button>
        );
      })}
    </motion.div>
  );
};
