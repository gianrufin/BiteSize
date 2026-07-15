"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DuplicateBillButton({
  sessionCode,
  className,
  label = "Duplicate",
}: {
  sessionCode: string;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [isDuplicating, setIsDuplicating] = useState(false);

  async function handleClick() {
    setIsDuplicating(true);
    try {
      const res = await fetch(`/api/sessions/${sessionCode}/duplicate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Could not duplicate bill");
      const data = await res.json();
      router.push(`/s/${data.code}`);
    } catch {
      setIsDuplicating(false);
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={isDuplicating} className={className}>
      {isDuplicating ? "Duplicating…" : label}
    </button>
  );
}
