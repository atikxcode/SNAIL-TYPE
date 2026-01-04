// app/settings/page.js
import { verifyAuth } from '@/lib/auth/verify';
import { redirect } from 'next/navigation';
import SettingsForm from './SettingsForm.jsx';

export default async function SettingsPage() {
  // For now, we'll create a client-side component that handles auth
  // In a full implementation, we'd verify auth on the server side
  // and redirect if the user isn't authenticated

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <SettingsForm />
        </div>
      </div>
    </div>
  );
}