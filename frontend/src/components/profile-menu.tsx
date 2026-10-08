"use client";
import Link from "next/link";
import { PlaceholderControl } from "./placeholder-control";
import { useState } from "react";
import { api, Profile } from "@/lib/api";

export function ProfileMenu({
  profile,
  account,
  onUpdate,
  onClose,
  onSignout,
}: {
  profile: Profile | null;
  account: boolean;
  onUpdate: (profile: Profile) => void;
  onClose: () => void;
  onSignout: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState(profile?.status_message || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(fields: Partial<Profile>) {
    setBusy(true);
    setError("");
    try {
      onUpdate(
        await api<Profile>("/api/profile", {
          method: "PATCH",
          body: JSON.stringify(fields),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const email = profile?.email.replace(/^(.{3})[^@]*@/, "$1***@");
  return (
    <div className="dropdown profile-dropdown expanded-profile">
      <div className="profile-menu-identity">
        <span className="profile-menu-avatar">
          {profile?.display_name
            .split(/\s+/)
            .slice(0, 2)
            .map((n) => n[0])
            .join("")
            .toUpperCase()}
        </span>
        <strong>{profile?.display_name || "Workspace"}</strong>
        <span>{email}</span>
      </div>
      <button
        className="availability-button"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        <span
          className={`presence-dot ${profile?.availability === "Available" ? "available" : "other"}`}
        />
        {profile?.availability || "Available"}
        <span>›</span>
      </button>
      {expanded && (
        <div className="availability-options" aria-label="Availability">
          {["Available", "Busy", "Do not disturb", "Away", "Out of office"].map(
            (status) => (
              <button
                key={status}
                disabled={busy}
                aria-pressed={profile?.availability === status}
                onClick={() => save({ availability: status })}
              >
                {status}
                {profile?.availability === status ? " ✓" : ""}
              </button>
            ),
          )}
          <button
            disabled={busy}
            onClick={() => {
              setMessage("");
              void save({
                availability: "Available",
                status_message: "",
                work_location: "Off",
              });
            }}
          >
            Reset status
          </button>
        </div>
      )}
      <form
        className="profile-preferences"
        onSubmit={(e) => {
          e.preventDefault();
          void save({ status_message: message.trim() });
        }}
      >
        <label htmlFor="status-message">Set status message</label>
        <input
          id="status-message"
          maxLength={200}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What’s on your mind?"
        />
        <button className="secondary" disabled={busy}>
          Save status
        </button>
        <label htmlFor="work-location">Work location</label>
        <select
          id="work-location"
          value={profile?.work_location || "Off"}
          disabled={busy}
          onChange={(e) => save({ work_location: e.target.value })}
        >
          {["Off", "Office", "Home"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </form>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <Link href="/profile" onClick={onClose}>
        Account Settings
      </Link>
      {["Check for updates", "Discover what’s new", "Download mobile app"].map(
        (label) => (
          <PlaceholderControl key={label} label={label} />
        ),
      )}
      <a href="https://support.zoom.com" target="_blank" rel="noreferrer">
        Help
      </a>
      {account ? (
        <>
          <Link href="/signin" onClick={onClose}>
            Add account
          </Link>
          <button onClick={onSignout}>Sign Out</button>
        </>
      ) : (
        <>
          <Link href="/signin" onClick={onClose}>
            Sign In
          </Link>
          <Link href="/signup" onClick={onClose}>
            Sign Up Free
          </Link>
          <span className="menu-hint">
            Shared demo workspace · manually selected status
          </span>
        </>
      )}
      <div className="profile-upgrade-preview">
        <strong>Get more from ZOOM-CLONE</strong>
        <p>Explore the upgrade interface preview.</p>
        <PlaceholderControl label="Upgrade now" className="primary" />
      </div>
    </div>
  );
}
