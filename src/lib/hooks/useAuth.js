// lib/hooks/useAuth.js
// Mock auth hook for demonstration

'use client';

import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate checking for user session
    setTimeout(() => {
      // In a real app, this would check for a valid session
      setLoading(false);
    }, 500);
  }, []);

  const signInWithGoogle = () => {
    // Mock sign in
    setUser({
      uid: 'mock-user-id',
      email: 'user@example.com',
      displayName: 'Test User',
      photoURL: null
    });
  };

  const signInWithGithub = () => {
    // Mock sign in
    setUser({
      uid: 'mock-user-id',
      email: 'user@example.com',
      displayName: 'Test User',
      photoURL: null
    });
  };

  const signOut = () => {
    setUser(null);
  };

  return {
    user,
    loading,
    signInWithGoogle,
    signInWithGithub,
    signOut
  };
};