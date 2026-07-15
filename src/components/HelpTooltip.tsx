"use client";

import { useState } from "react";

export function HelpTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Help"
        aria-expanded={open}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-muted text-[10px] font-medium leading-none text-muted"
      >
        ?
      </button>
      {open ? (
        <span className="absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded-xl border border-border bg-surface p-2.5 text-xs font-normal text-muted shadow-md">
          {text}
        </span>
      ) : null}
    </span>
  );
}
