import { Platform } from "react-native";

/**
 * Props for a wrapper around a profile photo. On the web they mark the photo so
 * a long press does not open the browser's "Save image" menu (the Google Photos
 * download sheet on Android) and dragging the photo out is blocked.
 */
export const noSaveDataProps: Record<string, unknown> =
  Platform.OS === "web" ? { dataSet: { noSave: "1" } } : {};

/** Style that stops the iOS long-press callout on the same wrapper. */
export const noSaveStyle = (Platform.OS === "web"
  ? { WebkitTouchCallout: "none", userSelect: "none" }
  : {}) as Record<string, string>;

let installed = false;

/** Installs the page-wide guard once. Only affects elements marked with noSaveDataProps. */
export function installNoSaveGuard() {
  if (Platform.OS !== "web" || installed || typeof window === "undefined") return;
  installed = true;
  const block = (event: Event) => {
    const target = event.target;
    if (target instanceof Element && target.closest("[data-no-save]")) {
      event.preventDefault();
    }
  };
  window.addEventListener("contextmenu", block, true);
  window.addEventListener("dragstart", block, true);
}
