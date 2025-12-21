// components/AuthButtons.js
'use client';

import { useAuth } from '@/lib/hooks/useAuth';

const AuthButtons = () => {
  const { user, loading, signInWithGoogle, signInWithGithub, signOut } = useAuth();

  if (loading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  if (user) {
    return (
      <div className="flex items-center space-x-4">
        {user.photoURL && (
          <img 
            src={user.photoURL} 
            alt={user.displayName || 'User'} 
            className="w-8 h-8 rounded-full"
          />
        )}
        <span className="text-sm font-medium">
          {user.displayName || user.email}
        </span>
        <button
          onClick={signOut}
          className="px-4 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex space-x-3">
      <button
        onClick={signInWithGoogle}
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
      >
        Sign in with Google
      </button>
      <button
        onClick={signInWithGithub}
        className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 transition-colors text-sm"
      >
        Sign in with GitHub
      </button>
    </div>
  );
};

export default AuthButtons;