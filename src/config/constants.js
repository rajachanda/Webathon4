export const APP_CONFIG = {
  name: 'CinYstore',
  tagline: 'Paora Filmy hai Boss..',
  version: '1.0.0',
  apiTimeout: 10000,
};

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  NEW_PROJECT: '/projects/new',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  HELP: '/help',
};

export const NAVIGATION_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',      route: '/dashboard',  requiresAuth: true  },
  { id: 'new-project',  label: 'New Film +',     route: '/projects/new', requiresAuth: true },
];

export const PROFILE_MENU_ITEMS = [
  { 
    id: 'profile', 
    label: 'My Profile', 
    route: ROUTES.PROFILE,
    feature: 'PROFILE',
  },
  { 
    id: 'settings', 
    label: 'Settings', 
    route: ROUTES.SETTINGS,
    feature: 'SETTINGS',
  },
  { 
    id: 'help', 
    label: 'Help & Support', 
    route: ROUTES.HELP,
    feature: 'HELP',
  },
];
