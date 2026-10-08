"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { api, Peer } from "@/lib/api";
type Admission = {
  participant_id: string;
  token: string;
  role: "host" | "guest";
  ice_servers: RTCIceServer[];
};
type PeerConnection = {
  pc: RTCPeerConnection;
  makingOffer: boolean;
  ignoreOffer: boolean;
  settingAnswer: boolean;
  pending: RTCIceCandidateInit[];
  queue: Promise<void>;
};
export type ChatEntry = {
  id: string;
  sender_id: string;
  display_name: string;
  text: string;
  sent_at: string;
};
type Message = {
  chat?: ChatEntry[];
  entry?: ChatEntry;
  emoji?: string;
  type: string;
  from?: string;
  data?: RTCSessionDescriptionInit | RTCIceCandidateInit;
  participant?: Peer;
  peers?: Peer[];
  id?: string;
  message?: string;
};
export function useCall({
  code,
  name,
  hostToken,
  joined,
  stream,
  audio,
  video,
  screen,
  onMute,
}: {
  code: string;
  name: string;
  hostToken: string | null;
  joined: boolean;
  stream: MediaStream | null;
  audio: boolean;
  video: boolean;
  screen: MediaStream | null;
  onMute: () => void;
}) {
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [handRaised, setHandRaised] = useState(false);
  const [reactions, setReactions] = useState<
    Record<string, { emoji: string; expires: number }>
  >({});
  useEffect(() => {
    const timer = setInterval(
      () =>
        setReactions((prev) =>
          Object.fromEntries(
            Object.entries(prev).filter(
              ([, value]) => value.expires > Date.now(),
            ),
          ),
        ),
      1000,
    );
    return () => clearInterval(timer);
  }, []);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<
    Record<string, MediaStream>
  >({});
  const [self, setSelf] = useState<Admission | null>(null);
  const [status, setStatus] = useState("Connecting");
  const [notice, setNotice] = useState("");
  const [finished, setFinished] = useState("");
  const [meetingEnded, setMeetingEnded] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const pcs = useRef(new Map<string, PeerConnection>());
  const local = useRef({ stream, audio, video, screen });
  const muteRef = useRef(onMute);
  const admission = useRef<Admission | null>(null);
  const ended = useRef(false);
  local.current = { stream, audio, video, screen };
  muteRef.current = onMute;
  const send = useCallback((message: object) => {
    if (socketRef.current?.readyState === WebSocket.OPEN)
      socketRef.current.send(JSON.stringify(message));
  }, []);
  function closePeer(id: string) {
    pcs.current.get(id)?.pc.close();
    pcs.current.delete(id);
    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setPeers((prev) => prev.filter((p) => p.id !== id));
  }
  useEffect(() => {
    if (!joined) return;
    let disposed = false;
    let ws: WebSocket | null = null;
    ended.current = false;
    function tracksForSend() {
      const media = local.current;
      return {
        audio: media.stream?.getAudioTracks()[0] || null,
        video:
          media.screen?.getVideoTracks()[0] ||
          media.stream?.getVideoTracks()[0] ||
          null,
      };
    }
    function createPeer(id: string) {
      const existing = pcs.current.get(id);
      if (existing) return existing;
      const pc = new RTCPeerConnection({
        iceServers: admission.current?.ice_servers || [],
      });
      const state: PeerConnection = {
        pc,
        makingOffer: false,
        ignoreOffer: false,
        settingAnswer: false,
        pending: [],
        queue: Promise.resolve(),
      };
      pcs.current.set(id, state);
      const tracks = tracksForSend();
      // Fixed audio/video transceivers allow permission grants and track replacement later.
      for (const kind of ["audio", "video"] as const) {
        const track = tracks[kind];
        pc.addTransceiver(track || kind, {
          direction: "sendrecv",
          streams: track ? [new MediaStream([track])] : [],
        });
      }
      pc.onicecandidate = (e) => {
        if (e.candidate)
          send({ type: "ice", target: id, data: e.candidate.toJSON() });
      };
      pc.ontrack = (e) => {
        setRemoteStreams((prev) => {
          const media = prev[id] || new MediaStream();
          if (!media.getTracks().some((t) => t.id === e.track.id))
            media.addTrack(e.track);
          return { ...prev, [id]: media };
        });
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          setNotice(
            "A participant connection failed. Leave and rejoin; check TURN configuration if you are on different networks.",
          );
        }
      };
      // Perfect negotiation: deterministic polite peer resolves simultaneous offers.
      pc.onnegotiationneeded = async () => {
        try {
          state.makingOffer = true;
          await pc.setLocalDescription();
          if (!disposed)
            send({
              type: pc.localDescription!.type,
              target: id,
              data: pc.localDescription,
            });
        } catch (e) {
          if (!disposed) setNotice((e as Error).message);
        } finally {
          state.makingOffer = false;
        }
      };
      return state;
    }
    async function handle(message: Message) {
      if (disposed) return;
      switch (message.type) {
        case "welcome":
          setChat(message.chat || []);
          setPeers(message.peers || []);
          setStatus("Connected");
          for (const p of message.peers || []) createPeer(p.id);
          break;
        // Existing peers wait for the new peer's offer instead of immediately negotiating.
        case "participant_joined":
          if (message.participant)
            setPeers((prev) => [
              ...prev.filter((p) => p.id !== message.participant!.id),
              message.participant!,
            ]);
          break;
        case "chat":
          if (message.entry)
            setChat((prev) => [...prev, message.entry!].slice(-100));
          break;
        case "reaction":
          if (message.id && message.emoji)
            setReactions((prev) => ({
              ...prev,
              [message.id!]: {
                emoji: message.emoji!,
                expires: Date.now() + 5000,
              },
            }));
          break;
        case "participant_updated":
          if (message.participant?.id === admission.current?.participant_id)
            setHandRaised(!!message.participant?.hand_raised);
          if (message.participant)
            setPeers((prev) =>
              prev.map((p) =>
                p.id === message.participant!.id ? message.participant! : p,
              ),
            );
          break;
        case "participant_left":
          if (message.id) closePeer(message.id);
          break;
        case "mute":
          muteRef.current();
          setNotice(
            "The host muted your microphone. You can unmute when you are ready.",
          );
          break;
        case "removed":
          ended.current = true;
          setFinished("You were removed from this meeting by the host.");
          break;
        case "ended":
          setMeetingEnded(true);
          ended.current = true;
          setFinished("The host ended this meeting.");
          break;
        case "error":
          setNotice(message.message || "Meeting action failed.");
          break;
        case "offer":
        case "answer":
        case "ice": {
          if (!message.from) return;
          const id = message.from;
          const state = createPeer(id);
          // Serialize ICE/SDP for each peer; receive events can otherwise overlap awaits.
          state.queue = state.queue
            .then(async () => {
              if (disposed || state.pc.signalingState === "closed") return;
              const pc = state.pc;
              if (message.type === "ice") {
                if (state.ignoreOffer) return;
                const candidate = message.data as RTCIceCandidateInit;
                if (pc.remoteDescription) await pc.addIceCandidate(candidate);
                else state.pending.push(candidate);
                return;
              }
              const description = message.data as RTCSessionDescriptionInit;
              const polite =
                admission.current!.participant_id.localeCompare(id) > 0;
              const ready =
                !state.makingOffer &&
                (pc.signalingState === "stable" || state.settingAnswer);
              const collision = description.type === "offer" && !ready;
              state.ignoreOffer = !polite && collision;
              if (state.ignoreOffer) return;
              state.settingAnswer = description.type === "answer";
              await pc.setRemoteDescription(description);
              state.settingAnswer = false;
              for (const candidate of state.pending.splice(0))
                await pc.addIceCandidate(candidate);
              if (description.type === "offer") {
                await pc.setLocalDescription();
                send({ type: "answer", target: id, data: pc.localDescription });
              }
            })
            .catch((e) => {
              if (!disposed)
                setNotice(
                  `Unable to connect to a participant: ${(e as Error).message}`,
                );
            });
          break;
        }
      }
    }
    async function connect() {
      try {
        const result = await api<Admission>(`/api/meetings/${code}/join`, {
          method: "POST",
          body: JSON.stringify({
            display_name: name,
            host_token: hostToken || undefined,
          }),
        });
        if (disposed) return;
        admission.current = result;
        setSelf(result);
        const base =
          process.env.NEXT_PUBLIC_WS_URL ||
          `${location.protocol === "https:" ? "wss" : "ws"}://${location.hostname}:8000`;
        ws = new WebSocket(`${base.replace(/\/$/, "")}/ws/meetings/${code}`);
        socketRef.current = ws;
        ws.onopen = () => {
          ws!.send(JSON.stringify({ token: result.token }));
          const media = local.current;
          send({
            type: "media",
            audio: media.audio,
            video: media.video,
            sharing: !!media.screen,
          });
        };
        ws.onmessage = (e) => {
          try {
            void handle(JSON.parse(e.data));
          } catch {
            setNotice("Received an invalid meeting event.");
          }
        };
        ws.onerror = () =>
          setNotice(
            "Could not connect to the meeting service. Check the WebSocket URL and allowed origins.",
          );
        ws.onclose = () => {
          if (!disposed) {
            setStatus("Disconnected");
            pcs.current.forEach((s) => s.pc.close());
            pcs.current.clear();
            if (!ended.current)
              setFinished(
                "Your connection to the meeting was lost. Please rejoin.",
              );
          }
        };
      } catch (e) {
        if (!disposed) {
          setNotice((e as Error).message);
          setStatus("Unable to join");
        }
      }
    }
    void connect();
    return () => {
      disposed = true;
      ws?.close();
      socketRef.current = null;
      pcs.current.forEach((s) => s.pc.close());
      pcs.current.clear();
    };
  }, [joined, code, name, hostToken, send]);
  useEffect(() => {
    const a = stream?.getAudioTracks()[0] || null;
    const v =
      screen?.getVideoTracks()[0] || stream?.getVideoTracks()[0] || null;
    pcs.current.forEach((state) => {
      const transceivers = state.pc.getTransceivers();
      for (const kind of ["audio", "video"] as const) {
        const tr = transceivers.find((t) => t.receiver.track.kind === kind);
        void tr?.sender
          .replaceTrack(kind === "audio" ? a : v)
          .catch(() =>
            setNotice("Unable to switch device. Leave and rejoin to retry."),
          );
      }
    });
    send({ type: "media", audio, video, sharing: !!screen });
  }, [stream, audio, video, screen, send]);
  function leave() {
    ended.current = true;
    socketRef.current?.close();
    setFinished("You left the meeting.");
  }
  return {
    chat,
    handRaised,
    reactions,
    peers,
    remoteStreams,
    self,
    status,
    notice,
    setNotice,
    finished,
    meetingEnded,
    send,
    leave,
  };
}
