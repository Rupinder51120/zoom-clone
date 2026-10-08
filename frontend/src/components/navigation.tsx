"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Home,
  Video,
  Search,
  X,
  Menu,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { api, Profile, startMeeting } from "@/lib/api";

export function Logo() {
  return (
    <Link href="/" className="zoom-logo" aria-label="Zoom home">
      zoom
    </Link>
  );
}
export function Header({ portal = false }: { portal?: boolean }) {
  const [account, setAccount] = useState<Profile | null>(null);
  useEffect(() => {
    api<Profile>("/api/auth/me")
      .then(setAccount)
      .catch(() => setAccount(null));
  }, []);
  async function signout() {
    try {
      await api("/api/auth/signout", { method: "POST" });
      sessionStorage.clear();
      window.location.assign("/signin");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const [menu, setMenu] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setMenu(null);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  async function host(video: boolean, share = false) {
    setBusy(true);
    setError("");
    try {
      await startMeeting(video, share);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
      setMenu(null);
    }
  }
  return (
    <header ref={ref}>
      {portal && (
        <div className="utility-bar">
          <a href="https://support.zoom.com" target="_blank" rel="noreferrer">
            <Search size={18} /> Support
          </a>
        </div>
      )}
      <div className="main-header">
        <Logo />
        <nav className="header-actions" aria-label="Meeting navigation">
          <a
            className="support-link"
            href="https://support.zoom.com"
            target="_blank"
            rel="noreferrer"
          >
            Support
          </a>
          <Link href="/meeting/schedule">Schedule</Link>
          <Link href="/join">Join</Link>
          <div className="menu-wrap">
            <button
              className={`nav-button ${menu === "host" ? "active" : ""}`}
              aria-expanded={menu === "host"}
              onClick={() => setMenu(menu === "host" ? null : "host")}
            >
              Host <ChevronDown size={16} />
            </button>
            {menu === "host" && (
              <div className="dropdown host-dropdown">
                <button disabled={busy} onClick={() => host(false)}>
                  With Video Off
                </button>
                <button disabled={busy} onClick={() => host(true)}>
                  With Video On
                </button>
                <button disabled={busy} onClick={() => host(false, true)}>
                  Screen Share Only
                </button>
              </div>
            )}
          </div>
          <div className="menu-wrap">
            <button
              className={`nav-button ${menu === "web" ? "active" : ""}`}
              aria-expanded={menu === "web"}
              onClick={() => setMenu(menu === "web" ? null : "web")}
            >
              Web App <ChevronDown size={16} />
            </button>
            {menu === "web" && (
              <div className="dropdown web-dropdown">
                <Link href="/" onClick={() => setMenu(null)}>
                  <Home size={21} /> Home
                </Link>
                <Link href="/meetings" onClick={() => setMenu(null)}>
                  <Video size={21} /> Meetings
                </Link>
              </div>
            )}
          </div>
          {account ? (
            <div className="menu-wrap">
              <button
                className="avatar"
                aria-label="Your profile"
                aria-expanded={menu === "profile"}
                onClick={() => setMenu(menu === "profile" ? null : "profile")}
              >
                {account.display_name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </button>
              {menu === "profile" && (
                <div className="dropdown profile-dropdown">
                  <Link href="/profile" onClick={() => setMenu(null)}>
                    Account Settings
                  </Link>
                  <button onClick={signout}>Sign Out</button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/signin">Sign In</Link>
              <Link href="/signup">Sign Up Free</Link>
            </>
          )}
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
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="mobile-sidebar-toggle"
        onClick={() => setOpen(!open)}
        aria-label="Toggle navigation"
      >
        <Menu size={20} /> Navigation
      </button>
      <aside className={`portal-sidebar ${open ? "is-open" : ""}`}>
        <p className="sidebar-label">My Products</p>
        <nav aria-label="Sidebar">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className={pathname === "/" ? "selected" : ""}
          >
            <Home size={15} /> Home
          </Link>
          <Link
            href="/meetings"
            onClick={() => setOpen(false)}
            className={pathname.includes("meeting") ? "selected" : ""}
          >
            <Video size={15} /> Meetings
          </Link>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className={pathname === "/profile" ? "selected" : ""}
          >
            <ChevronDown size={15} /> My Account
          </Link>
          <a href="https://support.zoom.com" target="_blank" rel="noreferrer">
            <ChevronDown size={15} /> Support
          </a>
        </nav>
      </aside>
    </>
  );
}
export function PortalShell({ children }: { children: React.ReactNode }) {
  const [banner, setBanner] = useState(true);
  return (
    <>
      <Header portal />
      {banner && (
        <div className="promo-banner">
          <CheckCircle2 size={21} />
          <p>
            <strong>Meet, connect, and get things done.</strong> Bring your team
            together with video meetings, wherever you work.
          </p>
          <button onClick={() => setBanner(false)} aria-label="Dismiss banner">
            <X size={17} />
          </button>
        </div>
      )}
      <div className="portal-body">
        <Sidebar />
        <main className="portal-content">{children}</main>
      </div>
      <HelpButton />
    </>
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
      <span>Zoom clone · Fullstack assignment demo</span>
      <a
        href="https://www.zoom.com/en/trust/privacy/"
        target="_blank"
        rel="noreferrer"
      >
        Privacy & Legal Policies
      </a>
      <span className="language">English</span>
    </footer>
  );
}
