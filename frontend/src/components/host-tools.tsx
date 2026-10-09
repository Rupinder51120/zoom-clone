"use client";
import { useState } from "react";
import { ArrowLeft, ChevronRight, X } from "lucide-react";
import { RoomPolicy } from "@/lib/room-policy";
import { PlaceholderControl } from "./placeholder-control";

export function HostTools({
  policy,
  onChange,
  onClose,
  onManage,
  onMute,
}: {
  policy: RoomPolicy;
  onChange: (patch: Partial<RoomPolicy>) => void;
  onClose: () => void;
  onManage: () => void;
  onMute: () => void;
}) {
  const [advanced, setAdvanced] = useState(false);
  function toggle(key: keyof RoomPolicy, label: string) {
    return (
      <button
        className="host-toggle-row"
        role="switch"
        aria-checked={policy[key]}
        onClick={() => onChange({ [key]: !policy[key] })}
      >
        <span>{label}</span>
        <span
          className={`host-switch ${policy[key] ? "on" : ""}`}
          aria-hidden="true"
        >
          <span />
        </span>
      </button>
    );
  }
  return (
    <section className="host-tools-panel" aria-label="Host tools">
      <header>
        {advanced && (
          <button
            aria-label="Back to host tools"
            onClick={() => setAdvanced(false)}
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <h2>{advanced ? "Advanced" : "Host tools"}</h2>
        <button aria-label="Close host tools" onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      <div className="host-tools-body">
        {advanced ? (
          toggle("hide_avatars", "Hide profile pictures")
        ) : (
          <>
            <p className="host-section-label">Meeting controls</p>
            {toggle("waiting_room", "Waiting room")}
            {toggle("locked", "Lock meeting")}
            <button
              className="host-toggle-row"
              onClick={() => setAdvanced(true)}
            >
              Advanced <ChevronRight size={20} />
            </button>
            <hr />
            <div className="host-permission-heading">
              <p className="host-section-label">Participant permissions</p>
              <button
                onClick={() =>
                  onChange({
                    unmute: false,
                    video: false,
                    chat: false,
                    rename: false,
                    share: false,
                  })
                }
              >
                Turn all off
              </button>
            </div>
            {toggle("unmute", "Unmute self")}
            {toggle("video", "Start video")}
            {toggle("chat", "Chat")}
            {toggle("rename", "Rename self")}
            {toggle("share", "Share screen")}
            <hr />
            {["Zoom AI", "Recording", "My Notes", "Captions", "Apps"].map(
              (label) => (
                <PlaceholderControl key={label} label={label} />
              ),
            )}
            <hr />
            <button className="host-toggle-row" onClick={onMute}>
              Mute all participants
            </button>
            <button className="host-toggle-row" onClick={onManage}>
              Manage participants <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
