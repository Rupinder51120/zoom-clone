"use client";
import Link from "next/link";
import { useState } from "react";
import { Video, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Logo } from "./navigation";
import { api } from "@/lib/api";

export default function AuthForm({ signup = false }: { signup?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      await api(`/api/auth/${signup ? "signup" : "signin"}`, {
        method: "POST",
        body: JSON.stringify({
          email: data.get("email"),
          password: data.get("password"),
          ...(signup
            ? {
                display_name:
                  `${String(data.get("first")).trim()} ${String(data.get("last")).trim()}`.trim(),
              }
            : {}),
        }),
      });
      sessionStorage.clear();
      window.location.assign("/");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <header className="auth-header">
        <Logo />
        <nav>
          {signup ? "Already have an account?" : "New to ZOOM-CLONE?"}{" "}
          <Link href={signup ? "/signin" : "/signup"}>
            {signup ? "Sign In" : "Sign Up Free"}
          </Link>
          <Link href="/join">Join Meeting</Link>
          <a href="https://support.zoom.com" target="_blank" rel="noreferrer">
            Support
          </a>
        </nav>
      </header>
      <main className="auth-content">
        <aside className="auth-aside">
          <Video size={120} strokeWidth={1} />
          <div className="auth-benefits">
            <h2>{signup ? "Create your account" : "Connect with your team"}</h2>
            {[
              "Create and schedule meetings",
              "Share invitations with your team",
              "Join with audio, video, and screen sharing",
            ].map((text) => (
              <p key={text}>
                <CheckCircle2 size={20} />
                {text}
              </p>
            ))}
          </div>
        </aside>
        <section className="auth-panel">
          <h1>{signup ? "Sign up" : "Sign in"}</h1>
          <form onSubmit={submit} className="auth-form">
            {signup && (
              <>
                <label htmlFor="first-name">First name</label>
                <input
                  id="first-name"
                  name="first"
                  autoComplete="given-name"
                  required
                  maxLength={50}
                />
                <label htmlFor="last-name">Last name</label>
                <input
                  id="last-name"
                  name="last"
                  autoComplete="family-name"
                  maxLength={49}
                />
              </>
            )}
            <label htmlFor="auth-email">Email address</label>
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
            <label htmlFor="auth-password">Password</label>
            <div className="password-field">
              <input
                id="auth-password"
                name="password"
                type={visible ? "text" : "password"}
                autoComplete={signup ? "new-password" : "current-password"}
                required
                minLength={signup ? 12 : 1}
                maxLength={128}
              />
              <button
                type="button"
                onClick={() => setVisible(!visible)}
                aria-label={visible ? "Hide password" : "Show password"}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {signup && (
              <p className="form-hint">
                Use at least 12 characters. Spaces and passphrases are
                supported.
              </p>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary" disabled={busy}>
              {busy ? "Please wait…" : signup ? "Create Account" : "Sign In"}
            </button>
            <Link href="/" className="text-button">
              Continue without an account
            </Link>
            <p className="form-hint">ZOOM-CLONE · Fullstack assignment demo</p>
          </form>
        </section>
      </main>
    </div>
  );
}
