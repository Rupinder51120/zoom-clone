export type Meeting = {
  code: string;
  title: string;
  description: string;
  scheduled_start: string | null;
  timezone: string;
  duration_minutes: number;
  status: "scheduled" | "active" | "ended";
  video_on: boolean;
  invite_link: string;
  started_at: string | null;
  ended_at: string | null;
};
export type Profile = { display_name: string; email: string; timezone: string };
export type Peer = {
  id: string;
  display_name: string;
  role: "host" | "guest";
  audio: boolean;
  video: boolean;
  sharing: boolean;
};
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/backend${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (
      response.status === 401 &&
      !path.startsWith("/api/auth/") &&
      typeof window !== "undefined"
    )
      window.location.assign("/signin");
    const detail = data.detail;
    throw new Error(
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((x: { msg: string }) => x.msg).join(". ")
          : "Unable to connect. Please try again.",
    );
  }
  return data;
}
export function formatCode(code: string) {
  return code.replace(/(\d{3})(\d{4})(\d{4})/, "$1 $2 $3");
}
export function saveHost(code: string, token: string) {
  sessionStorage.setItem(`host:${code}`, token);
}
export async function startMeeting(videoOn = true, screenOnly = false) {
  const meeting = await api<Meeting & { host_token: string }>("/api/meetings", {
    method: "POST",
    body: JSON.stringify({ title: "My Meeting", video_on: videoOn }),
  });
  saveHost(meeting.code, meeting.host_token);
  window.location.href = `/room/${meeting.code}?host=1&video=${videoOn ? "1" : "0"}${screenOnly ? "&share=1" : ""}`;
}
export async function openHostedMeeting(code: string) {
  const result = await api<{ host_token: string; video_on: boolean }>(
    `/api/meetings/${code}/host`,
    { method: "POST" },
  );
  saveHost(code, result.host_token);
  window.location.href = `/room/${code}?host=1&video=${result.video_on ? "1" : "0"}`;
}
export async function copyInvite(meeting: Meeting) {
  const link = `${window.location.origin}/join?meeting=${meeting.code}`;
  await navigator.clipboard.writeText(
    `${meeting.title}\nMeeting ID: ${formatCode(meeting.code)}\nJoin: ${link}`,
  );
}
