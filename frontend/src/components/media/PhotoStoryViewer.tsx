import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { stepPhotoStory, storySegmentFill } from "./photoStory";

type PhotoStoryViewerProps = {
  photos: string[];
  startIndex: number;
  visible: boolean;
  onClose: () => void;
};

/**
 * Full-screen photo viewer that works like a WhatsApp story: tap the right
 * side for the next photo, the left side for the previous one, swipe either
 * way, swipe down or press Escape to close. Shows one progress bar per photo.
 */
export function PhotoStoryViewer({ photos, startIndex, visible, onClose }: PhotoStoryViewerProps) {
  const count = photos.length;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (visible) setIndex(Math.min(Math.max(0, startIndex), Math.max(0, count - 1)));
  }, [visible, startIndex, count]);

  const go = (direction: 1 | -1) => {
    const step = stepPhotoStory(index, count, direction);
    if (step.close) onClose();
    else setIndex(step.index);
  };

  // Gesture and keyboard handlers read the latest values without re-creating listeners.
  const goRef = useRef(go);
  goRef.current = go;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // When the last swipe happened. A swipe often ends on a tap zone, which would
  // otherwise count as a second move, so taps right after a swipe are ignored.
  const lastSwipeAt = useRef(0);

  // How a swipe is judged. Shared by the native gesture and the web pointer path.
  const judgeSwipe = (dx: number, dy: number) => {
    if (dy > 90 && dy > Math.abs(dx)) {
      lastSwipeAt.current = Date.now();
      closeRef.current();
      return;
    }
    if (dx < -40) {
      lastSwipeAt.current = Date.now();
      goRef.current(1);
    } else if (dx > 40) {
      lastSwipeAt.current = Date.now();
      goRef.current(-1);
    }
  };

  const tap = (direction: 1 | -1) => {
    if (Date.now() - lastSwipeAt.current < 400) return;
    go(direction);
  };

  // Native: the gesture system.
  const nativeSwipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          Math.abs(gesture.dx) > 14 || Math.abs(gesture.dy) > 14,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 14 || Math.abs(gesture.dy) > 14,
        onPanResponderRelease: (_, gesture) => judgeSwipe(gesture.dx, gesture.dy),
      }),
    // judgeSwipe only reads refs, so this gesture is created once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Web: pointer events on the root. These work for mouse and touch alike, and
  // a drag that starts on a tap zone still counts as a swipe.
  const rootRef = useRef<View>(null);
  useEffect(() => {
    if (!visible || Platform.OS !== "web" || typeof window === "undefined") return;
    const node = rootRef.current as unknown as HTMLElement | null;
    if (!node) return;
    let startX: number | null = null;
    let startY = 0;
    const onDown = (event: PointerEvent) => {
      startX = event.clientX;
      startY = event.clientY;
    };
    const onUp = (event: PointerEvent) => {
      if (startX === null) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      startX = null;
      judgeSwipe(dx, dy);
    };
    // Capture phase, so the tap zones below cannot swallow the pointer events.
    node.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointerup", onUp, true);
    return () => {
      node.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointerup", onUp, true);
    };
    // judgeSwipe only reads refs, so this runs when the viewer opens or closes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!visible || Platform.OS !== "web" || typeof window === "undefined") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") goRef.current(1);
      else if (event.key === "ArrowLeft") goRef.current(-1);
      else if (event.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  const current = photos[index] ?? photos[0];

  return (
    <Modal
      visible={visible && count > 0}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        ref={rootRef}
        style={styles.root}
        {...(Platform.OS === "web" ? {} : nativeSwipe.panHandlers)}
        accessibilityLabel={`Photo ${index + 1} of ${count}`}
      >
        {!!current && <Image source={{ uri: current }} resizeMode="contain" style={styles.image} />}

        <View style={styles.tapLayer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous photo"
            onPress={() => tap(-1)}
            style={styles.tapLeft}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next photo"
            onPress={() => tap(1)}
            style={styles.tapRight}
          />
        </View>

        <View pointerEvents="none" style={styles.progressRow}>
          {photos.map((_, segment) => (
            <View key={segment} style={styles.segmentTrack}>
              <View
                style={[
                  styles.segmentFill,
                  { width: storySegmentFill(segment, index) ? "100%" : "0%" },
                ]}
              />
            </View>
          ))}
        </View>

        <View style={styles.header}>
          <Text style={styles.counter}>
            {index + 1} / {count}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close photos"
            onPress={onClose}
            hitSlop={12}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <Text pointerEvents="none" style={styles.hint}>
          Tap or swipe to move · swipe down to close
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  image: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  tapLayer: { ...StyleSheet.absoluteFillObject, flexDirection: "row" },
  tapLeft: { flex: 3 },
  tapRight: { flex: 7 },
  progressRow: {
    position: "absolute",
    top: Platform.OS === "web" ? 14 : 52,
    left: 12,
    right: 12,
    flexDirection: "row",
    gap: 5,
  },
  segmentTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.35)",
    overflow: "hidden",
  },
  segmentFill: { height: "100%", backgroundColor: "#F4D170" },
  header: {
    position: "absolute",
    top: Platform.OS === "web" ? 28 : 66,
    left: 16,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  counter: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  hint: {
    position: "absolute",
    bottom: Platform.OS === "web" ? 24 : 44,
    alignSelf: "center",
    color: "rgba(255,255,255,0.8)",
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
  },
});
