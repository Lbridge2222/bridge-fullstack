// Session memory store using Zustand
// Tracks user context for intelligent action triage

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SessionMemory } from '@/types/actions';

interface ConversationMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

interface ConversationContext {
  applicationId: string;
  messages: ConversationMessage[];
  keyConcerns: string[];
  lastUpdated: string;
}

interface SessionStore extends SessionMemory {
  ivySuggestions?: {
    applicationIds: string[]
    updatedAt?: string
  }
  recentConversations: ConversationContext[];
  // Phase 2: Session ID for Ask Ivy conversation continuity
  ivySessionId?: string | null;

  // Actions
  setActiveStage: (stage: string | undefined) => void;
  addViewedApplication: (applicationId: string) => void;
  setLastTriageIds: (ids: string[]) => void;
  updatePreferences: (prefs: Partial<SessionMemory['preferences']>) => void;
  setIvySuggestions: (applicationIds: string[]) => void;
  consumeSuggestion: (applicationId: string) => void;
  addConversationMessage: (applicationId: string, message: ConversationMessage) => void;
  getConversationContext: (applicationId: string) => ConversationContext | undefined;
  setIvySessionId: (sessionId: string | null) => void;
  reset: () => void;
}

const initialState: SessionMemory = {
  activeStage: undefined,
  viewedApplications: [],
  lastTriageIds: [],
  preferences: {
    autoRefresh: false,
    defaultLimit: 5,
  },
};

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      ivySuggestions: { applicationIds: [], updatedAt: undefined },
      recentConversations: [],
      ivySessionId: null,

      setActiveStage: (stage) => set({ activeStage: stage }),

      setIvySessionId: (sessionId: string | null) => {
        console.log('[Session Store] Setting ivySessionId:', sessionId);
        console.log('[Session Store] Current state before update:', get().ivySessionId);
        set({ ivySessionId: sessionId });
        console.log('[Session Store] State after update:', get().ivySessionId);
      },

      addViewedApplication: (applicationId) =>
        set((state) => ({
          viewedApplications: [
            ...(state.viewedApplications || []).filter((id) => id !== applicationId),
            applicationId,
          ].slice(-20), // Keep last 20
        })),

      setLastTriageIds: (ids) => set({ lastTriageIds: ids }),

      updatePreferences: (prefs) =>
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        })),

      setIvySuggestions: (applicationIds: string[]) =>
        set(() => ({
          ivySuggestions: { applicationIds: Array.from(new Set(applicationIds)), updatedAt: new Date().toISOString() },
        })),

      consumeSuggestion: (applicationId: string) =>
        set((state) => ({
          ivySuggestions: {
            applicationIds: (state.ivySuggestions?.applicationIds || []).filter((id) => id !== applicationId),
            updatedAt: new Date().toISOString(),
          },
        })),

      addConversationMessage: (applicationId: string, message: ConversationMessage) =>
        set((state) => {
          const conversations = state.recentConversations || [];
          const existingIndex = conversations.findIndex((c) => c.applicationId === applicationId);

          let updatedConversations: ConversationContext[];

          if (existingIndex >= 0) {
            // Update existing conversation
            const updated = [...conversations];
            const existing = updated[existingIndex];
            updated[existingIndex] = {
              ...existing,
              messages: [...existing.messages, message].slice(-10), // Keep last 10 messages
              lastUpdated: new Date().toISOString(),
            };
            updatedConversations = updated;
          } else {
            // Create new conversation
            const newConversation: ConversationContext = {
              applicationId,
              messages: [message],
              keyConcerns: [],
              lastUpdated: new Date().toISOString(),
            };
            updatedConversations = [...conversations, newConversation].slice(-20); // Keep last 20 conversations
          }

          // Sync to backend asynchronously (don't block UI)
          const conversationToSync = updatedConversations.find((c) => c.applicationId === applicationId);
          if (conversationToSync) {
            import('@/services/actionsApi').then(({ syncConversation }) => {
              syncConversation(
                applicationId,
                conversationToSync.messages,
                conversationToSync.keyConcerns
              ).catch((err) => {
                console.warn('[Session Store] Failed to sync conversation to backend:', err);
              });
            });
          }

          return { recentConversations: updatedConversations };
        }),

      getConversationContext: (applicationId: string) => {
        const conversations = get().recentConversations || [];
        return conversations.find((c) => c.applicationId === applicationId);
      },

      reset: () => set({ ...initialState, recentConversations: [] }),
    }),
    {
      name: 'ivy-session-memory',
    }
  )
);
