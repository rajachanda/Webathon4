/**
 * OTT Platform Data Service
 * 
 * Loads and parses platform information from OTTs - Sheet1.csv
 * Provides deal types, revenue ranges, and platform characteristics
 */

const fs = require('fs').promises;
const path = require('path');

let platformDataCache = null;

/**
 * Parse OTT platform CSV data
 * @returns {Promise<Array>} Array of platform objects with deal information
 */
async function loadOTTPlatforms() {
  if (platformDataCache) {
    return platformDataCache;
  }

  try {
    const csvPath = path.join(__dirname, '../../public/assets/OTTs - Sheet1.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    const lines = csvContent.split('\n').map(line => line.trim()).filter(Boolean);
    
    // Parse header (line index 1 after empty line)
    const headerLine = lines[1];
    const headers = headerLine.split(',').map(h => h.trim());
    
    // Extract platform names (skip first "Attribute" column)
    const platformNames = headers.slice(1);
    
    // Parse data rows
    const platforms = platformNames.map((name, idx) => ({
      name: name,
      columnIndex: idx + 1,
      attributes: {}
    }));
    
    // Process each data row (starting from line 2)
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      const cells = parseCSVLine(line);
      
      if (cells.length < 2) continue;
      
      const attributeName = cells[0];
      
      // Store attribute value for each platform
      platforms.forEach((platform, idx) => {
        if (cells[platform.columnIndex]) {
          platform.attributes[attributeName] = cells[platform.columnIndex];
        }
      });
    }
    
    // Transform to standardized format
    const standardizedPlatforms = platforms.map(p => ({
      name: p.name,
      deal_types: parseDealTypes(p.attributes['Deal Types Supported']),
      fixed_buyout_range: parseMoneyRange(p.attributes['Fixed Buyout Range (Tentpole)']),
      mg_range: p.attributes['Minimum Guarantee (MG) Range'] || 'Negotiated',
      revenue_share_range: p.attributes['Revenue Share Range'] || 'N/A',
      payment_timing: p.attributes['Payment Timing'] || 'Milestone-based',
      contract_duration: p.attributes['Contract Duration (Years)'] || '3-7 years',
      territory: p.attributes['Territory Scope'] || 'India',
      exclusivity: p.attributes['Exclusivity Required'] || 'Negotiable',
      marketing_support: p.attributes['Marketing Support'] || 'Standard',
      monthly_active_users: p.attributes['Monthly Active Users (MAU)'] || 'Not disclosed',
      avg_watch_hours: p.attributes['Avg. Watch Hours/User'] || 'N/A',
      regional_strength: p.attributes['Regional Strength'] || 'Pan-India',
      genre_preferences: parseGenrePreferences(p.attributes['Genre Preference Score']),
      past_performance: p.attributes['Past Performance (Views)'] || 'N/A',
      event_association: p.attributes['IPL/Event Association'] || 'None',
      churn_rate: p.attributes['Churn Rate (Monthly)'] || 'N/A',
      avg_revenue_per_view: estimateRevenuePerView(p.name)
    }));
    
    platformDataCache = standardizedPlatforms;
    return standardizedPlatforms;
  } catch (error) {
    console.error('Error loading OTT platforms CSV:', error);
    // Return fallback data
    return getFallbackPlatforms();
  }
}

/**
 * Parse CSV line handling quoted fields
 */
function parseCSVLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  
  return cells;
}

/**
 * Parse deal types from string
 */
function parseDealTypes(dealTypesStr) {
  if (!dealTypesStr) return ['fixed'];
  
  const types = [];
  const lower = dealTypesStr.toLowerCase();
  
  if (lower.includes('fixed buyout') || lower.includes('fixed')) {
    types.push('fixed');
  }
  if (lower.includes('mg') || lower.includes('minimum guarantee') || lower.includes('revenue share')) {
    types.push('mg_plus_revshare');
  }
  if (lower.includes('tvod') || lower.includes('transactional')) {
    types.push('tvod');
  }
  
  return types.length > 0 ? types : ['fixed'];
}

/**
 * Parse money range from string like "INR 50 crore – INR 100 crore+"
 */
function parseMoneyRange(rangeStr) {
  if (!rangeStr) return { min: 0, max: 0, currency: 'INR' };
  
  // Extract numbers (assuming crores)
  const numbers = rangeStr.match(/\d+/g);
  if (!numbers || numbers.length === 0) {
    return { min: 0, max: 0, currency: 'INR' };
  }
  
  const min = parseInt(numbers[0]) * 10000000; // Convert crores to rupees
  const max = numbers.length > 1 ? parseInt(numbers[1]) * 10000000 : min * 2;
  
  return { min, max, currency: 'INR' };
}

/**
 * Parse genre preferences from string like "Thriller: 0.9; Romcom: 0.6"
 */
function parseGenrePreferences(genreStr) {
  if (!genreStr) return {};
  
  const preferences = {};
  const pairs = genreStr.split(';').map(s => s.trim());
  
  pairs.forEach(pair => {
    const [genre, score] = pair.split(':').map(s => s.trim());
    if (genre && score) {
      preferences[genre.toLowerCase()] = parseFloat(score);
    }
  });
  
  return preferences;
}

/**
 * Estimate revenue per view based on platform tier
 */
function estimateRevenuePerView(platformName) {
  const lower = platformName.toLowerCase();
  
  if (lower.includes('netflix')) return '₹0.50';
  if (lower.includes('amazon') || lower.includes('prime')) return '₹0.45';
  if (lower.includes('hotstar') || lower.includes('jio')) return '₹0.42';
  if (lower.includes('zee')) return '₹0.35';
  if (lower.includes('sony')) return '₹0.38';
  
  return '₹0.40'; // Default
}

/**
 * Fallback platform data if CSV fails to load
 */
function getFallbackPlatforms() {
  return [
    {
      name: 'Netflix India',
      deal_types: ['fixed', 'mg_plus_revshare'],
      fixed_buyout_range: { min: 500000000, max: 1000000000, currency: 'INR' },
      avg_revenue_per_view: '₹0.50'
    },
    {
      name: 'Amazon Prime Video India',
      deal_types: ['fixed', 'mg_plus_revshare'],
      fixed_buyout_range: { min: 800000000, max: 3500000000, currency: 'INR' },
      avg_revenue_per_view: '₹0.45'
    },
    {
      name: 'JioHotstar',
      deal_types: ['fixed'],
      fixed_buyout_range: { min: 500000000, max: 1000000000, currency: 'INR' },
      avg_revenue_per_view: '₹0.42'
    }
  ];
}

/**
 * Get platform by name
 */
async function getPlatformByName(platformName) {
  const platforms = await loadOTTPlatforms();
  return platforms.find(p => 
    p.name.toLowerCase().includes(platformName.toLowerCase()) ||
    platformName.toLowerCase().includes(p.name.toLowerCase())
  );
}

/**
 * Clear cache (useful for testing)
 */
function clearCache() {
  platformDataCache = null;
}

module.exports = {
  loadOTTPlatforms,
  getPlatformByName,
  clearCache
};
