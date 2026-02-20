export const APP_CONFIG = {
  name: 'CinYstore',
  tagline: 'Paora Filmy hai Boss..',
  version: '1.0.0',
  apiTimeout: 10000,
};

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  HELP: '/help',
};

export const NAVIGATION_ITEMS = [
  { id: 'home', label: 'Home', href: '#home', requiresAuth: false },
  { id: 'product', label: 'Product', href: '#product', requiresAuth: false },
  { id: 'partners', label: 'Partners', href: '#partners', requiresAuth: false },
  { id: 'creator', label: 'Creator', href: '#creator', requiresAuth: false },
  { id: 'blogs', label: 'Blogs', href: '#blogs', requiresAuth: false },
  { id: 'team', label: 'Team', href: '#team', requiresAuth: false },
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
