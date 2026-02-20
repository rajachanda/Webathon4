# 🎯 Audience-Aware Release Window Analysis

## Overview

The Release Window Analyzer is now **audience-intelligent**. The same date can show different colors (Green/Orange/Red) based on WHO your target audience is.

## How It Works

### 1. Target Audience Detection

When you generate a persona, the system captures:
- **Primary Audience**: Core target clusters (e.g., College Youth, Family)
- **Secondary Audience**: Supporting segments (e.g., Urban Youth, Mass)

### 2. Event Impact Mapping

Every event in the CSV files has **different impacts** for different audiences:

| Event | College Youth | Family | Urban Youth | Mass/Rural |
|-------|--------------|---------|-------------|------------|
| **Board Exams** | 🔴 -80% | 🟡 -10% | 🟡 -40% | 🟢 0% |
| **IPL Finals** | 🔴 -70% | 🟡 -30% | 🔴 -80% | 🟡 -20% |
| **Diwali** | 🟢 +35% | 🟢 +60% | 🟢 +35% | 🟢 +45% |
| **Summer Vacation** | 🟢 +10% | 🟢 +50% | 🟢 +10% | 🟢 +10% |

### 3. Color Coding Logic

The heatmap color reflects **impact on YOUR specific audience**:

#### 🟢 **GREEN** (Score 55-100)
- No major competing films
- Positive events for your audience (festivals, holidays)
- Clear release corridor
- **Example**: Diwali weekend for family films

#### 🟠 **ORANGE** (Score 35-54)
- Moderate competition OR minor event conflicts
- Some concerns but manageable
- **Example**: Mid-week release with small festival

#### 🔴 **RED** (Score 0-34)
- High buzz competitors OR critical negative events
- Major exams for youth-targeted films
- IPL finals for youth films
- **Example**: March 10, 2026 = Board exams for college/teen films

## Real-World Examples

### Example 1: Youth Action Film
**Target Audience**: College Youth (17-22) + Urban Youth (18-30)

| Date | Event | Impact | Color | Reason |
|------|-------|--------|-------|--------|
| **March 10, 2026** | CBSE Board Exams | -80% | 🔴 RED | College students unavailable |
| **April 8, 2026** | IPL Playoffs | -70% | 🔴 RED | Youth watching cricket |
| **May 20, 2026** | Post-exams clear | +10% | 🟢 GREEN | Exams over, clear corridor |

---

### Example 2: Family Drama
**Target Audience**: Family (all ages) + Senior Citizens

| Date | Event | Impact | Color | Reason |
|------|-------|--------|-------|--------|
| **March 10, 2026** | CBSE Board Exams | -10% | 🟢 GREEN | Minimal family impact |
| **April 8, 2026** | IPL Playoffs | -30% | 🟡 ORANGE | Moderate impact on families |
| **Nov 9, 2026** | Diwali | +60% | 🟢 GREEN | EXCELLENT - Major festival boost |

---

### Example 3: Kids/Teen Film
**Target Audience**: Kids & Teens (12-18)

| Date | Event | Impact | Color | Reason |
|------|-------|--------|-------|--------|
| **March 10, 2026** | CBSE Board Exams | -80% | 🔴 RED | School exams in progress |
| **May 1-June 15** | Summer Vacation | +50% | 🟢 GREEN | School break = high availability |
| **Oct 22, 2026** | Dussehra | +40% | 🟢 GREEN | Festival + holiday combo |

## CSV Data Sources

### 1. `release_intelligence_2026_india.csv`
Contains national-level events with impacts across 8 audience segments:
- Urban Youth
- College Youth  
- Family
- Working Class
- Rural Heartland
- Kids/Parents
- Senior Citizens
- Women-Centric

### 2. `hoidays.csv`
Contains detailed exam calendars, holidays, and festivals:
- Board exams (CBSE, State boards)
- Entrance exams (JEE, NEET, CAT)
- University semester exams
- Festivals (Diwali, Dussehra, Eid, Christmas)
- Sports events (IPL, India-Pakistan cricket)
- School vacations (Summer, Winter, Dussehra)

## Scoring Formula

```
Base Score = 50

Competition Penalty:
- Higher buzz film: -20 per film
- Similar buzz film: -10 per film  
- Lower buzz film: -5 per film

Event Impact:
- Critical negative (Board exams for youth): -60 to -80
- High negative (IPL for youth): -50 to -70
- Moderate negative: -15 to -30
- Positive (festivals): +10 to +30
- Excellent (major festivals for families): +40 to +60

Weekend Bonus:
- Friday release: +5
- Thursday release: +3

Final Score = Base - Competition + Event Impact + Weekend Bonus
Capped between 0-100
```

## Critical Override Logic

Even if the score is decent, certain events FORCE a color:

### Force RED if:
- Board exams + College/Teen audience (-80% impact)
- IPL Finals + Youth audience (-70% impact)
- Any event with critical severity for target audience

This ensures **exam periods never show green** for youth films, even on dates with no competition.

## Audience Cluster Definitions

### Urban Youth (18-30)
- **Sensitive to**: IPL, Entrance Exams, Tech Festivals
- **Boost from**: Weekends, Long Weekends, Valentine Week

### College Students (17-22)  
- **Sensitive to**: Board Exams, Semester Exams, JEE/NEET
- **Boost from**: Summer Break, Post-Exam Period

### Family Audiences
- **Sensitive to**: School Days, Working Weekdays
- **Boost from**: Festivals, Long Weekends, School Vacations

### Mass/Working Class
- **Sensitive to**: Harvest Season
- **Boost from**: Post-Harvest, Major Festivals

### Rural Heartland
- **Sensitive to**: Agricultural Season, Local Fairs
- **Boost from**: Sankranti, Pongal, Post-Harvest

### Kids & Teens (12-18)
- **Sensitive to**: School Exams, Board Exams
- **Boost from**: Summer Vacation, Diwali Break

## How to Use

1. **Complete Persona Generation**  
   Generate persona with target audience clusters defined

2. **Navigate to Release Window Page**  
   Go to Release Window Analyzer for your project

3. **Set Date Range**  
   Choose earliest and latest release dates (e.g., March 1 - April 30, 2026)

4. **Click "Analyze Windows"**  
   System loads CSV data and analyzes each date

5. **Review Heatmap**  
   - Green dates = Best for your audience
   - Red dates = Avoid (exams/competition)
   - Hover for detailed breakdown

6. **Check Top Suggestions**  
   System recommends top 4 dates with pros/cons

## Console Debugging

Check browser console (F12) for detailed analysis:

```
🎯 Target Audience Analysis:
   Primary: COLLEGE_YOUTH, URBAN_YOUTH_MULTIPLEX
   Secondary: FAMILY_FESTIVAL

📊 Release Analysis: Found 47 competing films in date range
   - Languages: Telugu, Tamil, Hindi/Pan-India
   - Avg buzz: 58.3

🎨 Heatmap Color Distribution: 
   { green: 23, orange: 15, red: 12 }
```

## Advanced Features

### Multi-Cluster Averaging
If targeting multiple clusters, impact is averaged:
- Film targets: College Youth + Family
- March 10 (Board Exams): (-80% + -10%) / 2 = **-45%** = 🟠 ORANGE

### Regional Filtering
Events marked "National" apply to all regions.  
State-specific events (e.g., "Karnataka SSLC") only impact regional films.

### Severity Escalation
Critical events for primary audience get higher weight than secondary audience.

## Future Enhancements

- [ ] User-provided weightage (Primary vs Secondary audience)
- [ ] Custom event addition
- [ ] Social media trend integration
- [ ] Ticket pre-booking data
- [ ] Real-time buzz tracking

---

**Built for**: Webathon 4.0  
**Intelligence Level**: Release-grade decision support for Indian cinema
