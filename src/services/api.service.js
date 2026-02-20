import { supabase } from '../supabaseClient';
import { TABLES } from '../config/api';

// User service - handles all user-related API calls
export const userService = {
  // Get user profile
  async getProfile(userId) {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update user profile
  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get user settings
  async getSettings(userId) {
    const { data, error } = await supabase
      .from(TABLES.SETTINGS)
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update user settings
  async updateSettings(userId, settings) {
    const { data, error } = await supabase
      .from(TABLES.SETTINGS)
      .upsert({ user_id: userId, ...settings })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
};

// Add new services here as features are added
// export const movieService = { ... };
// export const promotionService = { ... };
