import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface TranscriptEntry {
  speaker: "user" | "ai";
  text: string;
  part?: "part1" | "part2" | "part3";
}

export interface Session {
  id: string;
  language: "English" | "German";
  cefrLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  name: string;
  topic: string;
  feedback?: string;
  transcript?: TranscriptEntry[];
  cefrConfirmation?: string;
  ieltsBand?: string;
  currentPart?: "part1" | "part2" | "part3";
  part2Topic?: string;
  part2PreparationTime?: number;
  part2SpeakingTime?: number;
  createdAt: string;
}

interface SessionState {
  sessions: Record<string, Session>;
  addSession: (session: Session) => void;
  updateSession: (
    sessionId: string,
    updates: Partial<Omit<Session, "id">>
  ) => void;
  addTranscriptEntry: (sessionId: string, entry: TranscriptEntry) => void;
  deleteSession: (sessionId: string) => void;
  ensureTranscript: (sessionId: string) => void;
}

const ensureTranscriptExists = (session: Session): Session => {
  if (!session.transcript) {
    return { ...session, transcript: [] };
  }
  return session;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: {},
      addSession: (session) =>
        set((state) => ({
          sessions: { ...state.sessions, [session.id]: session },
        })),
      updateSession: (sessionId, updates) =>
        set((state) => {
          if (state.sessions[sessionId]) {
            return {
              sessions: {
                ...state.sessions,
                [sessionId]: { 
                  ...state.sessions[sessionId], 
                  ...updates,
                  transcript: state.sessions[sessionId].transcript || []
                },
              },
            };
          }
          return {};
        }),
      addTranscriptEntry: (sessionId, entry) =>
        set((state) => {
          const session = state.sessions[sessionId];
          if (session) {
            return {
              sessions: {
                ...state.sessions,
                [sessionId]: {
                  ...session,
                  transcript: [...(session.transcript || []), entry],
                },
              },
            };
          }
          return {};
        }),
      deleteSession: (sessionId) =>
        set((state) => {
          const newSessions = { ...state.sessions };
          delete newSessions[sessionId];
          return { sessions: newSessions };
        }),
      ensureTranscript: (sessionId) =>
        set((state) => {
          const session = state.sessions[sessionId];
          if (session) {
            return {
              sessions: {
                ...state.sessions,
                [sessionId]: ensureTranscriptExists(session),
              },
            };
          }
          return {};
        }),
    }),
    {
      name: "vocab-session-storage",
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: any) => {
        if (persistedState && persistedState.sessions) {
          const migratedSessions = { ...persistedState.sessions };
          Object.keys(migratedSessions).forEach(sessionId => {
            if (!migratedSessions[sessionId].transcript) {
              migratedSessions[sessionId].transcript = [];
            }
          });
          return { ...persistedState, sessions: migratedSessions };
        }
        return persistedState;
      },
    }
  )
);
