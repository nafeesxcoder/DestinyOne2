/** Where the story viewer goes after a tap or swipe. */
export type StoryStep = { index: number; close: boolean };

/**
 * Moves through the photos like a story. Going back from the first photo stays put.
 * Going forward from the last photo closes the viewer, as stories do.
 */
export function stepPhotoStory(index: number, count: number, direction: 1 | -1): StoryStep {
  if (count <= 0) return { index: 0, close: true };
  if (direction === -1) return { index: Math.max(0, index - 1), close: false };
  if (index >= count - 1) return { index: count - 1, close: true };
  return { index: index + 1, close: false };
}

/** Progress bar fill for one segment: full up to and including the current photo. */
export function storySegmentFill(segment: number, current: number): number {
  return segment <= current ? 1 : 0;
}
