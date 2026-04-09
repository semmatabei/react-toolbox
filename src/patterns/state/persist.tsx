import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'

interface Note {
  id: number
  text: string
  createdAt: string
}

interface NotesStore {
  notes: Note[]
  addNote: (text: string) => void
  removeNote: (id: number) => void
  clear: () => void
}

const useNotesStore = create<NotesStore>()(
  persist(
    (set) => ({
      notes: [],
      addNote: (text) =>
        set((s) => ({
          notes: [
            { id: Date.now(), text, createdAt: new Date().toLocaleTimeString() },
            ...s.notes,
          ],
        })),
      removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
      clear: () => set({ notes: [] }),
    }),
    {
      name: 'react-toolbox:notes',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

export default function PersistedStore() {
  const { notes, addNote, removeNote, clear } = useNotesStore()
  const [text, setText] = useState('')

  function handleAdd() {
    if (!text.trim()) return
    addNote(text.trim())
    setText('')
  }

  return (
    <div className="space-y-4 rounded-lg border border-border p-6">
      <p className="text-sm text-muted-foreground">
        Notes persist in <code className="text-xs bg-muted px-1 py-0.5 rounded">localStorage</code> via Zustand persist middleware. Refresh the page — they'll still be here.
      </p>

      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note…"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Button onClick={handleAdd}>Add</Button>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No notes yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {notes.map((note) => (
            <li key={note.id} className="flex items-center justify-between py-2 text-sm">
              <span>{note.text}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{note.createdAt}</span>
                <Button variant="ghost" size="sm" onClick={() => removeNote(note.id)}>×</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {notes.length > 0 && (
        <Button variant="outline" size="sm" onClick={clear}>Clear all</Button>
      )}
    </div>
  )
}
