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

        // Parse value (simple number for now as per requirement, but could be extended)
        const seconds = parseInt(value, 10);
        if (!isNaN(seconds) && seconds >= 0) {
            onConfirm(seconds);
        }
        onClose();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-md bg-[#2c2e31] rounded-lg shadow-xl p-8 border border-gray-700"
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-2xl font-mono text-gray-400 mb-6">Test duration</h2>

                <div className="text-gray-500 mb-2 font-mono text-sm">
                    15 seconds
                </div>

                <form onSubmit={handleSubmit}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-[#323437] text-white text-xl font-mono p-3 rounded border-none outline-none focus:ring-1 focus:ring-yellow-500 mb-4"
                        placeholder="15"
                    />

                    <div className="text-gray-500 text-xs font-mono mb-4 leading-relaxed">
                        You can use "h" for hours and "m" for minutes, for example "1h30m".
                        <br /><br />
                        You can start an infinite test by inputting 0. Then, to stop the test, use the Bail Out feature ( <span className="bg-gray-700 px-1 rounded">esc</span> or <span className="bg-gray-700 px-1 rounded">ctrl/cmd</span> + <span className="bg-gray-700 px-1 rounded">shift</span> + <span className="bg-gray-700 px-1 rounded">p</span> &gt; Bail Out)
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-[#323437] hover:bg-white hover:text-black text-white font-mono py-2 rounded transition-colors"
                    >
                        ok
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CustomDurationModal;
