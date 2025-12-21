// lib/db/userActions.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Sync user to PostgreSQL when they sign in
 * @param {Object} userClaims - Firebase user claims from ID token
 */
export const syncUserToPostgres = async (userClaims) => {
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
 * @param {string} firebaseUid - Firebase user ID
 */
export const getUserByFirebaseUid = async (firebaseUid) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('firebase_uid', firebaseUid)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
      console.error('Error fetching user from PostgreSQL:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserByFirebaseUid:', error);
    return null;
  }
};