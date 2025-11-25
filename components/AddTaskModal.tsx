
import React, { useState, useEffect } from 'react';

export interface ManualTaskPayload {
    text: string;
    time?: string;
}

interface AddTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: ManualTaskPayload) => void;
    selectedDate: Date | null;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onSave, selectedDate }) => {
    const [text, setText] = useState('');
    const [addTime, setAddTime] = useState(false);
    const [time, setTime] = useState('09:00');

    useEffect(() => {
        if (!isOpen) {
            // Reset state when modal closes
            setText('');
            setAddTime(false);
            setTime('09:00');
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
          if (event.key === 'Escape') {
            onClose();
          }
        };
    
        if (isOpen) {
          document.addEventListener('keydown', handleKeyDown);
        }
    
        return () => {
          document.removeEventListener('keydown', handleKeyDown);
        };
      }, [isOpen, onClose]);

    if (!isOpen || !selectedDate) {
        return null;
    }

    const handleSave = () => {
        if (!text.trim()) return;
        onSave({ text, time: addTime ? time : undefined });
    };

    const dateString = selectedDate.toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
        >
            <div
                className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md mx-4 animate-fade-in"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="modal-title" className="text-xl font-bold text-white mb-2">
                    Add Task
                </h2>
                <p className="text-sm text-blue-300 mb-4">{dateString}</p>
                
                <div className="space-y-4">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="What do you need to do?"
                        className="w-full h-28 p-3 bg-gray-900/50 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none transition-colors"
                        aria-label="Task description"
                    />
                    <div className="flex items-center justify-between bg-gray-900/50 p-3 rounded-lg">
                        <label htmlFor="add-time-checkbox" className="flex items-center cursor-pointer">
                            <input
                                id="add-time-checkbox"
                                type="checkbox"
                                checked={addTime}
                                onChange={(e) => setAddTime(e.target.checked)}
                                className="h-5 w-5 rounded border-gray-500 text-blue-500 bg-gray-700 focus:ring-blue-600 focus:ring-offset-gray-800"
                            />
                            <span className="ml-3 text-gray-300">Add a specific time</span>
                        </label>
                        {addTime && (
                             <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="bg-gray-700 text-gray-200 rounded-md border border-gray-600 px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                             />
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium rounded-md bg-gray-600 text-gray-100 hover:bg-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-400"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!text.trim()}
                        className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Save Task
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddTaskModal;
