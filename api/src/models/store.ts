// In-memory collections standing in for MongoDB (Phase 4). Each class mirrors a planned collection:
// users, sessions, chats, configs (settings), ai_logs. Data resets when the API restarts.
import { randomUUID } from "node:crypto";

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: "admin" | "analyst";
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  reply?: unknown;
  at: string;
}

export interface Chat {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  theme: "light" | "dark" | "system";
  defaultFilters: { range: string; region: string; channel: string; category: string; segment: string };
}

export type ModelTier = "fast" | "reasoning" | "fallback";
export interface AiLog {
  id: string;
  at: string;
  userId?: string;
  question: string;
  intent: string;
  model: ModelTier;
  tokensBaseline: number;
  tokensOptimized: number;
  latencyMs: number;
  costUsd: number;
  guard: "passed" | "repaired" | "blocked";
  guardRule?: string;
  success: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  defaultFilters: { range: "1Y", region: "All", channel: "All", category: "All", segment: "All" },
};

class Collection<T extends { id: string }> {
  protected items = new Map<string, T>();
  insert(item: T) {
    this.items.set(item.id, item);
    return item;
  }
  get(id: string) {
    return this.items.get(id);
  }
  all() {
    return [...this.items.values()];
  }
  delete(id: string) {
    return this.items.delete(id);
  }
  clear() {
    this.items.clear();
  }
}

class Users extends Collection<User> {
  byEmail(email: string) {
    return this.all().find((u) => u.email === email.toLowerCase());
  }
}

class Chats extends Collection<Chat> {
  forUser(userId: string) {
    return this.all()
      .filter((c) => c.userId === userId)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }
  create(userId: string, title: string) {
    const now = new Date().toISOString();
    return this.insert({ id: randomUUID(), userId, title: title.slice(0, 80), messages: [], createdAt: now, updatedAt: now });
  }
}

class SettingsStore {
  private items = new Map<string, Settings>();
  get(userId: string): Settings {
    return this.items.get(userId) ?? structuredClone(DEFAULT_SETTINGS);
  }
  set(userId: string, s: Settings) {
    this.items.set(userId, s);
    return s;
  }
  clear() {
    this.items.clear();
  }
}

class AiLogs extends Collection<AiLog> {
  since(fromIso: string) {
    return this.all()
      .filter((l) => l.at >= fromIso)
      .sort((a, b) => (a.at < b.at ? -1 : 1));
  }
}

export const db = { users: new Users(), chats: new Chats(), settings: new SettingsStore(), aiLogs: new AiLogs() };
