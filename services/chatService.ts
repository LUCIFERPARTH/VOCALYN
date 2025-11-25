import { supabase } from './supabaseClient';
import type { ChatSession } from '../types';

export const getChatSessions = async (): Promise<ChatSession[]> => {
    const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching chats:", error);
        return [];
    }

    return data.map((session: any) => ({
        id: session.id,
        createdAt: session.created_at,
        title: session.title,
        noteIds: session.note_ids || [],
        messages: session.messages || []
    }));
};

export const saveChatSession = async (sessionToSave: ChatSession): Promise<ChatSession> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Check if session exists to decide update vs insert
    const { count } = await supabase
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('id', sessionToSave.id);

    let data, error;

    if (count && count > 0) {
        // Update
        const response = await supabase
            .from('chat_sessions')
            .update({
                title: sessionToSave.title,
                messages: sessionToSave.messages,
                note_ids: sessionToSave.noteIds
            })
            .eq('id', sessionToSave.id)
            .select()
            .single();
        data = response.data;
        error = response.error;
    } else {
        // Insert
        const response = await supabase
            .from('chat_sessions')
            .insert({
                id: sessionToSave.id,
                user_id: user.id,
                title: sessionToSave.title,
                messages: sessionToSave.messages,
                note_ids: sessionToSave.noteIds,
                created_at: sessionToSave.createdAt
            })
            .select()
            .single();
        data = response.data;
        error = response.error;
    }

    if (error) throw new Error(error.message);

    return {
        id: data.id,
        createdAt: data.created_at,
        title: data.title,
        noteIds: data.note_ids,
        messages: data.messages
    };
};

export const createChatSession = (noteIds: string[]): ChatSession => {
    // We just create the object client-side. It gets saved to DB when messages are added.
    return {
        id: crypto.randomUUID(),
        title: 'New Chat',
        createdAt: new Date().toISOString(),
        noteIds,
        messages: [],
    };
};

export const deleteChatSession = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', id);
    
    if (error) throw new Error(error.message);
};
