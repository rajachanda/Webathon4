/**
 * Gemini API service with automatic key rotation and retry on quota errors.
 * Uses gemini-1.5-flash (fast, generous free tier).
 */

const KEYS = [
  'AIzaSyDsGBprFeMi30R_mt-WxGMmr_jV3W5Rf88',
  'AIzaSyC8bSA4X3ed474nr457xT2mqRxiJrRrAD8',
  'AIzaSyBaIsOG3rNMmSlD_PC5JpixtQAd2tZG2vk',
  'AIzaSyDV3eQwzrFc_OVh-sSZeX9JRpUfpjMe98E',
];

const MODEL = 'gemini-1.5-flash';
const BASE  = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

let keyIndex = 0;

async function callGemini(prompt, retries = 0) {
  const key = KEYS[keyIndex % KEYS.length];
  const url = `${BASE}?key=${key}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1500 },
    }),
  });

  if (res.status === 429 || res.status === 503) {
    // Quota exceeded — rotate key and retry
    keyIndex = (keyIndex + 1) % KEYS.length;
    if (retries < KEYS.length) {
      return callGemini(prompt, retries + 1);
    }
    throw new Error('All Gemini API keys are rate-limited. Please try again shortly.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API error ${res.status}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text.trim();
}

/**
 * Parse a JSON block from Gemini's response (it sometimes wraps in ```json ... ```)
 */
function parseJSON(raw) {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = match ? match[1].trim() : raw.trim();
  return JSON.parse(jsonStr);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate custom team POV questions tailored to this specific film.
 * Returns: { questions: [{id, label, type, options?}] }
 */
export async function generateTeamFormQuestions(metadata) {
  const prompt = `
You are a South Indian film marketing strategist.

A producer has submitted the following basic details about their film:
- Title: ${metadata.title || 'Untitled'}
- Language: ${metadata.language || ''}
- Region: ${metadata.region_primary || ''}
- Genre: ${metadata.genre || ''} ${metadata.subgenre ? '/ ' + metadata.subgenre : ''}
- Tone: ${metadata.tone || ''}, Pace: ${metadata.pace || ''}
- Budget: ${metadata.budget_band || ''}, Star power: ${metadata.star_power_band || ''}
- Logline: ${metadata.logline || 'not provided'}
- Interesting hook: ${metadata.interesting_hook || 'not provided'}

Generate exactly 6 insightful questions to ask team members (director, writer, co-producer) to help understand the film's persona and target audience.

The questions must be:
- Specific to THIS film's genre, tone, and region (not generic)
- Varied: mix of short-answer, choice/select, and open-ended types
- Aimed at uncovering: audience perception, tone accuracy, competitive positioning, emotional hook

Respond ONLY with valid JSON in this exact format (no extra text):
{
  "questions": [
    { "id": "q1", "label": "Question text here?", "type": "text", "placeholder": "Your answer..." },
    { "id": "q2", "label": "Question text here?", "type": "select", "options": ["Option A", "Option B", "Option C"] },
    { "id": "q3", "label": "Question text here?", "type": "textarea", "placeholder": "Elaborate here..." }
  ]
}
Types allowed: "text", "textarea", "select"
`;

  const raw = await callGemini(prompt);
  const parsed = parseJSON(raw);
  return parsed.questions || [];
}

/**
 * Generate persona + audience segments from project metadata + team responses.
 * Returns: { persona_summary, positioning_statement, core_segments[], secondary_segments[], tags[] }
 */
export async function generatePersona(metadata, teamResponses = []) {
  const responseSummary = teamResponses.length > 0
    ? teamResponses.map((r, i) =>
        `Respondent ${i + 1} (${r.respondent_role || 'team member'}):
         Tone: ${r.tone_description || '-'}
         Themes: ${r.themes_perceived || '-'}
         Strengths: ${r.perceived_strengths || '-'}
         Weaknesses: ${r.perceived_weaknesses || '-'}
         Likely audience: ${r.likely_audience || '-'}
         Reference films: ${r.reference_films || '-'}`
      ).join('\n\n')
    : 'No team responses yet.';

  const prompt = `
You are a South Indian film marketing and audience strategy expert.

A producer has filled in the following details about their film:
- Title: ${metadata.title || 'Untitled'}
- Language: ${metadata.language || ''}, Region: ${metadata.region_primary || ''}
- Genre: ${metadata.genre || ''} / ${metadata.subgenre || ''}
- Tone: ${metadata.tone || ''}, Pace: ${metadata.pace || ''}
- Budget: ${metadata.budget_band || ''}, Star power: ${metadata.star_power_band || ''}
- Rating: ${metadata.rating || ''}, Platform strategy: ${metadata.platform_strategy || ''}
- Hero: ${metadata.hero_name || ''}, Heroine: ${metadata.heroine_name || ''}
- Runtime: ${metadata.runtime_minutes || ''} min
- Logline: ${metadata.logline || 'not provided'}
- Hook: ${metadata.interesting_hook || 'not provided'}

Team responses:
${responseSummary}

Based on all this, generate a comprehensive film persona and target audience analysis.

Respond ONLY with valid JSON in this exact format (no extra text):
{
  "persona_summary": "3-4 sentence description of the film's core identity, emotional tone, archetypal story, and cultural positioning. Be specific to South Indian context.",
  "positioning_statement": "One crisp sentence: '[Film title] is a [genre] for [primary audience] in [region/context] who want [emotional need].'",
  "core_audience_segments": ["URBAN_YOUTH_18_30", "COLLEGE_CROWD"],
  "secondary_audience_segments": ["OTT_VIEWER_25_40", "DIASPORA"],
  "tone_tags": ["raw", "emotional", "mass-appealing"],
  "theme_tags": ["revenge", "social justice", "brotherhood"]
}

Available segment codes (pick 1-3 each):
URBAN_YOUTH_18_30, URBAN_WOMEN_18_35, COLLEGE_CROWD, FAMILY_ALL_AGES, MASS_RURAL, OTT_VIEWER_25_40, DIASPORA, SENIOR_FAMILY
`;

  const raw = await callGemini(prompt);
  const parsed = parseJSON(raw);
  return parsed;
}
