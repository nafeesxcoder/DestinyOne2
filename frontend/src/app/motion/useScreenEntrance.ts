import { useLayoutEffect, useRef } from "react";
import { Platform } from "react-native";

import { shouldPlayEntrance, staggerDelay } from "./screenMotion";

const MAX_BLOCKS = 6;
const MAX_SCAN = 500;
const EASE_OUT = "cubic-bezier(.22,1,.36,1)";

function findScroller(root: HTMLElement): HTMLElement | null {
  const queue: Element[] = [root];
  for (let i = 0; i < queue.length && i < MAX_SCAN; i += 1) {
    const element = queue[i]!;
    if (element.getAttribute("role") === "tablist") continue;
    if (element !== root) {
      const { overflowY } = getComputedStyle(element);
      if (overflowY === "auto" || overflowY === "scroll") return element as HTMLElement;
    }
    queue.push(...Array.from(element.children));
  }
  return null;
}

function visibleBlocks(root: HTMLElement): HTMLElement[] {
  const scroller = findScroller(root);
  let parent = scroller?.firstElementChild ?? root.firstElementChild;
  if (!parent) return [];
  // Screens are often wrapped in single-child views: go down to the real blocks.
  for (let depth = 0; depth < 12 && parent.children.length === 1; depth += 1) {
    parent = parent.children[0]!;
  }
  const bottom = window.innerHeight;
  return (Array.from(parent.children) as HTMLElement[])
    .filter((element) => {
      if (element.querySelector('[role="tablist"]')) return false;
      const box = element.getBoundingClientRect();
      return box.height > 0 && box.top < bottom;
    })
    .slice(0, MAX_BLOCKS);
}

/**
 * Web: content blocks of each new screen rise in one after another. Uses the
 * Web Animations API, so nothing re-renders and no style stays on the element.
 */
export function useScreenEntrance(screen: string, wideChatLayout: boolean) {
  const previous = useRef<string | null>(null);
  const running = useRef<Animation[]>([]);

  useLayoutEffect(() => {
    const from = previous.current;
    previous.current = screen;
    if (Platform.OS !== "web" || !shouldPlayEntrance(from, screen, wideChatLayout)) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.getElementById("root");
    if (!root || typeof root.animate !== "function") return;

    running.current.forEach((animation) => animation.cancel());
    running.current = visibleBlocks(root).map((element, index) =>
      element.animate(
        [
          { opacity: 0, transform: "translateY(14px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 380, delay: staggerDelay(index), easing: EASE_OUT, fill: "backwards" },
      ),
    );
  }, [screen, wideChatLayout]);
}
