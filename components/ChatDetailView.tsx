
import React, { useState, useEffect, useRef } from 'react';
import type { ProcessedNoteWithId, ChatSession, ChatMessage, AskAIResponse } from '../types';
import { continueChatStream } from '../services/geminiService';
import Loader from './Loader';

interface ChatDetailViewProps {
    session: ChatSession;
    allNotes: ProcessedNoteWithId[];
    onSessionUpdate: (session: ChatSession) => void;
}

const ChatDetailView: React.FC<ChatDetailViewProps> = ({ session: initialSession, allNotes, onSessionUpdate }) => {
    const [session, setSession] = useState<ChatSession>(initialSession);
    const [question, setQuestion] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [useGoogleSearch, setUseGoogleSearch] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        // Scroll to the bottom of the messages list when new messages are added
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [session?.messages, isStreaming]);

    const handleSubmit = async () => {
        if (isStreaming || !question.trim() || !session) return;

        setIsStreaming(true);
        setError(null);
        
        const questionToAsk = question;
        
        // 1. Update UI Optimistically
        const userMessage: ChatMessage = { role: 'user', content: questionToAsk };
        
        // We maintain a local copy of the messages to ensure we always have the latest list 
        // for the final save, as state updates are async.
        let currentMessages = [...session.messages, userMessage];
        const isFirstMessage = session.messages.length === 0;

        // Add placeholder for model response
        const placeholderMessage: ChatMessage = { role: 'model', content: { answer: '', sources: [] } };
        currentMessages = [...currentMessages, placeholderMessage];

        setSession(prev => ({ ...prev, messages: currentMessages }));
        setQuestion('');
        
        const contextNotes = allNotes.filter(note => session.noteIds.includes(note.id));

        try {
            const stream = continueChatStream(contextNotes, questionToAsk, session.messages, useGoogleSearch);

            let fullAnswer = '';
            let collectedSources: any[] = [];
            let collectedWebSources: any[] = [];

            for await (const chunk of stream) {
                if (chunk.text) fullAnswer += chunk.text;
                if (chunk.sources) collectedSources = chunk.sources;
                if (chunk.webSources) collectedWebSources = chunk.webSources;

                // Update UI incrementally
                setSession(prev => {
                    const msgs = [...prev.messages];
                    const lastMsg = msgs[msgs.length - 1];
                    
                    if (lastMsg?.role === 'model' && typeof lastMsg.content === 'object') {
                        msgs[msgs.length - 1] = {
                            ...lastMsg,
                            content: {
                                answer: fullAnswer, // Use local fullAnswer to ensure no dropped characters
                                sources: collectedSources.length ? collectedSources : lastMsg.content.sources,
                                webSources: collectedWebSources.length ? collectedWebSources : lastMsg.content.webSources
                            }
                        };
                    }
                    return { ...prev, messages: msgs };
                });
            }
            
            // 2. Construct Final Session Object
            const finalMessages = [...currentMessages];
            finalMessages[finalMessages.length - 1] = {
                role: 'model',
                content: {
                    answer: fullAnswer,
                    sources: collectedSources,
                    webSources: collectedWebSources
                }
            };

            const finalSession: ChatSession = { 
                ...session, 
                title: isFirstMessage ? questionToAsk.substring(0, 50) : session.title,
                messages: finalMessages
            };
            
            // 3. Update Final State and Persist ONCE
            setSession(finalSession);
            onSessionUpdate(finalSession);

        } catch (e) {
            console.error(e);
            setError("Failed to get an answer from the AI. The service may be unavailable. Please try again.");
            // Remove the placeholder on error
            setSession(s => ({...s, messages: s.messages.slice(0, -1) }));
        } finally {
            setIsStreaming(false);
        }
    };

    const renderAnswerText = (text: string) => {
        const separator = '%%SOURCES_JSON%%';
        const cleanText = text.split(separator)[0];

        return cleanText.split('\n').map((line, index) => {
            line = line.trim();
            if (line.startsWith('* ')) {
                return <li key={index} className="ml-6 list-disc">{line.substring(2)}</li>;
            }
            if (line.startsWith('#')) {
                const level = line.match(/^#+/)?.[0].length || 1;
                const content = line.replace(/^#+\s*/, '');
                // FIX: Dynamically create heading tags using React.createElement to resolve JSX typing errors.
                const Tag = `h${Math.min(level + 1, 6)}` as keyof React.JSX.IntrinsicElements;
                return React.createElement(Tag, { key: index, className: "font-bold mt-3 mb-1" }, content);
            }
            return <p key={index} className="mb-2 last:mb-0">{line}</p>;
        });
    };

    if (!session) {
        return <div className="text-center">{error || <Loader />}</div>;
    }
    
    const contextNotes = allNotes.filter(note => session.noteIds.includes(note.id));

    return (
        <div className="w-full h-[70vh] flex flex-col text-left animate-fade-in">
             <div className="flex-shrink-0 border-b border-gray-700 pb-4 mb-4">
                <h2 className="text-2xl font-bold text-gray-100 truncate">{session.title}</h2>
                <p className="text-sm text-gray-400 mt-1">Context from {contextNotes.length} note{contextNotes.length > 1 ? 's' : ''}</p>
            </div>
            
            <div className="flex-grow overflow-y-auto pr-2 space-y-6">
                {session.messages.length === 0 && !isStreaming && (
                    <div className="text-center text-gray-400 p-8">
                        <p>Ask a question to start the conversation.</p>
                    </div>
                )}
                {session.messages.map((message, index) => (
                    <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xl p-4 rounded-xl ${message.role === 'user' ? 'bg-blue-800 text-white' : 'bg-gray-700 text-gray-200'}`}>
                             {typeof message.content === 'string' ? (
                                <p>{message.content}</p>
                             ) : (
                                <div className="prose prose-invert max-w-none prose-p:text-gray-200">
                                    {renderAnswerText(message.content.answer)}
                                    
                                    {message.content.sources && message.content.sources.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-gray-600">
                                            <h4 className="text-xs font-semibold text-gray-400 mb-2">NOTE SOURCES</h4>
                                            <div className="space-y-2">
                                            {message.content.sources.map((source, idx) => (
                                                <div key={idx} className="bg-gray-800/70 p-2 rounded-md border border-gray-600/50">
                                                    <blockquote className="border-l-4 border-blue-500 pl-2 text-gray-300 text-sm italic">
                                                        "{source.snippet}"
                                                    </blockquote>
                                                </div>
                                            ))}
                                            </div>
                                        </div>
                                    )}

                                    {message.content.webSources && message.content.webSources.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-gray-600">
                                            <h4 className="text-xs font-semibold text-gray-400 mb-2">WEB SOURCES</h4>
                                            <ul className="space-y-2 list-none p-0">
                                                {message.content.webSources.map((source, idx) => (
                                                    <li key={idx} className="flex items-start gap-2">
                                                        <span className="text-blue-400 mt-1">●</span>
                                                        <a 
                                                            href={source.uri} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-sm text-blue-400 hover:underline break-all"
                                                        >
                                                        {source.title || source.uri}
                                                        </a>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                             )}
                        </div>
                    </div>
                ))}
                 {error && (
                    <div className="text-center text-red-400 bg-red-900/40 p-3 rounded-lg mt-4">
                        <p className="font-bold">An Error Occurred</p>
                        <p>{error}</p>
                    </div>
                 )}

                <div ref={messagesEndRef} />
            </div>

            <div className="flex-shrink-0 pt-4 mt-2 border-t border-gray-700">
                 <div className="flex items-center gap-3">
                    <textarea
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                        placeholder="Ask a follow-up question..."
                        className="w-full p-3 bg-gray-900/50 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none transition-colors flex-grow"
                        aria-label="Your question"
                        rows={1}
                        style={{ height: 'auto', minHeight: '48px' }}
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={isStreaming || !question.trim()}
                        className="h-12 w-12 flex-shrink-0 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Send message"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                    </button>
                </div>
                <div className="mt-2 flex items-center justify-end">
                    <label htmlFor="google-search-checkbox" className="flex items-center cursor-pointer text-sm text-gray-400 hover:text-gray-200 transition-colors">
                        <input
                            id="google-search-checkbox"
                            type="checkbox"
                            checked={useGoogleSearch}
                            onChange={(e) => setUseGoogleSearch(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-500 text-blue-500 bg-gray-700 focus:ring-blue-600 focus:ring-offset-gray-800"
                        />
                        <span className="ml-2">Include Google Search</span>
                    </label>
                </div>
            </div>
        </div>
    );
};

export default ChatDetailView;
