
import React, { useState, useMemo } from 'react';
import type { ProcessedNoteWithId } from '../types';

interface CalendarProps {
    onDateSelect: (date: Date, target: HTMLElement) => void;
    notes: ProcessedNoteWithId[];
}

const Calendar: React.FC<CalendarProps> = ({ onDateSelect, notes }) => {
    const [date, setDate] = useState(new Date());

    const taskDates = useMemo(() => {
        const dates = new Set<string>();
        if (!notes) return dates;

        notes.forEach(note => {
            note.actionItems?.forEach(item => {
                if (item.dueDate) {
                    dates.add(item.dueDate);
                }
            });
        });
        return dates;
    }, [notes]);

    const changeMonth = (offset: number) => {
        setDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setDate(1); // Set to first day to avoid month overflow issues
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    };

    const renderHeader = () => {
        const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
        return (
            <div className="flex justify-between items-center mb-4">
                <button 
                    onClick={() => changeMonth(-1)}
                    className="p-2 rounded-full hover:bg-gray-700 transition-colors"
                    aria-label="Previous month"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h3 className="text-lg font-semibold text-gray-200">
                    {monthFormat.format(date)}
                </h3>
                <button 
                    onClick={() => changeMonth(1)}
                    className="p-2 rounded-full hover:bg-gray-700 transition-colors"
                    aria-label="Next month"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
        );
    };

    const renderDaysOfWeek = () => {
        const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        return (
            <div className="grid grid-cols-7 gap-2 text-center text-xs text-gray-500 font-semibold">
                {weekdays.map(day => <div key={day}>{day}</div>)}
            </div>
        );
    };

    const renderCells = () => {
        const month = date.getMonth();
        const year = date.getFullYear();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const cells = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            cells.push(<div key={`blank-${i}`} className="p-2"></div>);
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let day = 1; day <= daysInMonth; day++) {
            const fullDate = new Date(year, month, day);
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const hasTasks = taskDates.has(dateStr);
            const isPastDate = fullDate.getTime() < today.getTime();
            const isToday = fullDate.getTime() === today.getTime();

            const cellClasses = `
                h-9 w-9 flex items-center justify-center rounded-full relative
                transition-all duration-200 text-sm 
                ${isPastDate 
                    ? 'text-gray-600 cursor-not-allowed' 
                    : 'cursor-pointer hover:bg-blue-800/60 hover:text-white'}
                ${isToday 
                    ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-400' 
                    : isPastDate ? '' : 'text-gray-300'}
            `;
            cells.push(
                <div key={day} 
                     className={cellClasses}
                     onClick={(e) => !isPastDate && onDateSelect(fullDate, e.currentTarget)}
                     tabIndex={isPastDate ? -1 : 0}
                     onKeyDown={(e) => !isPastDate && (e.key === 'Enter' || e.key === ' ') && onDateSelect(fullDate, e.currentTarget)}
                     role="button"
                     aria-disabled={isPastDate}
                     aria-label={isPastDate ? `Date ${day} cannot be selected` : `Select date ${day}`}
                >
                    {day}
                    {hasTasks && <div className="absolute bottom-1 h-1.5 w-1.5 bg-yellow-400 rounded-full"></div>}
                </div>
            );
        }

        return (
            <div className="grid grid-cols-7 gap-y-2 place-items-center mt-3">
                {cells}
            </div>
        );
    };

    return (
        <div className="bg-gray-900/50 p-4 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-gray-100 mb-3 text-center">Calendar</h3>
            {renderHeader()}
            {renderDaysOfWeek()}
            {renderCells()}
             <p className="text-xs text-gray-500 text-center mt-3">Click a date to see tasks or add a new one.</p>
        </div>
    );
};

export default Calendar;
