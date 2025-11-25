
import React, { useState, useEffect } from 'react';

const Clock: React.FC = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = time.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="text-center bg-gray-900/50 p-6 rounded-lg shadow-lg">
            <p className="text-5xl md:text-6xl font-bold text-gray-100 tracking-wider font-mono">
                {timeString}
            </p>
            <p className="text-base md:text-lg text-gray-400 mt-2">
                {dateString}
            </p>
        </div>
    );
};

export default Clock;
