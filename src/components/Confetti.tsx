"use client";

import { useEffect, useState } from "react";

const COLORS = ["#8A9A6E", "#D9A44E", "#E8916B", "#6E93A9", "#B98AA6"];
const PIECE_COUNT = 28;

interface Piece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  rotation: number;
  color: string;
}

function generatePieces(): Piece[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.3,
    duration: 1.6 + Math.random() * 0.9,
    rotation: Math.random() * 360,
    color: COLORS[i % COLORS.length],
  }));
}

// Pure CSS confetti burst — no external dependency needed for a one-shot
// celebration moment. Unmounts itself after the longest piece finishes falling.
export function Confetti({ celebrationKey }: { celebrationKey: number | string }) {
  const [pieces, setPieces] = useState<Piece[] | null>(null);

  useEffect(() => {
    if (!celebrationKey) return;
    // celebrationKey only changes in response to an external event (a bill
    // transitioning to fully settled), not on every render — this is the
    // "synchronize with an external trigger" case the effect rule allows.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPieces(generatePieces());
    const timer = setTimeout(() => setPieces(null), 2600);
    return () => clearTimeout(timer);
  }, [celebrationKey]);

  if (!pieces) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            left: `${p.left}%`,
            top: "-10px",
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
          className="absolute h-2.5 w-1.5 rounded-sm confetti-piece"
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          to {
            transform: translateY(100vh) rotate(540deg);
            opacity: 0.2;
          }
        }
        .confetti-piece {
          animation-name: confetti-fall;
          animation-timing-function: ease-in;
          animation-fill-mode: forwards;
        }
      `}</style>
    </div>
  );
}
