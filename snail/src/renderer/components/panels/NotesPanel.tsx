import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StickyNote } from '../../../shared/types';

const NOTE_COLORS = [
  { bg: '#fef3c7', name: 'Yellow' },
  { bg: '#d1fae5', name: 'Green' },
  { bg: '#dbeafe', name: 'Blue' },
  { bg: '#fce7f3', name: 'Pink' },
  { bg: '#ede9fe', name: 'Purple' },
];

interface NotesPanelProps {
  onClose: () => void;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({ onClose }) => {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const n = await window.snailAPI.db.notes.getAll();
      setNotes(n as StickyNote[]);
    } catch {
      // Handle
    }
  };

  const addNote = useCallback(async () => {
    if (!newContent.trim()) return;
    try {
      const note = await window.snailAPI.db.notes.create({
        title: newTitle,
        content: newContent,
        color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)].bg,
        position: { x: 100, y: 100 },
        size: { width: 250, height: 200 },
        pinned: false,
      });
      setNotes((prev) => [note as StickyNote, ...prev]);
      setNewTitle('');
      setNewContent('');
    } catch {
      // Handle
    }
  }, [newTitle, newContent]);

  const deleteNote = useCallback(async (id: string) => {
    try {
      await window.snailAPI.db.notes.delete(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // Handle
    }
  }, []);

  return (
    <motion.div
      className="absolute top-2 left-2 w-[340px] max-h-[260px] glass rounded-2xl flex flex-col overflow-hidden z-50"
      initial={{ opacity: 0, scale: 0.9, x: -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: -10 }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
        <span className="text-xs font-medium">Sticky Notes</span>
        <button onClick={onClose} className="w-5 h-5 glass-light rounded-full text-[10px]">x</button>
      </div>

      <div className="px-3 py-2 space-y-1.5">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Title (optional)"
          className="w-full glass-input text-xs py-1.5"
        />
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Write a note..."
          className="w-full glass-input text-xs py-1.5 h-14 resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) addNote();
          }}
        />
        <button onClick={addNote} className="glass-btn-primary text-xs w-full">
          Add Note
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-2 scrollbar-thin space-y-1.5">
        <AnimatePresence>
          {notes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="px-3 py-2 rounded-lg group"
              style={{ backgroundColor: note.color + '20', borderLeft: `3px solid ${note.color}` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {note.title && (
                    <div className="text-xs font-medium text-white/90 truncate">{note.title}</div>
                  )}
                  <div className="text-[11px] text-white/60 mt-0.5 line-clamp-3">{note.content}</div>
                </div>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="opacity-0 group-hover:opacity-100 text-[10px] text-red-400/60 ml-1 flex-shrink-0 transition-all"
                >
                  x
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
