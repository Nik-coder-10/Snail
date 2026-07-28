import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TodoItem, TodoList } from '../../../shared/types';

interface TodoPanelProps {
  onClose: () => void;
}

export const TodoPanel: React.FC<TodoPanelProps> = ({ onClose }) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [lists, setLists] = useState<TodoList[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [selectedList, setSelectedList] = useState('default');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [t, l] = await Promise.all([
        window.snailAPI.db.todos.getAll(),
        window.snailAPI.db.lists.getAll(),
      ]);
      setTodos(t as TodoItem[]);
      setLists(l as TodoList[]);
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
        listId: selectedList,
      });
      setTodos((prev) => [todo as TodoItem, ...prev]);
      setNewTitle('');
    } catch {
      // Handle
    }
  }, [newTitle, selectedList]);

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
      className="absolute top-2 left-2 w-[340px] max-h-[260px] glass rounded-2xl flex flex-col overflow-hidden z-50"
      initial={{ opacity: 0, scale: 0.9, x: -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: -10 }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
        <span className="text-xs font-medium">To-Do List</span>
        <button onClick={onClose} className="w-5 h-5 glass-light rounded-full text-[10px]">x</button>
      </div>

      <div className="px-3 py-2">
        <div className="flex gap-1.5">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
            placeholder="Add a task..."
            className="flex-1 glass-input text-xs py-1.5"
          />
          <button onClick={addTodo} className="glass-btn-primary text-xs px-3">+</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-2 scrollbar-thin space-y-1">
        <AnimatePresence>
          {[...pendingTodos, ...completedTodos].map((todo) => (
            <motion.div
              key={todo.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center gap-2 px-2 py-1.5 glass-light rounded-lg group"
            >
              <button
                onClick={() => toggleTodo(todo.id, todo.completed)}
                className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${
                  todo.completed
                    ? 'bg-snail-500 border-snail-500'
                    : 'border-white/20 hover:border-white/40'
                }`}
              >
                {todo.completed && <span className="text-[10px] text-white">{'\u2713'}</span>}
              </button>
              <span className={`flex-1 text-xs truncate ${todo.completed ? 'line-through text-white/30' : ''}`}>
                {todo.title}
              </span>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="opacity-0 group-hover:opacity-100 text-[10px] text-red-400/60 hover:text-red-400 transition-all"
              >
                x
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
