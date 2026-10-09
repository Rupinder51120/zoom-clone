"use client";
import { ChevronRight, X } from "lucide-react";
import { RoomPolicy } from "@/lib/room-policy";
import { PlaceholderControl } from "./placeholder-control";

/** Only the assignment's mute-all/removal bonus is interactive. */
export function HostTools({
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
  return (
    <section className="host-tools-panel" aria-label="Host tools">
      <header>
        <h2>Host tools</h2>
        <button aria-label="Close host tools" onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      <div className="host-tools-body">
        <button className="host-toggle-row" onClick={onMute}>
          Mute all participants
        </button>
        <button className="host-toggle-row" onClick={onManage}>
          Manage participants <ChevronRight size={20} />
        </button>
        <hr />
        <p className="host-section-label">Additional controls · Preview only</p>
        {[
          "Waiting room",
          "Lock meeting",
          "Advanced",
          "Participant permissions",
          "Zoom AI",
          "Recording",
          "My Notes",
          "Captions",
          "Apps",
        ].map((label) => (
          <PlaceholderControl
            key={label}
            label={label}
            className="host-toggle-row"
          />
        ))}
      </div>
    </section>
  );
}
