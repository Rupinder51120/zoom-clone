"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Home,
  Video,
  Search,
  X,
  Settings,
  CalendarDays,
  Plus,
  HelpCircle,
  Sparkles,
  MessageSquare,
  Layers,
  Ellipsis,
  Bell,
} from "lucide-react";
import { api, Profile, startMeeting } from "@/lib/api";
import Dashboard from "./dashboard";
import { PlaceholderControl } from "./placeholder-control";
import { ProfileMenu } from "./profile-menu";
import { WorkflowDialog } from "./workflow-dialog";

export function Logo() {
  return (
    <Link href="/dashboard" className="zoom-logo" aria-label="ZOOM-CLONE home">
      ZOOM-CLONE<span>Workplace</span>
    </Link>
  );
}
export function Header({ portal = false }: { portal?: boolean }) {
  const [account, setAccount] = useState<Profile | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    api<Profile>("/api/auth/me")
      .then(setAccount)
      .catch(() => setAccount(null));
    api<Profile>("/api/profile")
      .then(setProfile)
      .catch(() => {});
  }, []);
  useEffect(() => {
    const click = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setMenu(null);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(null);
    };
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", key);
    };
  }, []);
  async function host(video: boolean, share = false) {
    setBusy(true);
    setError("");
    try {
      await startMeeting(video, share);
    } catch (error) {
      setError((error as Error).message);
      setBusy(false);
      setMenu(null);
    }
  }
  async function signout() {
    try {
      await api("/api/auth/signout", { method: "POST" });
      sessionStorage.clear();
      window.location.assign("/dashboard");
    } catch (error) {
      setError((error as Error).message);
    }
  }
  return (
    <header ref={ref} className={portal ? "workspace-header" : "public-header"}>
      <div className="main-header">
        <Logo />
        <form
          className="workspace-search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            router.push(`/meetings?q=${encodeURIComponent(search.trim())}`);
          }}
        >
          <Search size={18} />
          <input
            aria-label="Search meetings"
            placeholder="Search meetings"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </form>
        <nav className="header-actions" aria-label="Meeting navigation">
          <PlaceholderControl
            label="Upgrade"
            className="primary workspace-upgrade"
          />
          <PlaceholderControl label="Notifications" className="header-icon">
            <Bell size={21} />
          </PlaceholderControl>
          <Link
            className="header-icon"
            href="/meeting/schedule"
            aria-label="Schedule a meeting"
          >
            <CalendarDays size={21} />
          </Link>
          <Link href="/join">Join</Link>
          <div className="menu-wrap">
            <button
              className="nav-button"
              aria-expanded={menu === "host"}
              onClick={() => setMenu(menu === "host" ? null : "host")}
            >
              Host <ChevronDown size={14} />
            </button>
            {menu === "host" && (
              <div className="dropdown host-dropdown">
                <button disabled={busy} onClick={() => host(false)}>
                  With Video Off
                </button>
                <button disabled={busy} onClick={() => host(true)}>
                  With Video On
                </button>
                <PlaceholderControl label="Screen Share Only" />
              </div>
            )}
          </div>
          <div className="menu-wrap">
            <button
              className="avatar"
              data-availability={profile?.availability || "Available"}
              aria-label="Your profile"
              aria-expanded={menu === "profile"}
              onClick={() => setMenu(menu === "profile" ? null : "profile")}
            >
              {(account || profile)?.display_name
                .split(/\s+/)
                .slice(0, 2)
                .map((n) => n[0])
                .join("")
                .toUpperCase() || "ZC"}
            </button>
            {menu === "profile" && (
              <ProfileMenu
                key={profile?.email || "loading"}
                profile={profile}
                account={!!account}
                onUpdate={setProfile}
                onClose={() => setMenu(null)}
                onSignout={signout}
              />
            )}
          </div>
        </nav>
      </div>
      {error && (
        <div role="alert" className="header-error">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss error">
            <X size={16} />
          </button>
        </div>
      )}
    </header>
  );
}
export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="portal-sidebar">
      <nav aria-label="Sidebar">
        <Link
          href="/dashboard"
          className={pathname === "/dashboard" ? "selected" : ""}
        >
          <Home size={23} />
          <span>Home</span>
        </Link>
        <PlaceholderControl label="ZoomMate" className="rail-placeholder">
          <Sparkles size={23} />
          <span>ZoomMate</span>
        </PlaceholderControl>
        <Link
          href="/meetings"
          className={pathname.includes("meeting") ? "selected" : ""}
        >
          <Video size={23} />
          <span>Meetings</span>
        </Link>
        <PlaceholderControl
          label="Chat"
          className="rail-placeholder"
          description="Chat is a visual placeholder outside the assignment scope."
        >
          <MessageSquare size={23} />
          <span>Chat</span>
        </PlaceholderControl>
        <PlaceholderControl label="Hub" className="rail-placeholder">
          <Layers size={23} />
          <span>Hub</span>
        </PlaceholderControl>
        <details className="rail-more">
          <summary>
            <Ellipsis size={23} />
            <span>More</span>
          </summary>
          <div className="dropdown">
            {[
              "Phone",
              "Canvas",
              "Contacts",
              "Whiteboards",
              "Recordings",
              "Summaries",
              "Notes",
              "Clips",
              "Paper",
              "Sheets",
              "Slides",
              "Tasks",
              "Scheduler",
            ].map((label) => (
              <PlaceholderControl key={label} label={label} />
            ))}
          </div>
        </details>
        <Link href="/meeting/schedule">
          <Plus size={23} />
          <span>Schedule</span>
        </Link>
        <Link
          href="/profile"
          className={`rail-settings ${pathname === "/profile" ? "selected" : ""}`}
        >
          <Settings size={23} />
          <span>Settings</span>
        </Link>
      </nav>
    </aside>
  );
}
export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const scheduling = pathname === "/meeting/schedule";
  const details = /^\/meetings\/[^/]+$/.test(pathname);
  const modal = scheduling || details;
  return (
    <div className="workspace-shell">
      <Header portal />
      <div className="portal-body">
        <Sidebar />
        <main className="portal-content">
          {modal ? (
            <>
              <Dashboard />
              <WorkflowDialog
                label={scheduling ? "Schedule Meeting" : "Meeting Details"}
              >
                {children}
              </WorkflowDialog>
            </>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
export function HelpButton() {
  return (
    <a
      className="help-bubble"
      href="https://support.zoom.com"
      target="_blank"
      rel="noreferrer"
      aria-label="Open Zoom support"
    >
      <HelpCircle size={27} />
    </a>
  );
}
export function Footer() {
  return (
    <footer className="public-footer">
      <span>ZOOM-CLONE · Fullstack assignment demo</span>
      <span>System appearance</span>
    </footer>
  );
}
