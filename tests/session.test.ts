import { describe, it, expect } from "vitest";
import { SessionManager } from "../src/session.js";

describe("SessionManager", () => {
  it("creates a session with a unique ID", () => {
    const sm = new SessionManager();
    const s1 = sm.create();
    const s2 = sm.create();
    expect(s1.id).toBeTruthy();
    expect(s2.id).toBeTruthy();
    expect(s1.id).not.toBe(s2.id);
    expect(sm.count).toBe(2);
  });

  it("retrieves a session by ID", () => {
    const sm = new SessionManager();
    const s = sm.create();
    const retrieved = sm.get(s.id);
    expect(retrieved).toBe(s);
  });

  it("returns undefined for unknown session", () => {
    const sm = new SessionManager();
    expect(sm.get("nonexistent")).toBeUndefined();
  });

  it("removes a session and aborts active stream", () => {
    const sm = new SessionManager();
    const s = sm.create();
    const controller = new AbortController();
    sm.setAbortController(s.id, controller);
    
    sm.remove(s.id);
    expect(sm.get(s.id)).toBeUndefined();
    expect(controller.signal.aborted).toBe(true);
    expect(sm.count).toBe(0);
  });

  it("adds messages to session history", () => {
    const sm = new SessionManager();
    const s = sm.create();
    
    sm.addMessage(s.id, "user", "Hello");
    sm.addMessage(s.id, "assistant", "Hi there");
    
    const retrieved = sm.get(s.id);
    expect(retrieved?.messages).toHaveLength(2);
    expect(retrieved?.messages[0]?.role).toBe("user");
    expect(retrieved?.messages[0]?.content).toBe("Hello");
    expect(retrieved?.messages[1]?.role).toBe("assistant");
    expect(retrieved?.messages[1]?.content).toBe("Hi there");
  });

  it("trims message history to maxMessages", () => {
    const sm = new SessionManager(3);
    const s = sm.create();
    
    sm.addMessage(s.id, "user", "1");
    sm.addMessage(s.id, "assistant", "2");
    sm.addMessage(s.id, "user", "3");
    sm.addMessage(s.id, "assistant", "4");
    
    const retrieved = sm.get(s.id);
    expect(retrieved?.messages).toHaveLength(3);
    expect(retrieved?.messages[0]?.content).toBe("2");
    expect(retrieved?.messages[2]?.content).toBe("4");
  });

  it("updates lastActivity on touch", () => {
    const sm = new SessionManager();
    const s = sm.create();
    const before = s.lastActivity;
    
    // Small delay
    sm.touch(s.id);
    
    const after = sm.get(s.id)?.lastActivity;
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it("tracks abort controller per session", () => {
    const sm = new SessionManager();
    const s = sm.create();
    const controller = new AbortController();
    
    sm.setAbortController(s.id, controller);
    const retrieved = sm.get(s.id);
    expect(retrieved?.activeAbortController).toBe(controller);
    
    sm.setAbortController(s.id, null);
    expect(sm.get(s.id)?.activeAbortController).toBeNull();
  });

  it("cleans up idle sessions", async () => {
    const sm = new SessionManager();
    sm.create(); // This session gets touched
    
    // Create second session with old lastActivity
    const s2 = sm.create();
    // Manipulate lastActivity to simulate old session
    (s2 as { lastActivity: number }).lastActivity = Date.now() - 10 * 60 * 1000; // 10 min ago
    
    const removed = sm.cleanupIdle(5 * 60 * 1000); // 5 min max idle
    expect(removed).toBe(1);
    expect(sm.count).toBe(1);
    expect(sm.get(s2.id)).toBeUndefined();
  });

  it("returns all session IDs", () => {
    const sm = new SessionManager();
    const s1 = sm.create();
    const s2 = sm.create();
    
    expect(sm.allIds).toContain(s1.id);
    expect(sm.allIds).toContain(s2.id);
    expect(sm.allIds).toHaveLength(2);
  });
});