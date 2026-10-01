import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Match } from "../../data";
import { chatStyles, callStyles } from "../../theme/appStyles";
import { useCallEngine } from "./useCallEngine";

// How long the full-screen video controls stay visible after the last tap,
// before auto-hiding — matches WhatsApp's tap-to-reveal call screen.
const CONTROLS_AUTO_HIDE_MS = 4000;

function RTCVideoView({
  stream,
  mirrored,
  muted,
  volume,
}: {
  stream: MediaStream | null;
  mirrored?: boolean;
  muted?: boolean;
  volume?: number;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream as any;
    }
  }, [stream]);
  useEffect(() => {
    if (ref.current && typeof volume === "number") {
      ref.current.volume = volume;
    }
  }, [volume]);
  if (Platform.OS !== "web") return null;
  return React.createElement("video", {
    ref,
    autoPlay: true,
    playsInline: true,
    muted: !!muted,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      transform: mirrored ? "scaleX(-1)" : undefined,
    },
  });
}

// Plays the remote audio track. This is attached for EVERY audio-only call
// (a MediaStream must be attached to a media element to actually be heard).
// A video call's audio plays through the full-screen <video> element itself.
function RTCAudioSink({
  stream,
  volume,
}: {
  stream: MediaStream | null;
  volume?: number;
}) {
  const ref = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream as any;
    }
  }, [stream]);
  useEffect(() => {
    if (ref.current && typeof volume === "number") {
      ref.current.volume = volume;
    }
  }, [volume]);
  if (Platform.OS !== "web") return null;
  return React.createElement("audio", {
    ref,
    autoPlay: true,
    playsInline: true,
  });
}

function CircleButton({
  icon,
  onPress,
  danger,
  active,
  big,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  danger?: boolean;
  active?: boolean;
  big?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        callStyles.circleBtn,
        active && callStyles.circleBtnOn,
        danger && callStyles.circleBtnDanger,
        big && callStyles.circleBtnBig,
      ]}
    >
      <Ionicons
        name={icon}
        size={danger ? 28 : 24}
        color={danger ? "#FFFDFC" : active ? "#F6DFA3" : "#FFFDFC"}
      />
    </Pressable>
  );
}

export function CallModal({
  mode,
  match,
  isCoupleMode,
  accessToken,
  callId,
  isCaller,
  onClose,
}: {
  mode: "audio" | "video" | null;
  match: Match;
  isCoupleMode: boolean;
  accessToken: string;
  callId: string | null;
  isCaller: boolean;
  onClose: () => void;
}) {
  const [seconds, setSeconds] = useState(0);
  // WhatsApp-style swap: tapping the small PIP box makes it the main
  // full-screen view and moves the other feed into the PIP box.
  const [mainView, setMainView] = useState<"remote" | "self">("remote");
  // WhatsApp-style tap-to-reveal: the top/bottom bars auto-hide a few
  // seconds into a connected video call and reappear on tap, so the video
  // itself fills the whole screen instead of sitting in a boxed preview.
  const [controlsVisible, setControlsVisible] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const engine = useCallEngine({
    accessToken,
    callId,
    mode: mode ?? "audio",
    isCaller,
    onEnded: () => onClose(),
  });

  useEffect(() => {
    if (engine.phase !== "connected") return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [engine.phase]);

  const isFullScreenVideo =
    mode === "video" &&
    engine.phase !== "permission-error" &&
    engine.phase !== "unsupported";

  const scheduleAutoHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (mode === "video" && engine.phase === "connected") {
      hideTimer.current = setTimeout(
        () => setControlsVisible(false),
        CONTROLS_AUTO_HIDE_MS,
      );
    }
  };

  useEffect(() => {
    // Always show controls while connecting/ringing; only start the
    // auto-hide clock once a video call is actually connected.
    if (mode === "video" && engine.phase === "connected") {
      scheduleAutoHide();
    } else {
      setControlsVisible(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    }
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.phase, mode]);

  const handleTapVideo = () => {
    setControlsVisible((visible) => {
      const next = !visible;
      if (next) scheduleAutoHide();
      else if (hideTimer.current) clearTimeout(hideTimer.current);
      return next;
    });
  };

  if (!mode) return null;

  const elapsed = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const stateLabel =
    engine.phase === "permission-error" || engine.phase === "unsupported"
      ? "Connection needs attention"
      : engine.phase === "connecting"
        ? isCaller
          ? "Creating secure connection…"
          : "Answering securely…"
        : engine.phase === "ringing"
          ? `Ringing ${match.name}…`
          : engine.phase === "declined"
            ? "Call declined"
            : engine.phase === "ended"
              ? "Call ended"
              : engine.phase === "connected"
                ? elapsed
                : "";

  const hasRemoteVideo =
    mode === "video" && !!engine.remoteStream && engine.phase === "connected";
  const hasSelfVideo =
    mode === "video" && !!engine.localStream && engine.cameraEnabled;

  const mainIsSelf = mainView === "self" && hasSelfVideo;
  const mainStream = mainIsSelf
    ? engine.localStream
    : hasRemoteVideo
      ? engine.remoteStream
      : null;
  const pipIsSelf = !mainIsSelf;
  const pipStream = mainIsSelf
    ? hasRemoteVideo
      ? engine.remoteStream
      : null
    : hasSelfVideo
      ? engine.localStream
      : null;

  const remoteVolume = speakerOn ? 1 : 0.35;
  const showControls = controlsVisible || !isFullScreenVideo;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={callStyles.fullScreenRoot}>
        {/* Always play the remote party's audio for a pure voice call; a
            video call's audio plays through the full-screen <video> below. */}
        {mode === "audio" && (
          <RTCAudioSink stream={engine.remoteStream} volume={remoteVolume} />
        )}

        {/* Full-bleed background: the remote (or self) video feed for a
            video call, or a plain gradient behind the centered avatar for
            an audio call. */}
        {isFullScreenVideo ? (
          <View style={StyleSheet.absoluteFill}>
            {mainStream ? (
              <RTCVideoView
                stream={mainStream}
                mirrored={mainIsSelf}
                muted={mainIsSelf}
                volume={mainIsSelf ? undefined : remoteVolume}
              />
            ) : match.photo ? (
              <Image
                source={{ uri: match.photo }}
                style={callStyles.fullScreenMedia}
              />
            ) : (
              <View
                style={[callStyles.fullScreenMedia, chatStyles.initialAvatar]}
              >
                <Text style={[chatStyles.initialAvatarText, { fontSize: 72 }]}>
                  {match.name[0]?.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <LinearGradient
            colors={["#3A0714", "#150309", "#080103"]}
            style={StyleSheet.absoluteFill}
          />
        )}

        {/* Gradient so the top/bottom bar text and icons stay legible over
            busy video, without fully darkening the middle of the frame. */}
        <LinearGradient
          colors={[
            "rgba(8,0,3,.6)",
            "transparent",
            "transparent",
            "rgba(8,0,3,.7)",
          ]}
          locations={[0, 0.22, 0.6, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Tap anywhere on the video to toggle the bars — only relevant for
            a connected video call; this sits beneath the bars/PIP so taps on
            those controls are unaffected (siblings, not nested Pressables). */}
        {isFullScreenVideo && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              controlsVisible ? "Hide call controls" : "Show call controls"
            }
            style={StyleSheet.absoluteFill}
            onPress={handleTapVideo}
          />
        )}

        <SafeAreaView style={callStyles.fullScreenSafe} pointerEvents="box-none">
          {showControls && (
            <View style={callStyles.topBarFull}>
              <Text style={callStyles.topBarNameFull}>{match.name}</Text>
              <Text style={callStyles.topBarStatusFull}>
                {isCoupleMode ? "Private couple call" : "Mutual-match call"}
                {stateLabel ? ` · ${stateLabel}` : ""}
              </Text>
            </View>
          )}

          {!isFullScreenVideo && (
            <View style={callStyles.audioCenter} pointerEvents="box-none">
              <View style={callStyles.avatarWrap}>
                {match.photo ? (
                  <Image
                    source={{ uri: match.photo }}
                    style={callStyles.callAvatar}
                  />
                ) : (
                  <View
                    style={[callStyles.callAvatar, chatStyles.initialAvatar]}
                  >
                    <Text
                      style={[chatStyles.initialAvatarText, { fontSize: 42 }]}
                    >
                      {match.name[0]?.toUpperCase()}
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    callStyles.callPulse,
                    engine.phase === "connected" &&
                      callStyles.callPulseConnected,
                  ]}
                />
              </View>
              {(engine.phase === "permission-error" ||
                engine.phase === "unsupported") && (
                <View style={callStyles.permissionCard}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color="#F4C5CD"
                  />
                  <Text style={callStyles.permissionText}>
                    {engine.error || "Calling is unavailable right now."}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    onPress={onClose}
                    style={callStyles.retryPermission}
                  >
                    <Text style={callStyles.retryPermissionText}>Close</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          <View style={{ flex: 1 }} pointerEvents="none" />

          {isFullScreenVideo && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Swap main and preview video"
              style={[
                callStyles.pipBoxFull,
                { top: showControls ? 104 : 54 },
              ]}
              onPress={() => setMainView(pipIsSelf ? "self" : "remote")}
            >
              {pipStream ? (
                <RTCVideoView
                  stream={pipStream}
                  mirrored={pipIsSelf}
                  muted={pipIsSelf}
                  volume={pipIsSelf ? undefined : remoteVolume}
                />
              ) : (
                <Ionicons name="person" size={28} color="#FFFDFC" />
              )}
            </Pressable>
          )}

          {showControls && (
            <View style={callStyles.bottomBarFull}>
              {mode === "video" && (
                <CircleButton
                  icon={engine.cameraEnabled ? "videocam" : "videocam-off"}
                  active={!engine.cameraEnabled}
                  onPress={engine.toggleCamera}
                />
              )}
              <CircleButton
                icon={speakerOn ? "volume-high" : "volume-mute"}
                active={speakerOn}
                onPress={() => setSpeakerOn((value) => !value)}
              />
              <CircleButton
                icon={engine.micEnabled ? "mic" : "mic-off"}
                active={!engine.micEnabled}
                onPress={engine.toggleMic}
              />
              <CircleButton
                big
                danger
                icon="call"
                onPress={() => engine.hangUp("hangup")}
              />
            </View>
          )}

          {showControls && (
            <View style={callStyles.secureNoteFull} pointerEvents="none">
              <Ionicons name="lock-closed" size={12} color="#D6B35B" />
              <Text style={callStyles.callFine}>End-to-end encrypted call</Text>
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}
