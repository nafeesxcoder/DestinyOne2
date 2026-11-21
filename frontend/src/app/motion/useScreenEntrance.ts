import { useEffect, useLayoutEffect, useRef } from "react";
import { Platform } from "react-native";

import { installCardMotion } from "./cardMotion";
import { shouldPlayEntrance, staggerDelay } from "./screenMotion";

const MAX_BLOCKS = 40;
const MAX_SCAN = 500;
const EASE_SILK = "cubic-bezier(.22,.8,.2,1)";
const ENTER_MS = 950;
const REVEAL_MS = 850;

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

function contentBlocks(root: HTMLElement) {
  const scroller = findScroller(root);
  let parent = scroller?.firstElementChild ?? root.firstElementChild;
  if (!parent) return { scroller, blocks: [] as HTMLElement[] };
  // Screens are often wrapped in single-child views: go down to the real blocks.
  for (let depth = 0; depth < 12 && parent.children.length === 1; depth += 1) {
    parent = parent.children[0]!;
  }
  const blocks = (Array.from(parent.children) as HTMLElement[])
    .filter((element) => {
      if (element.querySelector('[role="tablist"]')) return false;
      return element.getBoundingClientRect().height > 0;
    })
    .slice(0, MAX_BLOCKS);
  return { scroller, blocks };
}

function riseKeyframes(): Keyframe[] {
  // Blur is heavy on phones, so only devices with a mouse get it.
  const soft = window.matchMedia?.("(hover: hover)").matches;
  return [
    {
      opacity: 0,
      transform: "translateY(36px) scale(.965)",
      ...(soft ? { filter: "blur(6px)" } : {}),
    },
    {
      opacity: 1,
      transform: "translateY(0) scale(1)",
      ...(soft ? { filter: "blur(0)" } : {}),
    },
  ];
}

/**
 * Web: blocks on a new screen drift in one after another, and blocks further
 * down reveal as they scroll into view. Uses the Web Animations API, so nothing
 * re-renders and no style stays on the element.
 */
export function useScreenEntrance(screen: string, wideChatLayout: boolean) {
  const previous = useRef<string | null>(null);
  const currentScreen = useRef(screen);
  const running = useRef<Animation[]>([]);
  const observer = useRef<IntersectionObserver | null>(null);
  currentScreen.current = screen;

  useEffect(() => {
    if (Platform.OS !== "web") return;
    return installCardMotion(
      () => currentScreen.current === "chat" || currentScreen.current === "chats",
    );
  }, []);

  useLayoutEffect(() => {
    const from = previous.current;
    previous.current = screen;
    if (Platform.OS !== "web") return;
    observer.current?.disconnect();
    observer.current = null;
    if (!shouldPlayEntrance(from, screen, wideChatLayout)) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.getElementById("root");
    if (!root || typeof root.animate !== "function") return;

    running.current.forEach((animation) => animation.cancel());
    const keyframes = riseKeyframes();
    const { scroller, blocks } = contentBlocks(root);
    const fold = window.innerHeight;
    const above = blocks.filter((block) => block.getBoundingClientRect().top < fold);
    const below = blocks.filter((block) => block.getBoundingClientRect().top >= fold);

    running.current = above.map((element, index) =>
      element.animate(keyframes, {
        duration: ENTER_MS,
        delay: staggerDelay(index),
        easing: EASE_SILK,
        fill: "backwards",
      }),
    );

    if (below.length && typeof IntersectionObserver === "function") {
      const watcher = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            watcher.unobserve(entry.target);
            running.current.push(
              entry.target.animate(keyframes, { duration: REVEAL_MS, easing: EASE_SILK }),
            );
          });
        },
        { root: scroller, threshold: 0.06 },
      );
      below.forEach((block) => watcher.observe(block));
      observer.current = watcher;
    }
  }, [screen, wideChatLayout]);

  useEffect(() => () => observer.current?.disconnect(), []);
}
