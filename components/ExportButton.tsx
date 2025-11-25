
import React, { useState, useRef, useEffect } from 'react';
import type { ProcessedNoteWithId } from '../types';
import DownloadIcon from './icons/DownloadIcon';

// Declare jsPDF in the global scope to satisfy TypeScript
declare const jspdf: any;

interface ExportButtonProps {
    note: ProcessedNoteWithId;
}

const ExportButton: React.FC<ExportButtonProps> = ({ note }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const toggleDropdown = () => setIsOpen(prev => !prev);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const getNoteContentAsString = (): string => {
        let content = `Title: ${note.refinedNote.split('\n')[0].replace(/^#\s*/, '') || 'Untitled Note'}\n`;
        content += `Created At: ${new Date(note.createdAt).toLocaleString()}\n\n`;
        content += `--- NOTE CONTENT ---\n${note.refinedNote}\n\n`;
        content += `--- AI EMOTION ANALYSIS ---\nSummary: ${note.emotionAnalysis.summary}\n`;
        note.emotionAnalysis.emotions.forEach(e => {
            content += `- ${e.emotion}: ${e.justification}\n`;
        });
        if (note.actionItems && note.actionItems.length > 0) {
            content += `\n--- ACTION ITEMS ---\n`;
            note.actionItems.forEach(item => {
                const status = item.completed ? '[x]' : '[ ]';
                const dueDate = item.dueDate ? ` (Due: ${item.dueDate})` : '';
                content += `${status} ${item.text}${dueDate}\n`;
            });
        }
        return content;
    };

    const handleExportTxt = () => {
        const content = getNoteContentAsString();
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Vocalyn Note - ${note.id}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsOpen(false);
    };

    const handleExportPdf = () => {
        const { jsPDF } = jspdf;
        const doc = new jsPDF();
        
        const title = note.refinedNote.split('\n')[0].replace(/^#\s*/, '') || 'Untitled Note';
        const createdAt = `Created: ${new Date(note.createdAt).toLocaleString()}`;
        
        doc.setFontSize(18);
        doc.text(title, 10, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(createdAt, 10, 26);
        
        doc.setLineWidth(0.5);
        doc.line(10, 30, 200, 30);

        // Add Refined Note
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Refined Note', 10, 40);
        const refinedNoteLines = doc.splitTextToSize(note.refinedNote.replace(/#\s*/g, ''), 180);
        doc.setFontSize(12);
        doc.text(refinedNoteLines, 10, 48);

        let yPos = 48 + (refinedNoteLines.length * 7);

        // Add Emotion Analysis
        yPos += 10;
        doc.setFontSize(14);
        doc.text('AI Emotion Analysis', 10, yPos);
        doc.setFontSize(12);
        doc.text(`Summary: ${note.emotionAnalysis.summary}`, 10, yPos + 8);
        yPos += 8;
        note.emotionAnalysis.emotions.forEach(e => {
            yPos += 7;
            doc.text(`- ${e.emotion}: ${e.justification}`, 14, yPos);
        });

        // Add Action Items
        if (note.actionItems && note.actionItems.length > 0) {
            yPos += 15;
            doc.setFontSize(14);
            doc.text('Action Items', 10, yPos);
            doc.setFontSize(12);
            note.actionItems.forEach(item => {
                yPos += 7;
                const status = item.completed ? '[x]' : '[ ]';
                const dueDate = item.dueDate ? ` (Due: ${item.dueDate})` : '';
                const itemText = `${status} ${item.text}${dueDate}`;
                const splitText = doc.splitTextToSize(itemText, 180);
                if (yPos > 280) { // Add new page if content overflows
                    doc.addPage();
                    yPos = 20;
                }
                doc.text(splitText, 14, yPos);
                 yPos += (splitText.length - 1) * 7;
            });
        }
        
        doc.save(`Vocalyn Note - ${note.id}.pdf`);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={toggleDropdown}
                className="px-3 py-1 text-sm rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors flex items-center gap-2"
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <DownloadIcon />
                <span>Export</span>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10 animate-fade-in">
                    <ul className="py-1">
                        <li>
                            <button
                                onClick={handleExportTxt}
                                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                            >
                                As Text (.txt)
                            </button>
                        </li>
                        <li>
                            <button
                                onClick={handleExportPdf}
                                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                            >
                                As PDF (.pdf)
                            </button>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default ExportButton;
