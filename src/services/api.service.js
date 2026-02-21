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
   * Update campaign blueprint action progress (checklist state)
   * @param {string} projectId 
   * @param {Object} actionProgress - { actions: [{ id, completed }] }
   * @returns {Promise<Object>}
   */
  async updateCampaignBlueprintProgress(projectId, actionProgress) {
    const { data, error } = await supabase
      .from(TABLES.CAMPAIGN_BLUEPRINTS)
      .update({ action_progress: actionProgress })
      .eq('project_id', projectId)
      .select()
      .single();
    
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
      const [project, persona, buzzSnaps, windows] = await Promise.all([
        this.getProject(projectId),
        this.getProjectPersona(projectId),
        this.getBuzzSnapshots(projectId),
        this.getReleaseWindows(projectId).catch(() => []),
      ]);

      // Get sentiment summary (import dynamically to avoid circular dependency)
      let sentimentSummary = null;
      try {
        const { getSentimentSummary } = await import('./sentiment.service');
        sentimentSummary = await getSentimentSummary(projectId);
      } catch (e) {
        console.log('No sentiment data available');
      }

      // Process buzz data and calculate trend
      const sortedBuzz = (buzzSnaps || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const latestBuzz = sortedBuzz[0];
      const previousBuzz = sortedBuzz[1];
      let buzzTrend = 'flat';
      if (latestBuzz && previousBuzz) {
        const diff = latestBuzz.buzz_score - previousBuzz.buzz_score;
        buzzTrend = diff >= 5 ? 'up' : diff <= -5 ? 'down' : 'flat';
      }

      // Determine release date (confirmed or tentative)
      let releaseDate = project.confirmed_release_date;
      let releaseDateType = 'confirmed';
      if (!releaseDate && windows?.length > 0) {
        const bestWindow = windows.sort((a, b) => (b.score_numeric || 0) - (a.score_numeric || 0))[0];
        releaseDate = bestWindow?.primary_date;
        releaseDateType = 'tentative';
      }

      // Calculate days to release
      let daysToRelease = 'UNKNOWN';
      if (releaseDate) {
        daysToRelease = Math.ceil((new Date(releaseDate) - new Date()) / (1000 * 60 * 60 * 24));
      }

      const m = project?.project_metadata || {};

      // Build comprehensive context object for LLM
      const context = {
        filmTitle: project.title || 'Untitled',
        language: m.language || 'Unknown',
        region: m.region || 'Unknown',
        genre: m.genre || 'Unknown',
        subgenre: m.subgenre || null,
        budgetBand: m.budget_band || 'small',
        platformStrategy: m.platform_strategy || 'theatrical-first',
        personaSummary: persona?.persona_summary || 'Not defined',
        positioningStatement: persona?.positioning_statement || 'Not defined',
        targetCoreClusters: persona?.target_core_clusters || [],
        targetSecondaryClusters: persona?.target_secondary_clusters || [],
        confirmedReleaseDate: releaseDateType === 'confirmed' ? releaseDate : null,
        tentativeReleaseDate: releaseDateType === 'tentative' ? releaseDate : null,
        daysToRelease: daysToRelease,
        currentBuzzScore: latestBuzz?.buzz_score || null,
        buzzTrend: buzzTrend,
        sentiment: sentimentSummary ? {
          positivePercent: sentimentSummary.positivePercent,
          neutralPercent: sentimentSummary.neutralPercent,
          negativePercent: sentimentSummary.negativePercent,
          keyPositives: sentimentSummary.keyPositives || [],
          keyConcerns: sentimentSummary.keyConcerns || []
        } : null
      };

      // Build prompt for LLM
      const prompt = `You are a South Indian indie film marketing strategist specializing in low-budget, high-impact campaigns. Create a practical, tactical 14-day campaign blueprint.

FILM CONTEXT:
${JSON.stringify(context, null, 2)}

INSTRUCTIONS:
Generate a 14-day campaign blueprint with:

1. **summary**: A brief 2-4 sentence narrative explaining the campaign strategy, focusing on how it leverages the persona, buzz level, sentiment insights, and release timing.

2. **next_14_days_actions**: An array of 8-12 specific, actionable tasks with:
   - dayOffset: Integer (negative for days before release, 0 for release day, positive for post-release)
     Example: -14, -10, -7, -3, -1, 0, +1, +3
   - title: Short action name (3-7 words)
   - description: 2-3 sentences explaining what to do and why it works for this audience
   - channel: Primary channel/medium (e.g., "Instagram Reels", "Campus Events", "WhatsApp Groups", "Local Radio")
   - clusterTargets: Array of target cluster codes from the persona (e.g., ["URBAN_YOUTH_MULTIPLEX", "NICHE_CINEPHILE"])

3. **channels_focus**: Array of 3-5 channel recommendations with:
   - clusterCode: One of the target clusters
   - channel: Primary channel for that cluster
   - rationale: 1-2 sentences explaining why this channel works for this audience segment

KEY REQUIREMENTS:
- Focus on LOW-COST, HIGH-IMPACT tactics suitable for a ${context.budgetBand} budget
- If sentiment has key concerns, include 1-2 actions that directly address them
- If sentiment has strong positives, include actions that amplify them
- If buzz is low, prioritize grassroots and organic tactics
- If buzz is high, include actions to sustain and convert momentum
- Distribute actions across the timeline (not all clustered at the end)
- Be specific and tactical, not generic

Return ONLY valid JSON with NO markdown formatting:

{
  "summary": "Brief campaign overview...",
  "next_14_days_actions": [
    {
      "dayOffset": -14,
      "title": "Action title",
      "description": "What to do and why it works",
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

      // Validate blueprint structure
      if (!blueprint.summary || !Array.isArray(blueprint.next_14_days_actions)) {
        throw new Error('Invalid blueprint structure from LLM');
      }

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

