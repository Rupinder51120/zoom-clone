"use client";
import { useEffect, useRef, useState } from "react";
import { X, Send } from "lucide-react";
import type { ChatEntry } from "@/hooks/use-call";

export function MeetingChat({
  messages,
  onSend,
  onClose,
  connected,
}: {
  messages: ChatEntry[];
  onSend: (text: string) => void;
  onClose: () => void;
  connected: boolean;
}) {
  const [draft, setDraft] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);
  return (
    <aside className="participants-panel chat-panel" aria-label="Meeting chat">
      <div className="participants-heading">
        <h2>Meeting Chat</h2>
        <button onClick={onClose} aria-label="Close chat">
          <X size={18} />
        </button>
      </div>
      <p className="chat-hint">
        To everyone · Available while this room is live
      </p>
      <div
        className="chat-messages"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {!messages.length && (
          <p className="muted">No messages yet. Say hello!</p>
        )}
        {messages.map((message) => (
          <article className="chat-message" key={message.id}>
            <div>
              <strong>{message.display_name}</strong>
              <time dateTime={message.sent_at}>
                {new Date(message.sent_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </div>
            <p>{message.text}</p>
          </article>
        ))}
        <div ref={bottom} />
      </div>
      <form
        className="chat-compose"
        onSubmit={(event) => {
          event.preventDefault();
          if (!connected || !draft.trim()) return;
          onSend(draft.trim());
          setDraft("");
        }}
      >
        <label htmlFor="chat-message">Message everyone</label>
        <textarea
          id="chat-message"
          maxLength={2000}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type a message…"
          rows={3}
        />
        <button className="primary" disabled={!connected || !draft.trim()}>
          <Send size={15} /> Send
        </button>
      </form>
    </aside>
  );
}
