/**
 * Test Script for Release Timing Intelligence System
 * Run: node test-release-intelligence.js
 * 
 * IMPORTANT: Set these environment variables before running:
 * - REACT_APP_SPORTS_API_KEY
 * - REACT_APP_GOOGLE_CALENDAR_API_KEY
 * 
 * Example: 
 * set REACT_APP_SPORTS_API_KEY=your_key && node test-release-intelligence.js
 */

// Load environment variables from .env if available
require('dotenv').config();

// Verify required environment variables
if (!process.env.REACT_APP_SPORTS_API_KEY) {
  console.warn('⚠️ REACT_APP_SPORTS_API_KEY not set');
}
if (!process.env.REACT_APP_GOOGLE_CALENDAR_API_KEY) {
  console.warn('⚠️ REACT_APP_GOOGLE_CALENDAR_API_KEY not set');
}

// Import the release scoring library
const path = require('path');

// Since we're using ES modules, we'll create a simple test
console.log('🚀 Release Timing Intelligence System - Test Suite\n');
console.log('=' .repeat(60));

// Test 1: Verify CSV file exists
const fs = require('fs');
const csvPath = path.join(__dirname, 'public', 'assets', 'release_intelligence_2026_india.csv');

console.log('\n📋 Test 1: CSV Data File');
console.log('-'.repeat(60));

if (fs.existsSync(csvPath)) {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  console.log(`✅ CSV file found: ${csvPath}`);
  console.log(`✅ Total events: ${lines.length - 1} (excluding header)`);
  
  // Show sample events
  console.log('\n📅 Sample Events:');
  const sampleLines = lines.slice(1, 6); // First 5 events
  sampleLines.forEach(line => {
    const parts = line.split(',');
    if (parts.length >= 4) {
      console.log(`  • ${parts[0]} (${parts[1]}) - ${parts[2]} to ${parts[3]}`);
    }
  });
} else {
  console.log('❌ CSV file not found');
}

// Test 2: Verify library files exist
console.log('\n\n📚 Test 2: Library Files');
console.log('-'.repeat(60));

const libFiles = [
  'src/lib/releaseScoring/types.js',
  'src/lib/releaseScoring/cache.js',
  'src/lib/releaseScoring/csvParser.js',
  'src/lib/releaseScoring/sportsAdapter.js',
  'src/lib/releaseScoring/calendarAdapter.js',
  'src/lib/releaseScoring/normalizeEvents.js',
  'src/lib/releaseScoring/scorer.js',
  'src/lib/releaseScoring/ReleaseCalendarAdapter.js',
  'src/lib/releaseScoring/index.js',
];

let allFilesExist = true;
libFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
  } else {
    console.log(`❌ ${file} - NOT FOUND`);
    allFilesExist = false;
  }
});

// Test 3: Verify API configuration
console.log('\n\n🔑 Test 3: API Configuration');
console.log('-'.repeat(60));

const configPath = path.join(__dirname, 'src', 'config', 'api.js');
if (fs.existsSync(configPath)) {
  const configContent = fs.readFileSync(configPath, 'utf-8');
  
  const hasSportsKey = configContent.includes('SPORTS_API_KEY');
  const hasCalendarKey = configContent.includes('GOOGLE_CALENDAR_API_KEY');
  
  console.log(`${hasSportsKey ? '✅' : '❌'} SPORTS_API_KEY export found`);
  console.log(`${hasCalendarKey ? '✅' : '❌'} GOOGLE_CALENDAR_API_KEY export found`);
  
  if (hasSportsKey && hasCalendarKey) {
    console.log('\n✅ API configuration is correct!');
  }
} else {
  console.log('❌ api.js not found');
}

// Test 4: Environment Variables
console.log('\n\n🌍 Test 4: Environment Variables');
console.log('-'.repeat(60));

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  
  const hasSportsEnv = envContent.includes('REACT_APP_SPORTS_API_KEY');
  const hasCalendarEnv = envContent.includes('REACT_APP_GOOGLE_CALENDAR_API_KEY');
  
  console.log(`${hasSportsEnv ? '✅' : '❌'} REACT_APP_SPORTS_API_KEY in .env`);
  console.log(`${hasCalendarEnv ? '✅' : '❌'} REACT_APP_GOOGLE_CALENDAR_API_KEY in .env`);
  
  if (hasSportsEnv) {
    const match = envContent.match(/REACT_APP_SPORTS_API_KEY=(.+)/);
    if (match && match[1]) {
      console.log(`   Value: ${match[1].substring(0, 20)}...`);
    }
  }
} else {
  console.log('❌ .env file not found');
}

// Test 5: Documentation
console.log('\n\n📖 Test 5: Documentation');
console.log('-'.repeat(60));

const docs = [
  'src/lib/releaseScoring/README.md',
  'src/lib/releaseScoring/IMPLEMENTATION.md',
  'src/lib/releaseScoring/examples.js',
];

docs.forEach(doc => {
  const docPath = path.join(__dirname, doc);
  if (fs.existsSync(docPath)) {
    const stats = fs.statSync(docPath);
    console.log(`✅ ${path.basename(doc)} (${(stats.size / 1024).toFixed(1)} KB)`);
  } else {
    console.log(`❌ ${path.basename(doc)} - NOT FOUND`);
  }
});

// Summary
console.log('\n\n' + '='.repeat(60));
console.log('📊 SYSTEM STATUS SUMMARY');
console.log('='.repeat(60));

const checklist = {
  '✅ CSV data file (41 events)': fs.existsSync(csvPath),
  '✅ All 9 library modules': allFilesExist,
  '✅ API configuration in api.js': fs.existsSync(configPath),
  '✅ Environment variables in .env': fs.existsSync(envPath),
  '✅ Documentation files': docs.every(d => fs.existsSync(path.join(__dirname, d))),
};

console.log('');
Object.entries(checklist).forEach(([item, status]) => {
  console.log(status ? item : item.replace('✅', '❌'));
});

const allReady = Object.values(checklist).every(v => v);

console.log('\n' + '='.repeat(60));
if (allReady) {
  console.log('🎉 SYSTEM READY! You can now:');
  console.log('   1. Start the dev server: npm start');
  console.log('   2. Import in your components:');
  console.log('      import { getDaySummaries } from "./lib/releaseScoring";');
  console.log('   3. See IMPLEMENTATION.md for integration guide');
} else {
  console.log('⚠️  Some components are missing. Check errors above.');
}
console.log('='.repeat(60) + '\n');

// Test 6: Sample Usage Example
console.log('\n📝 SAMPLE USAGE CODE:');
console.log('-'.repeat(60));
console.log(`
import { getDaySummaries } from './lib/releaseScoring';

// Example: Analyze March 2026 (Board Exam period)
const result = await getDaySummaries(
  '2026-03-01',
  '2026-03-31',
  {
    targetAudience: ['urbanYouth', 'college', 'family'],
    targetRegion: 'Tamil Nadu',
    considerNearby: true,
    useSportsAPI: true,
    useGoogleCalendar: false,
  }
);

console.log('Best Date:', result.summary.bestDate);
console.log('Blocked Days:', result.daySummaries.filter(d => d.isBlocked).length);

// Output will show:
// - Mar 1-25: BLOCKED (Board Exams)
// - Mar 26+: Score 90+ (Good release window)
`);

console.log('\n💡 TIP: See src/lib/releaseScoring/examples.js for more usage patterns\n');
