
import React, { useState } from 'react';
import type { ProcessedNoteWithId } from '../types';

interface NoteEditorProps {
    note?: ProcessedNoteWithId;
    onSave: (id: string | null, content: string) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ note, onSave, onCancel, isSaving }) => {
    const [content, setContent] = useState(note?.refinedNote || '');

    const handleSave = () => {
        if (!content.trim() || isSaving) return;
        onSave(note?.id || null, content);
    }
    
    return (
        <div className="w-full text-left animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-100 mb-4">
                {note ? 'Edit Note' : 'Create New Note'}
            </h2>
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start writing your note here..."
                className="w-full h-64 sm:h-80 p-4 bg-gray-900/50 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y transition-colors"
                aria-label="Note content"
                disabled={isSaving}
            />
            <p className="text-sm text-gray-500 mt-2">
                When you save, the AI will refine and analyze your note.
            </p>
            <div className="flex justify-end items-center gap-4 mt-6">
                <button
                    onClick={onCancel}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={isSaving || !content.trim()}
                    className="px-6 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? 'Saving...' : 'Save Note'}
                </button>
            </div>
        </div>
    );
}

export default NoteEditor;
