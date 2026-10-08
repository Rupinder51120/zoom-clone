"use client";
import Link from "next/link";
import { PlaceholderControl } from "./placeholder-control";
import { useEffect, useState } from "react";
import {
  Video,
  Plus,
  CalendarDays,
  ArrowRight,
  Copy,
  Check,
  MonitorUp,
  Sparkles,
} from "lucide-react";
import {
  api,
  Meeting,
  startMeeting,
  openHostedMeeting,
  copyInvite,
  formatCode,
} from "@/lib/api";

export function MeetingList({
  meetings,
  onError,
}: {
  meetings: Meeting[];
  onError: (message: string) => void;
}) {
  const [copied, setCopied] = useState("");
  const [busy, setBusy] = useState("");
  async function start(code: string) {
    setBusy(code);
    try {
      await openHostedMeeting(code);
    } catch (e) {
      onError((e as Error).message);
      setBusy("");
    }
  }
  async function copy(meeting: Meeting) {
    try {
      await copyInvite(meeting);
      setCopied(meeting.code);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      onError(
        "Clipboard access is unavailable. Open the meeting details to select its invitation link.",
      );
    }
  }
  if (!meetings.length)
    return (
      <div className="empty-state">
        No meetings here yet. Schedule a meeting to get started.
      </div>
    );
  return (
    <div className="meeting-list">
      {meetings.map((m) => {
        const date = new Date(m.scheduled_start || m.started_at || Date.now());
        return (
          <div className="meeting-row" key={m.code}>
            <div className="meeting-date">
              <span>
                {date
                  .toLocaleDateString("en-US", {
                    month: "short",
                    timeZone: m.timezone,
                  })
                  .toUpperCase()}
              </span>
              <b>
                {date.toLocaleDateString("en-US", {
                  day: "numeric",
                  timeZone: m.timezone,
                })}
              </b>
            </div>
            <div className="meeting-summary">
              <Link href={`/meetings/${m.code}`}>{m.title}</Link>
              <p>
                {date.toLocaleString("en-US", {
                  weekday: "short",
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: m.timezone,
                })}{" "}
                · {m.duration_minutes} min
                <br />
                Meeting ID: {formatCode(m.code)}
              </p>
            </div>
            <span className={`status-badge ${m.status}`}>
              {m.status === "active"
                ? "In progress"
                : m.status === "ended"
                  ? "Completed"
                  : "Scheduled"}
            </span>
            <div className="meeting-row-actions">
              {m.status !== "ended" && (
                <>
                  <button
                    className="primary"
                    disabled={busy === m.code}
                    onClick={() => start(m.code)}
                  >
                    {busy === m.code ? "Starting…" : "Start"}
                  </button>
                  <button
                    className="secondary"
                    onClick={() => copy(m)}
                    aria-label={`Copy invitation for ${m.title}`}
                  >
                    {copied === m.code ? (
                      <Check size={16} />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
export default function Dashboard({
  listOnly = false,
  initialTab = "upcoming",
  searchQuery = "",
}: {
  listOnly?: boolean;
  initialTab?: string;
  searchQuery?: string;
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState(initialTab);
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);
  function load() {
    setLoading(true);
    setError("");
    api<Meeting[]>("/api/meetings")
      .then(setMeetings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);
  async function create(share = false) {
    setBusy(true);
    try {
      await startMeeting(!share, share);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  const upcoming = meetings
    .filter(
      (m) =>
        m.status !== "ended" &&
        `${m.title} ${m.code}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
    )
    .sort(
      (a, b) =>
        new Date(a.scheduled_start || 0).getTime() -
        new Date(b.scheduled_start || 0).getTime(),
    );
  const recent = meetings
    .filter(
      (m) =>
        m.status === "ended" &&
        `${m.title} ${m.code}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
    )
    .sort(
      (a, b) =>
        new Date(b.ended_at || 0).getTime() -
        new Date(a.ended_at || 0).getTime(),
    );
  return (
    <>
      <div className={listOnly ? "workspace-meetings" : "workspace-home"}>
        {!listOnly ? (
          <div className="workspace-home-heading">
            <h1>
              {now?.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              }) || "Your workspace"}
            </h1>
            <p>
              {now?.toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              }) || "Welcome to ZOOM-CLONE"}
            </p>
          </div>
        ) : (
          <div className="page-heading">
            <div>
              <h1>Meetings</h1>
              <p className="muted">
                Manage your upcoming and previous meetings.
              </p>
            </div>
            <Link className="primary" href="/meeting/schedule">
              <Plus size={16} /> Schedule a Meeting
            </Link>
          </div>
        )}
        {!listOnly && (
          <div className="dashboard-actions">
            <button
              className="action-card"
              onClick={() => create()}
              disabled={busy}
            >
              <span className="action-icon orange">
                <Video size={30} />
              </span>
              <strong>{busy ? "Starting…" : "New Meeting"}</strong>
            </button>
            <Link className="action-card" href="/join">
              <span className="action-icon">
                <Plus size={30} />
              </span>
              <strong>Join Meeting</strong>
            </Link>
            <Link className="action-card" href="/meeting/schedule">
              <span className="action-icon">
                <CalendarDays size={30} />
              </span>
              <strong>Schedule</strong>
            </Link>
            <button
              className="action-card"
              onClick={() => create(true)}
              disabled={busy}
            >
              <span className="action-icon">
                <MonitorUp size={30} />
              </span>
              <strong>Share Screen</strong>
            </button>
            <PlaceholderControl label="My Notes" className="action-card">
              <span className="action-icon">
                <Sparkles size={30} />
              </span>
              <strong>My Notes</strong>
            </PlaceholderControl>
          </div>
        )}
        {!listOnly && (
          <div className="workspace-reference-notice">
            <span>You haven’t connected your calendar yet.</span>
            <PlaceholderControl
              label="Connect now"
              className="text-button"
              description="Calendar provider connection is a placeholder. You can export your meetings from the Meetings view."
            />
          </div>
        )}
        {error && (
          <div role="alert">
            <p className="error">{error}</p>
            {loading === false && meetings.length === 0 && (
              <button className="secondary" onClick={load}>
                Try again
              </button>
            )}
          </div>
        )}
        {loading ? (
          <p className="loading">Loading your meetings…</p>
        ) : listOnly ? (
          <>
            <div className="tabs">
              <button
                className={tab === "upcoming" ? "active" : ""}
                onClick={() => setTab("upcoming")}
              >
                Upcoming
              </button>
              <button
                className={tab === "recent" ? "active" : ""}
                onClick={() => setTab("recent")}
              >
                Previous
              </button>
            </div>
            <MeetingList
              meetings={tab === "upcoming" ? upcoming : recent}
              onError={setError}
            />
          </>
        ) : (
          <>
            <section className="meeting-section">
              <div className="section-heading">
                <h2>Upcoming Meetings</h2>
                <Link href="/meetings">
                  View all{" "}
                  <ArrowRight size={13} style={{ display: "inline" }} />
                </Link>
              </div>
              <MeetingList meetings={upcoming.slice(0, 3)} onError={setError} />
              <PlaceholderControl
                label="Open recordings"
                className="recordings-placeholder"
              />
            </section>
            <section className="meeting-section">
              <div className="section-heading">
                <h2>Recent Meetings</h2>
                <Link href="/meetings?tab=recent">View all</Link>
              </div>
              <MeetingList meetings={recent.slice(0, 2)} onError={setError} />
            </section>
          </>
        )}
      </div>
    </>
  );
}
