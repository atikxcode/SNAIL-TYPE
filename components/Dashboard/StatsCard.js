// components/Dashboard/StatsCard.js
export default function StatsCard({ title, value, icon, change }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
      {change && (
        <div className={`mt-2 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% from last week
        </div>
      )}
    </div>
  );
}