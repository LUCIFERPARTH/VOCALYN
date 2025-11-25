
import React, { useState } from 'react';
import type { ProcessedNoteWithId } from '../types';
import ConfirmationModal from './ConfirmationModal';
import ExportButton from './ExportButton';

interface NoteCardProps {
  note: ProcessedNoteWithId;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onToggleActionItem: (noteId: string, itemIndex: number) => void;
  onUpdateActionItemDate: (noteId: string, itemIndex: number, newDate: string) => void;
}

/**
 * Formats a YYYY-MM-DD date string into a relative, user-friendly label.
 * @param dueDate The date string in YYYY-MM-DD format.
 * @returns A string like "(Today)", "(Tomorrow)", "(in 5 days)", etc.
 */
const formatDueDate = (dueDate: string): string => {
    if (!dueDate) return '';

    // Create date from YYYY-MM-DD. Append T00:00:00 to ensure it's parsed in the user's local timezone.
    const targetDate = new Date(`${dueDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set today to midnight for accurate day difference calculation

    const timeDiff = targetDate.getTime() - today.getTime();
    const dayDiff = Math.round(timeDiff / (1000 * 3600 * 24));

    if (dayDiff === 0) return 'Today';
    if (dayDiff === 1) return 'Tomorrow';
    if (dayDiff === -1) return 'Yesterday';
    if (dayDiff > 1) return `in ${dayDiff} days`;
    if (dayDiff < -1) return `${Math.abs(dayDiff)} days ago`;
    
    return `on ${targetDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
};


const NoteCard: React.FC<NoteCardProps> = ({ note, onDelete, onEdit, onToggleActionItem, onUpdateActionItemDate }) => {
  const { refinedNote, emotionAnalysis, createdAt, id, actionItems } = note;
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // A markdown to JSX converter that groups list items correctly.
  const renderRefinedNote = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: React.ReactNode[] = [];

    const flushListItems = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc pl-5 space-y-1 my-2">
            {listItems}
          </ul>
        );
        listItems = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('* ')) {
        listItems.push(<li key={index} className="text-gray-300">{trimmedLine.substring(2)}</li>);
      } else {
        flushListItems();
        if (trimmedLine.startsWith('# ')) {
          elements.push(<h2 key={index} className="text-2xl font-bold text-blue-300 mt-4 mb-2">{trimmedLine.substring(2)}</h2>);
        } else if (trimmedLine === '') {
           elements.push(<br key={index} />);
        } else {
          elements.push(<p key={index} className="text-gray-200 mb-2">{trimmedLine}</p>);
        }
      }
    });

    flushListItems(); // Add any remaining list items

    return elements;
  };


  return (
    <>
        <div className="w-full text-left animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <p className="text-sm text-gray-500">Created: {new Date(createdAt).toLocaleString()}</p>
                <div className="flex items-center gap-3">
                    <ExportButton note={note} />
                    <button
                        onClick={() => onEdit(id)}
                        className="px-3 py-1 text-sm rounded-md bg-blue-800/70 text-blue-200 hover:bg-blue-700 transition-colors"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="px-3 py-1 text-sm rounded-md bg-red-800/70 text-red-200 hover:bg-red-700 transition-colors"
                    >
                        Delete Note
                    </button>
                </div>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Refined Note Section */}
            <div className="md:col-span-2 bg-gray-900/50 p-6 rounded-lg">
                <h3 className="text-xl font-bold text-gray-100 border-b border-gray-700 pb-3 mb-4 flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                    <span>Refined Note</span>
                </h3>
              <div className="prose prose-invert max-w-none max-h-[40rem] overflow-y-auto pr-4">
                {renderRefinedNote(refinedNote)}
              </div>
            </div>

            {/* Emotion Analysis Section */}
            <div className="md:col-span-1 bg-gray-800/80 p-6 rounded-lg border border-teal-500/20 shadow-lg">
                <h3 className="text-xl font-bold text-teal-300 border-b border-gray-600 pb-3 mb-4 flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 22.5l-.648-1.938a3.375 3.375 0 00-2.684-2.684L11.25 17.25l1.938-.648a3.375 3.375 0 002.684-2.684L16.25 12l.648 1.938a3.375 3.375 0 002.684 2.684l1.938.648-1.938.648a3.375 3.375 0 00-2.684 2.684z" />
                    </svg>
                    <span>AI Emotion Analysis</span>
                </h3>
                <div>
                    <blockquote className="border-l-4 border-gray-500 pl-4 py-2 my-4 bg-gray-900/50 rounded-r-lg">
                        <p className="text-base text-gray-300 italic">"{emotionAnalysis.summary}"</p>
                    </blockquote>
                    <div className="space-y-4 mt-6">
                        {emotionAnalysis.emotions.map((item, index) => (
                            <div key={index} className="bg-gray-900/60 p-4 rounded-lg shadow-inner">
                            <p className="font-semibold text-lg text-blue-300 capitalize">{item.emotion}</p>
                            <p className="text-sm text-gray-400 mt-1">{item.justification}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Action Items Section */}
            {actionItems && actionItems.length > 0 && (
                <div className="md:col-span-3 bg-gray-900/50 p-6 rounded-lg">
                    <h3 className="text-xl font-bold text-gray-100 border-b border-gray-700 pb-3 mb-4 flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Action Items</span>
                    </h3>
                    <ul className="space-y-3">
                        {actionItems.map((item, index) => (
                        <li key={index} className="flex flex-wrap items-center justify-between gap-4 p-2 rounded-md hover:bg-gray-800/40 transition-colors">
                            <div className="flex items-center flex-grow min-w-0">
                                <input
                                id={`action-item-${id}-${index}`}
                                type="checkbox"
                                checked={item.completed}
                                onChange={() => onToggleActionItem(id, index)}
                                className="h-5 w-5 rounded border-gray-500 text-blue-500 bg-gray-700 focus:ring-blue-600 focus:ring-offset-gray-900 cursor-pointer flex-shrink-0"
                                />
                                <label
                                    htmlFor={`action-item-${id}-${index}`}
                                    className={`ml-3 text-base cursor-pointer transition-colors break-words ${item.completed ? 'text-gray-500 line-through' : 'text-gray-200'}`}
                                >
                                    {item.text}
                                </label>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-auto pl-4">
                               <span className={`text-sm ${item.dueDate ? 'text-gray-400' : 'text-gray-600'} hidden sm:inline`}>
                                   {formatDueDate(item.dueDate) || 'No date'}
                               </span>
                               <input
                                   type="date"
                                   value={item.dueDate || ''}
                                   onChange={(e) => onUpdateActionItemDate(id, index, e.target.value)}
                                   className="bg-gray-700 text-gray-300 text-sm rounded border border-gray-600 focus:ring-1 focus:ring-blue-500 focus:outline-none p-1.5 w-[140px]"
                                   aria-label={`Due date for ${item.text}`}
                               />
                            </div>
                        </li>
                        ))}
                    </ul>
                </div>
            )}
          </div>
        </div>
        <ConfirmationModal 
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={() => onDelete(id)}
            title="Delete Note Confirmation"
            message="Are you sure you want to permanently delete this note? This action cannot be undone."
            confirmText="Delete"
        />
    </>
  );
};

export default NoteCard;
