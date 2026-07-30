import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Check, Trash2, ListTodo, RotateCcw } from 'lucide-react';
import type { TodoItem } from '../../../shared/types';

const panelSpring = {
  type: 'spring' as const,
  stiffness: 380, damping: 28, mass: 0.6,
};

const itemSpring = {
  type: 'spring' as const,
  stiffness: 400, damping: 30, mass: 0.5,
};

interface TodoPanelProps {
  onClose: () => void;
}

export const TodoPanel: React.FC<TodoPanelProps> = ({ onClose }) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const t = await window.snailAPI.db.todos.getAll();
      setTodos(t as TodoItem[]);
    } catch {}
  };

  const addTodo = useCallback(async () => {
    if (!newTitle.trim()) return;
    try {
      const todo = await window.snailAPI.db.todos.create({
        title: newTitle, completed: false, priority: 'medium' as const, listId: 'default',
      });
      setTodos((prev) => [todo as TodoItem, ...prev]);
      setNewTitle('');
    } catch {}
  }, [newTitle]);

  const toggleTodo = useCallback(async (id: string, completed: boolean) => {
    try {
      await window.snailAPI.db.todos.update(id, { completed: !completed });
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !completed } : t)));
    } catch {}
  }, []);

  const deleteTodo = useCallback(async (id: string) => {
    try {
      await window.snailAPI.db.todos.delete(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch {}
  }, []);

  const pendingTodos = todos.filter((t) => !t.completed);
  const completedTodos = todos.filter((t) => t.completed);

  return (
    <motion.div
      className="fixed top-3 left-3 w-[360px] max-h-[400px] panel-container glass flex flex-col overflow-hidden z-50"
      initial={{ opacity: 0, scale: 0.94, x: -8 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.94, x: -8 }}
      transition={panelSpring}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-snail-400/10 flex items-center justify-center">
            <ListTodo size={15} className="text-snail-400" />
          </div>
          <span className="text-sm font-semibold text-white/85 tracking-tight">To-Do List</span>
          {pendingTodos.length > 0 && (
            <span className="badge badge-green">{pendingTodos.length}</span>
          )}
        </div>
        <button onClick={onClose} className="close-btn"><X size={14} /></button>
      </div>

      <div className="px-3 py-2.5 border-b border-white/[0.04]">
        <div className="flex gap-2">
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
            placeholder="Add a task..." className="flex-1 glass-input text-xs py-2" />
          <motion.button onClick={addTodo}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-snail-500/18 border border-snail-500/22 text-snail-400 transition-colors"
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }}>
            <Plus size={14} />
          </motion.button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin space-y-1">
        <AnimatePresence initial={false}>
          {todos.length === 0 && (
            <div className="empty-state">
              <ListTodo size={28} className="empty-state-icon" />
              <p className="empty-state-text">No tasks yet. Add one above!</p>
            </div>
          )}
          {[...pendingTodos, ...completedTodos].map((todo) => (
            <motion.div
              key={todo.id}
              layout
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96, height: 0 }}
              transition={itemSpring}
              className="flex items-center gap-2.5 px-3 py-2.5 glass-light rounded-xl group"
            >
              <motion.button
                onClick={() => toggleTodo(todo.id, todo.completed)}
                className={`w-[18px] h-[18px] rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${
                  todo.completed ? 'bg-snail-500 border-snail-500' : 'border-white/15 hover:border-white/30 hover:bg-white/5'
                }`}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.85 }}
              >
                {todo.completed && <Check size={10} className="text-white" />}
              </motion.button>
              <span className={`flex-1 text-xs truncate ${todo.completed ? 'line-through text-white/20' : 'text-white/65'}`}>
                {todo.title}
              </span>
              <motion.button
                onClick={() => deleteTodo(todo.id)}
                className="opacity-0 group-hover:opacity-100 text-red-400/40 hover:text-red-400 transition-opacity"
                whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}
              >
                <Trash2 size={12} />
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
