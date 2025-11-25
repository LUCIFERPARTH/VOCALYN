import React, { useState } from 'react';
import type { ProcessedNoteWithId } from '../types';

interface NotesListProps {
  notes: ProcessedNoteWithId[];
  onSelectNote: (id: string) => void;
  onCreateNew: () => void;
  selectedNoteIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onAskAboutSelection: () => void;
}

/**
 * Renders a simplified version of the note's markdown content for previews.
 * @param text The markdown text to render.
 * @returns An array of JSX elements.
 */
const renderMarkdownPreview = (text: string) => {
    return text.split('\n').map((line, index) => {
      line = line.trim();
      if (line.startsWith('# ')) {
        return <p key={index} className="font-bold text-gray-200 mt-2 mb-1 text-base">{line.substring(2)}</p>;
      }
      if (line.startsWith('* ')) {
        return <li key={index} className="ml-5 list-disc text-gray-300">{line.substring(2)}</li>;
      }
      if(line === '') {
        return null;
      }
      return <p key={index} className="text-gray-300">{line}</p>;
    }).filter(Boolean); // Filter out nulls from empty lines
};


const NotesList: React.FC<NotesListProps> = ({ notes, onSelectNote, onCreateNew, selectedNoteIds, onSelectionChange, onAskAboutSelection }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

    const handleNoteSelection = (noteId: string) => {
        const newSelection = selectedNoteIds.includes(noteId)
            ? selectedNoteIds.filter(id => id !== noteId)
            : [...selectedNoteIds, noteId];
        onSelectionChange(newSelection);
    };

    const filteredNotes = notes.filter(note => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        const content = note.refinedNote.toLowerCase();
        const summary = note.emotionAnalysis.summary.toLowerCase();
        return content.includes(query) || summary.includes(query);
    });

    return (
        <div className="w-full text-left animate-fade-in space-y-4 relative pb-24">
            <div className="flex justify-between items-center border-b border-gray-700 pb-3 mb-4">
                <h2 className="text-2xl font-bold text-gray-100">My Notes</h2>
                <button
                    onClick={onCreateNew}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                    + New Note
                </button>
            </div>

            {/* Search Bar: Only show if there are notes to search through */}
            {notes.length > 0 && (
                <div className="relative mb-4">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search notes by keyword..."
                        className="w-full bg-gray-900/50 text-gray-200 placeholder-gray-500 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        aria-label="Search notes"
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
            )}
            
            {notes.length === 0 ? (
                 <div className="text-center text-gray-400 py-12">
                    <h3 className="text-xl font-semibold text-gray-300 mb-2">No Notes Yet</h3>
                    <p>Create your first note to get started.</p>
                </div>
            ) : filteredNotes.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                    <h3 className="text-xl font-semibold text-gray-300 mb-2">No Matches Found</h3>
                    <p>Try a different search term.</p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {filteredNotes.map(note => {
                        const allTasksCompleted = note.actionItems?.length > 0 && note.actionItems.every(item => item.completed);
                        const isSelected = selectedNoteIds.includes(note.id);
                        const isExpanded = expandedNoteId === note.id;
                        const TRUNCATE_LENGTH = 180;
                        const needsTruncation = note.refinedNote.length > TRUNCATE_LENGTH;

                        let previewContent = note.refinedNote;
                        if (needsTruncation && !isExpanded) {
                            const lastSpace = note.refinedNote.lastIndexOf(' ', TRUNCATE_LENGTH);
                            previewContent = note.refinedNote.substring(0, lastSpace > 0 ? lastSpace : TRUNCATE_LENGTH) + '...';
                        }
                        
                        return (
                            <li 
                                key={note.id}
                                onClick={() => handleNoteSelection(note.id)}
                                className={`p-4 rounded-lg cursor-pointer transition-all duration-200 flex items-start gap-4 ${isSelected ? 'bg-blue-900/50 ring-2 ring-blue-500' : 'bg-gray-900/50 hover:bg-gray-800/80'}`}
                                role="checkbox"
                                tabIndex={0}
                                aria-checked={isSelected}
                                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleNoteSelection(note.id)}
                            >
                                 <input
                                    type="checkbox"
                                    checked={isSelected}
                                    readOnly
                                    className="h-5 w-5 rounded border-gray-500 text-blue-500 bg-gray-700 focus:ring-blue-600 focus:ring-offset-gray-900 mt-1 flex-shrink-0 pointer-events-none"
                                    aria-labelledby={`note-title-${note.id}`}
                                    tabIndex={-1}
                                />
                                <div className="flex-grow overflow-hidden">
                                    <div className="flex justify-between items-start gap-2">
                                        <button
                                            id={`note-title-${note.id}`}
                                            className="font-semibold text-lg text-blue-300 truncate pr-2 text-left hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-sm"
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevent li selection handler
                                                onSelectNote(note.id);
                                            }}
                                        >
                                            {note.refinedNote.split('\n')[0].replace(/^#\s*/, '') || 'Untitled Note'}
                                        </button>
                                        {allTasksCompleted && (
                                            <span className="flex-shrink-0 flex items-center gap-1 bg-green-800/60 text-green-300 text-xs font-medium px-2 py-1 rounded-full mt-1" title="All action items in this note are complete.">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span>Complete</span>
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-400">{new Date(note.createdAt).toLocaleString()}</p>
                                    
                                    <div className={`mt-2 text-sm transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 overflow-y-auto' : ''}`}>
                                        <div className="prose prose-invert max-w-none prose-p:my-1 prose-li:my-0.5 text-gray-400 break-words">
                                            {renderMarkdownPreview(previewContent)}
                                        </div>
                                        {needsTruncation && (
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setExpandedNoteId(isExpanded ? null : note.id);
                                                }}
                                                className="text-blue-400 text-sm font-semibold mt-2 hover:underline focus:outline-none"
                                            >
                                                {isExpanded ? 'Show Less' : 'Read More'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
            {selectedNoteIds.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 sm:left-auto sm:right-auto sm:bottom-8 bg-gray-900/80 backdrop-blur-sm border-t sm:border border-gray-700 p-4 sm:rounded-xl shadow-2xl w-full sm:w-auto animate-fade-in">
                    <div className="flex items-center justify-between gap-4 max-w-5xl mx-auto">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-200">{selectedNoteIds.length} note{selectedNoteIds.length > 1 ? 's' : ''} selected</span>
                            <button
                                onClick={() => onSelectionChange([])}
                                className="p-1.5 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                                aria-label="Clear selection"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <button
                            onClick={onAskAboutSelection}
                            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 22.5l-.648-1.938a3.375 3.375 0 00-2.684-2.684L11.25 17.25l1.938-.648a3.375 3.375 0 002.684-2.684L16.25 12l.648 1.938a3.375 3.375 0 002.684 2.684l1.938.648-1.938.648a3.375 3.375 0 00-2.684 2.684z" /></svg>
                            <span>Ask AI</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotesList;