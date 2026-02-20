import { supabase } from '../supabaseClient';
import { TABLES } from '../config/api';

// User service - handles all user-related API calls
export const userService = {
  // Get user profile
  async getProfile(userId) {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update user profile
  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get user settings
  async getSettings(userId) {
    const { data, error } = await supabase
      .from(TABLES.SETTINGS)
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update user settings
  async updateSettings(userId, settings) {
    const { data, error } = await supabase
      .from(TABLES.SETTINGS)
      .upsert({ user_id: userId, ...settings })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
};

// Add new services here as features are added
// export const movieService = { ... };
// export const promotionService = { ... };

// ─── Project service ────────────────────────────────────────────────────────
export const projectService = {

  // List all projects for a user (with metadata joined)
  async listProjects(ownerId) {
    const { data, error } = await supabase
      .from(TABLES.PROJECTS)
      .select(`*, project_metadata(*)`)
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Create project + metadata in one go
  async createProjectWithMetadata({ title, owner_id, metadata }) {
    // 1. Create project
    const { data: project, error: pErr } = await supabase
      .from(TABLES.PROJECTS)
      .insert({ title, owner_id, status: 'draft' })
      .select()
      .single();
    if (pErr) throw pErr;

    // 2. Create metadata
    const { error: mErr } = await supabase
      .from(TABLES.PROJECT_METADATA)
      .insert({ project_id: project.id, ...metadata });
    if (mErr) throw mErr;

    return project;
  },

  // Get single project (with metadata)
  async getProject(projectId) {
    const { data, error } = await supabase
      .from(TABLES.PROJECTS)
      .select(`*, project_metadata(*)`)
      .eq('id', projectId)
      .single();
    if (error) throw error;
    return data;
  },

  // ── Persona ──────────────────────────────────────────────────────────────

  async getProjectPersona(projectId) {
    const { data, error } = await supabase
      .from(TABLES.PERSONAS)
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async updatePersona(projectId, payload) {
    const { data, error } = await supabase
      .from(TABLES.PERSONAS)
      .upsert({ project_id: projectId, ...payload, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async lockPersona(projectId, locked) {
    const { data, error } = await supabase
      .from(TABLES.PERSONAS)
      .upsert({ project_id: projectId, locked, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    // Also update project status
    if (locked) {
      await supabase
        .from(TABLES.PROJECTS)
        .update({ status: 'persona_locked', updated_at: new Date().toISOString() })
        .eq('id', projectId);
    }
    return data;
  },

  // ── Team invites / responses ──────────────────────────────────────────────

  async createTeamInvite(projectId, roleHint) {
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const { data, error } = await supabase
      .from(TABLES.TEAM_INVITES)
      .insert({ project_id: projectId, token, role_hint: roleHint || null })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getTeamInvite(token) {
    const { data, error } = await supabase
      .from(TABLES.TEAM_INVITES)
      .select('*')
      .eq('token', token)
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Public method (no auth required) — gets project_metadata via a team invite token.
   * Used by TeamPovFormPage to generate custom Gemini questions.
   */
  async getProjectMetadataByToken(token) {
    const { data: invite, error: invErr } = await supabase
      .from(TABLES.TEAM_INVITES)
      .select('project_id')
      .eq('token', token)
      .single();
    if (invErr) throw invErr;

    const { data, error } = await supabase
      .from(TABLES.PROJECT_METADATA)
      .select('*')
      .eq('project_id', invite.project_id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async submitTeamResponse(token, payload) {
    // Resolve invite
    const invite = await this.getTeamInvite(token);
    const { data, error } = await supabase
      .from(TABLES.TEAM_RESPONSES)
      .insert({
        project_id: invite.project_id,
        invite_id: invite.id,
        ...payload,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getTeamResponses(projectId) {
    const { data, error } = await supabase
      .from(TABLES.TEAM_RESPONSES)
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // ── Release windows ───────────────────────────────────────────────────────

  async getReleaseWindows(projectId) {
    const { data, error } = await supabase
      .from(TABLES.RELEASE_WINDOWS)
      .select('*')
      .eq('project_id', projectId)
      .order('start_date', { ascending: true });
    if (error) throw error;
    return data;
  },

  /**
   * TODO: Replace stub with a real server-side engine that:
   *  - Reads competition_calendar in range
   *  - Applies genre/language clash rules + festival/holiday flags
   *  - Returns ranked windows written to release_windows table
   */
  async analyzeReleaseWindow(projectId, { earliest, latest, avoid_big_clashes }) {
    console.warn('analyzeReleaseWindow: TODO — implement release engine.');
    // Stub: return empty array; engine to be implemented server-side
    return [];
  },

  // ── Buzz snapshots ────────────────────────────────────────────────────────

  async getBuzzSnapshots(projectId) {
    const { data, error } = await supabase
      .from(TABLES.BUZZ_SNAPSHOTS)
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  async createBuzzSnapshot(projectId, payload) {
    const { data, error } = await supabase
      .from(TABLES.BUZZ_SNAPSHOTS)
      .insert({ project_id: projectId, ...payload })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── Campaign blueprint ────────────────────────────────────────────────────

  async getCampaignBlueprint(projectId) {
    const { data, error } = await supabase
      .from(TABLES.CAMPAIGN_BLUEPRINTS)
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  /**
   * Generate campaign blueprint using LLM with full context
   * @param {string} projectId 
   * @returns {Promise<Object>} Campaign blueprint
   */
  async generateCampaignBlueprint(projectId) {
    try {
      // Load all context
      const [project, persona, buzzSnaps] = await Promise.all([
        this.getProject(projectId),
        this.getProjectPersona(projectId),
        this.getBuzzSnapshots(projectId),
      ]);

      // Get sentiment summary (import dynamically to avoid circular dependency)
      let sentimentSummary = null;
      try {
        const { getSentimentSummary } = await import('./sentiment.service');
        sentimentSummary = await getSentimentSummary(projectId);
      } catch (e) {
        console.log('No sentiment data available');
      }

      const latestBuzz = (buzzSnaps || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
      const m = project?.project_metadata || {};

      // Build prompt for LLM
      const prompt = `You are a South Indian film marketing strategist. Create a practical, low-budget 14-day campaign plan.

FILM DETAILS:
- Title: ${project.title}
- Language: ${m.language || 'Unknown'}
- Genre: ${m.genre || 'Unknown'} ${m.subgenre ? '/ ' + m.subgenre : ''}
- Budget: ${m.budget_band || 'Unknown'}
- Platform: ${m.platform_strategy || 'Unknown'}

PERSONA & AUDIENCE:
- Positioning: ${persona?.positioning_statement || 'Not defined'}
- Core Clusters: ${persona?.target_core_clusters?.join(', ') || 'Not defined'}
- Secondary Clusters: ${persona?.target_secondary_clusters?.join(', ') || 'None'}

RELEASE INFO:
- Confirmed Date: ${project.confirmed_release_date || 'Not set'}
- Days Until Release: ${project.confirmed_release_date ? Math.ceil((new Date(project.confirmed_release_date) - new Date()) / (1000 * 60 * 60 * 24)) : 'Unknown'}

CURRENT BUZZ:
- Buzz Score: ${latestBuzz?.buzz_score || 'Unknown'} / 100
- Status: ${latestBuzz ? (latestBuzz.buzz_score >= 70 ? 'High' : latestBuzz.buzz_score >= 40 ? 'Medium' : 'Low') : 'Unknown'}

SENTIMENT ANALYSIS:
${sentimentSummary ? `- Positive: ${sentimentSummary.positivePercent}%, Neutral: ${sentimentSummary.neutralPercent}%, Negative: ${sentimentSummary.negativePercent}%
- Key Positives: ${sentimentSummary.keyPositives?.join(', ') || 'None'}
- Key Concerns: ${sentimentSummary.keyConcerns?.map(c => c.factor).join(', ') || 'None'}
- Recommended Actions: ${sentimentSummary.keyConcerns?.map(c => c.recommendedAction).slice(0, 2).join('; ') || 'None'}` : '- Not available'}

INSTRUCTIONS:
Generate a 14-day campaign blueprint with:
1. A brief summary (2-3 sentences)
2. 8-12 specific, actionable tasks (next_14_days_actions) with:
   - dayOffset (negative for days before release, e.g., -14, -10, -7, -3, -1, 0)
   - title (short action name)
   - description (2-3 sentences explaining the action)
   - channel (e.g., "Instagram Reels", "Campus Events", "WhatsApp Groups")
   - clusterTargets (array of target cluster codes)
3. Channel focus recommendations (channels_focus) for each target cluster with rationale

Focus on LOW-COST, HIGH-IMPACT tactics suitable for the budget band.
Address sentiment concerns proactively.
Leverage positive aspects identified in sentiment.

Return ONLY valid JSON in this exact format:
{
  "summary": "Brief campaign overview...",
  "next_14_days_actions": [
    {
      "dayOffset": -14,
      "title": "Action title",
      "description": "What to do and why",
      "channel": "Channel name",
      "clusterTargets": ["CLUSTER_CODE"]
    }
  ],
  "channels_focus": [
    {
      "clusterCode": "CLUSTER_CODE",
      "channel": "Primary channel",
      "rationale": "Why this channel works for this audience"
    }
  ]
}`;

      // Call Groq API
      const { callGroq, parseJSON } = await import('./gemini.service');
      const response = await callGroq(prompt);
      const blueprint = parseJSON(response);

      // Save to database
      const { data, error } = await supabase
        .from(TABLES.CAMPAIGN_BLUEPRINTS)
        .upsert([{
          project_id: projectId,
          summary: blueprint.summary,
          next_14_days_actions: blueprint.next_14_days_actions || [],
          channels_focus: blueprint.channels_focus || [],
        }], { onConflict: 'project_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Campaign generation error:', e);
      throw new Error('Campaign generation failed: ' + e.message);
    }
  },
};

