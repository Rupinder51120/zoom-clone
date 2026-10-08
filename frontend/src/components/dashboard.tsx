"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Video,
  Plus,
  CalendarDays,
  ArrowRight,
  Copy,
  Check,
} from "lucide-react";
import {
  api,
  Meeting,
  Profile,
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
}: {
  listOnly?: boolean;
  initialTab?: string;
}) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
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
    Promise.all([api<Meeting[]>("/api/meetings"), api<Profile>("/api/profile")])
      .then(([m, p]) => {
        setMeetings(m);
        setProfile(p);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);
  async function create() {
    setBusy(true);
    try {
      await startMeeting();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  const upcoming = meetings
    .filter((m) => m.status !== "ended")
    .sort(
      (a, b) =>
        new Date(a.scheduled_start || 0).getTime() -
        new Date(b.scheduled_start || 0).getTime(),
    );
  const recent = meetings
    .filter((m) => m.status === "ended")
    .sort(
      (a, b) =>
        new Date(b.ended_at || 0).getTime() -
        new Date(a.ended_at || 0).getTime(),
    );
  return (
    <>
      {!listOnly && <p className="dashboard-greeting">YOUR WORKSPACE</p>}
      <div className="page-heading">
        <div>
          <h1>
            {listOnly
              ? "Meetings"
              : `Welcome, ${profile?.display_name.split(" ")[0] || "Rupinder"}`}
          </h1>
          <p className="muted">
            {listOnly
              ? "Manage your upcoming and previous meetings."
              : "A little connection goes a long way."}
          </p>
        </div>
        {listOnly && (
          <Link className="primary" href="/meeting/schedule">
            <Plus size={16} /> Schedule a Meeting
          </Link>
        )}
      </div>
      {!listOnly && (
        <div className="dashboard-actions">
          <button className="action-card" onClick={create} disabled={busy}>
            <span className="action-icon orange">
              <Video size={28} />
            </span>
            <strong>{busy ? "Starting…" : "New Meeting"}</strong>
            <span>Start an instant video meeting</span>
          </button>
          <Link className="action-card" href="/join">
            <span className="action-icon">
              <Plus size={29} />
            </span>
            <strong>Join Meeting</strong>
            <span>Connect with a meeting ID or link</span>
          </Link>
          <Link className="action-card" href="/meeting/schedule">
            <span className="action-icon">
              <CalendarDays size={27} />
            </span>
            <strong>Schedule</strong>
            <span>Find a time to bring everyone together</span>
          </Link>
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
                View all <ArrowRight size={13} style={{ display: "inline" }} />
              </Link>
            </div>
            <MeetingList meetings={upcoming.slice(0, 3)} onError={setError} />
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
    </>
  );
}
