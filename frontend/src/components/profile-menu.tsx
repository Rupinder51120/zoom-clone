"use client";
import Link from "next/link";
import { PlaceholderControl } from "./placeholder-control";
import { Profile } from "@/lib/api";

export function ProfileMenu({
  profile,
  account,
  onClose,
  onSignout,
}: {
  profile: Profile | null;
  account: boolean;
  onUpdate: (profile: Profile) => void;
  onClose: () => void;
  onSignout: () => void;
}) {
  return (
    <div className="dropdown profile-dropdown expanded-profile">
      <div className="profile-menu-identity">
        <span className="profile-menu-avatar">
          {profile?.display_name
            .split(/\s+/)
            .slice(0, 2)
            .map((n) => n[0])
            .join("")
            .toUpperCase() || "ZC"}
        </span>
        <strong>{profile?.display_name || "Demo workspace"}</strong>
      </div>
      {[
        "Available",
        "Set status message",
        "Work location",
        "Profile",
        "Settings",
        "Check for updates",
        "Discover what’s new",
        "Download mobile app",
        "Help",
      ].map((label) => (
        <PlaceholderControl key={label} label={label} />
      ))}
      {account ? (
        <button onClick={onSignout}>Sign Out</button>
      ) : (
        <>
          <Link href="/signin" onClick={onClose}>
            Sign In
          </Link>
          <Link href="/signup" onClick={onClose}>
            Sign Up Free
          </Link>
          <span className="menu-hint">
            Login optional · shared demo workspace
          </span>
        </>
      )}
      <Link href="/welcome" onClick={onClose}>
        Public landing page
      </Link>
    </div>
  );
}
