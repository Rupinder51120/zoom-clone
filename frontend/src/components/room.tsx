"use client";
import Link from "next/link";
import { PlaceholderControl } from "./placeholder-control";
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
  MessageSquare,
  Smile,
  Hand,
  Ellipsis,
  Info,
  Settings,
  OctagonX,
} from "lucide-react";
import { HostTools } from "./host-tools";
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
  reaction,
  hideAvatar = false,
}: {
  peer: Peer;
  stream: MediaStream | null;
  local?: boolean;
  reaction?: string;
  hideAvatar?: boolean;
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
        <div className="tile-avatar">
          <span className="avatar-initials">
            {hideAvatar ? <UserRound size={48} /> : initials(peer.display_name)}
          </span>
        </div>
      )}
      {peer.hand_raised && (
        <span
          className="tile-hand"
          aria-label={`${peer.display_name} raised hand`}
        >
          ✋
        </span>
      )}
      {reaction && (
        <span className="tile-reaction" role="status">
          {reaction}
        </span>
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
  initialAudio = true,
  hostMode = false,
  screenOnly = false,
}: {
  code: string;
  initialVideo?: boolean;
  initialAudio?: boolean;
  hostMode?: boolean;
  screenOnly?: boolean;
}) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState("");
  const [hostToken, setHostToken] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [sharingBusy, setSharingBusy] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [screen, setScreen] = useState<MediaStream | null>(null);
  const screenRef = useRef<MediaStream | null>(null);
  const media = useMedia(initialVideo, initialAudio);
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
  const isHost = call.self?.role === "host";
  const allowed = (key: "unmute" | "video" | "chat" | "rename" | "share") =>
    isHost || call.policy[key];
  useEffect(() => {
    if (call.self?.role !== "guest") return;
    if (!call.policy.unmute) media.mute();
    if (!call.policy.video && media.video) void media.toggleVideo();
    if (!call.policy.share && screenRef.current) {
      screenRef.current.getTracks().forEach((t) => t.stop());
      screenRef.current = null;
      setScreen(null);
    }
  }, [
    call.policy,
    call.self?.role,
    media.mute,
    media.audio,
    media.video,
    media.toggleVideo,
  ]);
  useEffect(() => {
    if (call.finished) {
      media.stream?.getTracks().forEach((t) => t.stop());
      screenRef.current?.getTracks().forEach((t) => t.stop());
    }
  }, [call.finished, media.stream]);
  const captureAllowed = useRef(false);
  captureAllowed.current =
    call.status === "Connected" && !call.finished && allowed("share");
  useEffect(
    () => () => {
      captureAllowed.current = false;
    },
    [],
  );
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: "nearest" });
  }, [call.chat, chatOpen]);
  function stopSharing() {
    const capture = screenRef.current;
    screenRef.current = null;
    setScreen(null);
    capture?.getTracks().forEach((track) => track.stop());
  }
  async function toggleSharing() {
    if (screenRef.current) {
      stopSharing();
      return;
    }
    if (!allowed("share") || call.status !== "Connected") return;
    if (!navigator.mediaDevices?.getDisplayMedia) {
      call.setNotice(
        "This browser cannot capture your screen. Share from a supported desktop browser; you can still view shared screens on your phone.",
      );
      return;
    }
    setSharingBusy(true);
    try {
      const capture = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      if (!captureAllowed.current) {
        capture.getTracks().forEach((track) => track.stop());
        return;
      }
      screenRef.current = capture;
      setScreen(capture);
      capture
        .getVideoTracks()[0]
        .addEventListener("ended", stopSharing, { once: true });
    } catch (error) {
      if ((error as DOMException).name !== "NotAllowedError")
        call.setNotice(
          "Screen sharing could not start. Try a supported desktop browser.",
        );
    } finally {
      setSharingBusy(false);
    }
  }
  function sendChat(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim() || !allowed("chat") || call.status !== "Connected")
      return;
    call.send({ type: "chat", text: draft.trim() });
    setDraft("");
  }
  function join(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !meeting || loadError) return;
    setName(name.trim());
    localStorage.setItem("guest-name", name.trim());
    setJoined(true);
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
    display_name: call.selfName || name || "You",
    role: call.self?.role || "guest",
    audio: media.audio,
    video: media.video,
    sharing: !!screen,
    hand_raised: call.handRaised,
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
          {!call.meetingEnded && meeting?.status !== "ended" && (
            <p>
              <a
                href={
                  hostMode && hostToken
                    ? `/room/${code}?host=1`
                    : `/join?meeting=${code}`
                }
              >
                Rejoin meeting
              </a>
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
            {media.busy && (
              <button
                type="button"
                className="text-button"
                onClick={media.disableMedia}
              >
                Continue without audio/video
              </button>
            )}
            <p className="form-hint">
              {screenOnly
                ? "Start the meeting, then select Share Screen to choose a screen or window."
                : "Your microphone and camera settings above will be used when you join."}
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
          <VideoTile
            hideAvatar={call.policy.hide_avatars}
            peer={selfPeer}
            stream={screen || media.stream}
            local
            reaction={call.reactions[selfPeer.id]?.emoji}
          />
          {call.peers.map((p) => (
            <VideoTile
              hideAvatar={call.policy.hide_avatars}
              key={p.id}
              peer={p}
              reaction={call.reactions[p.id]?.emoji}
              stream={call.remoteStreams[p.id] || null}
            />
          ))}
          {!call.peers.length && (
            <div className="waiting-message">
              {call.status === "Connected"
                ? "You are the only participant. Invite someone to join your meeting."
                : call.status === "Waiting for host admission"
                  ? "Waiting room: the host will admit you shortly."
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
              {isHost && call.waitingPeers.length > 0 && (
                <section aria-label="Waiting room participants">
                  <h3>Waiting room ({call.waitingPeers.length})</h3>
                  {call.waitingPeers.map((p) => (
                    <div className="participant-item" key={p.id}>
                      <span className="participant-name">{p.display_name}</span>
                      <button
                        onClick={() =>
                          call.send({ type: "admit", target: p.id })
                        }
                      >
                        Admit
                      </button>
                      <button
                        onClick={() =>
                          call.send({ type: "remove", target: p.id })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </section>
              )}
              {allPeers.map((p) => (
                <div className="participant-item" key={p.id}>
                  <span className="participant-avatar">
                    {initials(p.display_name)}
                  </span>
                  <div className="participant-name">
                    {p.display_name}
                    {p.id === selfPeer.id ? " (You)" : ""}
                    {p.hand_raised && (
                      <span aria-label={`${p.display_name} raised hand`}>
                        {" "}
                        ✋
                      </span>
                    )}
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
        {chatOpen && (
          <aside
            className="participants-panel chat-panel"
            aria-label="Meeting Chat"
          >
            <div className="participants-heading">
              <h2>Meeting Chat</h2>
              <button
                aria-label="Close chat"
                onClick={() => setChatOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <p className="chat-hint">
              To everyone · Available while this room is live
            </p>
            <div className="chat-messages" aria-live="polite">
              {call.chat.map((entry) => (
                <div className="chat-message" key={entry.id}>
                  <div>
                    <strong>{entry.display_name}</strong>
                    <time>
                      {new Date(entry.sent_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  <p>{entry.text}</p>
                </div>
              ))}
              <div ref={chatEnd} />
            </div>
            <form className="chat-compose" onSubmit={sendChat}>
              <label htmlFor="chat-message">Message everyone</label>
              <textarea
                id="chat-message"
                placeholder="Type a message…"
                maxLength={2000}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={!allowed("chat") || call.status !== "Connected"}
              />
              <button
                className="primary"
                disabled={
                  !draft.trim() ||
                  !allowed("chat") ||
                  call.status !== "Connected"
                }
              >
                Send
              </button>
            </form>
          </aside>
        )}
      </div>
      <footer className="room-toolbar">
        <button
          className={`toolbar-control ${!media.audio ? "off" : ""}`}
          onClick={() => void media.toggleAudio()}
          disabled={media.busy || (!media.audio && !allowed("unmute"))}
          aria-label={media.audio ? "Mute microphone" : "Unmute microphone"}
        >
          {media.audio ? <Mic size={24} /> : <MicOff size={24} />}
          <span>{media.audio ? "Mute" : "Unmute"}</span>
        </button>
        <button
          className={`toolbar-control ${!media.video ? "off" : ""}`}
          onClick={() => void media.toggleVideo()}
          disabled={media.busy || (!media.video && !allowed("video"))}
          aria-label={media.video ? "Stop video" : "Start video"}
        >
          {media.video ? <Video size={24} /> : <VideoOff size={24} />}
          <span>{media.video ? "Stop Video" : "Start Video"}</span>
        </button>
        <div className="toolbar-spacer" />
        <button
          className={`toolbar-control ${participantsOpen ? "selected" : ""}`}
          onClick={() => {
            setParticipantsOpen(!participantsOpen);
            setChatOpen(false);
          }}
        >
          <Users size={24} />
          <span>Participants ({allPeers.length})</span>
        </button>
        <button
          className={`toolbar-control ${screen ? "selected" : ""}`}
          onClick={() => void toggleSharing()}
          disabled={
            sharingBusy ||
            call.status !== "Connected" ||
            (!screen && !allowed("share"))
          }
        >
          <MonitorUp size={24} />
          <span>{screen ? "Stop Sharing" : "Share Screen"}</span>
        </button>
        <button
          className={`toolbar-control ${chatOpen ? "selected" : ""}`}
          onClick={() => {
            setChatOpen(!chatOpen);
            setParticipantsOpen(false);
          }}
        >
          <MessageSquare size={24} />
          <span>Chat</span>
        </button>
        <button
          className={`toolbar-control ${call.handRaised ? "selected" : ""}`}
          disabled={call.status !== "Connected"}
          onClick={() => call.send({ type: "hand", raised: !call.handRaised })}
        >
          <Hand size={24} />
          <span>{call.handRaised ? "Lower Hand" : "Raise Hand"}</span>
        </button>
        <div className="reactions-control">
          <button
            className="toolbar-control"
            aria-expanded={reactionsOpen}
            disabled={call.status !== "Connected"}
            onClick={() => setReactionsOpen(!reactionsOpen)}
          >
            <Smile size={24} />
            <span>Reactions</span>
          </button>
          {reactionsOpen && (
            <div className="reaction-picker" aria-label="Choose reaction">
              {["👍", "👏", "❤️", "😂", "🎉", "😮"].map((emoji) => (
                <button
                  key={emoji}
                  aria-label={`React ${emoji}`}
                  onClick={() => {
                    call.send({ type: "reaction", emoji });
                    setReactionsOpen(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="toolbar-control invite-control" onClick={copy}>
          {copied ? <Check size={23} /> : <Copy size={23} />}
          <span>{copied ? "Copied" : "Invite"}</span>
        </button>
        {call.self?.role === "host" && (
          <div className="reactions-control">
            <button
              className="toolbar-control"
              aria-expanded={toolsOpen}
              onClick={() => {
                setToolsOpen(!toolsOpen);
                setMoreOpen(false);
              }}
            >
              <ShieldCheck size={24} />
              <span>Host tools</span>
            </button>
            {toolsOpen && (
              <HostTools
                policy={call.policy}
                onChange={(patch) => call.send({ type: "policy", patch })}
                onClose={() => setToolsOpen(false)}
                onMute={() => call.send({ type: "mute_all" })}
                onManage={() => {
                  setParticipantsOpen(true);
                  setToolsOpen(false);
                }}
              />
            )}
          </div>
        )}
        <div className="reactions-control">
          <button
            className="toolbar-control"
            aria-expanded={moreOpen}
            onClick={() => {
              setMoreOpen(!moreOpen);
              setToolsOpen(false);
            }}
          >
            <Ellipsis size={24} />
            <span>More</span>
          </button>
          {moreOpen && (
            <div className="room-popover room-more-grid">
              {[
                "Record",
                "Show caption",
                "Breakout rooms",
                "Docs",
                "Whiteboards",
                "Apps",
              ].map((label) => (
                <PlaceholderControl key={label} label={label} />
              ))}
              <PlaceholderControl label="Rename self" />
              <button
                onClick={() => {
                  setInfoOpen(true);
                  setMoreOpen(false);
                }}
              >
                <Info size={18} /> Meeting info
              </button>
              <button
                onClick={() => {
                  setSettingsOpen(true);
                  setMoreOpen(false);
                }}
              >
                <Settings size={18} /> Device settings
              </button>
              <button
                onClick={() => {
                  void copy();
                  setMoreOpen(false);
                }}
              >
                <Copy size={18} /> Copy invitation
              </button>
            </div>
          )}
        </div>
        <div className="toolbar-spacer" />
        <button className="leave-button" onClick={() => setLeaveOpen(true)}>
          <OctagonX size={25} />
          <span>{call.self?.role === "host" ? "End" : "Leave"}</span>
        </button>
      </footer>
      {(infoOpen || settingsOpen) && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={infoOpen ? "Meeting info" : "Device settings"}
        >
          <div className="modal room-settings">
            <button
              className="dialog-close"
              aria-label="Close meeting dialog"
              onClick={() => {
                setInfoOpen(false);
                setSettingsOpen(false);
              }}
            >
              <X size={20} />
            </button>
            <h2>{infoOpen ? "Meeting info" : "Device settings"}</h2>
            {infoOpen ? (
              <>
                <p>{meeting?.title}</p>
                <p>Meeting ID: {formatCode(code)}</p>
                <p className="muted">
                  {allPeers.length} participants · {call.status}
                </p>
                <button className="primary" onClick={copy}>
                  {copied ? "Copied" : "Copy Invitation"}
                </button>
              </>
            ) : (
              <div className="device-selects">
                <label>
                  Microphone
                  <select
                    aria-label="In-call microphone device"
                    value={media.audioId}
                    onChange={(event) =>
                      void media.selectDevice("audio", event.target.value)
                    }
                  >
                    <option value="">System default</option>
                    {media.devices
                      .filter((device) => device.kind === "audioinput")
                      .map((device, index) => (
                        <option
                          key={device.deviceId || index}
                          value={device.deviceId}
                        >
                          {device.label || `Microphone ${index + 1}`}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Camera
                  <select
                    aria-label="In-call camera device"
                    value={media.videoId}
                    onChange={(event) =>
                      void media.selectDevice("video", event.target.value)
                    }
                  >
                    <option value="">System default</option>
                    {media.devices
                      .filter((device) => device.kind === "videoinput")
                      .map((device, index) => (
                        <option
                          key={device.deviceId || index}
                          value={device.deviceId}
                        >
                          {device.label || `Camera ${index + 1}`}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            )}
          </div>
        </div>
      )}
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
