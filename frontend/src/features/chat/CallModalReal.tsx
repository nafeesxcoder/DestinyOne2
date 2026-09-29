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
import {
  MiniPremiumIcon,
  PremiumIcon,
} from "../../components/premium/PremiumIcon";
import { callStyles, chatStyles } from "../../theme/appStyles";
import { useCallEngine } from "./useCallEngine";

function RTCVideoView({
  stream,
  mirrored,
  muted,
}: {
  stream: MediaStream | null;
  mirrored?: boolean;
  muted?: boolean;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream as any;
    }
  }, [stream]);
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

// Plays the remote audio track. This is attached for EVERY call (audio-only
// and video), because a MediaStream must be attached to a media element to
// actually be heard. Previously this only happened for video calls, so a
// voice call would connect ("Secure audio connected") but never play sound.
function RTCAudioSink({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream as any;
    }
  }, [stream]);
  if (Platform.OS !== "web") return null;
  return React.createElement("audio", {
    ref,
    autoPlay: true,
    playsInline: true,
  });
}

function CallAction({
  icon,
  label,
  onPress,
  danger,
  active,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={callStyles.callAction}>
      <View
        style={[
          callStyles.callActionFrame,
          active && callStyles.callActionFrameOn,
          danger && callStyles.callActionFrameDanger,
        ]}
      >
        <PremiumIcon
          name={icon}
          tone={danger ? "ruby" : active ? "gold" : "dark"}
          size={58}
          iconSize={24}
        />
      </View>
      <Text style={callStyles.callActionText}>{label}</Text>
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
              : !engine.micEnabled
                ? "You are muted"
                : mode === "video" && engine.cameraEnabled
                  ? "Secure video connected"
                  : "Secure audio connected";

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

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <LinearGradient
        colors={["#3A0714", "#150309", "#080103"]}
        style={callStyles.backdrop}
      >
        <SafeAreaView style={callStyles.content}>
          {/* Always play the remote party's audio, even for a pure voice call. */}
          {mode === "audio" && <RTCAudioSink stream={engine.remoteStream} />}
          <View style={callStyles.topPill}>
            <MiniPremiumIcon
              name="shield-checkmark"
              tone="gold"
              size={28}
              iconSize={13}
            />
            <Text style={callStyles.topPillText}>
              {isCoupleMode ? "Private couple call" : "Mutual-match call"} ·{" "}
              {engine.phase === "connected"
                ? elapsed
                : isCaller
                  ? "Calling"
                  : "Incoming"}
            </Text>
          </View>
          <View style={callStyles.avatarWrap}>
            {match.photo ? (
              <Image
                source={{ uri: match.photo }}
                style={callStyles.callAvatar}
              />
            ) : (
              <View style={[callStyles.callAvatar, chatStyles.initialAvatar]}>
                <Text style={[chatStyles.initialAvatarText, { fontSize: 42 }]}>
                  {match.name[0]?.toUpperCase()}
                </Text>
              </View>
            )}
            <View
              style={[
                callStyles.callPulse,
                engine.phase === "connected" && callStyles.callPulseConnected,
              ]}
            />
          </View>
          <Text style={callStyles.callName}>{match.name}</Text>
          <Text style={callStyles.callStatus}>{stateLabel}</Text>
          {(engine.phase === "permission-error" ||
            engine.phase === "unsupported") && (
            <View style={callStyles.permissionCard}>
              <Ionicons name="lock-closed-outline" size={18} color="#F4C5CD" />
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
          {mode === "video" &&
            engine.phase !== "permission-error" &&
            engine.phase !== "unsupported" && (
              <View style={callStyles.videoPreview}>
                {mainStream ? (
                  <RTCVideoView
                    stream={mainStream}
                    mirrored={mainIsSelf}
                    muted={mainIsSelf}
                  />
                ) : match.photo ? (
                  <Image
                    source={{ uri: match.photo }}
                    style={callStyles.videoRemote}
                  />
                ) : (
                  <View
                    style={[callStyles.videoRemote, chatStyles.initialAvatar]}
                  >
                    <Text
                      style={[chatStyles.initialAvatarText, { fontSize: 52 }]}
                    >
                      {match.name[0]?.toUpperCase()}
                    </Text>
                  </View>
                )}
                <LinearGradient
                  colors={["transparent", "rgba(8,0,3,.78)"]}
                  style={StyleSheet.absoluteFill}
                />
                <Pressable
                  style={callStyles.selfPreview}
                  onPress={() => setMainView(pipIsSelf ? "self" : "remote")}
                >
                  {pipStream ? (
                    <RTCVideoView
                      stream={pipStream}
                      mirrored={pipIsSelf}
                      muted={pipIsSelf}
                    />
                  ) : (
                    <>
                      <PremiumIcon
                        name="person"
                        tone="dark"
                        size={34}
                        iconSize={16}
                      />
                      <Text style={callStyles.selfPreviewText}>
                        {pipIsSelf ? "You" : match.name}
                      </Text>
                    </>
                  )}
                </Pressable>
                <View style={callStyles.callStatePill}>
                  <MiniPremiumIcon
                    name={
                      engine.phase === "connected" ? "videocam" : "lock-closed"
                    }
                    tone="gold"
                    size={24}
                    iconSize={11}
                  />
                  <Text style={callStyles.callStateText}>
                    {engine.phase === "connected" ? "Camera on" : "Connecting"}
                  </Text>
                </View>
              </View>
            )}
          <View style={callStyles.callActions}>
            <CallAction
              active={!engine.micEnabled}
              icon={engine.micEnabled ? "mic-outline" : "mic-off"}
              label={engine.micEnabled ? "Mute" : "Muted"}
              onPress={engine.toggleMic}
            />
            {mode === "video" && (
              <CallAction
                active={engine.cameraEnabled}
                icon={engine.cameraEnabled ? "videocam" : "videocam-off"}
                label={engine.cameraEnabled ? "Camera on" : "Camera off"}
                onPress={engine.toggleCamera}
              />
            )}
            <CallAction
              danger
              icon="call"
              label="End"
              onPress={() => engine.hangUp("hangup")}
            />
          </View>
          <View style={callStyles.secureNote}>
            <Ionicons name="lock-closed" size={13} color="#D6B35B" />
            <Text style={callStyles.callFine}>End-to-end encrypted call</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}
