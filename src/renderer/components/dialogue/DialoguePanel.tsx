import React, { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { Send, X, Bot, User } from 'lucide-react';
import type { ChatMessage } from '../../../shared/types';

interface DialoguePanelProps {
  onSend: (text: string) => void;
  onClose: () => void;
}

export const DialoguePanel: React.FC<DialoguePanelProps> = ({ onSend, onClose }) => {
  const {
    messages, isStreaming, streamedContent,
    userInput, setUserInput,
  } = useStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamedContent]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(() => {
    const text = userInput.trim();
    if (!text) return;
    setUserInput('');
    onSend(text);
  }, [userInput, setUserInput, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <motion.div
      className="fixed top-3 right-3 w-[380px] max-h-[420px] glass rounded-2xl flex flex-col overflow-hidden z-50 shadow-2xl"
      initial={{ opacity: 0, scale: 0.92, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -8 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-snail-400/15 flex items-center justify-center">
            <Bot size={14} className="text-snail-400" />
          </div>
          <div>
            <span className="text-sm font-medium text-white/80">Shellby</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-snail-400 animate-pulse-soft" />
              <span className="text-[10px] text-white/30">Online</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="close-btn">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 scrollbar-thin" style={{ maxHeight: '280px' }}>
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-10 text-center"
          >
            <Bot size={32} className="text-white/10 mb-3" />
            <p className="text-xs text-white/25 leading-relaxed max-w-[200px]">
              Hello! I'm Shellby, your snail companion. Ask me anything!
            </p>
          </motion.div>
        )}
        <AnimatePresence>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>
        {isStreaming && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="max-w-[85%] px-3 py-2.5 rounded-2xl rounded-tl-sm glass-light text-xs leading-relaxed">
              {streamedContent ? (
                <span className="text-white/80">{streamedContent}</span>
              ) : (
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-3 py-2.5 border-t border-white/5">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 glass-input text-xs py-2 px-3"
          />
          <button
            onClick={handleSend}
            disabled={!userInput.trim()}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-snail-500/20 border border-snail-500/25 text-snail-400 disabled:opacity-20 disabled:cursor-not-allowed transition-all hover:bg-snail-500/30"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}
    >
      {!isUser && (
        <div className="w-6 h-6 rounded-lg bg-snail-400/10 flex items-center justify-center flex-shrink-0 mt-1">
          <Bot size={12} className="text-snail-400" />
        </div>
      )}
      <div
        className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
          isUser
            ? 'bg-snail-500/15 border border-snail-500/20 rounded-tr-sm'
            : 'glass-light rounded-tl-sm'
        }`}
      >
        <p className="whitespace-pre-wrap break-words text-white/80">{message.content}</p>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
            {message.toolCalls.map((tc) => (
              <div key={tc.id} className="flex items-center gap-1.5 text-[10px] text-snail-300/60">
                <div className={`w-1 h-1 rounded-full ${tc.result ? 'bg-snail-400' : 'bg-amber-400'} animate-pulse-soft`} />
                <span>{tc.name}</span>
                {tc.result && <span className="text-white/20">- Done</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-1">
          <User size={12} className="text-white/40" />
        </div>
      )}
    </motion.div>
  );
};
