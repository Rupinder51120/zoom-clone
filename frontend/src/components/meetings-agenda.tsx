"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  CalendarDays,
} from "lucide-react";
import { api, Meeting, Profile } from "@/lib/api";
import { MeetingList } from "./dashboard";

export function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function calendarFile(meetings: Meeting[]) {
  const escape = (text: string) =>
    text
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  const stamp = (date: Date) =>
    date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ZOOM-CLONE//Meetings//EN",
    ...meetings
      .filter((m) => m.scheduled_start && m.status !== "ended")
      .flatMap((m) => {
        const start = new Date(m.scheduled_start!);
        return [
          "BEGIN:VEVENT",
          `UID:${m.code}@zoom-clone`,
          `DTSTAMP:${stamp(new Date())}`,
          `DTSTART:${stamp(start)}`,
          `DTEND:${stamp(new Date(start.getTime() + m.duration_minutes * 60000))}`,
          `SUMMARY:${escape(m.title)}`,
          `DESCRIPTION:${escape(m.description)}`,
          `URL:${window.location.origin}/join?meeting=${m.code}`,
          "END:VEVENT",
        ];
      }),
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
export default function MeetingsAgenda({
  searchQuery = "",
  recent = false,
}: {
  searchQuery?: string;
  recent?: boolean;
}) {
  const [selected, setSelected] = useState<Date | null>(null);
  const [month, setMonth] = useState<Date | null>(null);
  const [view, setView] = useState(recent ? "previous" : "upcoming");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  function load() {
    setLoading(true);
    setError("");
    api<Meeting[]>("/api/meetings")
      .then(setMeetings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    const today = new Date();
    setSelected(today);
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    load();
    api<Profile>("/api/profile")
      .then(setProfile)
      .catch(() => {});
  }, []);
  useEffect(
    () => setView(recent ? "previous" : "upcoming"),
    [recent, searchQuery],
  );
  function navigate(offset: number) {
    if (month)
      setMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1));
  }
  function today() {
    const date = new Date();
    setSelected(date);
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setView("agenda");
  }
  function exportCalendar() {
    const url = URL.createObjectURL(
      new Blob([calendarFile(meetings)], {
        type: "text/calendar;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "zoom-clone-meetings.ics";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const dates = month
    ? Array.from(
        { length: 42 },
        (_, i) =>
          new Date(
            month.getFullYear(),
            month.getMonth(),
            1 - month.getDay() + i,
          ),
      )
    : [];
  const visible = meetings
    .filter(
      (m) =>
        `${m.title} ${m.code}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) &&
        (view === "previous"
          ? m.status === "ended"
          : view === "upcoming"
            ? m.status !== "ended"
            : selected &&
              dayKey(
                new Date(m.scheduled_start || m.started_at || m.ended_at || ""),
              ) === dayKey(selected)),
    )
    .sort(
      (a, b) =>
        new Date(a.scheduled_start || a.started_at || "").getTime() -
        new Date(b.scheduled_start || b.started_at || "").getTime(),
    );
  return (
    <section className="calendar-workspace" aria-label="Meetings calendar">
      <div className="calendar-notice">
        <CalendarDays size={22} />
        <span>
          Your meetings are saved in this workspace. Export them to add to your
          calendar.
        </span>
        <button
          className="link-button"
          onClick={exportCalendar}
          disabled={loading}
        >
          Export calendar
        </button>
      </div>
      <div className="calendar-columns">
        <aside className="mini-calendar">
          <div className="calendar-heading">
            <strong>Calendar</strong>
            <Link
              className="calendar-add"
              href="/meeting/schedule"
              aria-label="Schedule a Meeting"
            >
              <Plus />
            </Link>
          </div>
          <div className="month-navigation">
            <button aria-label="Previous year" onClick={() => navigate(-12)}>
              «
            </button>
            <button aria-label="Previous month" onClick={() => navigate(-1)}>
              <ChevronLeft size={18} />
            </button>
            <strong>
              {month?.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </strong>
            <button aria-label="Next month" onClick={() => navigate(1)}>
              <ChevronRight size={18} />
            </button>
            <button aria-label="Next year" onClick={() => navigate(12)}>
              »
            </button>
          </div>
          <div className="calendar-grid">
            {"SMTWTFS".split("").map((d, i) => (
              <span key={i}>{d}</span>
            ))}
            {dates.map((date) => (
              <button
                key={dayKey(date)}
                aria-label={date.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                aria-pressed={!!selected && dayKey(date) === dayKey(selected)}
                className={
                  date.getMonth() !== month?.getMonth() ? "outside-month" : ""
                }
                onClick={() => {
                  setSelected(date);
                  setView("agenda");
                }}
              >
                {date.getDate()}
              </button>
            ))}
          </div>
          <p className="calendar-owner">
            <span className="presence-dot available" />
            {profile?.display_name || "Your workspace"}
          </p>
          <p className="muted">Dates use your device’s time zone.</p>
        </aside>
        <div className="agenda-content">
          <div className="agenda-toolbar">
            <button className="secondary" onClick={today}>
              Today
            </button>
            <button
              aria-label="Previous day"
              onClick={() => {
                if (selected) {
                  const d = new Date(selected);
                  d.setDate(d.getDate() - 1);
                  setSelected(d);
                  setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                  setView("agenda");
                }
              }}
            >
              <ChevronLeft />
            </button>
            <button
              aria-label="Next day"
              onClick={() => {
                if (selected) {
                  const d = new Date(selected);
                  d.setDate(d.getDate() + 1);
                  setSelected(d);
                  setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                  setView("agenda");
                }
              }}
            >
              <ChevronRight />
            </button>
            <h1>
              {month?.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              }) || "Meetings"}
            </h1>
            <button
              aria-label="Refresh meetings"
              onClick={load}
              disabled={loading}
            >
              <RefreshCw size={20} />
            </button>
            <select
              aria-label="Meeting view"
              value={view}
              onChange={(e) => setView(e.target.value)}
            >
              <option value="agenda">Agenda</option>
              <option value="upcoming">Upcoming</option>
              <option value="previous">Previous</option>
            </select>
          </div>
          <h2>
            {view === "agenda"
              ? selected?.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })
              : view === "upcoming"
                ? "Upcoming Meetings"
                : "Previous Meetings"}
          </h2>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {loading ? (
            <p className="loading">Loading your meetings…</p>
          ) : (
            <MeetingList meetings={visible} onError={setError} />
          )}
        </div>
      </div>
    </section>
  );
}
