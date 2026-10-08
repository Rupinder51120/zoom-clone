"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

/** Native modal supplies focus containment, Escape handling and inert background. */
export function WorkflowDialog({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="workflow-dialog"
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        router.push("/");
      }}
    >
      <button
        className="dialog-close"
        aria-label={`Close ${label}`}
        onClick={() => router.push("/")}
      >
        <X size={21} />
      </button>
      <div className="workflow-body">{children}</div>
    </dialog>
  );
}
