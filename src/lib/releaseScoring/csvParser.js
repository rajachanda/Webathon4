/**
 * CSV Parser for Release Intelligence Data
 * Parses assets/release_intelligence_2026_india.csv
 */

import { CSV_COLUMNS, TIMEZONE } from './types.js';

/**
 * Parse CSV text into rows
 * @param {string} csvText - Raw CSV content
 * @returns {CsvEventRow[]} Parsed events
 */
export function parseCsvEvents(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    console.warn('CSV file is empty or has no data rows');
    return [];
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    try {
      const row = parseCSVLine(lines[i]);
      if (row.length < headers.length) {
        console.warn(`Row ${i + 1} has fewer columns than headers, skipping`);
        continue;
      }

      const event = parseRow(headers, row, i + 1);
      if (event) {
        rows.push(event);
      }
    } catch (error) {
      console.error(`Error parsing row ${i + 1}:`, error.message);
    }
  }

  console.log(`✅ Parsed ${rows.length} events from CSV`);
  return rows;
}

/**
 * Parse a single CSV line handling quoted values
 * @param {string} line - CSV line
 * @returns {string[]} Columns
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

/**
 * Parse a single row into CsvEventRow
 * @param {string[]} headers - Column headers
 * @param {string[]} values - Row values
 * @param {number} rowNum - Row number for logging
 * @returns {CsvEventRow | null}
 */
function parseRow(headers, values, rowNum) {
  const getColumn = (colName) => {
    const index = headers.indexOf(colName);
    return index >= 0 ? values[index] : '';
  };

  const eventType = getColumn(CSV_COLUMNS.EVENT_TYPE);
  const eventName = getColumn(CSV_COLUMNS.EVENT_NAME);
  const region = getColumn(CSV_COLUMNS.REGION) || 'National';
  const startDateStr = getColumn(CSV_COLUMNS.START_DATE);
  const endDateStr = getColumn(CSV_COLUMNS.END_DATE);

  if (!eventName || !startDateStr) {
    console.warn(`Row ${rowNum}: Missing required fields (Event_Name or Start_Date)`);
    return null;
  }

  // Parse dates in Asia/Kolkata timezone
  const startDateISO = parseDateToISO(startDateStr, rowNum);
  const endDateISO = endDateStr ? parseDateToISO(endDateStr, rowNum) : startDateISO;

  if (!startDateISO || !endDateISO) {
    console.warn(`Row ${rowNum}: Invalid date format`);
    return null;
  }

  // Parse impact columns
  const impacts = {
    urbanYouth: parseImpact(getColumn(CSV_COLUMNS.IMPACT_URBAN_YOUTH), rowNum),
    college: parseImpact(getColumn(CSV_COLUMNS.IMPACT_COLLEGE), rowNum),
    family: parseImpact(getColumn(CSV_COLUMNS.IMPACT_FAMILY), rowNum),
    workingClass: parseImpact(getColumn(CSV_COLUMNS.IMPACT_WORKING_CLASS), rowNum),
    rural: parseImpact(getColumn(CSV_COLUMNS.IMPACT_RURAL), rowNum),
    kidsParents: parseImpact(getColumn(CSV_COLUMNS.IMPACT_KIDS_PARENTS), rowNum),
    seniorCitizens: parseImpact(getColumn(CSV_COLUMNS.IMPACT_SENIOR_CITIZENS), rowNum),
    womenCentric: parseImpact(getColumn(CSV_COLUMNS.IMPACT_WOMEN_CENTRIC), rowNum),
  };

  return {
    eventType,
    eventName,
    region,
    startDateISO,
    endDateISO,
    impacts,
  };
}

/**
 * Parse date string to ISO format (YYYY-MM-DD)
 * Supports formats: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
 * @param {string} dateStr - Date string
 * @param {number} rowNum - Row number for logging
 * @returns {string | null} ISO date string or null
 */
function parseDateToISO(dateStr, rowNum) {
  if (!dateStr) return null;

  dateStr = dateStr.trim();

  // Already in ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const parts = dateStr.split(/[/-]/);
  if (parts.length === 3) {
    const [day, month, year] = parts;
    if (year.length === 4) {
      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      if (isValidDate(isoDate)) {
        return isoDate;
      }
    }
  }

  console.warn(`Row ${rowNum}: Unable to parse date "${dateStr}"`);
  return null;
}

/**
 * Validate ISO date string
 * @param {string} dateStr - ISO date string
 * @returns {boolean}
 */
function isValidDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date instanceof Date && !isNaN(date);
}

/**
 * Parse impact value (can be positive, negative, or blank)
 * @param {string} value - Impact value
 * @param {number} rowNum - Row number for logging
 * @returns {number} Parsed impact (0 if blank or invalid)
 */
function parseImpact(value, rowNum) {
  if (!value || value === '') return 0;

  const num = parseFloat(value);
  if (isNaN(num)) {
    console.warn(`Row ${rowNum}: Non-numeric impact value "${value}", using 0`);
    return 0;
  }

  return num;
}

/**
 * Load CSV from public assets
 * @returns {Promise<CsvEventRow[]>} Parsed events
 */
export async function loadCsvEvents() {
  try {
    const response = await fetch('/assets/release_intelligence_2026_india.csv');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const csvText = await response.text();
    return parseCsvEvents(csvText);
  } catch (error) {
    console.error('Error loading CSV file:', error);
    console.warn('⚠️ CSV data unavailable, continuing with empty dataset');
    return [];
  }
}
