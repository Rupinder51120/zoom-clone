"use client";
import Link from "next/link";
import { SchedulePlaceholders } from "./placeholder-control";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, Plus, Info } from "lucide-react";
import { api, Meeting, saveHost } from "@/lib/api";
// Convert wall-clock values in an IANA zone into an instant, including DST offsets.
function zonedDate(date: string, time: string, zone: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const target = Date.UTC(y, m - 1, d, h, min);
  let instant = target;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  for (let i = 0; i < 3; i++) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(instant)).map((p) => [p.type, p.value]),
    );
    const represented = Date.UTC(
      +parts.year,
      +parts.month - 1,
      +parts.day,
      +parts.hour,
      +parts.minute,
      +parts.second,
    );
    instant += target - represented;
  }
  const check = Object.fromEntries(
    formatter.formatToParts(new Date(instant)).map((p) => [p.type, p.value]),
  );
  if (+check.hour !== h || +check.minute !== min || +check.day !== d)
    throw new Error(
      "That time does not exist in the selected timezone. Choose another time.",
    );
  return new Date(instant).toISOString();
}
export default function Schedule() {
  const router = useRouter();
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const tomorrow = new Date(Date.now() + 86400000);
  const defaultDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(tomorrow);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const timezone = String(f.get("timezone"));
      const [hour, minute] = String(f.get("time")).split(":").map(Number);
      const hour24 = (hour % 12) + (f.get("period") === "PM" ? 12 : 0);
      const scheduled_start = zonedDate(
        String(f.get("date")),
        `${hour24.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
        timezone,
      );
      const result = await api<Meeting & { host_token: string }>(
        "/api/meetings",
        {
          method: "POST",
          body: JSON.stringify({
            title: f.get("title"),
            description: f.get("description") || "",
            scheduled_start,
            timezone,
            duration_minutes:
              Number(f.get("hours")) * 60 + Number(f.get("minutes")),
            video_on: f.get("video") === "on",
          }),
        },
      );
      saveHost(result.code, result.host_token);
      router.push(`/meetings/${result.code}?scheduled=1`);
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
      <h1>Schedule Meeting</h1>
      <form onSubmit={submit} className="schedule-form">
        <div className="form-row">
          <label className="row-label" htmlFor="topic">
            <span className="required">*</span>Topic
          </label>
          <div className="field-content">
            <input
              id="topic"
              name="title"
              defaultValue="My Meeting"
              required
              maxLength={200}
            />
            {descriptionOpen ? (
              <textarea
                name="description"
                aria-label="Description"
                placeholder="Add a description"
                maxLength={5000}
                style={{ marginTop: 18 }}
              />
            ) : (
              <button
                type="button"
                className="text-button description-toggle"
                onClick={() => setDescriptionOpen(true)}
              >
                <Plus size={17} />
                Add Description
              </button>
            )}
          </div>
        </div>
        <div className="form-row">
          <label className="row-label" htmlFor="date">
            When
          </label>
          <div className="field-content date-fields">
            <input
              id="date"
              type="date"
              name="date"
              defaultValue={defaultDate}
              required
            />
            <select
              name="time"
              aria-label="Meeting start time"
              defaultValue="10:30"
              required
              className="start-time"
            >
              {Array.from({ length: 48 }, (_, i) => {
                const value = `${Math.floor(i / 4) + 1}:${((i % 4) * 15).toString().padStart(2, "0")}`;
                return <option key={value}>{value}</option>;
              })}
            </select>
            <select name="period" aria-label="AM or PM" defaultValue="AM">
              <option>AM</option>
              <option>PM</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <label className="row-label" htmlFor="hours">
            Duration
          </label>
          <div className="field-content duration-fields">
            <select id="hours" name="hours" defaultValue="0">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
            <span>hr</span>
            <select
              name="minutes"
              aria-label="Duration minutes"
              defaultValue="40"
            >
              {[0, 5, 10, 15, 20, 30, 40, 45, 50, 55].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
            <span>min</span>
          </div>
        </div>
        <div className="form-row">
          <label className="row-label" htmlFor="timezone">
            Time Zone
          </label>
          <div className="field-content">
            <select id="timezone" name="timezone" defaultValue="Asia/Kolkata">
              <option value="Asia/Kolkata">(GMT+5:30) India</option>
              <option value="UTC">(GMT+0:00) UTC</option>
              <option value="Europe/London">London</option>
              <option value="America/New_York">
                Eastern Time (US and Canada)
              </option>
              <option value="America/Los_Angeles">
                Pacific Time (US and Canada)
              </option>
              <option value="Asia/Singapore">(GMT+8:00) Singapore</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <span className="row-label">Meeting ID</span>
          <div className="field-content">
            <p>Generate Automatically</p>
            <p className="form-hint">
              A unique meeting ID and invitation link are created when you save.
            </p>
          </div>
        </div>
        <div className="settings-divider" />
        <div className="form-row">
          <span className="row-label">Video</span>
          <div className="field-content">
            <p className="muted" style={{ fontSize: 13, marginBottom: 7 }}>
              Host
            </p>
            <div className="radio-options">
              <label>
                <input type="radio" name="video" value="on" defaultChecked />
                On
              </label>
              <label>
                <input type="radio" name="video" value="off" />
                Off
              </label>
            </div>
          </div>
        </div>
        <div className="form-row">
          <span className="row-label">Audio</span>
          <div className="field-content">
            <p>Computer Audio</p>
          </div>
        </div>
        <div className="notice">
          <Info size={20} />
          <p>
            Share the invitation link after saving. Guests can join from their
            browser without creating an account.
          </p>
        </div>
        <SchedulePlaceholders />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
          <Link href="/meetings" className="secondary">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
