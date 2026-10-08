"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  MonitorUp,
  Users,
  Copy,
  ShieldCheck,
  X,
  PhoneOff,
  UserRound,
  Check,
  ArrowLeft,
  LoaderCircle,
} from "lucide-react";
import { Header } from "./navigation";
import { api, Meeting, Profile, Peer, formatCode, copyInvite } from "@/lib/api";
import { useMedia } from "@/hooks/use-media";
import { useCall } from "@/hooks/use-call";
function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "?"
  );
}
function MediaVideo({
  stream,
  muted,
  className,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.srcObject = stream;
      void el.play().catch(() => {});
    }
    return () => {
      if (el) el.srcObject = null;
    };
  }, [stream]);
  return (
    <video ref={ref} autoPlay playsInline muted={muted} className={className} />
  );
}
function VideoTile({
  peer,
  stream,
  local = false,
}: {
  peer: Peer;
  stream: MediaStream | null;
  local?: boolean;
}) {
  return (
    <div
      className={`video-tile ${local ? "local" : ""} ${peer.sharing ? "sharing" : ""}`}
      data-participant={peer.id}
    >
      <MediaVideo
        stream={stream}
        muted={local}
        className={!peer.video && !peer.sharing ? "hidden-video" : ""}
      />
      {!peer.video && !peer.sharing && (
        <div className="tile-avatar">{initials(peer.display_name)}</div>
      )}
      {peer.sharing && <span className="tile-status">Sharing screen</span>}
      <span className="tile-name">
        {!peer.audio && <MicOff size={12} />} {peer.display_name}
        {local ? " (You)" : ""}
        {peer.role === "host" ? " · Host" : ""}
      </span>
    </div>
  );
}
export default function Room({
  code,
  initialVideo = true,
  hostMode = false,
  screenOnly = false,
}: {
  code: string;
  initialVideo?: boolean;
  hostMode?: boolean;
  screenOnly?: boolean;
}) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState("");
  const [hostToken, setHostToken] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [screen, setScreen] = useState<MediaStream | null>(null);
  const screenRef = useRef<MediaStream | null>(null);
  const [sharingBusy, setSharingBusy] = useState(false);
  const media = useMedia(initialVideo);
  const call = useCall({
    code,
    name,
    hostToken,
    joined,
    stream: media.stream,
    audio: media.audio,
    video: media.video,
    screen,
    onMute: media.mute,
  });
  useEffect(() => {
    api<Meeting>(`/api/meetings/${code}`)
      .then((m) => {
        if (m.status === "ended") setLoadError("This meeting has ended.");
        else setMeeting(m);
      })
      .catch((e) => setLoadError(e.message));
    if (hostMode) {
      const token = sessionStorage.getItem(`host:${code}`);
      if (!token)
        setLoadError(
          "Your host session is missing. Start this meeting from the dashboard.",
        );
      setHostToken(token);
      api<Profile>("/api/profile")
        .then((p) => setName(p.display_name))
        .catch(() => setName("Host"));
    } else setName(localStorage.getItem("guest-name") || "");
  }, [code, hostMode]);
  useEffect(
    () => () => {
      screenRef.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  useEffect(() => {
    if (call.finished) {
      media.stream?.getTracks().forEach((t) => t.stop());
      screenRef.current?.getTracks().forEach((t) => t.stop());
    }
  }, [call.finished, media.stream]);
  async function toggleShare() {
    if (screen) {
      screen.getTracks().forEach((t) => t.stop());
      setScreen(null);
      screenRef.current = null;
      return;
    }
    setSharingBusy(true);
    try {
      if (!navigator.mediaDevices?.getDisplayMedia)
        throw new Error("Screen sharing is unavailable in this browser.");
      const next = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      next.getVideoTracks()[0].onended = () => {
        setScreen(null);
        screenRef.current = null;
      };
      screenRef.current = next;
      setScreen(next);
    } catch (e) {
      if ((e as Error).name !== "NotAllowedError")
        call.setNotice((e as Error).message);
    } finally {
      setSharingBusy(false);
    }
  }
  function join(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !meeting || loadError) return;
    setName(name.trim());
    localStorage.setItem("guest-name", name.trim());
    setJoined(true);
    if (screenOnly) void toggleShare();
  }
  async function copy() {
    if (!meeting) return;
    try {
      await copyInvite(meeting);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      call.setNotice(
        "Clipboard is unavailable. Your invitation link is " +
          `${location.origin}/join?meeting=${code}`,
      );
    }
  }
  const selfPeer: Peer = {
    id: call.self?.participant_id || "self",
    display_name: name || "You",
    role: call.self?.role || "guest",
    audio: media.audio,
    video: media.video,
    sharing: !!screen,
  };
  const allPeers = [selfPeer, ...call.peers];
  if (call.finished)
    return (
      <div className="call-finished">
        <div>
          <PhoneOff size={42} />
          <h1>Meeting finished</h1>
          <p>{call.finished}</p>
          <Link className="primary" href="/">
            Back to Home
          </Link>
          {meeting?.status !== "ended" && (
            <p>
              <Link href={`/join?meeting=${code}`}>Rejoin meeting</Link>
            </p>
          )}
        </div>
      </div>
    );
  if (!joined)
    return (
      <div className="prejoin-page">
        <Header />
        <main className="prejoin-content">
          <div>
            <div className="preview-tile">
              {media.video && media.stream ? (
                <MediaVideo stream={media.stream} muted />
              ) : (
                <div className="preview-fallback">
                  <UserRound size={65} />
                  <span>Your video is off</span>
                </div>
              )}
              <div className="preview-controls">
                <button
                  className={!media.audio ? "off" : ""}
                  onClick={() => void media.toggleAudio()}
                  disabled={media.busy}
                  aria-label={
                    media.audio ? "Mute microphone" : "Unmute microphone"
                  }
                >
                  {media.audio ? <Mic size={19} /> : <MicOff size={19} />}
                </button>
                <button
                  className={!media.video ? "off" : ""}
                  onClick={() => void media.toggleVideo()}
                  disabled={media.busy}
                  aria-label={
                    media.video ? "Turn camera off" : "Turn camera on"
                  }
                >
                  {media.video ? <Video size={19} /> : <VideoOff size={19} />}
                </button>
              </div>
            </div>
            <div className="device-selects">
              <label>
                Microphone
                <select
                  aria-label="Microphone device"
                  value={media.audioId}
                  onChange={(e) =>
                    void media.selectDevice("audio", e.target.value)
                  }
                >
                  <option value="">System default</option>
                  {media.devices
                    .filter((d) => d.kind === "audioinput")
                    .map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Microphone ${i + 1}`}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Camera
                <select
                  aria-label="Camera device"
                  value={media.videoId}
                  onChange={(e) =>
                    void media.selectDevice("video", e.target.value)
                  }
                >
                  <option value="">System default</option>
                  {media.devices
                    .filter((d) => d.kind === "videoinput")
                    .map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            {media.error && (
              <>
                <p className="error" role="alert">
                  {media.error}
                </p>
                <button
                  className="text-button"
                  onClick={() => void media.retry()}
                >
                  Retry camera & microphone
                </button>
              </>
            )}
          </div>
          <form className="prejoin-form" onSubmit={join}>
            <p className="dashboard-greeting">
              {hostMode ? "START YOUR MEETING" : "READY TO CONNECT?"}
            </p>
            <h1>{meeting?.title || "Join Meeting"}</h1>
            <p className="muted">Meeting ID: {formatCode(code)}</p>
            <label htmlFor="display-name">Your Name</label>
            <input
              id="display-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your display name"
              required
              maxLength={100}
            />
            {loadError && (
              <p className="error" role="alert">
                {loadError}
              </p>
            )}
            <button
              className="primary"
              disabled={!meeting || !!loadError || !name.trim() || media.busy}
            >
              {media.busy
                ? "Preparing devices…"
                : hostMode
                  ? "Start Meeting"
                  : "Join Meeting"}
            </button>
            <p className="form-hint">
              Your microphone and camera settings above will be used when you
              join.
            </p>
            <Link className="back-link" href="/join" style={{ marginTop: 22 }}>
              <ArrowLeft size={14} />
              Back
            </Link>
          </form>
        </main>
      </div>
    );
  return (
    <div className="room-page">
      <header className="room-topbar">
        <ShieldCheck size={18} />
        <span className="meeting-title">{meeting?.title}</span>
        <span className="connection-pill">{call.status}</span>
        <span className="room-id">Meeting ID: {formatCode(code)}</span>
      </header>
      {(call.notice || media.error) && (
        <div className="room-notice" role="status">
          <span>{call.notice || media.error}</span>
          {call.notice && (
            <button
              onClick={() => call.setNotice("")}
              aria-label="Dismiss notice"
            >
              <X size={15} />
            </button>
          )}
        </div>
      )}
      <div className="room-main">
        <div className={`video-grid ${call.peers.length === 0 ? "solo" : ""}`}>
          <VideoTile peer={selfPeer} stream={screen || media.stream} local />
          {call.peers.map((p) => (
            <VideoTile
              key={p.id}
              peer={p}
              stream={call.remoteStreams[p.id] || null}
            />
          ))}
          {!call.peers.length && (
            <div className="waiting-message">
              {call.status === "Connected"
                ? "You are the only participant. Invite someone to join your meeting."
                : "Connecting to the meeting…"}
            </div>
          )}
        </div>
        {participantsOpen && (
          <aside className="participants-panel">
            <div className="participants-heading">
              <h2>Participants ({allPeers.length})</h2>
              <button
                onClick={() => setParticipantsOpen(false)}
                aria-label="Close participants"
              >
                <X size={18} />
              </button>
            </div>
            <div className="participants-list">
              {allPeers.map((p) => (
                <div className="participant-item" key={p.id}>
                  <span className="participant-avatar">
                    {initials(p.display_name)}
                  </span>
                  <div className="participant-name">
                    {p.display_name}
                    {p.id === selfPeer.id ? " (You)" : ""}
                    <small>{p.role === "host" ? "Host" : "Guest"}</small>
                  </div>
                  <div className="participant-actions">
                    {p.audio ? <Mic size={14} /> : <MicOff size={14} />}{" "}
                    {p.video ? <Video size={14} /> : <VideoOff size={14} />}{" "}
                    {call.self?.role === "host" && p.id !== selfPeer.id && (
                      <button
                        onClick={() =>
                          call.send({ type: "remove", target: p.id })
                        }
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="panel-bottom">
              <button className="secondary" onClick={copy}>
                Invite
              </button>
              {call.self?.role === "host" && (
                <button
                  className="secondary"
                  onClick={() => call.send({ type: "mute_all" })}
                >
                  Mute All
                </button>
              )}
            </div>
          </aside>
        )}
      </div>
      <footer className="room-toolbar">
        <button
          className={`toolbar-control ${!media.audio ? "off" : ""}`}
          onClick={() => void media.toggleAudio()}
          disabled={media.busy}
          aria-label={media.audio ? "Mute microphone" : "Unmute microphone"}
        >
          {media.audio ? <Mic size={24} /> : <MicOff size={24} />}
          <span>{media.audio ? "Mute" : "Unmute"}</span>
        </button>
        <button
          className={`toolbar-control ${!media.video ? "off" : ""}`}
          onClick={() => void media.toggleVideo()}
          disabled={media.busy}
          aria-label={media.video ? "Stop video" : "Start video"}
        >
          {media.video ? <Video size={24} /> : <VideoOff size={24} />}
          <span>{media.video ? "Stop Video" : "Start Video"}</span>
        </button>
        <div className="toolbar-spacer" />
        <button
          className={`toolbar-control ${participantsOpen ? "selected" : ""}`}
          onClick={() => setParticipantsOpen(!participantsOpen)}
        >
          <Users size={24} />
          <span>Participants ({allPeers.length})</span>
        </button>
        <button
          className={`toolbar-control ${screen ? "sharing" : ""}`}
          onClick={() => void toggleShare()}
          disabled={sharingBusy}
        >
          {sharingBusy ? <LoaderCircle size={24} /> : <MonitorUp size={24} />}
          <span>{screen ? "Stop Share" : "Share Screen"}</span>
        </button>
        <button className="toolbar-control invite-control" onClick={copy}>
          {copied ? <Check size={23} /> : <Copy size={23} />}
          <span>{copied ? "Copied" : "Invite"}</span>
        </button>
        <div className="toolbar-spacer" />
        <button className="leave-button" onClick={() => setLeaveOpen(true)}>
          {call.self?.role === "host" ? "End" : "Leave"}
        </button>
      </footer>
      {leaveOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-title"
        >
          <div className="modal">
            <h2 id="leave-title">
              {call.self?.role === "host"
                ? "End or leave meeting?"
                : "Leave this meeting?"}
            </h2>
            <p>
              {call.self?.role === "host"
                ? "End the meeting for all participants, or leave while others stay connected."
                : "You can rejoin using the invitation link while the meeting is open."}
            </p>
            <div className="modal-actions">
              {call.self?.role === "host" && (
                <button
                  className="primary danger"
                  onClick={() => {
                    call.send({ type: "end" });
                    setLeaveOpen(false);
                  }}
                >
                  End Meeting for All
                </button>
              )}
              <button className="secondary" onClick={call.leave}>
                Leave Meeting
              </button>
              <button
                className="text-button"
                onClick={() => setLeaveOpen(false)}
                style={{ justifyContent: "center", marginTop: 7 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
