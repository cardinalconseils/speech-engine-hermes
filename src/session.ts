import { v4 as uuidv4 } from "uuid";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface SessionState {
  id: string;
  createdAt: number;
  lastActivity: number;
  messages: ChatMessage[];
  activeAbortController: AbortController | null;
}

export class SessionManager {
  private sessions = new Map<string, SessionState>();
  private maxMessages: number;

  constructor(maxMessages: number = 100) {
    this.maxMessages = maxMessages;
  }

  /** Create a new session, returns the session */
  create(): SessionState {
    const session: SessionState = {
      id: uuidv4(),
      createdAt: Date.now(),
      lastActivity: Date.now(),
      messages: [],
      activeAbortController: null,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  /** Get a session by ID */
  get(id: string): SessionState | undefined {
    return this.sessions.get(id);
  }

  /** Remove a session and abort any active stream */
  remove(id: string): void {
    const session = this.sessions.get(id);
    if (session) {
      session.activeAbortController?.abort();
      this.sessions.delete(id);
    }
  }

  /** Add a message to the session history */
  addMessage(sessionId: string, role: ChatMessage["role"], content: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.messages.push({ role, content });

    // Trim to max messages
    if (session.messages.length > this.maxMessages) {
      session.messages = session.messages.slice(-this.maxMessages);
    }

    session.lastActivity = Date.now();
  }

  /** Update lastActivity timestamp */
  touch(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) session.lastActivity = Date.now();
  }

  /** Set the abort controller for a session's active stream */
  setAbortController(sessionId: string, controller: AbortController | null): void {
    const session = this.sessions.get(sessionId);
    if (session) session.activeAbortController = controller;
  }

  /** Get count of active sessions */
  get count(): number {
    return this.sessions.size;
  }

  /** Get all session IDs */
  get allIds(): string[] {
    return Array.from(this.sessions.keys());
  }

  /** Remove sessions that have been idle for more than `maxIdleMs` */
  cleanupIdle(maxIdleMs: number): number {
    const now = Date.now();
    let removed = 0;
    for (const [id, session] of this.sessions) {
      if (now - session.lastActivity > maxIdleMs) {
        this.remove(id);
        removed++;
      }
    }
    return removed;
  }
}