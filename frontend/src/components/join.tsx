"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header, Footer, HelpButton } from "./navigation";
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
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setValue(params.get("meeting") || "");
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
      router.push(`/room/${code}`);
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
        {error && (
          <p id="join-error" className="error" role="alert">
            {error}
          </p>
        )}
        <button
          className="primary join-submit"
          disabled={!value.trim() || busy}
        >
          {busy ? "Joining…" : "Join"}
        </button>
        <p className="join-terms">
          By clicking “Join”, you agree to our{" "}
          <a
            href="https://www.zoom.com/en/trust/terms/"
            target="_blank"
            rel="noreferrer"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="https://www.zoom.com/en/trust/privacy/"
            target="_blank"
            rel="noreferrer"
          >
            Privacy Statement
          </a>
          .
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
    <div className="public-page">
      <Header />
      <Suspense fallback={<main className="join-main">Loading…</main>}>
        <JoinForm />
      </Suspense>
      <Footer />
      <HelpButton />
    </div>
  );
}
