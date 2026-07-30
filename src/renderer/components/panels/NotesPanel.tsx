import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, StickyNote } from 'lucide-react';
import type { StickyNote as StickyNoteType } from '../../../shared/types';

const NOTE_COLORS = [
  { bg: '#fef3c7', border: '#fbbf24', name: 'Yellow' },
  { bg: '#d1fae5', border: '#34d399', name: 'Green' },
  { bg: '#dbeafe', border: '#60a5fa', name: 'Blue' },
  { bg: '#fce7f3', border: '#f472b6', name: 'Pink' },
  { bg: '#ede9fe', border: '#a78bfa', name: 'Purple' },
  { bg: '#fef9c3', border: '#facc15', name: 'Gold' },
];

interface NotesPanelProps {
  onClose: () => void;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({ onClose }) => {
  const [notes, setNotes] = useState<StickyNoteType[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(NOTE_COLORS[0].bg);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const n = await window.snailAPI.db.notes.getAll();
      setNotes(n as StickyNoteType[]);
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
        color: selectedColor,
        position: { x: 100, y: 100 },
        size: { width: 250, height: 200 },
        pinned: false,
      });
      setNotes((prev) => [note as StickyNoteType, ...prev]);
      setNewTitle('');
      setNewContent('');
    } catch {
      // Handle
    }
  }, [newTitle, newContent, selectedColor]);

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
      className="fixed top-3 left-3 w-[360px] max-h-[380px] glass rounded-2xl flex flex-col overflow-hidden z-50 shadow-2xl"
      initial={{ opacity: 0, scale: 0.92, x: -8 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.92, x: -8 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-400/10 flex items-center justify-center">
            <StickyNote size={14} className="text-amber-400" />
          </div>
          <span className="text-sm font-medium text-white/80">Sticky Notes</span>
        </div>
        <button onClick={onClose} className="close-btn">
          <X size={14} />
        </button>
      </div>

      <div className="px-3 py-2.5 border-b border-white/5 space-y-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Title (optional)"
          className="w-full glass-input text-xs py-2"
        />
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Write a note..."
          className="w-full glass-input text-xs py-2 h-[60px] resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) addNote();
          }}
        />
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {NOTE_COLORS.map((c) => (
              <button
                key={c.bg}
                onClick={() => setSelectedColor(c.bg)}
                className={`w-5 h-5 rounded-full transition-all ${
                  selectedColor === c.bg ? 'ring-2 ring-white/40 ring-offset-1 ring-offset-transparent scale-110' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c.bg }}
              />
            ))}
          </div>
          <button onClick={addNote} className="glass-btn-primary text-xs px-3 py-1.5 ml-auto flex items-center gap-1">
            <Plus size={12} />
            Add Note
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin space-y-1.5">
        <AnimatePresence>
          {notes.length === 0 && (
            <div className="empty-state">
              <StickyNote size={28} />
              <p className="empty-state-text">No notes yet. Jot something down!</p>
            </div>
          )}
          {notes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="px-3 py-2.5 rounded-xl group transition-all"
              style={{ backgroundColor: note.color + '15', borderLeft: `3px solid ${note.color}` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {note.title && (
                    <div className="text-xs font-medium text-white/80 truncate">{note.title}</div>
                  )}
                  <div className="text-[11px] text-white/50 mt-0.5 line-clamp-3 leading-relaxed">{note.content}</div>
                </div>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-400/50 hover:text-red-400 transition-all flex-shrink-0 mt-0.5"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
