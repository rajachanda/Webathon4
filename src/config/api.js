// API endpoints configuration for Supabase
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    SIGN_IN: '/auth/sign-in',
    SIGN_OUT: '/auth/sign-out',
    GET_SESSION: '/auth/session',
  },
  
  // User endpoints
  USERS: {
    GET_PROFILE: (userId) => `/users/${userId}`,
    UPDATE_PROFILE: (userId) => `/users/${userId}`,
    GET_PREFERENCES: (userId) => `/users/${userId}/preferences`,
  },
  
  // Add new API endpoints here as features grow
  // MOVIES: {
  //   LIST: '/movies',
  //   GET: (id) => `/movies/${id}`,
  //   CREATE: '/movies',
  // },
};

// Supabase table names
export const TABLES = {
  USERS: 'users',
  PROFILES: 'profiles',
  SETTINGS: 'user_settings',
  // Add new tables here
  // MOVIES: 'movies',
  // PROMOTIONS: 'promotions',
};
