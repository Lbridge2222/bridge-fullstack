// Helper to detect and suggest urgent follow-up actions from Ask Ivy responses
// This enables automatic ivy:suggestAction events when Ivy recommends specific applicants

export interface ActionableQueryResponse {
  answer: string;
  query_type: string;
  confidence: number;
  // Extracted suggested application IDs
  suggested_application_ids?: string[];
  // Backend candidate IDs (from triage or risk scoring)
  candidate_ids?: string[];
}

/**
 * Normalize a name for better matching
 */
function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '')  // Remove punctuation
    .replace(/\s+/g, ' ');     // Normalize whitespace
}

/**
 * Check if two names match (handles variations)
 */
function namesMatch(name1: string, name2: string): boolean {
  const norm1 = normalizeName(name1);
  const norm2 = normalizeName(name2);

  // Exact match
  if (norm1 === norm2) return true;

  // Partial match (either direction)
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  // Word-level match (firstname or lastname)
  const words1 = norm1.split(' ');
  const words2 = norm2.split(' ');
  return words1.some(w1 => w1.length > 3 && words2.some(w2 => w1 === w2));
}

/**
 * Detect if an Ivy response should trigger action suggestions
 */
export function detectActionableFollowups(
  answer: string,
  contextApplications?: Array<{ application_id: string; name?: string; [key: string]: any }>,
  backendCandidates?: string[]
): string[] {
  // Keywords that suggest urgent follow-up needed
  const urgentKeywords = [
    // Expiring/time-sensitive
    'expiring', 'expires soon', 'expires in',
    // Follow-up language
    'needs follow-up', 'follow up urgently', 'urgent follow-up',
    'follow-up call', 'schedule a follow-up', 'personalized follow-up',
    // Risk indicators
    'at risk', 'conversion risk', 'high risk', 'top_at_risk', 'top at risk',
    // Responsiveness issues
    'unresponsive', 'no response', 'hasn\'t responded', 'has not responded',
    'not responded', 'conditional_offer_no_response', 'no_response',
    // Attention needed
    'needs attention', 'requires immediate action', 'requires urgent',
    'recommended actions', 'next steps', 'attention', 'urgent attention',
    // Interview/offer related
    'book interview', 'schedule interview', 'schedule a call',
    'offer pending', 'decision needed', 'conditional offer',
    // Engagement/conversion issues
    'low engagement', 'below average', 'conversion probability',
    'probability is currently 0', 'probability: 0',
    // Applicant queries
    'require urgent follow-up', 'applicants require', 'should follow up'
  ];

  const answerLower = answer.toLowerCase();
  const hasUrgentContext = urgentKeywords.some(keyword => answerLower.includes(keyword));
  
  // Debug: Show which keywords matched
  const matchedKeywords = urgentKeywords.filter(keyword => answerLower.includes(keyword));

  console.log('[Action Suggestion] Checking for actionable follow-ups:', {
    hasUrgentContext,
    contextSize: contextApplications?.length,
    backendCandidates: backendCandidates?.length,
    matchedKeywords: matchedKeywords.length > 0 ? matchedKeywords : 'none'
  });

  if (!hasUrgentContext) {
    console.log('[Action Suggestion] No urgent keywords detected');
    return [];
  }

  // PRIORITY 1: Use backend candidates if available (most reliable)
  if (backendCandidates && backendCandidates.length > 0) {
    console.log('[Action Suggestion] ✓ Using backend candidates:', backendCandidates.length);
    return backendCandidates.slice(0, 5);
  }

  // PRIORITY 2: Extract application IDs mentioned in the response
  const suggestedIds: string[] = [];

  if (contextApplications && contextApplications.length > 0) {
    // Clean the answer (remove markdown bold, escaped underscores, etc.)
    const cleanAnswer = answerLower
      .replace(/\*\*/g, '')      // Remove **bold**
      .replace(/\*/g, '')         // Remove single *
      .replace(/\\_/g, '_')       // Unescape underscores
      .replace(/\\\\_/g, '')      // Remove double-escaped underscores
      .replace(/\\n/g, ' ')       // Unescape newlines
      .replace(/['"]/g, ' ')      // Remove quotes
      .replace(/:/g, ' ');        // Remove colons (after names)

    console.log('[Action Suggestion] Clean answer preview:', cleanAnswer.substring(0, 200));

    // Extract all potential names (words in title case) from ORIGINAL answer (not cleanAnswer)
    const potentialNames = new Set<string>();

    // Look for "FirstName LastName" patterns in the original answer (case-insensitive)
    const namePattern = /\b([A-Za-z]+ [A-Za-z]+)\b/g;
    let match;
    while ((match = namePattern.exec(answer)) !== null) {
      const fullName = match[1];
      if (fullName && fullName.length > 3) {
        // Convert to title case for consistent matching
        const titleCaseName = fullName.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
        potentialNames.add(titleCaseName);
        console.log('[Action Suggestion] Extracted name from text:', fullName, '→', titleCaseName);
      }
    }
    
    console.log('[Action Suggestion] Potential names found:', Array.from(potentialNames));

    // DEBUG: Log available application names (check multiple name fields)
    console.log('[Action Suggestion] Available apps in context:',
      contextApplications.slice(0, 10).map(a => ({
        id: a.application_id?.substring(0, 8),
        name: a.name || (a.first_name && a.last_name ? `${a.first_name} ${a.last_name}` : undefined),
        first_name: a.first_name,
        last_name: a.last_name
      }))
    );

    // Match extracted names to applications using improved matching
    for (const app of contextApplications) {
      // Try multiple name fields (applications may use different structures)
      const appName = app.name ||
                      (app.first_name && app.last_name ? `${app.first_name} ${app.last_name}`.trim() : '') ||
                      app.full_name ||
                      '';
      if (!appName || !app.application_id) continue;

      // Check if any extracted name matches this application
      const matched = Array.from(potentialNames).some(extractedName =>
        namesMatch(extractedName, appName)
      );

      if (matched) {
        console.log('[Action Suggestion] ✓ Matched:', appName, '→', app.application_id.substring(0, 8));
        suggestedIds.push(app.application_id);
      }
    }

    console.log('[Action Suggestion] Found suggested IDs via name matching:', suggestedIds.length);

    // If no names matched, try partial word matching as fallback
    if (suggestedIds.length === 0 && potentialNames.size > 0) {
      console.log('[Action Suggestion] No direct matches, trying word-level matching...');
      const extractedWords = Array.from(potentialNames)
        .flatMap(name => normalizeName(name).split(' '))
        .filter(word => word.length > 3);

      for (const app of contextApplications) {
        // Try multiple name fields (applications may use different structures)
        const appName = app.name ||
                        (app.first_name && app.last_name ? `${app.first_name} ${app.last_name}`.trim() : '') ||
                        app.full_name ||
                        '';
        if (!appName || !app.application_id) continue;

        const appWords = normalizeName(appName).split(' ');
        const wordMatched = extractedWords.some(word =>
          appWords.some(appWord => appWord === word || appWord.includes(word) || word.includes(appWord))
        );

        if (wordMatched) {
          console.log('[Action Suggestion] ✓ Word-matched:', appName, '→', app.application_id.substring(0, 8));
          suggestedIds.push(app.application_id);
        }
      }
    }

    // Final fallback: if still no matches and query is about urgent follow-ups,
    // suggest all high-risk or recently updated applications
    if (suggestedIds.length === 0 && (answerLower.includes('applicants needing') || answerLower.includes('applicants that need') || answerLower.includes('require urgent'))) {
      console.log('[Action Suggestion] Using fallback: suggesting high-risk apps');
      const highRiskApps = contextApplications.filter((app: any) => {
        const risk = (app.conversion_probability || app.progression_probability || 0);
        return risk < 0.5 || risk > 0.7; // High risk or high value
      });

      if (highRiskApps.length > 0) {
        const ids = highRiskApps.slice(0, 5).map((app: any) => app.application_id).filter(Boolean);
        suggestedIds.push(...ids);
        console.log('[Action Suggestion] Fallback suggested IDs:', suggestedIds);
      }
    }
  }
  
  console.log('[Action Suggestion] Final suggested IDs:', suggestedIds);

  // Return unique IDs
  return Array.from(new Set(suggestedIds));
}

/**
 * Process a query to detect if it's asking about urgent follow-ups
 */
export function isActionableQuery(query: string): boolean {
  const actionablePatterns = [
    /which.*applicants?.*need.*(follow.?up|attention|action)/i,
    /who.*need.*follow.?up/i,
    /urgent.*follow.?up/i,
    /applicants?.*at.?risk/i,
    /applicants?.*expiring/i,
    /calls?.*need.*to.*make/i,
    /emails?.*need.*to.*send/i
  ];

  return actionablePatterns.some(pattern => pattern.test(query));
}

