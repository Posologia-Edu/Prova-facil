import * as React from "react";

import { cn } from "@/lib/utils";

interface ScoreRingProps {
  /** progresso de 0 a 1 */
  value: number;
  /** texto no centro (a nota, a porcentagem) */
  label: React.ReactNode;
  size?: number;
  stroke?: number;
  tone?: "accent" | "ok" | "bad";
  className?: string;
  "aria-label"?: string;
}

const TONE_STROKE: Record<NonNullable<ScoreRingProps["tone"]>, string> = {
  accent: "stroke-highlight",
  ok: "stroke-success",
  bad: "stroke-destructive",
};

// Anel de progresso: leitura imediata de nota ou cobertura, no lugar de selos com texto longo.
function ScoreRing({ value, label, size = 116, stroke = 9, tone = "accent", className, ...props }: ScoreRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={props["aria-label"]}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-sunken" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          className={cn("transition-[stroke-dashoffset] duration-500", TONE_STROKE[tone])}
        />
      </svg>
      <span className="num absolute text-[1.75rem] font-medium leading-none">{label}</span>
    </div>
  );
}

export { ScoreRing };
