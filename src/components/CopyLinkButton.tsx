"use client";

import { useState } from "react";

export function CopyLinkButton({
  text,
  label = "Copy",
  className = "shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-accent",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — the value is still
      // visible as selectable text, so there's nothing further to fall back to.
    }
  }

  return (
    <button onClick={handleCopy} className={className}>
      {copied ? "Copied!" : label}
    </button>
  );
}
