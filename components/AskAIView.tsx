import React, { useState } from 'react';
import type { ChatSession } from '../types';
import ConfirmationModal from './ConfirmationModal';

interface AskAIViewProps {
    sessions: ChatSession[];
    onSelectChat: (id: string) => void;
    onDeleteChat: (id: string) => void;
    onNewChat: () => void;
}

const AskAIView: React.FC<AskAIViewProps> = ({ sessions, onSelectChat, onDeleteChat, onNewChat }) => {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [chatToDelete, setChatToDelete] = useState<ChatSession | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const handleDeleteRequest = (session: ChatSession) => {
        setChatToDelete(session);
        setIsDeleteModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsDeleteModalOpen(false);
        setChatToDelete(null);
    };

    const handleConfirmDelete = () => {
        if (chatToDelete) {
            onDeleteChat(chatToDelete.id);
        }
        handleCloseModal();
    };

    const filteredSessions = sessions.filter(session => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();

        // Check title
        if ((session.title || '').toLowerCase().includes(query)) {
            return true;
        }

        // Check message content
        return session.messages.some(message => {
            if (typeof message.content === 'string') {
                return message.content.toLowerCase().includes(query);
            } else if (message.content && typeof message.content.answer === 'string') {
                return message.content.answer.toLowerCase().includes(query);
            }
            return false;
        });
    });

    return (
        <>
            <div className="w-full text-left animate-fade-in space-y-4">
                <div className="flex justify-between items-center border-b border-gray-700 pb-3 mb-4">
                    <h2 className="text-2xl font-bold text-gray-100">AI Chat History</h2>
                    <button
                        onClick={onNewChat}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                    >
                        + New Chat
                    </button>
                </div>

                {/* Search Bar: Only show if there are sessions to search through */}
                {sessions.length > 0 && (
                    <div className="relative mb-4">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search chats by title or content..."
                            className="w-full bg-gray-900/50 text-gray-200 placeholder-gray-500 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            aria-label="Search chats"
                        />
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                )}


                {sessions.length === 0 ? (
                    <div className="text-center text-gray-400 py-12">
                        <h3 className="text-xl font-semibold text-gray-300 mb-2">No Chats Yet</h3>
                        <p>Start a new chat to ask questions about your notes.</p>
                    </div>
                ) : filteredSessions.length === 0 ? (
                    <div className="text-center text-gray-400 py-12">
                        <h3 className="text-xl font-semibold text-gray-300 mb-2">No Matches Found</h3>
                        <p>Try a different search term.</p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {filteredSessions.map(session => (
                            <li 
                                key={session.id}
                                className="p-4 rounded-lg bg-gray-900/50 hover:bg-gray-800/80 transition-all duration-200 flex items-center justify-between gap-4"
                            >
                                <button
                                    onClick={() => onSelectChat(session.id)}
                                    className="flex-grow text-left focus:outline-none"
                                >
                                    <p className="font-semibold text-lg text-blue-300 truncate pr-2 hover:underline">
                                        {session.title || 'Untitled Chat'}
                                    </p>
                                    <p className="text-sm text-gray-400 mt-1">
                                        {new Date(session.createdAt).toLocaleString()} • {session.noteIds.length} note{session.noteIds.length > 1 ? 's' : ''}
                                    </p>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteRequest(session);
                                    }}
                                    className="p-2 rounded-full text-gray-500 hover:bg-red-900/50 hover:text-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                                    aria-label={`Delete chat titled ${session.title}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <ConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={handleCloseModal}
                onConfirm={handleConfirmDelete}
                title="Delete Chat Confirmation"
                message={`Are you sure you want to permanently delete the chat titled "${chatToDelete?.title || 'Untitled Chat'}"? This action cannot be undone.`}
                confirmText="Delete"
            />
        </>
    );
};

export default AskAIView;