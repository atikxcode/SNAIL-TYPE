// lib/db/userActions.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = null;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('Supabase environment variables missing. Using Mock DB Mode.');
} else {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
}

/**
 * Sync user to PostgreSQL when they sign in
 */
export const syncUserToPostgres = async (userClaims) => {
  if (!supabaseAdmin) return { success: true }; // Mock success

  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert({
        firebase_uid: userClaims.uid,
        email: userClaims.email,
        display_name: userClaims.name || userClaims.displayName,
        photo_url: userClaims.picture || userClaims.photoURL,
      }, {
        onConflict: 'firebase_uid',
        returning: 'minimal'
      });

    if (error) {
      console.error('Error syncing user to PostgreSQL:', error);
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error in syncUserToPostgres:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user by Firebase UID
 */
export const getUserByFirebaseUid = async (firebaseUid) => {
  // Mock Mode
  if (!supabaseAdmin || firebaseUid === 'mock-user-id') {
    return {
      id: 'mock-db-id',
      firebase_uid: 'mock-user-id',
      email: 'demo@snailtype.com',
      display_name: 'Demo User',
      photo_url: 'https://via.placeholder.com/150',
      created_at: new Date().toISOString()
    };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('firebase_uid', firebaseUid)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user from PostgreSQL:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserByFirebaseUid:', error);
    return null;
  }
};