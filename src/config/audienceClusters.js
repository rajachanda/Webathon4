/**
 * Audience Cluster Definitions and Mappings
 * Maps technical cluster codes to user-friendly labels and descriptions
 */

export const AUDIENCE_CLUSTERS = {
  'URBAN_YOUTH_MULTIPLEX': {
    label: 'Urban Youth (18-30)',
    icon: '👨‍💼',
    description: 'Multiplex-going young professionals and college students in metros',
    sensitive_to: ['IPL/Sports Events', 'Entrance Exams', 'Tech Festivals'],
    boost_from: ['Weekends', 'Long Weekends', 'Valentine Week']
  },
  
  'COLLEGE_YOUTH': {
    label: 'College Students (17-22)',
    icon: '🎓',
    description: 'College-going youth, highly exam-sensitive',
    sensitive_to: ['Board Exams', 'Semester Exams', 'Entrance Tests', 'JEE/NEET'],
    boost_from: ['Summer Break', 'Festival Holidays', 'Post-Exam Period']
  },
  
  'FAMILY_FESTIVAL': {
    label: 'Family Audiences',
    icon: '👨‍👩‍👧‍👦',
    description: 'Multi-generational family groups',
    sensitive_to: ['School Days', 'Working Weekdays'],
    boost_from: ['Major Festivals', 'Long Weekends', 'School Vacations', 'Public Holidays']
  },
  
  'MASS_SINGLE_SCREEN': {
    label: 'Mass/Working Class',
    icon: '💪',
    description: 'Working class, single-screen audiences',
    sensitive_to: ['Harvest Season', 'Agricultural Busy Period'],
    boost_from: ['Post-Harvest', 'Major Festivals', 'Regional Events']
  },
  
  'RURAL_HEARTLAND': {
    label: 'Rural Audiences',
    icon: '🌾',
    description: 'Tier-2/3 towns and rural areas',
    sensitive_to: ['Harvest Season', 'Local Fairs/Jatara', 'Agricultural Season'],
    boost_from: ['Post-Harvest Festivals', 'Sankranti', 'Pongal']
  },
  
  'KIDS_TEENS': {
    label: 'Kids & Teens (12-18)',
    icon: '🧒',
    description: 'School-going children and teenagers',
    sensitive_to: ['School Exams', 'Board Exams', 'School Days'],
    boost_from: ['Summer Vacation', 'Diwali Break', 'Christmas Holidays']
  },
  
  'WOMEN_CENTRIC': {
    label: 'Women Audiences (18-45)',
    icon: '👩',
    description: 'Female-dominated audience segments',
    sensitive_to: ['Working Days'],
    boost_from: ['Festive Season', "Women's Day", 'Valentine Week', 'Family Holidays']
  },
  
  'SENIOR_CITIZENS': {
    label: 'Senior Citizens (55+)',
    icon: '👴',
    description: 'Retired and older audiences',
    sensitive_to: ['Extreme Weather', 'Weekdays'],
    boost_from: ['Morning Shows', 'Religious Festivals', 'Holidays']
  },
  
  'OTT_WAITING': {
    label: 'OTT-Primary (25-40)',
    icon: '📺',
    description: 'Urban professionals who prefer OTT over theaters',
    sensitive_to: ['Corporate Busy Season', 'Financial Year Closing'],
    boost_from: ['Premium Content Buzz', 'Award Nominations']
  },
  
  'NRI_DIASPORA': {
    label: 'NRI/Diaspora',
    icon: '✈️',
    description: 'Overseas Indian audiences',
    sensitive_to: ['Weekday releases in India'],
    boost_from: ['US Long Weekends', 'Gulf Weekends', 'Festival Period']
  },
  
  'NICHE_CINEPHILE': {
    label: 'Niche/Cinephile',
    icon: '🎬',
    description: 'Art film and serious cinema enthusiasts',
    sensitive_to: ['Mainstream Blockbuster Clashes'],
    boost_from: ['Film Festivals', 'Critics Week', 'Awards Season']
  }
};

/**
 * Get user-friendly label for cluster code
 */
export function getClusterLabel(clusterCode) {
  return AUDIENCE_CLUSTERS[clusterCode]?.label || clusterCode;
}

/**
 * Get icon for cluster code
 */
export function getClusterIcon(clusterCode) {
  return AUDIENCE_CLUSTERS[clusterCode]?.icon || '👥';
}

/**
 * Get description for cluster code
 */
export function getClusterDescription(clusterCode) {
  return AUDIENCE_CLUSTERS[clusterCode]?.description || '';
}

/**
 * Get what this audience is sensitive to (negative impacts)
 */
export function getClusterSensitivities(clusterCode) {
  return AUDIENCE_CLUSTERS[clusterCode]?.sensitive_to || [];
}

/**
 * Get what boosts this audience (positive impacts)
 */
export function getClusterBoosts(clusterCode) {
  return AUDIENCE_CLUSTERS[clusterCode]?.boost_from || [];
}

/**
 * Format multiple clusters for display
 */
export function formatClusterList(clusterCodes) {
  if (!clusterCodes || clusterCodes.length === 0) return 'Not specified';
  
  return clusterCodes
    .map(code => `${getClusterIcon(code)} ${getClusterLabel(code)}`)
    .join(', ');
}
