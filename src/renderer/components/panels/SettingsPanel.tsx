import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface SettingsPanelProps {
  onClose: () => void;
}

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
  { id: 'playful', name: 'Playful', desc: 'Fun and energetic' },
  { id: 'formal', name: 'Formal', desc: 'Professional and precise' },
  { id: 'casual', name: 'Casual', desc: 'Relaxed and friendly' },
  { id: 'philosophical', name: 'Philosophical', desc: 'Deep and thoughtful' },
  { id: 'energetic', name: 'Energetic', desc: 'Always enthusiastic' },
];

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
    } catch {
      // Defaults
    }
  };

  const saveSettings = useCallback(async () => {
    try {
      await window.snailAPI.db.prefs.set('apiKey', apiKey);
      await window.snailAPI.db.prefs.set('apiEndpoint', apiEndpoint);
      await window.snailAPI.db.prefs.set('model', model);
      await window.snailAPI.db.prefs.set('skin', skin);
      await window.snailAPI.db.prefs.set('notificationsEnabled', notificationsEnabled);

      const personalityObj = PERSONALITIES.find((p) => p.id === personality);
      if (personalityObj) {
        await window.snailAPI.db.prefs.set('personality', {
          name: 'Shellby',
          traits: ['friendly', 'curious', 'helpful'],
          speechStyle: personality,
          responseSpeed: 1,
          humorLevel: 0.7,
        });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Handle
    }
  }, [apiKey, apiEndpoint, model, skin, personality, notificationsEnabled]);

  return (
    <motion.div
      className="absolute inset-2 glass rounded-2xl flex flex-col overflow-hidden z-50"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
        <span className="text-xs font-medium">Settings</span>
        <button onClick={onClose} className="w-5 h-5 glass-light rounded-full text-[10px]">x</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin space-y-4">
        {/* API Settings */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-white/40">AI Configuration</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="OpenAI API Key"
            className="w-full glass-input text-xs py-1.5"
          />
          <input
            value={apiEndpoint}
            onChange={(e) => setApiEndpoint(e.target.value)}
            placeholder="API Endpoint"
            className="w-full glass-input text-xs py-1.5"
          />
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full glass-input text-xs py-1.5 bg-transparent"
          >
            <option value="gpt-4o" className="bg-gray-800">GPT-4o</option>
            <option value="gpt-4o-mini" className="bg-gray-800">GPT-4o Mini</option>
            <option value="gpt-4-turbo" className="bg-gray-800">GPT-4 Turbo</option>
          </select>
        </div>

        {/* Skin */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-white/40">Snail Skin</label>
          <div className="grid grid-cols-4 gap-1.5">
            {SKINS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSkin(s.id)}
                className={`p-2 rounded-lg text-[10px] transition-all ${
                  skin === s.id
                    ? 'bg-white/10 border border-white/20'
                    : 'glass-light hover:bg-white/5'
                }`}
              >
                <div className="w-6 h-6 rounded-full mx-auto mb-1" style={{ backgroundColor: s.color }} />
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Personality */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-white/40">Personality</label>
          <div className="space-y-1">
            {PERSONALITIES.map((p) => (
              <button
                key={p.id}
                onClick={() => setPersonality(p.id)}
                className={`w-full px-3 py-2 rounded-lg text-left transition-all ${
                  personality === p.id
                    ? 'bg-white/10 border border-white/20'
                    : 'glass-light hover:bg-white/5'
                }`}
              >
                <div className="text-xs">{p.name}</div>
                <div className="text-[10px] text-white/30">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="flex items-center justify-between">
          <span className="text-xs">Desktop Notifications</span>
          <button
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className={`w-10 h-5 rounded-full transition-colors relative ${
              notificationsEnabled ? 'bg-snail-500' : 'bg-white/10'
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                notificationsEnabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-white/5">
        <button
          onClick={saveSettings}
          className={`glass-btn-primary text-xs w-full py-2 ${saved ? '!bg-snail-500/40' : ''}`}
        >
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </motion.div>
  );
};
