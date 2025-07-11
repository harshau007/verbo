import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface TranscriptEntry {
  speaker: "user" | "ai";
  text: string;
}

export interface Session {
  id: string;
  language: "English" | "German";
  cefrLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  name: string;
  topic: string;
  transcript: TranscriptEntry[];
  feedback?: string;
  cefrConfirmation?: string;
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
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
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
                [sessionId]: { ...state.sessions[sessionId], ...updates },
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
                  transcript: [...session.transcript, entry],
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
    }),
    {
      name: "vocab-session-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
