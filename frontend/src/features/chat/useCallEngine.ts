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

    const run = async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: mode === "video",
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
