import { create } from "zustand";
import type { AssistantReply, ConversationContext } from "@/ai/demoAssistant";

export type ChatTurn = { id: number; role: "user"; text: string } | { id: number; role: "assistant"; reply: AssistantReply };

interface ChatState {
  turns: ChatTurn[];
  context: ConversationContext;
  pending: boolean;
  push: (t: ChatTurn) => void;
  setContext: (c: ConversationContext) => void;
  setPending: (p: boolean) => void;
  clear: () => void;
}

/** The assistant conversation, kept while you move between pages. */
export const useChat = create<ChatState>((set) => ({
  turns: [],
  context: {},
  pending: false,
  push: (t) => set((s) => ({ turns: [...s.turns, t] })),
  setContext: (context) => set({ context }),
  setPending: (pending) => set({ pending }),
  clear: () => set({ turns: [], context: {}, pending: false }),
}));
