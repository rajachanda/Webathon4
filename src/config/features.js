// Configuration for feature modules
export const FEATURES = {
  PROFILE: {
    enabled: true,
    routes: ['/profile'],
  },
  SETTINGS: {
    enabled: true,
    routes: ['/settings'],
  },
  HELP: {
    enabled: true,
    routes: ['/help'],
  },
  ANALYTICS: {
    enabled: false,
    routes: ['/analytics'],
  },
};

// Add new features here and they will be automatically integrated
export const isFeatureEnabled = (featureName) => {
  return FEATURES[featureName]?.enabled || false;
};
