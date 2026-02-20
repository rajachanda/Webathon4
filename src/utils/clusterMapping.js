/**
 * Target Audience Cluster Mapping Utility
 * 
 * Maps fine-grained persona audience segments to broader target clusters
 * used by Release Window and Campaign modules.
 */

// Define available target clusters
export const TARGET_CLUSTERS = {
  MASS_SINGLE_SCREEN: 'MASS_SINGLE_SCREEN',
  URBAN_YOUTH_MULTIPLEX: 'URBAN_YOUTH_MULTIPLEX',
  FAMILY_FESTIVAL: 'FAMILY_FESTIVAL',
  NICHE_CINEPHILE: 'NICHE_CINEPHILE',
  KIDS_TEENS: 'KIDS_TEENS',
};

// Human-readable labels for UI display
export const CLUSTER_LABELS = {
  MASS_SINGLE_SCREEN: 'Mass / Single Screen',
  URBAN_YOUTH_MULTIPLEX: 'Urban Youth / Multiplex',
  FAMILY_FESTIVAL: 'Family / Festival',
  NICHE_CINEPHILE: 'Niche / Cinephile',
  KIDS_TEENS: 'Kids & Teens',
};

// Color coding for UI chips
export const CLUSTER_COLORS = {
  MASS_SINGLE_SCREEN: 'red',
  URBAN_YOUTH_MULTIPLEX: 'blue',
  FAMILY_FESTIVAL: 'green',
  NICHE_CINEPHILE: 'purple',
  KIDS_TEENS: 'orange',
};

/**
 * Derive target audience clusters from persona segments
 * 
 * @param {Array<string>} personaSegments - Array of audience segment codes or labels
 * @returns {Object} { core: string[], secondary: string[] }
 */
export function deriveTargetClustersFromPersona(personaSegments) {
  if (!personaSegments || !Array.isArray(personaSegments)) {
    return { core: [], secondary: [] };
  }

  const core = new Set();
  const secondary = new Set();

  // Convert segments to uppercase strings for matching
  const segments = personaSegments.map(s => 
    typeof s === 'string' ? s.toUpperCase() : (s?.code || s?.label || '').toUpperCase()
  );

  // Rule 1: Mass Rural → MASS_SINGLE_SCREEN
  if (segments.some(s => s.includes('MASS') && s.includes('RURAL')) || 
      segments.some(s => s.includes('MASS_RURAL'))) {
    core.add(TARGET_CLUSTERS.MASS_SINGLE_SCREEN);
  }

  // Rule 2: Urban Youth 18-30 OR College Crowd → URBAN_YOUTH_MULTIPLEX
  if (segments.some(s => s.includes('URBAN') && s.includes('YOUTH')) ||
      segments.some(s => s.includes('URBAN_YOUTH')) ||
      segments.some(s => s.includes('COLLEGE'))) {
    core.add(TARGET_CLUSTERS.URBAN_YOUTH_MULTIPLEX);
  }

  // Rule 3: Urban Women → can be URBAN_YOUTH_MULTIPLEX or secondary
  if (segments.some(s => s.includes('URBAN') && s.includes('WOMEN'))) {
    if (core.size === 0) {
      core.add(TARGET_CLUSTERS.URBAN_YOUTH_MULTIPLEX);
    } else {
      secondary.add(TARGET_CLUSTERS.URBAN_YOUTH_MULTIPLEX);
    }
  }

  // Rule 4: Family All Ages OR Senior Family → FAMILY_FESTIVAL
  if (segments.some(s => s.includes('FAMILY')) ||
      segments.some(s => s.includes('SENIOR'))) {
    if (core.has(TARGET_CLUSTERS.MASS_SINGLE_SCREEN)) {
      // Mass + Family = Strong family appeal
      core.add(TARGET_CLUSTERS.FAMILY_FESTIVAL);
    } else if (core.size < 2) {
      core.add(TARGET_CLUSTERS.FAMILY_FESTIVAL);
    } else {
      secondary.add(TARGET_CLUSTERS.FAMILY_FESTIVAL);
    }
  }

  // Rule 5: OTT Viewer 25-40 OR Diaspora → NICHE_CINEPHILE
  if (segments.some(s => s.includes('OTT')) ||
      segments.some(s => s.includes('DIASPORA'))) {
    if (core.size < 2) {
      core.add(TARGET_CLUSTERS.NICHE_CINEPHILE);
    } else {
      secondary.add(TARGET_CLUSTERS.NICHE_CINEPHILE);
    }
  }

  // Rule 6: College Crowd (if not already added) → can also be KIDS_TEENS
  if (segments.some(s => s.includes('COLLEGE') || (s.includes('17') && s.includes('22')))) {
    if (!core.has(TARGET_CLUSTERS.URBAN_YOUTH_MULTIPLEX) && core.size < 2) {
      core.add(TARGET_CLUSTERS.KIDS_TEENS);
    }
  }

  // Ensure at least one core cluster
  if (core.size === 0 && secondary.size > 0) {
    const firstSecondary = Array.from(secondary)[0];
    core.add(firstSecondary);
    secondary.delete(firstSecondary);
  }

  // Default fallback
  if (core.size === 0) {
    core.add(TARGET_CLUSTERS.URBAN_YOUTH_MULTIPLEX);
  }

  return {
    core: Array.from(core),
    secondary: Array.from(secondary),
  };
}

/**
 * Get display label for a cluster code
 * @param {string} clusterCode 
 * @returns {string}
 */
export function getClusterLabel(clusterCode) {
  return CLUSTER_LABELS[clusterCode] || clusterCode;
}

/**
 * Get color for a cluster code
 * @param {string} clusterCode 
 * @returns {string}
 */
export function getClusterColor(clusterCode) {
  return CLUSTER_COLORS[clusterCode] || 'gray';
}

/**
 * Calculate overlap between two sets of clusters
 * @param {Array<string>} clusters1 
 * @param {Array<string>} clusters2 
 * @returns {number} Overlap score (0-1)
 */
export function calculateClusterOverlap(clusters1, clusters2) {
  if (!clusters1?.length || !clusters2?.length) return 0;
  
  const set1 = new Set(clusters1);
  const set2 = new Set(clusters2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size; // Jaccard similarity
}
