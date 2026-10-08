"use client";
import { useState } from "react";
import { api } from "@/lib/api";
export default function PasswordSettings() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      await api("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({
          current_password: f.get("current"),
          new_password: f.get("new"),
        }),
      });
      sessionStorage.clear();
      window.location.assign("/signin");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <section className="password-settings">
      <h2>Change password</h2>
      <p className="muted">
        Changing your password signs out all account sessions.
      </p>
      <form onSubmit={submit}>
        <label htmlFor="current-password">Current password</label>
        <input
          id="current-password"
          name="current"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
        />
        <label htmlFor="new-password">New password</label>
        <input
          id="new-password"
          name="new"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
        />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy ? "Updating…" : "Change Password"}
        </button>
      </form>
    </section>
  );
}
