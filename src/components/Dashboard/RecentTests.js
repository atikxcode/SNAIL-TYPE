// src/components/Dashboard/RecentTests.js
'use client';

export default function RecentTests({ sessions }) {
    if (!sessions || sessions.length === 0) {
        return (
            <div className="text-text-sub py-8 text-center">
                No test data yet. Complete your first test to see it here!
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10">
                <thead>
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-sub uppercase tracking-wider">
                            Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-sub uppercase tracking-wider">
                            WPM
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-sub uppercase tracking-wider">
                            Accuracy
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-sub uppercase tracking-wider">
                            Tests
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {sessions.map((session, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white/[0.02]' : ''}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-sub">
                                {session.session_date ? new Date(session.session_date).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-main">
                                {session.avg_wpm ? session.avg_wpm.toFixed(1) : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-sub">
                                {session.avg_accuracy ? session.avg_accuracy.toFixed(1) + '%' : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-sub">
                                {session.tests_completed}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
