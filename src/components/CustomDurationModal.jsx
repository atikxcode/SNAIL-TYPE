'use client';

import { useState, useRef, useEffect } from 'react';

const CustomDurationModal = ({ isOpen, onClose, onConfirm }) => {
    const [value, setValue] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setValue('');
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!value) return;

        let totalSeconds = 0;
        const str = value.trim();

        // Check if it's just a number (default to seconds)
        if (/^\d+$/.test(str)) {
            totalSeconds = parseInt(str, 10);
        } else {
            // Parse with regex for h/m/s (case insensitive)
            const hoursMatch = str.match(/(\d+)\s*[hH]/);
            const minutesMatch = str.match(/(\d+)\s*[mM]/);
            const secondsMatch = str.match(/(\d+)\s*[sS]/);

            if (hoursMatch) totalSeconds += parseInt(hoursMatch[1], 10) * 3600;
            if (minutesMatch) totalSeconds += parseInt(minutesMatch[1], 10) * 60;
            if (secondsMatch) totalSeconds += parseInt(secondsMatch[1], 10);
        }

        // Must be at least 1 second
        if (!isNaN(totalSeconds) && totalSeconds >= 1) {
            onConfirm(totalSeconds);
        }
        onClose();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md" onClick={onClose}>
            <div
                className="w-full max-w-md glass-panel rounded-xl shadow-2xl p-8 transform transition-all scale-100"
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-2xl font-sans font-bold text-text-main mb-6">Test duration</h2>

                <form onSubmit={handleSubmit}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-black/20 text-text-main text-3xl font-mono p-4 rounded-lg border border-white/10 outline-none focus:border-caret-color focus:ring-1 focus:ring-caret-color mb-6 transition-all"
                        placeholder="15"
                    />

                    <div className="text-text-sub text-xs font-mono mb-8 leading-relaxed opacity-70">
                        Format: <span className="text-caret-color">15</span> (seconds), <span className="text-caret-color">1m</span> (minute), <span className="text-caret-color">1h</span> (hour).
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 rounded-lg transition-all active:scale-95 border border-white/5"
                    >
                        Start Test
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CustomDurationModal;
