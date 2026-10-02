import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { callApi } from "../../api/callApi";

export type CallPhase =
  | "connecting"
  | "ringing"
  | "connected"
  | "ended"
  | "declined"
  | "permission-error"
  | "unsupported";

export type UseCallEngineArgs = {
  accessToken: string;
  callId: string | null;
  mode: "audio" | "video";
  isCaller: boolean;
  onEnded: (reason: string) => void;
};

export type CallEngine = {
  phase: CallPhase;
  error: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  micEnabled: boolean;
  cameraEnabled: boolean;
  toggleMic: () => void;
  toggleCamera: () => void;
  hangUp: (reason?: string) => void;
};

export function useCallEngine({
  accessToken,
  callId,
  mode,
  isCaller,
  onEnded,
}: UseCallEngineArgs): CallEngine {
  const [phase, setPhase] = useState<CallPhase>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(mode === "video");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const sinceMsRef = useRef(0);
  const remoteDescriptionSetRef = useRef(false);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const endedRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const finish = useCallback(
    (reason: string) => {
      if (endedRef.current) return;
      endedRef.current = true;
      setPhase(reason === "declined" ? "declined" : "ended");
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (statusTimerRef.current) clearInterval(statusTimerRef.current);
      pcRef.current?.close();
      pcRef.current = null;
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      onEnded(reason);
    },
    [onEnded],
  );

  const hangUp = useCallback(
    (reason: string = "hangup") => {
      if (endedRef.current) return;
      if (callId) {
        void callApi.sendSignal(accessToken, callId, "hangup", {});
        void callApi.end(accessToken, callId, reason);
      }
      finish(reason);
    },
    [accessToken, callId, finish],
  );

  const toggleMic = useCallback(() => {
    setMicEnabled((current) => {
      const next = !current;
      localStreamRef.current
        ?.getAudioTracks()
        .forEach((track) => (track.enabled = next));
      return next;
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraEnabled((current) => {
      const next = !current;
      localStreamRef.current
        ?.getVideoTracks()
        .forEach((track) => (track.enabled = next));
      return next;
    });
  }, []);

  useEffect(() => {
    if (!callId) return;
    if (
      Platform.OS !== "web" ||
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof RTCPeerConnection === "undefined"
    ) {
      setPhase("unsupported");
      setError("Calling is only available in a supported web browser.");
      return;
    }
    let active = true;

    // This hook's refs live on the CallModal component instance, which
    // stays mounted for the whole chat screen — it isn't remounted between
    // one call and the next. endedRef in particular used to stay `true`
    // forever after the FIRST call ended, so on every call after that,
    // hangUp()/finish() would see it already "ended" and silently return
    // without closing the peer connection, stopping the mic track, or
    // calling onEnded. That's what made a second call need a full page
    // refresh before audio worked again. remoteDescriptionSetRef and
    // pendingCandidatesRef are likewise per-call signaling state that must
    // start clean for each new callId, not carry over from the last call.
    endedRef.current = false;
    remoteDescriptionSetRef.current = false;
    pendingCandidatesRef.current = [];
    sinceMsRef.current = 0;

    const run = async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          // Explicit constraints instead of a bare `true`: on several mobile
          // browsers (notably iOS Safari / in-app webviews), requesting
          // audio+video together without explicit audio processing
          // constraints can silently disable echo cancellation, which is
          // what caused the very loud mic feedback/noise heard during
          // video calls even when nobody was speaking.
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            // autoGainControl automatically boosts the mic's gain when the
            // input is quiet — which is exactly what was making distant
            // background sound (a fan, people talking across the room,
            // traffic outside) come through loudly: the AGC was turning it
            // up to compensate for the speaker not being right next to the
            // mic. Turning it off keeps the mic at a fixed sensitivity, so
            // only sound close to the phone comes through at a normal
            // volume and everything farther away stays quiet.
            autoGainControl: false,
            channelCount: 1,
            // Legacy Chrome-prefixed equivalents. Several Android WebViews
            // and older Chrome builds only actually enable acoustic echo
            // cancellation when these are present alongside the standard
            // constraints above — without them, the other side can hear
            // their own voice looped back (the "hello hello" echo), mainly
            // when the call is on speakerphone instead of an earpiece/
            // headset.
            ...({
              googEchoCancellation: true,
              googAutoGainControl: false,
              googNoiseSuppression: true,
              googHighpassFilter: true,
            } as MediaTrackConstraints),
          },
          video:
            mode === "video"
              ? {
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  frameRate: { ideal: 30, max: 30 },
                  facingMode: "user",
                }
              : false,
        });
      } catch {
        if (!active) return;
        setPhase("permission-error");
        setError(
          "Camera/microphone access was blocked. Allow access in your browser settings and try again.",
        );
        return;
      }
      if (!active) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      localStreamRef.current = stream;
      setLocalStream(stream);

      const { iceServers } = await callApi.getIceServers(accessToken);
      if (!active) return;
      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (!active) return;
        setRemoteStream(event.streams[0] ?? null);
        setPhase("connected");
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && callId) {
          void callApi.sendSignal(
            accessToken,
            callId,
            "ice-candidate",
            event.candidate.toJSON(),
          );
        }
      };

      pc.onconnectionstatechange = () => {
        if (!active) return;
        if (pc.connectionState === "connected") setPhase("connected");
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          finish("connection-lost");
        }
      };

      const flushPendingCandidates = async () => {
        const queued = pendingCandidatesRef.current;
        pendingCandidatesRef.current = [];
        for (const candidate of queued) {
          try {
            await pc.addIceCandidate(candidate);
          } catch {
            // ignore malformed/late candidates
          }
        }
      };

      if (isCaller) {
        setPhase("ringing");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (callId) await callApi.sendSignal(accessToken, callId, "offer", offer);
      }

      const poll = async () => {
        if (!active || !callId) return;
        try {
          const signals = await callApi.pollSignals(
            accessToken,
            callId,
            sinceMsRef.current,
          );
          for (const signal of signals) {
            sinceMsRef.current = Math.max(sinceMsRef.current, signal.createdAtMs);
            if (signal.type === "offer" && !isCaller) {
              await pc.setRemoteDescription(
                new RTCSessionDescription(signal.payload),
              );
              remoteDescriptionSetRef.current = true;
              await flushPendingCandidates();
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await callApi.sendSignal(accessToken, callId, "answer", answer);
            } else if (signal.type === "answer" && isCaller) {
              await pc.setRemoteDescription(
                new RTCSessionDescription(signal.payload),
              );
              remoteDescriptionSetRef.current = true;
              await flushPendingCandidates();
            } else if (signal.type === "ice-candidate") {
              if (remoteDescriptionSetRef.current) {
                try {
                  await pc.addIceCandidate(signal.payload);
                } catch {
                  // ignore
                }
              } else {
                pendingCandidatesRef.current.push(signal.payload);
              }
            } else if (signal.type === "hangup") {
              finish("remote-hangup");
            }
          }
        } catch {
          // transient network hiccup; next poll will retry
        }
      };
      pollTimerRef.current = setInterval(() => void poll(), 1200);
      void poll();

      if (!isCaller) {
        statusTimerRef.current = setInterval(async () => {
          if (!active || !callId) return;
          try {
            const { status } = await callApi.getStatus(accessToken, callId);
            if (status === "ended") finish("remote-hangup");
            if (status === "declined") finish("declined");
          } catch {
            // ignore
          }
        }, 2500);
      } else {
        statusTimerRef.current = setInterval(async () => {
          if (!active || !callId) return;
          try {
            const { status } = await callApi.getStatus(accessToken, callId);
            if (status === "declined") finish("declined");
            if (status === "ended") finish("remote-hangup");
          } catch {
            // ignore
          }
        }, 1500);
      }
    };

    void run();

    return () => {
      active = false;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (statusTimerRef.current) clearInterval(statusTimerRef.current);
      pcRef.current?.close();
      pcRef.current = null;
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId]);

  return {
    phase,
    error,
    localStream,
    remoteStream,
    micEnabled,
    cameraEnabled,
    toggleMic,
    toggleCamera,
    hangUp,
  };
}
