
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { ProcessedNote, ProcessedNoteWithId, ChatSession, ActionItem, User } from './types';
import { processTranscript } from './services/geminiService';
import * as notesService from './services/notesService';
import * as chatService from './services/chatService';
import * as authService from './services/authService';
import type { TodaysActionItem } from './services/notesService';
import Header from './components/Header';
import RecorderControl from './components/RecorderControl';
import NoteCard from './components/NoteCard';
import Loader from './components/Loader';
import NotesList from './components/NotesList';
import NoteEditor from './components/NoteEditor';
import Clock from './components/Clock';
import Calendar from './components/Calendar';
import AddTaskModal, { ManualTaskPayload } from './components/AddTaskModal';
import AskAIView from './components/AskAIView';
import ChatDetailView from './components/ChatDetailView';
import DateDetailPopover from './components/DateDetailPopover';
import Auth from './components/Auth';

// --- New Component Definition for Today's Reminders ---
interface TodaysActionsProps {
    items: TodaysActionItem[];
    onToggle: (noteId: string, itemIndex: number) => void;
    onNavigateToNote: (noteId: string) => void;
}

const TodaysActions: React.FC<TodaysActionsProps> = ({ items, onToggle, onNavigateToNote }) => {
    if (items.length === 0) {
        return (
            <div className="w-full bg-gray-900/50 border border-gray-700/50 rounded-lg p-4 text-center">
                <h3 className="text-lg font-semibold text-gray-300 mb-2">No Reminders Today</h3>
                <p className="text-gray-400">Use the calendar to add a task for today.</p>
            </div>
        );
    }

    return (
        <div className="w-full bg-yellow-900/40 border border-yellow-600/50 rounded-lg p-4 animate-fade-in">
            <h3 className="text-lg font-semibold text-yellow-300 mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Reminders for Today</span>
            </h3>
            <ul className="space-y-2">
                {items.map(({ noteId, itemIndex, item, noteTitle }) => (
                    <li key={`${noteId}-${itemIndex}`} className="flex items-start bg-gray-800/50 p-3 rounded-md">
                        <input
                            id={`today-action-item-${noteId}-${itemIndex}`}
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => onToggle(noteId, itemIndex)}
                            className="h-5 w-5 rounded border-gray-500 text-blue-500 bg-gray-700 focus:ring-blue-600 focus:ring-offset-gray-800 mt-1 cursor-pointer flex-shrink-0"
                        />
                        <div className="ml-3 flex-grow">
                            <label
                                htmlFor={`today-action-item-${noteId}-${itemIndex}`}
                                className={`text-base cursor-pointer transition-colors ${item.completed ? 'text-gray-500 line-through' : 'text-gray-200'}`}
                            >
                                {item.text}
                            </label>
                            <p className="text-xs text-gray-400 mt-1 flex items-center flex-wrap">
                                {item.time && (
                                    <span className="mr-2 px-1.5 py-0.5 bg-blue-900/70 text-blue-300 rounded text-xs font-mono">{item.time}</span>
                                )}
                                <span>From note:</span> 
                                <button onClick={() => onNavigateToNote(noteId)} className="ml-1 text-blue-400 hover:underline focus:outline-none">
                                    {noteTitle}
                                </button>
                            </p>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

type View = 'home' | 'notesList' | 'noteDetail' | 'editNote' | 'askAI' | 'chatDetail';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authIsLoading, setAuthIsLoading] = useState(true);

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("Loading...");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);
  
  const [view, setView] = useState<View>('home');
  const [notes, setNotes] = useState<ProcessedNoteWithId[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [todaysActions, setTodaysActions] = useState<TodaysActionItem[]>([]);
  
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState<boolean>(false);
  const [selectedDateForTask, setSelectedDateForTask] = useState<Date | null>(null);
  const [datePopover, setDatePopover] = useState<{ date: Date, target: HTMLElement } | null>(null);
  
  const [listSelectedNoteIds, setListSelectedNoteIds] = useState<string[]>([]);
  
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [pendingChatSession, setPendingChatSession] = useState<ChatSession | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const fromViewRef = useRef<View>('home');

  useEffect(() => {
    const initAuth = async () => {
        try {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
        } catch (e) {
            console.error("Auth Init Error:", e);
            // Fallback to null user to allow re-login attempt
            setUser(null);
        } finally {
            setAuthIsLoading(false);
        }
    };
    initAuth();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
        if (user) {
            setIsLoading(true);
            setLoadingMessage("Loading your notes...");
            try {
                const [fetchedNotes, fetchedChats] = await Promise.all([
                    notesService.getNotes(),
                    chatService.getChatSessions()
                ]);
                setNotes(fetchedNotes);
                setChatSessions(fetchedChats);
            } catch (e) {
                console.error("Error fetching data", e);
            } finally {
                setIsLoading(false);
            }
        } else {
            setNotes([]);
            setChatSessions([]);
        }
    };
    fetchData();
  }, [user]);
  
  useEffect(() => {
    setTodaysActions(notesService.getTodaysActionItemsFromNotes(notes));
  }, [notes]);

  const analyzeAndSaveNote = useCallback(async (text: string) => {
    if (!text.trim() || isProcessingRef.current) {
      return;
    }
    
    isProcessingRef.current = true;
    setIsLoading(true);
    setLoadingMessage("Analyzing your note...");
    setError(null);
    
    try {
      const result = await processTranscript(text);
      const newNote = await notesService.saveNote(result);
      setNotes(prevNotes => [newNote, ...prevNotes]);
      setSelectedNoteId(newNote.id);
      setView('noteDetail');
    } catch (e) {
      console.error(e);
      setError('Failed to analyze note. The AI service may be unavailable. Please try again.');
    } finally {
      setIsLoading(false);
      setTranscript('');
      isProcessingRef.current = false;
    }
  }, []);
  
  useEffect(() => {
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Speech recognition is not supported by your browser. Please try Chrome or Safari.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const currentTranscript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      setTranscript(currentTranscript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = `Speech recognition error: ${event.error}`;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        errorMessage = "Microphone access was denied. Please allow microphone access in your browser settings to use this feature.";
      }
      setError(errorMessage);
      setIsRecording(false);
    };
    
    recognition.onend = () => {
      setIsRecording(false);
      // Using functional update to get latest transcript state
      setTranscript(currentTranscript => {
        const trimmed = currentTranscript.trim();
        if (trimmed) {
          analyzeAndSaveNote(trimmed);
        }
        // Return empty string to clear the transcript and prevent double submission
        // if onend fires multiple times or components re-render.
        return ''; 
      });
    };

    recognitionRef.current = recognition;

    return () => {
      // Directly abort the local instance to ensure cleanup of specific effect cycle
      recognition.abort();
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
    };
  }, [analyzeAndSaveNote]);

  const handleToggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      setError(null);
      try {
         setView('home');
         recognitionRef.current?.start();
         setIsRecording(true);
      } catch(e) {
        if (e instanceof DOMException && e.name === 'InvalidStateError') {
          console.error("SpeechRecognition is already active.");
        } else {
          throw e;
        }
      }
    }
  };

  const handleNavigate = (targetView: 'home' | 'notesList' | 'askAI') => {
      setError(null);
      setSelectedNoteId(null);
      if (isRecording) {
        recognitionRef.current?.stop();
      }
      setListSelectedNoteIds([]);
      setPendingChatSession(null);
      setView(targetView);
  }
  
  const handleSelectNote = (id: string) => {
      setSelectedNoteId(id);
      setView('noteDetail');
  }

  const handleEditNote = (id: string) => {
    setSelectedNoteId(id);
    setView('editNote');
  };

  const handleCreateNewNote = () => {
    if (view === 'notesList') {
        setListSelectedNoteIds([]);
        setView('home');
        return;
    }
    fromViewRef.current = view;
    setSelectedNoteId(null);
    setView('editNote');
  };

  const handleCancelEdit = () => {
    setError(null);
    if (selectedNoteId) {
        setView('noteDetail');
    } else {
        setView(fromViewRef.current);
    }
  };

  const handleSaveNote = async (id: string | null, content: string) => {
    if (!content.trim()) {
        setError("Note content cannot be empty.");
        return;
    }
    setIsLoading(true);
    setLoadingMessage("Refining your note...");
    setError(null);
    try {
        const processedData: ProcessedNote = await processTranscript(content);
        let savedNote: ProcessedNoteWithId;
        if (id) {
            savedNote = await notesService.updateNote(id, processedData);
            setNotes(notes => notes.map(n => n.id === id ? savedNote : n));
        } else {
            savedNote = await notesService.saveNote(processedData);
            setNotes(prevNotes => [savedNote, ...prevNotes]);
        }
        setSelectedNoteId(savedNote.id);
        setView('noteDetail');
    } catch (e) {
        console.error(e);
        setError('Failed to save and analyze note. Please try again.');
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleDeleteNote = async (id: string) => {
      try {
          await notesService.deleteNote(id);
          const updatedNotes = notes.filter(n => n.id !== id);
          setNotes(updatedNotes);
          setView('notesList');
          setSelectedNoteId(null);
      } catch (e) {
          console.error("Failed to delete note", e);
          setError("Failed to delete note.");
      }
  }

  const handleToggleActionItem = async (noteId: string, itemIndex: number) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    try {
        const updatedNote = await notesService.toggleActionItemCompletion(note, itemIndex);
        if (updatedNote) {
            setNotes(currentNotes =>
                currentNotes.map(n => n.id === noteId ? updatedNote : n)
            );
        }
    } catch(e) {
        console.error("Error toggling item", e);
    }
  };

  const handleUpdateActionItemDate = async (noteId: string, itemIndex: number, newDate: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    try {
        const updatedNote = await notesService.updateActionItemDate(note, itemIndex, newDate);
        if (updatedNote) {
            setNotes(currentNotes =>
                currentNotes.map(n => n.id === noteId ? updatedNote : n)
            );
        }
    } catch (e) {
        console.error("Error updating date", e);
    }
  };

  const handleDateSelect = (date: Date, target: HTMLElement) => {
      setDatePopover({ date, target });
  };

  const handleClosePopover = () => {
      setDatePopover(null);
  };
  
  const handleAddTaskFromPopover = () => {
    if (!datePopover) return;
    setSelectedDateForTask(datePopover.date);
    setIsAddTaskModalOpen(true);
    handleClosePopover();
  };

  const handleNavigateFromPopover = (noteId: string) => {
    handleClosePopover();
    handleSelectNote(noteId);
  };

  const handleCloseAddTaskModal = () => {
      setIsAddTaskModalOpen(false);
      setSelectedDateForTask(null);
  };

  const handleSaveManualTask = async (task: ManualTaskPayload) => {
    if (!selectedDateForTask) return;

    const year = selectedDateForTask.getFullYear();
    const month = (selectedDateForTask.getMonth() + 1).toString().padStart(2, '0');
    const day = selectedDateForTask.getDate().toString().padStart(2, '0');
    const dueDate = `${year}-${month}-${day}`;

    try {
        const newNote = await notesService.saveManualTaskAsNote({ ...task, dueDate });
        setNotes(prevNotes => [newNote, ...prevNotes].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        handleCloseAddTaskModal();
    } catch (e) {
        console.error("Failed to save task", e);
        setError("Failed to save task.");
    }
  };
  
  const toYYYYMMDD = (d: Date) => {
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
  };

  const popoverTasks = useMemo(() => {
      if (!datePopover) return [];
      const selectedDateStr = toYYYYMMDD(datePopover.date);
      const tasks: TodaysActionItem[] = [];
      notes.forEach(note => {
          if (note.actionItems) {
              note.actionItems.forEach((item, index) => {
                  if (item.dueDate === selectedDateStr) {
                      tasks.push({
                          noteId: note.id,
                          itemIndex: index,
                          item: item,
                          noteTitle: note.refinedNote.split('\n')[0].replace(/^#\s*/, '') || 'Untitled Note',
                      });
                  }
              });
          }
      });
      tasks.sort((a, b) => {
          const aTime = a.item.time;
          const bTime = b.item.time;
          if (a.item.completed !== b.item.completed) {
              return a.item.completed ? 1 : -1;
          }
          if (aTime && bTime) return aTime.localeCompare(bTime);
          if (aTime) return -1;
          if (bTime) return 1;
          return 0;
      });
      return tasks;
  }, [datePopover, notes]);

  const handleStartNewChat = () => {
    setView('notesList');
  }

  const handleAskAboutSelection = () => {
    if (listSelectedNoteIds.length === 0) return;
    const newSession = chatService.createChatSession(listSelectedNoteIds);
    setPendingChatSession(newSession);
    setSelectedChatId(newSession.id);
    setListSelectedNoteIds([]);
    setView('chatDetail');
  }

  const handleSelectChat = (chatId: string) => {
    setPendingChatSession(null);
    setSelectedChatId(chatId);
    setView('chatDetail');
  }
  
  const handleDeleteChat = async (chatId: string) => {
    try {
        await chatService.deleteChatSession(chatId);
        setChatSessions(prev => prev.filter(s => s.id !== chatId));
    } catch (e) {
        console.error("Failed to delete chat", e);
    }
  }
  
  const handleUpdateChatSession = async (updatedSession: ChatSession) => {
    try {
        await chatService.saveChatSession(updatedSession);
        
        setChatSessions(prev => {
            // Use functional update to safely check current state and prevent duplicates
            const existingIndex = prev.findIndex(s => s.id === updatedSession.id);
            
            if (existingIndex >= 0) {
                const newSessions = [...prev];
                newSessions[existingIndex] = updatedSession;
                return newSessions;
            } else {
                return [updatedSession, ...prev].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            }
        });

        // Safely clear pending session if it matches the saved one
        setPendingChatSession(current => (current?.id === updatedSession.id ? null : current));
        
    } catch (e) {
        console.error("Failed to save chat session", e);
    }
  }

  const handleAuthSuccess = async () => {
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
  };

  const handleUserUpdate = (updatedUser: User) => {
      setUser(updatedUser);
  };

  const handleSignOut = async () => {
    await authService.signOut();
    setUser(null);
    setNotes([]);
    setChatSessions([]);
    setView('home');
  };

  const renderViewContent = () => {
    if (error && view !== 'editNote' && view !== 'home') {
      return (
        <div className="text-center text-red-400 bg-red-900/50 p-4 rounded-lg">
            <p className="font-bold">An Error Occurred</p>
            <p>{error}</p>
        </div>
      );
    }
    if (isLoading) return <Loader text={loadingMessage} />;

    switch (view) {
      case 'noteDetail':
        const selectedNote = notes.find(n => n.id === selectedNoteId);
        return selectedNote ? (
          <NoteCard 
            note={selectedNote} 
            onDelete={handleDeleteNote} 
            onEdit={handleEditNote} 
            onToggleActionItem={handleToggleActionItem}
            onUpdateActionItemDate={handleUpdateActionItemDate}
          />
        ) : (
          <div className="text-center text-gray-400">Note not found. It may have been deleted.</div>
        );
       case 'editNote':
        const noteToEdit = notes.find(n => n.id === selectedNoteId);
        return (
            <NoteEditor 
                note={noteToEdit}
                onSave={handleSaveNote}
                onCancel={handleCancelEdit}
                isSaving={isLoading}
            />
        );
      case 'notesList':
        return (
           <NotesList 
              notes={notes}
              onSelectNote={handleSelectNote}
              onCreateNew={handleCreateNewNote}
              selectedNoteIds={listSelectedNoteIds}
              onSelectionChange={setListSelectedNoteIds}
              onAskAboutSelection={handleAskAboutSelection}
            />
        );
      case 'askAI':
        return <AskAIView 
          sessions={chatSessions}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
          onNewChat={handleStartNewChat}
        />;
      case 'chatDetail':
        const sessionToView = (pendingChatSession && pendingChatSession.id === selectedChatId)
            ? pendingChatSession
            : chatSessions.find(s => s.id === selectedChatId);
            
        return sessionToView ? (
            <ChatDetailView
                key={sessionToView.id}
                session={sessionToView}
                allNotes={notes}
                onSessionUpdate={handleUpdateChatSession}
            />
        ) : (
             <div className="text-center text-gray-400">No chat selected.</div>
        )
      case 'home':
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            <div className="space-y-8">
                <Clock />
                <TodaysActions
                    items={todaysActions}
                    onToggle={handleToggleActionItem}
                    onNavigateToNote={handleSelectNote}
                />
            </div>

            <div className="space-y-8">
                <div className="text-center bg-gray-900/50 p-6 rounded-lg shadow-lg">
                   {error && !isRecording && (
                     <div className="mb-4 text-red-400 bg-red-900/50 p-4 rounded-lg">
                        <p className="font-bold">An Error Occurred</p>
                        <p>{error}</p>
                    </div>
                   )}
                  {isRecording ? (
                    <>
                      <p className="text-lg text-gray-400 mb-2">Listening...</p>
                      <p className="text-xl text-gray-100 min-h-[4rem]">{transcript || "Speak now"}</p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-xl font-bold text-gray-200 mb-1">Create a New Note</h2>
                      <p className="text-gray-400 text-sm">Speak freely or write it down.</p>
                    </>
                  )}
                  <div className="mt-6">
                      {isRecording ? (
                          <div className="flex justify-center">
                              <RecorderControl
                                  isRecording={isRecording}
                                  onToggleRecording={handleToggleRecording}
                                  disabled={!isSupported}
                              />
                          </div>
                      ) : (
                          <div className="flex justify-center items-center gap-4 sm:gap-6">
                            <div className="flex flex-col items-center gap-2">
                              <RecorderControl
                                isRecording={isRecording}
                                onToggleRecording={handleToggleRecording}
                                disabled={!isSupported}
                              />
                              <span className="text-gray-300 text-sm font-medium">Record</span>
                            </div>
                            
                            <div className="flex flex-col items-center gap-2">
                               <button
                                  onClick={handleCreateNewNote}
                                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out shadow-lg focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-gray-900 bg-gray-700 hover:bg-gray-600 focus:ring-gray-600"
                                  aria-label="Write a new note"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9 sm:h-10 sm:w-10 text-white" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                    <path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" />
                                    <path d="M13.5 6.5l4 4" />
                                  </svg>
                                </button>
                                <span className="text-gray-300 text-sm font-medium">Write</span>
                            </div>
                          </div>
                      )}
                  </div>
                </div>

                <Calendar onDateSelect={handleDateSelect} notes={notes} />
            </div>
          </div>
        );
    }
  };

  const containerClasses = `w-full bg-gray-800/50 rounded-2xl shadow-2xl p-6 sm:p-8 transition-all duration-300 ${
    (isLoading || (!!error && view !== 'editNote' && view !== 'home'))
    ? 'min-h-[300px] flex items-center justify-center' : ''
  }`;

  if (authIsLoading) {
    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <Loader text="Loading Vocalyn..." />
        </div>
    );
  }

  if (!user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 md:p-8 font-sans">
      <Header view={view} onNavigate={handleNavigate} user={user} onSignOut={handleSignOut} onUserUpdate={handleUserUpdate} />
      <main className="flex flex-col items-center justify-center flex-grow w-full max-w-5xl">
        <div className={containerClasses}>
          {renderViewContent()}
        </div>
      </main>
      <DateDetailPopover
        popoverData={datePopover}
        tasks={popoverTasks}
        onClose={handleClosePopover}
        onAddTask={handleAddTaskFromPopover}
        onToggleTask={handleToggleActionItem}
        onNavigateToNote={handleNavigateFromPopover}
      />
      <AddTaskModal 
        isOpen={isAddTaskModalOpen}
        onClose={handleCloseAddTaskModal}
        onSave={handleSaveManualTask}
        selectedDate={selectedDateForTask}
      />
      <footer className="text-center text-gray-600 p-4 text-sm mt-8">
          <p>Powered by AI. Your notes are processed securely.</p>
      </footer>
    </div>
  );
};

export default App;
