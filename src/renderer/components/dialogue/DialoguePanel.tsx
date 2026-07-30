import React, { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { Send, X, Bot, User } from 'lucide-react';
import type { ChatMessage } from '../../../shared/types';

const panelSpring = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
  mass: 0.6,
};

const bubbleSpring = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 34,
  mass: 0.4,
};

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
      className="fixed top-3 right-3 w-[380px] max-h-[440px] panel-container glass flex flex-col overflow-hidden z-50"
      initial={{ opacity: 0, scale: 0.94, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: -8 }}
      transition={panelSpring}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-snail-400/12 flex items-center justify-center">
            <Bot size={15} className="text-snail-400" />
          </div>
          <div>
            <span className="text-sm font-semibold text-white/85 tracking-tight">Shellby</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-snail-400 animate-pulse-soft" />
              <span className="text-[10px] text-white/25 font-medium">Online</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="close-btn">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin" style={{ maxHeight: '300px' }}>
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, ...bubbleSpring }}
            className="flex flex-col items-center justify-center py-14 text-center"
          >
            <Bot size={36} className="text-white/[0.06] mb-4" />
            <p className="text-sm text-white/20 leading-relaxed max-w-[200px] font-medium">
              Hello! I'm Shellby, your snail companion.
            </p>
            <p className="text-xs text-white/15 mt-1">Ask me anything!</p>
          </motion.div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>
        {isStreaming && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={bubbleSpring}
            className="flex justify-start"
          >
            <div className="max-w-[85%] px-3 py-2.5 rounded-2xl rounded-tl-sm glass-light text-xs leading-relaxed">
              {streamedContent ? (
                <span className="text-white/75">{streamedContent}</span>
              ) : (
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-3 py-2.5 border-t border-white/[0.04]">
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
          <motion.button
            onClick={handleSend}
            disabled={!userInput.trim()}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-snail-500/18 border border-snail-500/22 text-snail-400 disabled:opacity-15 disabled:cursor-not-allowed transition-colors"
            whileHover={userInput.trim() ? { scale: 1.05, backgroundColor: 'rgba(74,222,128,0.25)' } : {}}
            whileTap={userInput.trim() ? { scale: 0.92 } : {}}
          >
            <Send size={14} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={bubbleSpring}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2 items-end`}
    >
      {!isUser && (
        <div className="w-6 h-6 rounded-lg bg-snail-400/8 flex items-center justify-center flex-shrink-0 mb-0.5">
          <Bot size={11} className="text-snail-400/60" />
        </div>
      )}
      <div
        className={`max-w-[78%] px-3 py-2.5 rounded-2xl text-xs leading-relaxed ${
          isUser
            ? 'bg-snail-500/12 border border-snail-500/18 rounded-tr-sm'
            : 'glass-light rounded-tl-sm'
        }`}
      >
        <p className="whitespace-pre-wrap break-words text-white/75 leading-relaxed">{message.content}</p>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/[0.04] space-y-1">
            {message.toolCalls.map((tc) => (
              <div key={tc.id} className="flex items-center gap-1.5 text-[10px] text-snail-300/50">
                <div className={`w-1 h-1 rounded-full ${tc.result ? 'bg-snail-400' : 'bg-amber-400'} animate-pulse-soft`} />
                <span className="font-medium">{tc.name}</span>
                {tc.result && <span className="text-white/15">- Done</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-6 h-6 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0 mb-0.5">
          <User size={11} className="text-white/30" />
        </div>
      )}
    </motion.div>
  );
};
