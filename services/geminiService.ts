import { GoogleGenAI, Type } from "@google/genai";
import type { ProcessedNote, ProcessedNoteWithId, AskAIResponse, ChatMessage, WebSource, SourceSnippet } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const promptTemplate = (transcript: string, currentDate: string) => `
You are an intelligent note-processing assistant for an app called Vocalyn.
Your task is to analyze a raw text transcript from a user's voice note or text input.
Perform the following three actions:
1.  Correct and Refine the Note: First and foremost, meticulously correct all grammar and spelling errors. This includes fixing common transcription or typing errors like improperly joined words (e.g., "wordword" should be "word word"), missing spaces after punctuation (e.g., "end.Start" should be "end. Start"), and incorrect capitalization. Then, improve sentence structure for clarity and flow. Format the final, grammatically-perfect text using simple markdown for readability (e.g., use '#' for headings, '*' for bullet points). The goal is a polished, professional, and easy-to-read note.
2.  Analyze Emotions: Identify up to three dominant emotions in the text. For each emotion, provide a brief justification based on specific words or phrases. Also, write a one-sentence summary of the overall emotional tone.
3.  Extract Action Items: Identify any concrete tasks, to-do items, or follow-ups. For each item, extract the task description and its due date. The due date must be in 'YYYY-MM-DD' format. If a relative day is mentioned (e.g., 'today', 'tomorrow', 'next Tuesday'), calculate the date based on the current date: ${currentDate}. If no date is mentioned, the dueDate should be an empty string.

Here is the raw transcript:
---
${transcript}
---

Provide your response strictly in the specified JSON format. Do not include any text, markdown formatting, or code fences before or after the JSON object.
`;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    refinedNote: {
      type: Type.STRING,
      description: "The markdown-formatted, cleaned-up version of the note.",
    },
    emotionAnalysis: {
      type: Type.OBJECT,
      properties: {
        summary: {
          type: Type.STRING,
          description: "A single sentence summarizing the overall emotional tone of the note.",
        },
        emotions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              emotion: {
                type: Type.STRING,
                description: "The identified dominant emotion (e.g., Joy, Frustration, Contemplation).",
              },
              justification: {
                type: Type.STRING,
                description: "A brief explanation for why this emotion was identified, citing parts of the text.",
              },
            },
            required: ["emotion", "justification"],
          },
        },
      },
      required: ["summary", "emotions"],
    },
    actionItems: {
        type: Type.ARRAY,
        description: "A list of action items or to-do tasks extracted from the note.",
        items: {
            type: Type.OBJECT,
            properties: {
                text: { 
                    type: Type.STRING,
                    description: "The description of the action item."
                },
                dueDate: { 
                    type: Type.STRING,
                    description: "The due date in YYYY-MM-DD format, or an empty string if no date is specified."
                }
            },
            required: ["text", "dueDate"],
        }
    }
  },
  required: ["refinedNote", "emotionAnalysis", "actionItems"],
};


export const processTranscript = async (transcript: string): Promise<ProcessedNote> => {
    try {
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        const localTodayStr = `${year}-${month}-${day}`;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: promptTemplate(transcript, localTodayStr),
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.3,
            },
        });

        const jsonString = response.text.trim();
        const result = JSON.parse(jsonString);
        return result as ProcessedNote;

    } catch (error) {
        console.error("Error processing transcript with Gemini API:", error);
        throw new Error("Failed to get a valid response from the AI service.");
    }
};

export async function* continueChatStream(notes: ProcessedNoteWithId[], question: string, history: ChatMessage[], useGoogleSearch: boolean): AsyncGenerator<{ text?: string; sources?: SourceSnippet[]; webSources?: WebSource[] }> {
    const notesContext = notes.map((note) => {
        return `--- NOTE START ---
noteId: "${note.id}"
Content:
${note.refinedNote}
--- NOTE END ---
`;
    }).join('\n\n');

    const historyContext = history.map(message => {
        if (message.role === 'user') {
            return `User: ${message.content}`;
        } else {
            // Ensure content is not a string before accessing 'answer'
            const modelContent = typeof message.content === 'object' ? message.content.answer : message.content;
            return `Assistant: ${modelContent}`;
        }
    }).join('\n');
    
    if (useGoogleSearch) {
        // Logic for Google Search enabled query
        const prompt = `You are a helpful assistant. Your primary goal is to answer the user's question. Use the provided conversation history and context from the user's notes for context if relevant.
        However, for the main answer, you are equipped with Google Search to find the most current and relevant information from the web.
        Prioritize real-time web search results for accuracy when the question seems to be about current events or facts.
        
        Conversation History:
        ${historyContext}

        Context from Notes (use for personal context, not for general knowledge):
        ${notesContext}

        Based on all available information, answer the user's question comprehensively.
        Question: "${question}"
        `;

        try {
            const result = await ai.models.generateContentStream({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    tools: [{googleSearch: {}}],
                    temperature: 0.5,
                },
            });

            const allChunks = [];
            for await (const chunk of result) {
                if (chunk.text) {
                    yield { text: chunk.text };
                }
                allChunks.push(chunk);
            }
            
            const webSources: WebSource[] = [];
            for (const chunk of allChunks) {
                const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
                if (groundingChunks) {
                    for (const grounding of groundingChunks) {
                        if (grounding.web) {
                            webSources.push({
                                uri: grounding.web.uri,
                                title: grounding.web.title || grounding.web.uri, // Fallback for title
                            });
                        }
                    }
                }
            }

            // Deduplicate web sources based on URI
            const uniqueWebSources = Array.from(new Map(webSources.map(item => [item.uri, item])).values());
            if (uniqueWebSources.length > 0) {
              yield { webSources: uniqueWebSources };
            }

        } catch (error) {
            console.error("Error questioning with Google Search and Gemini API:", error);
            throw new Error("Failed to get a valid response from the AI service with Google Search.");
        }
    } else {
        // Original logic for notes-only query
        const prompt = `You are a helpful assistant that answers questions based ONLY on the provided context from a user's notes and the history of the current conversation.
        Your task is to answer the user's latest question in markdown. Do not use any external knowledge. 
        
        After your complete answer, on a new line, write the exact separator "%%SOURCES_JSON%%".

        After the separator, provide a valid JSON array of the exact source snippets from the notes that justify your answer. The JSON array should be in this format: [{"noteId": "string", "snippet": "string"}].
        
        If the answer cannot be found within the provided notes, your answer must be "I could not find an answer in the selected notes." and you must not include the separator or the JSON block.

        Here is the context from the notes:
        ${notesContext}

        Here is the conversation history so far:
        ${historyContext}

        Based ONLY on the notes and conversation history above, answer the following question:
        Question: "${question}"
        `;

        try {
            const resultStream = await ai.models.generateContentStream({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    temperature: 0.1,
                },
            });
            
            let fullText = '';
            for await (const chunk of resultStream) {
                 if (chunk.text) {
                    fullText += chunk.text;
                }
            }

            const separator = '%%SOURCES_JSON%%';
            if (fullText.includes(separator)) {
                const parts = fullText.split(separator);
                const answerText = parts[0];
                const jsonPart = parts[1];
                
                // Yield the text part first
                yield { text: answerText };
                
                try {
                    const sources = JSON.parse(jsonPart);
                    // Then yield the sources
                    yield { sources };
                } catch (e) {
                    console.error("Failed to parse sources JSON from stream:", e);
                    // If parsing fails, the text is already streamed, so we fail silently.
                }
            } else {
                // If separator is not present, yield the full text as the answer.
                yield { text: fullText };
            }
        } catch (error) {
            console.error("Error questioning notes with Gemini API:", error);
            throw new Error("Failed to get a valid response from the AI service for your question.");
        }
    }
};