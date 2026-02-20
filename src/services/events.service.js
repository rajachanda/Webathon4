/**
 * Events & Holiday Impact Service
 * Parses CSV files to determine impact of holidays, exams, festivals, sports events on release dates
 */

/**
 * Load and parse release_intelligence_2026_india.csv
 * Returns events with their impact on different audience segments
 */
export async function loadReleaseIntelligenceEvents() {
  try {
    const response = await fetch('/assets/release_intelligence_2026_india.csv');
    const csvText = await response.text();
    
    const lines = csvText.trim().split('\n');
    const events = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length >= 12) {
        const event = {
          name: values[0]?.trim(),
          type: values[1]?.trim(),
          startDate: parseDate(values[2]?.trim()),
          endDate: parseDate(values[3]?.trim()),
          region: values[4]?.trim(),
          impacts: {
            'URBAN_YOUTH_MULTIPLEX': parseInt(values[5]) || 0,
            'COLLEGE_YOUTH': parseInt(values[6]) || 0,
            'FAMILY_FESTIVAL': parseInt(values[7]) || 0,
            'MASS_SINGLE_SCREEN': parseInt(values[8]) || 0, // Working Class
            'RURAL_HEARTLAND': parseInt(values[9]) || 0,
            'KIDS_TEENS': parseInt(values[10]) || 0, // Kids_Parents
            'SENIOR_CITIZENS': parseInt(values[11]) || 0,
            'WOMEN_CENTRIC': parseInt(values[12]) || 0,
          }
        };
        
        if (event.name && event.startDate) {
          events.push(event);
        }
      }
    }
    
    console.log(`📅 Loaded ${events.length} events from release_intelligence_2026_india.csv`);
    return events;
  } catch (error) {
    console.error('Error loading release intelligence events:', error);
    return [];
  }
}

/**
 * Load and parse hoidays.csv (holidays, exams, festivals)
 * Returns events with their impact on different audience segments
 */
export async function loadHolidaysEvents() {
  try {
    const response = await fetch('/assets/hoidays.csv');
    const csvText = await response.text();
    
    const lines = csvText.trim().split('\n');
    const events = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length >= 10) {
        const event = {
          type: values[0]?.trim(),
          name: values[1]?.trim(),
          region: values[2]?.trim(),
          startDate: parseDate(values[3]?.trim()),
          endDate: parseDate(values[4]?.trim()),
          impacts: {
            'URBAN_YOUTH_MULTIPLEX': parseInt(values[5]) || 0,
            'COLLEGE_YOUTH': parseInt(values[6]) || 0,
            'FAMILY_FESTIVAL': parseInt(values[7]) || 0,
            'MASS_SINGLE_SCREEN': parseInt(values[8]) || 0, // Mass_Rural
            'OTT_WAITING': parseInt(values[9]) || 0,
            'NRI_DIASPORA': parseInt(values[10]) || 0,
          }
        };
        
        if (event.name && event.startDate) {
          events.push(event);
        }
      }
    }
    
    console.log(`🎉 Loaded ${events.length} events from hoidays.csv`);
    return events;
  } catch (error) {
    console.error('Error loading holidays events:', error);
    return [];
  }
}

/**
 * Get all events affecting a specific date
 * Combines both CSV sources
 */
export async function getEventsForDate(date) {
  const [intelligenceEvents, holidayEvents] = await Promise.all([
    loadReleaseIntelligenceEvents(),
    loadHolidaysEvents()
  ]);
  
  const allEvents = [...intelligenceEvents, ...holidayEvents];
  const targetDate = new Date(date);
  
  return allEvents.filter(event => {
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    return targetDate >= start && targetDate <= end;
  });
}

/**
 * Calculate impact of events on a date for specific audience clusters
 * AUDIENCE-AWARE LOGIC: Same event affects different audiences differently
 * 
 * @param {string} date - ISO date string
 * @param {Array<string>} targetClusters - User's target audience clusters
 * @returns {Promise<Object>} { totalImpact, events, impactLevel, detailedImpacts }
 */
export async function calculateEventImpact(date, targetClusters = []) {
  const events = await getEventsForDate(date);
  
  if (events.length === 0) {
    return { 
      totalImpact: 0, 
      events: [], 
      impactLevel: 'none',
      detailedImpacts: [] 
    };
  }
  
  if (targetClusters.length === 0) {
    // No target clusters defined, return neutral
    return {
      totalImpact: 0,
      events,
      impactLevel: 'unknown',
      detailedImpacts: []
    };
  }
  
  // Calculate weighted impact based on target clusters
  let totalImpact = 0;
  let impactCount = 0;
  const detailedImpacts = [];
  
  for (const event of events) {
    let eventImpactSum = 0;
    let eventImpactCount = 0;
    
    for (const cluster of targetClusters) {
      const clusterImpact = event.impacts[cluster];
      if (clusterImpact !== undefined) {
        eventImpactSum += clusterImpact;
        eventImpactCount++;
        totalImpact += clusterImpact;
        impactCount++;
      }
    }
    
    // Average impact for this event across target clusters
    const avgEventImpact = eventImpactCount > 0 ? eventImpactSum / eventImpactCount : 0;
    
    if (avgEventImpact !== 0) {
      detailedImpacts.push({
        event,
        impact: Math.round(avgEventImpact),
        severity: getSeverityLevel(avgEventImpact, event.type)
      });
    }
  }
  
  // Average impact across all events and clusters
  const avgImpact = impactCount > 0 ? totalImpact / impactCount : 0;
  
  // Determine impact level based on SEVERITY
  let impactLevel;
  if (avgImpact >= 25) {
    impactLevel = 'very_positive'; // Major festivals, long weekends
  } else if (avgImpact > 5) {
    impactLevel = 'positive'; // Minor festivals, holidays
  } else if (avgImpact >= -15) {
    impactLevel = 'neutral'; // Minor impact
  } else if (avgImpact >= -50) {
    impactLevel = 'negative'; // Mid-level exams, sports events
  } else {
    impactLevel = 'very_negative'; // Board exams, IPL finals for youth
  }
  
  return {
    totalImpact: Math.round(avgImpact),
    events,
    impactLevel,
    eventsCount: events.length,
    detailedImpacts
  };
}

/**
 * Determine severity level for an event impact
 */
function getSeverityLevel(impact, eventType) {
  // Exams are CRITICAL when negative
  if ((eventType === 'BOARD_EXAM' || eventType === 'ENTRANCE_EXAM' || eventType === 'EXAM_FINAL') && impact < -60) {
    return 'critical'; // RED
  }
  
  // IPL/Sports are HIGH IMPACT for youth
  if (eventType === 'SPORTS' && impact < -50) {
    return 'high'; // RED
  }
  
  // Major festivals are HIGH POSITIVE
  if (eventType === 'FESTIVAL' && impact > 30) {
    return 'excellent'; // BRIGHT GREEN
  }
  
  // Standard severity mapping
  if (impact >= 25) return 'excellent';
  if (impact >= 10) return 'good';
  if (impact >= -10) return 'neutral';
  if (impact >= -30) return 'moderate';
  if (impact >= -60) return 'high';
  return 'critical';
}

/**
 * Helper: Parse CSV line handling quoted fields
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
}

/**
 * Helper: Parse date from DD/MM/YYYY or YYYY-MM-DD format
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // Handle DD/MM/YYYY format
  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Already in YYYY-MM-DD format
  return dateStr;
}
