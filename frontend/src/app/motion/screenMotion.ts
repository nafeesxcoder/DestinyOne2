/** Rules for when a screen change should play its entrance. */
export function shouldPlayEntrance(
  previous: string | null,
  next: string,
  wideChatLayout: boolean,
): boolean {
  if (previous === next) return false;
  // An open conversation must appear at once, with messages in place.
  if (next === "chat") return false;
  // Side-by-side chat keeps the list on screen, so nothing is "entering".
  if (wideChatLayout && previous === "chat" && next === "chats") return false;
  return true;
}

/** Delay for the nth visible block, capped so long pages never feel slow. */
export function staggerDelay(index: number, stepMs = 120, maxMs = 600): number {
  return Math.min(Math.max(0, index) * stepMs, maxMs);
}
