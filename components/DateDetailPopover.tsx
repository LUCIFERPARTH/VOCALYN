
import React, { useEffect, useState, useRef } from 'react';
import type { TodaysActionItem } from '../services/notesService';

interface DateDetailPopoverProps {
  popoverData: { date: Date; target: HTMLElement; } | null;
  tasks: TodaysActionItem[];
  onClose: () => void;
  onAddTask: () => void;
  onToggleTask: (noteId: string, itemIndex: number) => void;
  onNavigateToNote: (noteId: string) => void;
}

const DateDetailPopover: React.FC<DateDetailPopoverProps> = ({
  popoverData,
  tasks,
  onClose,
  onAddTask,
  onToggleTask,
  onNavigateToNote
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!popoverData || !popoverRef.current) return;

    const targetRect = popoverData.target.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 8;

    let top = targetRect.top;
    let left = targetRect.right + margin;

    // Adjust if it overflows the right edge
    if (left + popoverRect.width > viewportWidth) {
      left = targetRect.left - popoverRect.width - margin;
    }

    // Adjust if it overflows the bottom edge
    if (top + popoverRect.height > viewportHeight) {
      top = viewportHeight - popoverRect.height - margin;
    }
    
    // Ensure it doesn't go off the top or left
    if (top < margin) top = margin;
    if (left < margin) left = margin;


    setPosition({ top, left });
  }, [popoverData]);
  
  if (!popoverData) {
    return null;
  }

  const dateString = popoverData.date.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={popoverRef}
        className="fixed z-50 w-80 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl animate-fade-in"
        style={{ top: `${position.top}px`, left: `${position.left}px` }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="popover-title"
      >
        <div className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 id="popover-title" className="font-semibold text-white">{dateString}</h3>
            <button 
                onClick={onClose}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                aria-label="Close popover"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
            {tasks.length > 0 ? (
                tasks.map(({ noteId, itemIndex, item, noteTitle }) => (
                    <div key={`${noteId}-${itemIndex}`} className="flex items-start text-sm bg-gray-900/50 p-2.5 rounded-md">
                        <input
                            id={`popover-action-item-${noteId}-${itemIndex}`}
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => onToggleTask(noteId, itemIndex)}
                            className="h-4 w-4 rounded border-gray-500 text-blue-500 bg-gray-700 focus:ring-blue-600 focus:ring-offset-gray-800 mt-0.5 cursor-pointer flex-shrink-0"
                        />
                         <div className="ml-2.5 flex-grow">
                            <label
                                htmlFor={`popover-action-item-${noteId}-${itemIndex}`}
                                className={`cursor-pointer transition-colors ${item.completed ? 'text-gray-500 line-through' : 'text-gray-200'}`}
                            >
                                {item.text}
                            </label>
                            <p className="text-xs text-gray-400 mt-1">
                                {item.time && (
                                    <span className="mr-2 px-1 py-0.5 bg-blue-900/70 text-blue-300 rounded text-xs font-mono">{item.time}</span>
                                )}
                                <button onClick={() => onNavigateToNote(noteId)} className="text-blue-400 hover:underline focus:outline-none">
                                    from "{noteTitle}"
                                </button>
                            </p>
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-center text-gray-400 py-4 text-sm">No tasks for this day.</p>
            )}
          </div>
          
          <div className="mt-4 border-t border-gray-700 pt-3">
            <button
                onClick={onAddTask}
                className="w-full px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 flex items-center justify-center gap-2"
            >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                <span>Add New Task</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DateDetailPopover;
