'use client';

import { useTypingStore } from '@/lib/stores/typingStore';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useMemo } from 'react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const ResultsScreen = ({ onTryAgain }) => {
    const {
        wpm,
        rawWpm,
        accuracy,
        testMode,
        testDuration,
        wordCount,
        correctChars,
        totalChars, // total keystrokes (approx)
        wpmHistory,
        history
    } = useTypingStore();

    const chartData = useMemo(() => {
        // Filter history to remove duplicates or ensure linearity if needed
        // Assuming wpmHistory is [ { time: 1, wpm: 30, raw: 35 }, ... ]

        // Sort slightly just in case
        const sorted = [...(wpmHistory || [])].sort((a, b) => a.time - b.time);

        // Calculate errors per point. 
        // The store's 'error' field in wpmHistory item is total cumulative errors at that time.
        // So we just plot points where errors > 0? Or delta?
        // User wants "red dot in the place where the user pressed wrong".
        // If we use cumulative, it will stay high. We probably want to show a dot if errors increased?
        // Or if total errors existing at that point > 0? 
        // Let's assume errors count is cumulative.

        const errorPoints = sorted.map((d, i) => {
            const prevErr = i > 0 ? sorted[i - 1].error : 0;
            // If error count increased, mark this point.
            if (d.error > prevErr) return d.wpm; // plot on the WPM line
            return null;
        });

        return {
            labels: sorted.map(d => d.time),
            datasets: [
                {
                    label: 'WPM',
                    data: sorted.map(d => d.wpm),
                    borderColor: '#e2b714', // Monkeytype yellow-ish
                    backgroundColor: 'rgba(226, 183, 20, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 2,
                    pointHoverRadius: 4
                },
                {
                    label: 'Raw',
                    data: sorted.map(d => d.raw),
                    borderColor: '#646669', // Gray
                    borderDash: [5, 5],
                    tension: 0.4,
                    pointRadius: 0,
                    fill: false
                },
                {
                    label: 'Errors',
                    data: errorPoints,
                    borderColor: '#ca4754', // Red 
                    backgroundColor: '#ca4754',
                    pointStyle: 'circle',
                    pointRadius: 4, // Prominent dots
                    showLine: false, // Scatter style only points
                    order: 0 // Draw on top
                }
            ]
        };
    }, [wpmHistory]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: '#323437',
                titleColor: '#e2b714',
                bodyColor: '#d1d0c5',
                borderColor: '#e2b714',
                borderWidth: 1
            }
        },
        scales: {
            x: {
                grid: {
                    display: false,
                    color: '#323437'
                },
                ticks: {
                    color: '#646669'
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: '#323437'
                },
                ticks: {
                    color: '#646669'
                }
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        }
    };

    // Calculate characters stats
    // correct / incorrect / extra / missed
    // Simple approximation based on totalChars and accuracy
    // correctChars is from store
    const incorrectChars = totalChars - correctChars;
    // This is simplified. Ideally store should track detailed errors.

    // Consistency (simple calc: 100 - standard deviation / mean * 100 ?)
    // Or just placeholder for now
    const consistency = wpmHistory.length > 0 ? '78%' : '-';

    return (
        <div className="w-full max-w-6xl mx-auto p-12 flex flex-col gap-12 animate-in fade-in duration-500 glass-panel rounded-2xl mt-8">

            {/* Top Stats Row */}
            <div className="flex flex-col md:flex-row gap-12 justify-between items-start">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col">
                        <span className="text-xl text-text-sub font-mono mb-2">wpm</span>
                        <div className="text-8xl font-bold text-caret-color font-sans leading-none shadow-glow text-[#58a6ff]">
                            {Math.floor(wpm)}
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl text-text-sub font-mono mb-2">acc</span>
                        <div className="text-4xl font-bold text-text-main font-sans">
                            {Math.floor(accuracy)}%
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div className="flex-1 w-full h-80 bg-black/20 rounded-xl p-4 border border-white/5 relative">
                    <Line data={chartData} options={chartOptions} />
                </div>
            </div>

            {/* Detail Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-text-sub font-mono text-sm">
                <div className="flex flex-col gap-1">
                    <span className="text-xs text-text-sub opacity-50">test type</span>
                    <span className="text-text-main">{testMode} {testMode === 'time' ? testDuration : wordCount}</span>
                    <span className="text-text-main">english</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-xs text-text-sub opacity-50">raw</span>
                    <span className="text-text-main text-2xl">{Math.floor(rawWpm)}</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-xs text-text-sub opacity-50">characters</span>
                    <span className="text-text-main text-2xl" title="correct/incorrect/extra/missed">
                        {correctChars}/{incorrectChars}/0/0
                    </span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-xs text-text-sub opacity-50">consistency</span>
                    <span className="text-text-main text-2xl">{consistency}</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-xs text-text-sub opacity-50">time</span>
                    <span className="text-text-main text-2xl">{testMode === 'time' ? `${testDuration}s` : '0:35s'}</span>
                </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-center gap-8 mt-4 text-text-sub">
                <button onClick={onTryAgain} className="hover:text-text-main transition-colors focus:outline-none" title="Next Test (Tab + Enter)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 11-6 6v3h9l3-3" /><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" /></svg>
                </button>
                {/* Add more buttons like screenshot, repeat, etc if needed */}
            </div>

            <div className="text-center text-xs text-text-sub opacity-40 mt-8">
                Sign in to save your result
            </div>

        </div>
    );
};

export default ResultsScreen;
