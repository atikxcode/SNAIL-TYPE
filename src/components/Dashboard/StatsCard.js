// src/components/Dashboard/StatsCard.js
'use client';

export default function StatsCard({ title, value, icon, change }) {
    return (
        <div className="glass-panel p-6 rounded-xl">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-text-sub text-sm font-medium mb-1">{title}</p>
                    <p className="text-3xl font-bold text-text-main">{value}</p>
                </div>
                <div className="text-2xl text-caret-color">{icon}</div>
            </div>
            {change && (
                <div className={`mt-2 text-sm ${change >= 0 ? 'text-green-400' : 'text-error'}`}>
                    {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% from last week
                </div>
            )}
        </div>
    );
}
