import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';
import type { ChatMessage } from '../../../shared/types';

interface DialoguePanelProps {
  onSend: (text: string) => void;
  onClose: () => void;
}

export const DialoguePanel: React.FC<DialoguePanelProps> = ({ onSend, onClose }) => {
  const {
    messages, isStreaming, streamedContent,
    userInput, setUserInput, setIsStreaming,
  } = useStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [localHistory] = useState<ChatMessage[]>([]);

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

  const allMessages = [...messages];

  return (
    <motion.div
      className="absolute top-2 right-2 w-[360px] max-h-[280px] glass rounded-2xl flex flex-col overflow-hidden z-50"
      initial={{ opacity: 0, scale: 0.9, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      {/* Header */}
      <div className="drag-region flex items-center justify-between px-4 py-2.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-snail-400 animate-pulse-soft" />
          <span className="text-xs font-medium text-white/70">Shellby</span>
        </div>
        <button
          onClick={onClose}
          className="no-drag w-6 h-6 rounded-full glass-light flex items-center justify-center text-xs hover:bg-white/10 transition-colors"
        >
          x
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 scrollbar-thin">
        {allMessages.length === 0 && (
          <div className="text-center text-white/30 text-xs py-6">
            <p>Hello! I'm Shellby, your snail companion.</p>
            <p className="mt-1">Ask me anything or tell me what you need!</p>
          </div>
        )}
        <AnimatePresence>
          {allMessages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>
        {isStreaming && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-tl-sm glass-light text-xs leading-relaxed">
              {streamedContent || (
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-white/5">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="no-drag flex-1 glass-input text-xs py-2"
          />
          <button
            onClick={handleSend}
            disabled={!userInput.trim()}
            className="glass-btn-primary px-3 text-xs disabled:opacity-30"
          >
            Send
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
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
          isUser
            ? 'bg-snail-500/20 border border-snail-500/30 rounded-tr-sm'
            : 'glass-light rounded-tl-sm'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-1.5 pt-1.5 border-t border-white/10">
            {message.toolCalls.map((tc) => (
              <div key={tc.id} className="text-[10px] text-snail-300/80">
                Tool: {tc.name} {tc.result ? '- Done' : '- Running...'}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
