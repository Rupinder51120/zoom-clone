"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Copy, Check } from "lucide-react";
import {
  api,
  Meeting,
  formatCode,
  copyInvite,
  openHostedMeeting,
} from "@/lib/api";
export default function MeetingDetails({ code }: { code: string }) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<Meeting>(`/api/meetings/${code}`)
      .then(setMeeting)
      .catch((e) => setError(e.message));
  }, [code]);
  async function copy() {
    if (!meeting) return;
    try {
      await copyInvite(meeting);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(
        "Clipboard is unavailable. Select and copy the invitation link below.",
      );
    }
  }
  async function start() {
    setBusy(true);
    try {
      await openHostedMeeting(code);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      <Link href="/meetings" className="back-link">
        <ChevronLeft size={16} />
        Back to Meetings
      </Link>
      <h1>Meeting Details</h1>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {meeting ? (
        <>
          <div className="detail-card">
            <h2>{meeting.title}</h2>
            <div className="detail-row">
              <span>Description</span>
              <span>{meeting.description || "No description"}</span>
            </div>
            <div className="detail-row">
              <span>When</span>
              <span>
                {meeting.scheduled_start
                  ? new Date(meeting.scheduled_start).toLocaleString("en-US", {
                      dateStyle: "full",
                      timeStyle: "short",
                      timeZone: meeting.timezone,
                    })
                  : "Instant meeting"}
                <br />
                <small className="muted">{meeting.timezone}</small>
              </span>
            </div>
            <div className="detail-row">
              <span>Duration</span>
              <span>{meeting.duration_minutes} minutes</span>
            </div>
            <div className="detail-row">
              <span>Meeting ID</span>
              <span>{formatCode(code)}</span>
            </div>
            <div className="detail-row">
              <span>Status</span>
              <span style={{ textTransform: "capitalize" }}>
                {meeting.status}
              </span>
            </div>
            <div className="detail-row">
              <span>Invite Link</span>
              <div className="invite-box">
                <a href={`/join?meeting=${code}`}>
                  {typeof window !== "undefined" ? window.location.origin : ""}
                  /join?meeting={code}
                </a>
                <button className="text-button" onClick={copy}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
                  {copied ? "Copied" : "Copy Invitation"}
                </button>
              </div>
            </div>
          </div>
          <div className="detail-actions">
            {meeting.status !== "ended" && (
              <>
                <button className="primary" onClick={start} disabled={busy}>
                  {busy ? "Starting…" : "Start this Meeting"}
                </button>
                <Link href={`/join?meeting=${code}`} className="secondary">
                  Join as Guest
                </Link>
              </>
            )}
          </div>
        </>
      ) : (
        !error && <p className="loading">Loading meeting…</p>
      )}
    </>
  );
}
