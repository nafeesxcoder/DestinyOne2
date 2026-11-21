// React Native Web renders a Pressable as a focusable div, or a button/link
// when it has an accessibility role.
const PRESSABLE = 'div[tabindex="0"]:not([role="dialog"]), button, a[href]';
const MAX_TILT_DEG = 7;
const RIPPLE_MS = 950;

function isCard(element: HTMLElement): boolean {
  const box = element.getBoundingClientRect();
  return (
    box.width >= 130 &&
    box.height >= 80 &&
    box.height <= window.innerHeight * 0.7 &&
    !element.querySelector("input, textarea") &&
    !element.closest('[role="tablist"]')
  );
}

function findCard(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  let current = target.closest<HTMLElement>(PRESSABLE);
  while (current) {
    if (isCard(current)) return current;
    current = current.parentElement?.closest<HTMLElement>(PRESSABLE) ?? null;
  }
  return null;
}

/** Tilt and gold sheen on hover, plus a glow that spreads from the tap point. */
export function installCardMotion(isPaused: () => boolean): () => void {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return () => {};

  let tilted: HTMLElement | null = null;
  let frame = 0;
  let lastEvent: PointerEvent | null = null;

  const release = () => {
    tilted?.removeAttribute("data-d1-tilt");
    tilted = null;
  };

  const applyTilt = () => {
    frame = 0;
    const event = lastEvent;
    if (!event) return;
    const card = isPaused() ? null : findCard(event.target);
    if (card !== tilted) {
      release();
      if (card && getComputedStyle(card).transform === "none") {
        tilted = card;
        card.setAttribute("data-d1-tilt", "");
      }
    }
    if (!tilted) return;
    const box = tilted.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    const y = Math.min(1, Math.max(0, (event.clientY - box.top) / box.height));
    tilted.style.setProperty("--d1-rx", `${((0.5 - y) * MAX_TILT_DEG * 2).toFixed(2)}deg`);
    tilted.style.setProperty("--d1-ry", `${((x - 0.5) * MAX_TILT_DEG * 2).toFixed(2)}deg`);
    tilted.style.setProperty("--d1-mx", `${(x * 100).toFixed(1)}%`);
    tilted.style.setProperty("--d1-my", `${(y * 100).toFixed(1)}%`);
  };

  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    lastEvent = event;
    if (!frame) frame = requestAnimationFrame(applyTilt);
  };

  const onDown = (event: PointerEvent) => {
    if (isPaused() || !(event.target instanceof Element)) return;
    const pressable = event.target.closest<HTMLElement>(PRESSABLE);
    if (!pressable || pressable.closest('[role="tablist"]')) return;
    const box = pressable.getBoundingClientRect();
    pressable.style.setProperty("--d1-px", `${event.clientX - box.left}px`);
    pressable.style.setProperty("--d1-py", `${event.clientY - box.top}px`);
    pressable.style.setProperty("--d1-rmax", `${Math.ceil(Math.hypot(box.width, box.height))}px`);
    pressable.removeAttribute("data-d1-ripple");
    void pressable.offsetWidth; // restart the glow on a quick second tap
    pressable.setAttribute("data-d1-ripple", "");
    window.setTimeout(() => pressable.removeAttribute("data-d1-ripple"), RIPPLE_MS);
  };

  const onLeave = () => {
    lastEvent = null;
    release();
  };

  document.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerdown", onDown, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);
  return () => {
    if (frame) cancelAnimationFrame(frame);
    release();
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerdown", onDown);
    document.documentElement.removeEventListener("pointerleave", onLeave);
  };
}
