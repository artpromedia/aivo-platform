'use client';

import { formatDistanceToNow } from 'date-fns';

interface TeacherNote {
  id: string;
  teacherName: string;
  content: string;
  createdAt: string;
  subject?: string;
}

interface TeacherNotesProps {
  notes: TeacherNote[];
}

export function TeacherNotes({ notes }: TeacherNotesProps) {
  if (notes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <div key={note.id} className="border-l-2 border-indigo-500 pl-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900">{note.teacherName}</span>
            {note.subject && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {note.subject}
              </span>
            )}
          </div>
          <p className="text-gray-700 text-sm">{note.content}</p>
          <p className="text-xs text-gray-400 mt-1">
            {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
          </p>
        </div>
      ))}
    </div>
  );
}
