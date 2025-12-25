// src/components/Dashboard/ProgressGraph.js
'use client';

export default function ProgressGraph({ data }) {
    // If no data, show a message
    if (!data || data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-text-sub">
                No data available yet. Complete some tests to see your progress!
            </div>
        );
    }

    // Find min and max values to scale the graph
    const wpmValues = data.map(item => item.avg_wpm).filter(val => val !== null);
    const minWpm = Math.min(...wpmValues, 0);
    const maxWpm = Math.max(...wpmValues, 100);
    const range = maxWpm - minWpm || 100;

    // Prepare data points for display
    const graphData = data.slice(-30).map((item, index) => ({
        date: new Date(item.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        wpm: item.avg_wpm,
        tests: item.tests_completed,
        index
    }));

    return (
        <div className="h-64 w-full">
            <div className="relative h-5/6">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-text-sub -ml-6 pr-2">
                    <span>{Math.ceil(maxWpm)}</span>
                    <span>{Math.round((maxWpm + minWpm) / 2)}</span>
                    <span>{Math.floor(minWpm)}</span>
                </div>

                {/* Graph area */}
                <div className="absolute left-8 right-0 top-0 h-full flex items-end pb-6 border-b border-l border-white/10">
                    {/* Grid lines */}
                    <div className="absolute inset-0 grid grid-rows-4 gap-0 -mt-6">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className="border-t border-white/5"></div>
                        ))}
                    </div>

                    {/* Data points */}
                    <div className="flex-1 flex items-end justify-between px-2">
                        {graphData.map((point, index) => {
                            if (point.wpm === null) return null;

                            const heightPercentage = ((point.wpm - minWpm) / range) * 100;

                            return (
                                <div
                                    key={index}
                                    className="flex flex-col items-center w-1/20 group relative"
                                >
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black/80 text-text-main text-xs rounded py-1 px-2 -translate-x-1/2 whitespace-nowrap z-10">
                                        <div>{point.wpm.toFixed(1)} WPM</div>
                                        <div>{point.tests} test{point.tests !== 1 ? 's' : ''}</div>
                                    </div>

                                    {/* Bar */}
                                    <div
                                        className="w-3/4 bg-caret-color rounded-t hover:bg-caret-color/80 transition-colors"
                                        style={{ height: `${heightPercentage > 100 ? 100 : heightPercentage}%` }}
                                    ></div>

                                    {/* X-axis label */}
                                    <div className="text-xs text-text-sub mt-1 rotate-45 origin-left transform translate-y-2">
                                        {point.date}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center mt-16 pl-8">
                <div className="flex items-center mr-4">
                    <div className="w-4 h-4 bg-caret-color mr-2"></div>
                    <span className="text-sm text-text-sub">Average WPM</span>
                </div>
            </div>
        </div>
    );
}
