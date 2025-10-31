/**
 * Unit tests for Action Suggestion Helper
 * Tests name matching, normalization, and detection logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { detectActionableFollowups } from '../actionSuggestionHelper';

describe('actionSuggestionHelper', () => {
  // Mock application data
  const mockApplications = [
    {
      application_id: 'app-001',
      name: 'Harper Martin',
      status: 'screening',
      is_at_risk: false
    },
    {
      application_id: 'app-002',
      name: 'Marco Rossi',
      status: 'interview',
      is_at_risk: true
    },
    {
      application_id: 'app-003',
      name: 'Sarah Johnson',
      status: 'offer',
      is_at_risk: false
    },
    {
      application_id: 'app-004',
      name: 'John Smith',
      status: 'screening',
      is_at_risk: true
    }
  ];

  describe('Backend Candidates (PRIORITY 1)', () => {
    it('should use backend candidates when provided', () => {
      const answer = 'You should follow up with Harper Martin urgently.';
      const backendCandidates = ['app-001', 'app-002'];

      const result = detectActionableFollowups(answer, mockApplications, backendCandidates);

      expect(result).toEqual(['app-001', 'app-002']);
      expect(result.length).toBe(2);
    });

    it('should prioritize backend candidates over name matching', () => {
      // Answer mentions "Sarah" but backend suggests Harper and Marco
      const answer = 'Sarah Johnson needs attention.';
      const backendCandidates = ['app-001', 'app-002'];

      const result = detectActionableFollowups(answer, mockApplications, backendCandidates);

      // Should use backend candidates, not Sarah from the text
      expect(result).toEqual(['app-001', 'app-002']);
    });

    it('should limit backend candidates to 5', () => {
      const answer = 'Multiple candidates need follow-up.';
      const backendCandidates = ['app-001', 'app-002', 'app-003', 'app-004', 'app-005', 'app-006'];

      const result = detectActionableFollowups(answer, mockApplications, backendCandidates);

      expect(result.length).toBe(5);
    });

    it('should fall back to name matching when backend candidates empty', () => {
      const answer = 'Follow up with Harper Martin.';
      const backendCandidates: string[] = [];

      const result = detectActionableFollowups(answer, mockApplications, backendCandidates);

      // Should fall back to name matching
      expect(result).toContain('app-001');
    });
  });

  describe('Name Matching - Exact', () => {
    it('should match exact name with proper case', () => {
      const answer = 'You should contact Harper Martin about their application.';

      const result = detectActionableFollowups(answer, mockApplications);

      expect(result).toContain('app-001');
    });

    it('should match multiple names in one query', () => {
      const answer = 'Harper Martin and Marco Rossi both need follow-ups today.';

      const result = detectActionableFollowups(answer, mockApplications);

      expect(result).toContain('app-001');
      expect(result).toContain('app-002');
      expect(result.length).toBe(2);
    });

    it('should handle names with punctuation', () => {
      const answer = 'Contact Harper Martin, Marco Rossi, and Sarah Johnson.';

      const result = detectActionableFollowups(answer, mockApplications);

      expect(result).toContain('app-001');
      expect(result).toContain('app-002');
      expect(result).toContain('app-003');
    });
  });

  describe('Name Matching - Variations', () => {
    it('should match lowercase version of name', () => {
      const answer = 'harper martin needs a call';

      const result = detectActionableFollowups(answer, mockApplications);

      expect(result).toContain('app-001');
    });

    it('should match reversed name order', () => {
      const answer = 'Contact Martin Harper about the position.';

      const result = detectActionableFollowups(answer, mockApplications);

      expect(result).toContain('app-001');
    });

    it('should match name with extra whitespace', () => {
      const answer = 'Harper   Martin   needs follow-up.';

      const result = detectActionableFollowups(answer, mockApplications);

      expect(result).toContain('app-001');
    });

    it('should match partial name (word-level fallback)', () => {
      const answer = 'Harper needs urgent attention.';

      const result = detectActionableFollowups(answer, mockApplications);

      expect(result).toContain('app-001');
    });

    it('should match last name only', () => {
      const answer = 'Rossi is at high risk.';

      const result = detectActionableFollowups(answer, mockApplications);

      expect(result).toContain('app-002');
    });
  });

  describe('Edge Cases', () => {
    it('should return empty array when no matches found', () => {
      const answer = 'No actionable information in this query.';

      const result = detectActionableFollowups(answer, mockApplications);

      expect(result).toEqual([]);
    });

    it('should handle empty answer', () => {
      const answer = '';

      const result = detectActionableFollowups(answer, mockApplications);

      expect(result).toEqual([]);
    });

    it('should handle undefined applications context', () => {
      const answer = 'Contact Harper Martin.';

      const result = detectActionableFollowups(answer, undefined);

      expect(result).toEqual([]);
    });

    it('should handle empty applications array', () => {
      const answer = 'Contact Harper Martin.';

      const result = detectActionableFollowups(answer, []);

      expect(result).toEqual([]);
    });

    it('should filter out short names (< 3 chars)', () => {
      const answer = 'Contact Jo Smith.';  // "Jo" too short

      const result = detectActionableFollowups(answer, mockApplications);

      // Should not match John Smith because "Jo" is too short
      expect(result.length).toBe(0);
    });

    it('should not match common words', () => {
      const answer = 'The application process needs improvement.';

      const result = detectActionableFollowups(answer, mockApplications);

      expect(result).toEqual([]);
    });
  });

  describe('High-Risk Fallback', () => {
    it('should return at-risk applications when no names matched', () => {
      const answer = 'Who is at high risk?';

      const result = detectActionableFollowups(answer, mockApplications);

      // Should return Marco Rossi and John Smith (both at_risk)
      expect(result).toContain('app-002');
      expect(result).toContain('app-004');
    });

    it('should not use high-risk fallback when names matched', () => {
      const answer = 'Sarah Johnson needs attention.';

      const result = detectActionableFollowups(answer, mockApplications);

      // Should match Sarah, not return all at-risk apps
      expect(result).toContain('app-003');
      expect(result.length).toBe(1);
    });
  });

  describe('Deduplication', () => {
    it('should not return duplicate IDs', () => {
      const answer = 'Harper Martin and Harper Martin need follow-up.';

      const result = detectActionableFollowups(answer, mockApplications);

      expect(result).toContain('app-001');
      expect(result.length).toBe(1); // Should only appear once
    });

    it('should deduplicate when multiple matching strategies match same app', () => {
      const answer = 'Harper Martin and Harper both need attention.';

      const result = detectActionableFollowups(answer, mockApplications);

      // Both "Harper Martin" and "Harper" should match same app
      expect(result).toContain('app-001');
      expect(result.length).toBe(1);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle urgent follow-up query', () => {
      const answer = 'Based on urgency, you should follow up with Harper Martin immediately. Marco Rossi also needs attention within 24 hours.';

      const result = detectActionableFollowups(answer, mockApplications);

      expect(result).toContain('app-001');
      expect(result).toContain('app-002');
    });

    it('should handle at-risk query', () => {
      const answer = 'Marco Rossi is showing signs of disengagement and may drop out.';

      const result = detectActionableFollowups(answer, mockApplications);

      expect(result).toContain('app-002');
    });

    it('should handle status update query', () => {
      const answer = 'Sarah Johnson has completed all interviews and is ready for an offer.';

      const result = detectActionableFollowups(answer, mockApplications);

      expect(result).toContain('app-003');
    });

    it('should handle general inquiry with no actionable names', () => {
      const answer = 'The application pipeline is healthy with 15 candidates in screening.';

      const result = detectActionableFollowups(answer, mockApplications);

      expect(result).toEqual([]);
    });
  });

  describe('Performance', () => {
    it('should handle large application lists efficiently', () => {
      const largeAppList = Array.from({ length: 1000 }, (_, i) => ({
        application_id: `app-${i}`,
        name: `Person ${i}`,
        status: 'screening',
        is_at_risk: false
      }));

      const answer = 'Person 500 needs follow-up.';

      const start = performance.now();
      const result = detectActionableFollowups(answer, largeAppList);
      const duration = performance.now() - start;

      expect(result).toContain('app-500');
      expect(duration).toBeLessThan(100); // Should complete in <100ms
    });
  });
});
