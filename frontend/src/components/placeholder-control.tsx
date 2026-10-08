"use client";
import { useRef } from "react";
import { X } from "lucide-react";

/** Reference-only controls never issue API calls or pretend to save settings. */
export function PlaceholderControl({
  label,
  children,
  className = "",
  description,
}: {
  label: string;
  children?: React.ReactNode;
  className?: string;
  description?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => ref.current?.showModal()}
        title={`${label} — preview only`}
      >
        {children || label}
      </button>
      <dialog
        ref={ref}
        className="placeholder-dialog"
        aria-label={`${label} preview`}
        onClick={(e) => {
          if (e.target === e.currentTarget) ref.current?.close();
        }}
      >
        <div className="placeholder-heading">
          <h2>{label}</h2>
          <button
            type="button"
            aria-label={`Close ${label} preview`}
            onClick={() => ref.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <span className="preview-badge">Preview only</span>
        <p>
          {description ||
            `${label} is a visual placeholder and is not available in this demo.`}
        </p>
        <button
          type="button"
          className="primary"
          onClick={() => ref.current?.close()}
        >
          Got it
        </button>
      </dialog>
    </>
  );
}
export function SchedulePlaceholders() {
  return (
    <details className="schedule-preview-options">
      <summary>More Options</summary>
      <p className="form-hint">
        Reference-only options below are not saved or enforced.
      </p>
      <fieldset disabled>
        <legend>Meeting Security · Preview only</legend>
        <label>
          <input type="checkbox" /> Passcode
        </label>
        <input placeholder="Passcode" aria-label="Preview passcode" />
        <label>
          <input type="checkbox" /> Waiting Room
        </label>
      </fieldset>
      <fieldset disabled>
        <legend>Encryption · Preview only</legend>
        <label>
          <input type="radio" name="preview-encryption" /> Enhanced encryption
        </label>
        <label>
          <input type="radio" name="preview-encryption" /> End-to-end encryption
        </label>
      </fieldset>
      <fieldset disabled>
        <legend>Zoom AI · Preview only</legend>
        <label>
          <input type="checkbox" /> Automatically start Zoom AI
        </label>
        <label>
          <input type="checkbox" /> Automatically start meeting questions
        </label>
        <label>
          <input type="checkbox" /> Automatically start meeting summary
        </label>
      </fieldset>
      <fieldset disabled>
        <legend>Meeting options · Preview only</legend>
        <label>
          Repeat{" "}
          <select defaultValue="Never">
            <option>Never</option>
            <option>Daily</option>
            <option>Weekly</option>
          </select>
        </label>
        <label>
          Invitees <input placeholder="Add invitees" />
        </label>
        <label>
          <input type="radio" /> Personal Meeting ID
        </label>
        <label>
          <input type="checkbox" /> Allow meeting chat before and after the
          meeting
        </label>
        <label>
          <input type="checkbox" /> Allow meeting transcript with My Notes
        </label>
        <label>
          <input type="checkbox" /> Participant video on
        </label>
      </fieldset>
      <div className="preview-option-actions">
        {[
          "Create agenda",
          "Add attachments",
          "Attach workflow",
          "Whiteboard",
          "Calendar integration",
          "Advanced",
        ].map((label) => (
          <PlaceholderControl
            key={label}
            label={label}
            className="text-button"
          />
        ))}
      </div>
    </details>
  );
}
