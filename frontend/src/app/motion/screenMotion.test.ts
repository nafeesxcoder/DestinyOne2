import { describe, expect, it } from "vitest";
import { shouldPlayEntrance, staggerDelay } from "./screenMotion";

describe("screen entrance rules", () => {
  it("plays when moving between screens", () => {
    expect(shouldPlayEntrance("home", "gifts", false)).toBe(true);
    expect(shouldPlayEntrance(null, "welcome", false)).toBe(true);
  });
  it("does not replay on the same screen", () => {
    expect(shouldPlayEntrance("home", "home", false)).toBe(false);
  });
  it("never animates an open conversation", () => {
    expect(shouldPlayEntrance("chats", "chat", false)).toBe(false);
    expect(shouldPlayEntrance("chats", "chat", true)).toBe(false);
  });
  it("keeps the desktop chat list still when closing a chat", () => {
    expect(shouldPlayEntrance("chat", "chats", true)).toBe(false);
    expect(shouldPlayEntrance("chat", "chats", false)).toBe(true);
  });
  it("caps the stagger", () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(2)).toBe(90);
    expect(staggerDelay(50)).toBe(225);
  });
});
