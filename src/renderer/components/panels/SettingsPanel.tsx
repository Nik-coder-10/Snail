import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Key, Palette, MessageCircle, Bell, Settings as SettingsIcon, type LucideIcon } from 'lucide-react';

const panelSpring = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 28,
  mass: 0.6,
};

const SKINS = [
  { id: 'classic', name: 'Classic', color: '#4ade80' },
  { id: 'golden', name: 'Golden', color: '#fbbf24' },
  { id: 'ocean', name: 'Ocean', color: '#60a5fa' },
  { id: 'sunset', name: 'Sunset', color: '#f472b6' },
  { id: 'forest', name: 'Forest', color: '#22c55e' },
  { id: 'midnight', name: 'Midnight', color: '#6366f1' },
  { id: 'ruby', name: 'Ruby', color: '#ef4444' },
  { id: 'amethyst', name: 'Amethyst', color: '#a78bfa' },
];

const PERSONALITIES = [
  { id: 'playful', name: 'Playful', desc: 'Fun and energetic', icon: '\uD83D\uDE04' },
  { id: 'formal', name: 'Formal', desc: 'Professional and precise', icon: '\uD83C\uDFAF' },
  { id: 'casual', name: 'Casual', desc: 'Relaxed and friendly', icon: '\uD83D\uDE0A' },
  { id: 'philosophical', name: 'Philosophical', desc: 'Deep and thoughtful', icon: '\uD83E\uDD14' },
  { id: 'energetic', name: 'Energetic', desc: 'Always enthusiastic', icon: '\u26A1' },
];

interface SettingsPanelProps {
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('https://api.openai.com/v1');
  const [model, setModel] = useState('gpt-4o');
  const [skin, setSkin] = useState('classic');
  const [personality, setPersonality] = useState('playful');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    try {
      const prefs = await window.snailAPI.db.prefs.get();
      setApiKey(prefs.apiKey || '');
      setApiEndpoint(prefs.apiEndpoint || 'https://api.openai.com/v1');
      setModel(prefs.model || 'gpt-4o');
      setSkin(prefs.skin || 'classic');
      setPersonality(prefs.personality?.speechStyle || 'playful');
      setNotificationsEnabled(prefs.notificationsEnabled !== false);
    } catch {}
  };

  const saveSettings = useCallback(async () => {
    try {
      await window.snailAPI.db.prefs.set('apiKey', apiKey);
      await window.snailAPI.db.prefs.set('apiEndpoint', apiEndpoint);
      await window.snailAPI.db.prefs.set('model', model);
      await window.snailAPI.db.prefs.set('skin', skin);
      await window.snailAPI.db.prefs.set('notificationsEnabled', notificationsEnabled);

      const p = PERSONALITIES.find((p) => p.id === personality);
      if (p) {
        await window.snailAPI.db.prefs.set('personality', {
          name: 'Shellby', traits: ['friendly', 'curious', 'helpful'],
          speechStyle: personality, responseSpeed: 1, humorLevel: 0.7,
        });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  }, [apiKey, apiEndpoint, model, skin, personality, notificationsEnabled]);

  return (
    <motion.div
      className="fixed top-3 right-3 w-[380px] max-h-[440px] panel-container glass flex flex-col overflow-hidden z-50"
      initial={{ opacity: 0, scale: 0.94, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: -8 }}
      transition={panelSpring}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center">
            <SettingsIcon size={15} className="text-white/40" />
          </div>
          <span className="text-sm font-semibold text-white/85 tracking-tight">Settings</span>
        </div>
        <button onClick={onClose} className="close-btn">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin space-y-6">
        <Section icon={Key} title="AI Configuration">
          <div className="space-y-2.5">
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="OpenAI API Key" className="w-full glass-input text-xs py-2" />
            <input value={apiEndpoint} onChange={(e) => setApiEndpoint(e.target.value)} placeholder="API Endpoint" className="w-full glass-input text-xs py-2" />
            <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full glass-select text-xs py-2">
              <option value="gpt-4o" className="bg-gray-800">GPT-4o</option>
              <option value="gpt-4o-mini" className="bg-gray-800">GPT-4o Mini</option>
              <option value="gpt-4-turbo" className="bg-gray-800">GPT-4 Turbo</option>
            </select>
          </div>
        </Section>

        <Section icon={Palette} title="Snail Skin">
          <div className="grid grid-cols-4 gap-2">
            {SKINS.map((s) => (
              <motion.button
                key={s.id}
                onClick={() => setSkin(s.id)}
                className={`p-2.5 rounded-xl text-[10px] transition-colors text-center ${skin === s.id ? 'bg-white/8 ring-1 ring-white/15' : 'glass-light hover:bg-white/5'}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="w-7 h-7 rounded-full mx-auto mb-1.5 ring-1 ring-white/8" style={{ backgroundColor: s.color }} />
                <span className="text-white/50 font-medium">{s.name}</span>
              </motion.button>
            ))}
          </div>
        </Section>

        <Section icon={MessageCircle} title="Personality">
          <div className="space-y-1.5">
            {PERSONALITIES.map((p) => (
              <motion.button
                key={p.id}
                onClick={() => setPersonality(p.id)}
                className={`w-full px-3 py-2.5 rounded-xl text-left transition-colors ${personality === p.id ? 'bg-snail-500/8 ring-1 ring-snail-500/18' : 'glass-light hover:bg-white/5'}`}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{p.icon}</span>
                  <div>
                    <div className="text-xs text-white/75 font-medium">{p.name}</div>
                    <div className="text-[10px] text-white/25">{p.desc}</div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </Section>

        <Section icon={Bell} title="Notifications">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-white/50">Desktop Notifications</span>
            <motion.button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`toggle-switch ${notificationsEnabled ? 'active' : 'inactive'}`}
              whileTap={{ scale: 0.9 }}
            >
              <div className="thumb" />
            </motion.button>
          </div>
        </Section>
      </div>

      <div className="px-4 py-3 border-t border-white/[0.04]">
        <motion.button
          onClick={saveSettings}
          className="btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-2"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          <Save size={14} />
          {saved ? 'Saved!' : 'Save Settings'}
        </motion.button>
      </div>
    </motion.div>
  );
};

const Section: React.FC<{
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}> = ({ icon: Icon, title, children }) => (
  <div className="px-1 space-y-3">
    <div className="flex items-center gap-2.5">
      <Icon size={12} className="text-white/20" />
      <span className="text-[10px] uppercase tracking-widest text-white/20 font-semibold">{title}</span>
    </div>
    {children}
  </div>
);
