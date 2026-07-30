import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Check, Trash2, ListTodo } from 'lucide-react';
import type { TodoItem } from '../../../shared/types';

interface TodoPanelProps {
  onClose: () => void;
}

export const TodoPanel: React.FC<TodoPanelProps> = ({ onClose }) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const t = await window.snailAPI.db.todos.getAll();
      setTodos(t as TodoItem[]);
    } catch {
      // Handle gracefully
    }
  };

  const addTodo = useCallback(async () => {
    if (!newTitle.trim()) return;
    try {
      const todo = await window.snailAPI.db.todos.create({
        title: newTitle,
        completed: false,
        priority: 'medium' as const,
        listId: 'default',
      });
      setTodos((prev) => [todo as TodoItem, ...prev]);
      setNewTitle('');
    } catch {
      // Handle
    }
  }, [newTitle]);

  const toggleTodo = useCallback(async (id: string, completed: boolean) => {
    try {
      await window.snailAPI.db.todos.update(id, { completed: !completed });
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !completed } : t)));
    } catch {
      // Handle
    }
  }, []);

  const deleteTodo = useCallback(async (id: string) => {
    try {
      await window.snailAPI.db.todos.delete(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch {
      // Handle
    }
  }, []);

  const pendingTodos = todos.filter((t) => !t.completed);
  const completedTodos = todos.filter((t) => t.completed);

  return (
    <motion.div
      className="fixed top-3 left-3 w-[360px] max-h-[380px] glass rounded-2xl flex flex-col overflow-hidden z-50 shadow-2xl"
      initial={{ opacity: 0, scale: 0.92, x: -8 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.92, x: -8 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-snail-400/10 flex items-center justify-center">
            <ListTodo size={14} className="text-snail-400" />
          </div>
          <span className="text-sm font-medium text-white/80">To-Do List</span>
          {pendingTodos.length > 0 && (
            <span className="badge badge-green">{pendingTodos.length}</span>
          )}
        </div>
        <button onClick={onClose} className="close-btn">
          <X size={14} />
        </button>
      </div>

      <div className="px-3 py-2.5 border-b border-white/5">
        <div className="flex gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
            placeholder="Add a task..."
            className="flex-1 glass-input text-xs py-2"
          />
          <button onClick={addTodo} className="flex items-center justify-center w-9 h-9 rounded-xl bg-snail-500/20 border border-snail-500/25 text-snail-400 transition-all hover:bg-snail-500/30">
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin space-y-1">
        <AnimatePresence>
          {todos.length === 0 && (
            <div className="empty-state">
              <ListTodo size={28} />
              <p className="empty-state-text">No tasks yet. Add one above!</p>
            </div>
          )}
          {[...pendingTodos, ...completedTodos].map((todo) => (
            <motion.div
              key={todo.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8, height: 0 }}
              className="flex items-center gap-2.5 px-3 py-2.5 glass-light rounded-xl group transition-all"
            >
              <button
                onClick={() => toggleTodo(todo.id, todo.completed)}
                className={`w-4.5 h-4.5 rounded-full border flex-shrink-0 flex items-center justify-center transition-all ${
                  todo.completed
                    ? 'bg-snail-500 border-snail-500'
                    : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                }`}
              >
                {todo.completed && <Check size={10} className="text-white" />}
              </button>
              <span className={`flex-1 text-xs truncate ${
                todo.completed ? 'line-through text-white/25' : 'text-white/70'
              }`}>
                {todo.title}
              </span>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="opacity-0 group-hover:opacity-100 text-red-400/50 hover:text-red-400 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
