import { supabase } from './supabaseClient';
import type { ProcessedNote, ProcessedNoteWithId, ActionItem, AIActionItem } from '../types';

export interface TodaysActionItem {
    noteId: string;
    itemIndex: number;
    item: ActionItem;
    noteTitle: string;
}

// Fetch all notes for the current user
export const getNotes = async (): Promise<ProcessedNoteWithId[]> => {
    const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching notes:", error);
        return [];
    }

    return data.map((note: any) => ({
        id: note.id,
        createdAt: note.created_at,
        refinedNote: note.refined_note,
        emotionAnalysis: note.emotion_analysis,
        actionItems: note.action_items || []
    }));
};

// Helper for Today's Actions
const isActionItemForToday = (dueDate: string): boolean => {
    if (!dueDate) return false;
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const localTodayStr = `${year}-${month}-${day}`;
    return dueDate === localTodayStr;
};

// Calculate today's actions from fetched notes
export const getTodaysActionItemsFromNotes = (notes: ProcessedNoteWithId[]): TodaysActionItem[] => {
    const todaysItems: TodaysActionItem[] = [];
    notes.forEach(note => {
        if (note.actionItems) {
            note.actionItems.forEach((item, index) => {
                if (isActionItemForToday(item.dueDate) && !item.completed) {
                    todaysItems.push({
                        noteId: note.id,
                        itemIndex: index,
                        item: item,
                        noteTitle: note.refinedNote.split('\n')[0].replace(/^#\s*/, '') || 'Untitled Note',
                    });
                }
            });
        }
    });
    todaysItems.sort((a, b) => {
        const aTime = a.item.time;
        const bTime = b.item.time;
        if (aTime && bTime) return aTime.localeCompare(bTime);
        if (aTime) return -1;
        if (bTime) return 1;
        return 0;
    });
    return todaysItems;
};

export const saveNote = async (note: ProcessedNote): Promise<ProcessedNoteWithId> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const actionItems = note.actionItems.map((item: AIActionItem) => ({ 
        text: item.text, 
        dueDate: item.dueDate,
        completed: false 
    }));

    const { data, error } = await supabase
        .from('notes')
        .insert({
            user_id: user.id,
            refined_note: note.refinedNote,
            emotion_analysis: note.emotionAnalysis,
            action_items: actionItems
        })
        .select()
        .single();

    if (error) throw new Error(error.message);

    return {
        id: data.id,
        createdAt: data.created_at,
        refinedNote: data.refined_note,
        emotionAnalysis: data.emotion_analysis,
        actionItems: data.action_items
    };
};

export const updateNote = async (id: string, updatedData: ProcessedNote): Promise<ProcessedNoteWithId> => {
    const actionItems = updatedData.actionItems.map((item: AIActionItem) => ({ 
        text: item.text, 
        dueDate: item.dueDate,
        completed: false 
    }));

    const { data, error } = await supabase
        .from('notes')
        .update({
            refined_note: updatedData.refinedNote,
            emotion_analysis: updatedData.emotionAnalysis,
            action_items: actionItems
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);

    return {
        id: data.id,
        createdAt: data.created_at,
        refinedNote: data.refined_note,
        emotionAnalysis: data.emotion_analysis,
        actionItems: data.action_items
    };
};

export const saveManualTaskAsNote = async (task: { text: string; dueDate: string; time?: string; }): Promise<ProcessedNoteWithId> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const noteContent = `# To-Do: ${task.text}`;
    const emotionAnalysis = {
        summary: 'Task added manually from calendar.',
        emotions: [],
    };
    const actionItems = [{
        text: task.text,
        dueDate: task.dueDate,
        time: task.time,
        completed: false,
    }];

    const { data, error } = await supabase
        .from('notes')
        .insert({
            user_id: user.id,
            refined_note: noteContent,
            emotion_analysis: emotionAnalysis,
            action_items: actionItems
        })
        .select()
        .single();

    if (error) throw new Error(error.message);

    return {
        id: data.id,
        createdAt: data.created_at,
        refinedNote: data.refined_note,
        emotionAnalysis: data.emotion_analysis,
        actionItems: data.action_items
    };
};


export const deleteNote = async (id: string): Promise<void> => {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) throw new Error(error.message);
};

export const toggleActionItemCompletion = async (note: ProcessedNoteWithId, itemIndex: number): Promise<ProcessedNoteWithId | undefined> => {
    const updatedItems = [...note.actionItems];
    if (updatedItems[itemIndex]) {
        updatedItems[itemIndex].completed = !updatedItems[itemIndex].completed;
    }

    const { data, error } = await supabase
        .from('notes')
        .update({ action_items: updatedItems })
        .eq('id', note.id)
        .select()
        .single();

    if (error || !data) return undefined;

    return {
        ...note,
        actionItems: data.action_items
    };
};

export const updateActionItemDate = async (note: ProcessedNoteWithId, itemIndex: number, newDueDate: string): Promise<ProcessedNoteWithId | undefined> => {
    const updatedItems = [...note.actionItems];
    if (updatedItems[itemIndex]) {
        updatedItems[itemIndex].dueDate = newDueDate;
    }

    const { data, error } = await supabase
        .from('notes')
        .update({ action_items: updatedItems })
        .eq('id', note.id)
        .select()
        .single();
        
    if (error || !data) return undefined;

    return {
        ...note,
        actionItems: data.action_items
    };
};
