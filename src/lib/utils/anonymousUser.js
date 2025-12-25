// lib/utils/anonymousUser.js

// Generate a unique device ID for anonymous users
export const generateDeviceId = () => {
  // Check if we already have a device ID in localStorage
  const existingId = localStorage.getItem('snailtype_device_id');
  if (existingId) {
    return existingId;
  }
  
  // Generate a new device ID
  const newId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('snailtype_device_id', newId);
  return newId;
};

// Save session data locally for anonymous users
export const saveLocalSession = (sessionData) => {
  const deviceId = generateDeviceId();
  const sessions = getLocalSessions() || [];
  
  // Add device ID to session
  const sessionWithDeviceId = {
    ...sessionData,
    deviceId,
    id: Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toISOString()
  };
  
  sessions.push(sessionWithDeviceId);
  
  // Keep only the last 50 sessions to prevent localStorage from getting too large
  const truncatedSessions = sessions.slice(-50);
  
  localStorage.setItem('snailtype_local_sessions', JSON.stringify(truncatedSessions));
  return sessionWithDeviceId;
};

// Get local session data for anonymous users
export const getLocalSessions = () => {
  const sessions = localStorage.getItem('snailtype_local_sessions');
  return sessions ? JSON.parse(sessions) : [];
};

// Clear local session data
export const clearLocalSessions = () => {
  localStorage.removeItem('snailtype_local_sessions');
};

// Check if user is anonymous
export const isAnonymousUser = () => {
  return !localStorage.getItem('__session'); // If no session cookie, user is anonymous
};