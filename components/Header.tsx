
import React, { useState, useRef, useEffect } from 'react';
import type { User } from '../types';
import UserIcon from './icons/UserIcon';
import SettingsModal from './SettingsModal';

interface HeaderProps {
    view: 'home' | 'notesList' | 'noteDetail' | 'editNote' | 'askAI' | 'chatDetail';
    onNavigate: (view: 'home' | 'notesList' | 'askAI') => void;
    user: User | null;
    onSignOut: () => void;
    onUserUpdate?: (user: User) => void;
}

const Header: React.FC<HeaderProps> = ({ view, onNavigate, user, onSignOut, onUserUpdate }) => {
  const showTabs = view === 'home' || view === 'notesList' || view === 'askAI';
  const showNoteBackButton = view === 'noteDetail' || view === 'editNote';
  const showChatBackButton = view === 'chatDetail';

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setIsMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleOpenSettings = () => {
      setIsSettingsOpen(true);
      setIsMenuOpen(false);
  };

  const navItems = [
    { view: 'home' as const, label: 'Home' },
    { view: 'notesList' as const, label: 'My Notes' },
    { view: 'askAI' as const, label: 'Ask AI' },
  ];

  return (
    <>
    <header className="w-full max-w-4xl mb-8">
        <div className="flex justify-between items-center relative h-20">
            <div className="absolute left-0 top-1/2 -translate-y-1/2">
              {showNoteBackButton && (
                <button 
                  onClick={() => onNavigate('notesList')} 
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                  ‹ All Notes
                </button>
              )}
               {showChatBackButton && (
                <button 
                  onClick={() => onNavigate('askAI')} 
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                  ‹ All Chats
                </button>
              )}
            </div>
            <div className="text-center w-full">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-teal-300 text-transparent bg-clip-text cursor-pointer" onClick={() => onNavigate('home')}>
                    Vocalyn
                </h1>
                <p className="text-gray-400 mt-2 text-sm sm:text-base">Your AI Emotional Knowledge Companion</p>
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
                {user && (
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-2 rounded-full bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="User menu"
                            aria-haspopup="true"
                            aria-expanded={isMenuOpen}
                        >
                            <UserIcon />
                        </button>
                        {isMenuOpen && (
                             <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10 animate-fade-in">
                                <div className="px-4 py-3 border-b border-gray-700">
                                    <p className="text-sm text-gray-400">Signed in as</p>
                                    <p className="text-sm font-medium text-gray-200 truncate">{user.email}</p>
                                </div>
                                <ul className="py-1">
                                     <li>
                                        <button
                                            onClick={handleOpenSettings}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                                        >
                                            Settings
                                        </button>
                                    </li>
                                    <li>
                                        <button
                                            onClick={onSignOut}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                                        >
                                            Sign Out
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

        {showTabs && (
           <nav className="mt-4 flex justify-center">
                <div className="bg-gray-800 p-1 rounded-xl flex space-x-1 shadow-md">
                    {navItems.map(item => {
                        const isActive = view === item.view;
                        return (
                            <button
                                key={item.view}
                                onClick={() => onNavigate(item.view)}
                                className={`px-4 sm:px-6 py-2 text-sm sm:text-base font-semibold rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 ${
                                    isActive 
                                    ? 'bg-blue-600 text-white shadow-sm' 
                                    : 'text-gray-300 hover:bg-gray-700/50 hover:text-gray-100'
                                }`}
                                aria-current={isActive ? 'page' : undefined}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            </nav>
        )}
    </header>
    {user && onUserUpdate && (
        <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
            user={user} 
            onUserUpdate={onUserUpdate}
        />
    )}
    </>
  );
};

export default Header;
