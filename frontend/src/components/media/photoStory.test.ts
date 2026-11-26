import { describe, expect, it } from "vitest";
import { stepPhotoStory, storySegmentFill } from "./photoStory";

describe("stepPhotoStory", () => {
  it("moves forward and backward through the photos", () => {
    expect(stepPhotoStory(0, 3, 1)).toEqual({ index: 1, close: false });
    expect(stepPhotoStory(1, 3, 1)).toEqual({ index: 2, close: false });
    expect(stepPhotoStory(2, 3, -1)).toEqual({ index: 1, close: false });
  });

  it("stays on the first photo when going back", () => {
    expect(stepPhotoStory(0, 3, -1)).toEqual({ index: 0, close: false });
  });

  it("closes the viewer when going forward from the last photo", () => {
    expect(stepPhotoStory(2, 3, 1)).toEqual({ index: 2, close: true });
  });

  it("closes straight away when there are no photos", () => {
    expect(stepPhotoStory(0, 0, 1)).toEqual({ index: 0, close: true });
  });
});

describe("storySegmentFill", () => {
  it("fills the current and earlier bars, not the later ones", () => {
    expect([0, 1, 2].map((segment) => storySegmentFill(segment, 1))).toEqual([1, 1, 0]);
    expect([0, 1, 2].map((segment) => storySegmentFill(segment, 0))).toEqual([1, 0, 0]);
  });
});
