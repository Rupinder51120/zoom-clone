"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PortalShell } from "./navigation";
import Dashboard from "./dashboard";
import Link from "next/link";
import { WorkflowDialog } from "./workflow-dialog";
import { api, Meeting } from "@/lib/api";
export function parseMeeting(value: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      return (
        url.searchParams.get("meeting") ||
        url.pathname.split("/").filter(Boolean).pop() ||
        ""
      ).replace(/[\s-]/g, "");
    } catch {
      return "";
    }
  }
  return trimmed.replace(/[\s-]/g, "");
}
function JoinForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [name, setName] = useState("");
  const [audioOff, setAudioOff] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setValue(params.get("meeting") || "");
    setName(localStorage.getItem("guest-name") || "");
  }, [params]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const code = parseMeeting(value);
    if (!/^\d{11}$/.test(code)) {
      setError("Enter a valid 11-digit meeting ID or invitation link.");
      setBusy(false);
      return;
    }
    try {
      const meeting = await api<Meeting>(`/api/meetings/${code}`);
      if (meeting.status === "ended")
        throw new Error("This meeting has ended.");
      if (name.trim()) localStorage.setItem("guest-name", name.trim());
      router.push(
        `/room/${code}?video=${videoOff ? "0" : "1"}&audio=${audioOff ? "0" : "1"}`,
      );
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <main className="join-main">
      <h1>Join Meeting</h1>
      <form className="join-form" onSubmit={submit}>
        <label htmlFor="meeting-id">Meeting ID or Invite Link</label>
        <input
          id="meeting-id"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter Meeting ID or Invite Link"
          autoFocus
          autoComplete="off"
          aria-describedby={error ? "join-error" : undefined}
        />
        <label htmlFor="join-name">Your Name</label>
        <input
          id="join-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={100}
          placeholder="Enter your display name"
        />
        <label className="join-option">
          <input
            type="checkbox"
            checked={audioOff}
            onChange={(event) => setAudioOff(event.target.checked)}
          />{" "}
          Don’t connect to audio
        </label>
        <label className="join-option">
          <input
            type="checkbox"
            checked={videoOff}
            onChange={(event) => setVideoOff(event.target.checked)}
          />{" "}
          Turn off my video
        </label>
        {error && (
          <p id="join-error" className="error" role="alert">
            {error}
          </p>
        )}
        <div className="join-buttons">
          <Link className="secondary" href="/">
            Cancel
          </Link>
          <button
            className="primary join-submit"
            disabled={!value.trim() || busy}
          >
            {busy ? "Joining…" : "Join"}
          </button>
        </div>
        <p className="join-terms">
          Join from your browser. You can change your audio and video settings
          in the preview before entering.
        </p>
      </form>
      <p className="room-system-note">
        Join directly from your browser. No download required.
      </p>
    </main>
  );
}
export default function Join() {
  return (
    <PortalShell>
      <Dashboard />
      <WorkflowDialog label="Join Meeting">
        <Suspense fallback={<main className="join-main">Loading…</main>}>
          <JoinForm />
        </Suspense>
      </WorkflowDialog>
    </PortalShell>
  );
}
