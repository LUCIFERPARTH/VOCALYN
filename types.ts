
export interface Emotion {
  emotion: string;
  justification: string;
}

export interface EmotionAnalysis {
  summary: string;
  emotions: Emotion[];
}

// What we store in localStorage for each action item
export interface ActionItem {
  text: string;
  completed: boolean;
  dueDate: string; // YYYY-MM-DD format or empty string
  time?: string; // HH:MM format
}

// This is the shape of the action item data returned by the Gemini API
export interface AIActionItem {
    text: string;
    dueDate: string; // YYYY-MM-DD format or empty string
}

// This is the shape of the full data returned by the Gemini API
export interface ProcessedNote {
  refinedNote: string;
  emotionAnalysis: EmotionAnalysis;
  actionItems: AIActionItem[];
}

// This is the shape of the data we store in localStorage
export interface ProcessedNoteWithId extends Omit<ProcessedNote, 'actionItems'> {
    id: string;
    createdAt: string;
    actionItems: ActionItem[];
}

// Represents a single piece of source text used by the AI
export interface SourceSnippet {
  noteId: string;
  snippet: string;
}

// Represents a single web source from Google Search
export interface WebSource {
    uri: string;
    title: string;
}

// The shape of the structured response from the Ask AI feature
export interface AskAIResponse {
  answer: string;
  sources: SourceSnippet[];
  webSources?: WebSource[];
}

// Represents a single message in a chat session
export interface ChatMessage {
    role: 'user' | 'model';
    // User content is a simple string, model content is the structured response
    content: string | AskAIResponse;
}

// Represents a full chat session
export interface ChatSession {
    id: string;
    title: string;
    createdAt: string;
    noteIds: string[]; // IDs of the notes used as context
    messages: ChatMessage[];
}

export interface User {
    id: string;
    email: string | null;
    twoFactorEnabled?: boolean;
}
