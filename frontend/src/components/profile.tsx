"use client";
import { useEffect, useState } from "react";
import { UserRound, ShieldCheck } from "lucide-react";
import { api, Profile as ProfileType } from "@/lib/api";
export default function Profile() {
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<ProfileType>("/api/profile")
      .then(setProfile)
      .catch((e) => setError(e.message));
  }, []);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      setProfile(
        await api<ProfileType>("/api/profile", {
          method: "PATCH",
          body: JSON.stringify({
            display_name: f.get("name"),
            timezone: f.get("timezone"),
          }),
        }),
      );
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="info-banner">
        <ShieldCheck size={24} />
        <p>
          When you join meetings, your display name is visible to the other
          participants. You are using the default account for this assignment
          demo.
        </p>
      </div>
      {profile ? (
        <>
          <div className="profile-intro">
            <div className="profile-picture">
              <UserRound size={90} fill="currentColor" strokeWidth={1} />
            </div>
            <div>
              <h1>{profile.display_name}</h1>
              <p className="muted">{profile.display_name}</p>
            </div>
          </div>
          <h2 className="profile-section-title">Personal information</h2>
          <form className="profile-form" onSubmit={save}>
            <div className="form-row">
              <label className="row-label" htmlFor="name">
                Display Name
              </label>
              <input
                id="name"
                name="name"
                defaultValue={profile.display_name}
                required
                maxLength={100}
              />
            </div>
            <div className="form-row">
              <span className="row-label">Email</span>
              <span className="row-label muted">{profile.email}</span>
            </div>
            <div className="form-row">
              <span className="row-label">Language</span>
              <span className="row-label">English</span>
            </div>
            <div className="form-row">
              <label className="row-label" htmlFor="profile-zone">
                Time Zone
              </label>
              <select
                id="profile-zone"
                name="timezone"
                defaultValue={profile.timezone}
              >
                <option value="Asia/Kolkata">(GMT+5:30) India</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">
                  Eastern Time (US and Canada)
                </option>
                <option value="Europe/London">London</option>
              </select>
            </div>
            <button className="primary" disabled={busy}>
              {busy ? "Saving…" : "Save Changes"}
            </button>
            {saved && (
              <p className="success" role="status" style={{ marginTop: 15 }}>
                Your profile has been updated.
              </p>
            )}
          </form>
        </>
      ) : (
        !error && <p className="loading">Loading profile…</p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
