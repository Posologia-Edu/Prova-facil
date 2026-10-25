import { useState, useEffect, useCallback, useRef } from "react";

interface Props {
  durationMinutes: number;
  isRunning: boolean;
  onTimeUp?: () => void;
  startedAt?: string | null;
}

export function OsceTimer({ durationMinutes, isRunning, onTimeUp, startedAt }: Props) {
  const [remaining, setRemaining] = useState(durationMinutes * 60);
  const onTimeUpRef = useRef(onTimeUp);
  const firedRef = useRef(false);
  onTimeUpRef.current = onTimeUp;

  // Reset when startedAt changes (new student enters)
  useEffect(() => {
    firedRef.current = false;
    if (startedAt && isRunning) {
      const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      const r = Math.max(0, durationMinutes * 60 - elapsed);
      setRemaining(r);
    } else if (!isRunning) {
      setRemaining(durationMinutes * 60);
    }
  }, [startedAt, isRunning, durationMinutes]);

  useEffect(() => {
    if (!isRunning || remaining <= 0) {
      if (remaining <= 0 && isRunning && !firedRef.current) {
        firedRef.current = true;
        onTimeUpRef.current?.();
      }
      return;
    }
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!firedRef.current) {
            firedRef.current = true;
            onTimeUpRef.current?.();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, remaining]);

  const total = durationMinutes * 60;
  const pct = total > 0 ? remaining / total : 0;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  let colorClass = "text-success bg-success/10 border-success/40";
  let barColor = "bg-success";
  if (pct <= 0.25) {
    colorClass = "text-destructive bg-destructive/10 border-destructive/40 animate-pulse";
    barColor = "bg-destructive";
  } else if (pct <= 0.5) {
    colorClass = "text-warning-ink bg-warning/10 border-warning/40";
    barColor = "bg-warning";
  }

  return (
    <div className={`rounded-xl border-2 p-4 transition-colors ${colorClass}`}>
      <div className="text-center">
        <div className="text-4xl font-mono font-bold tabular-nums">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
        <div className="text-xs mt-1 opacity-70">
          {isRunning ? "Em andamento" : "Aguardando início"}
        </div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-black/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}
