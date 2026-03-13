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
  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
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
      if (remaining <= 0 && isRunning) onTimeUpRef.current?.();
      return;
    }
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUpRef.current?.();
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

  let colorClass = "text-green-600 bg-green-50 border-green-200";
  let barColor = "bg-green-500";
  if (pct <= 0.25) {
    colorClass = "text-red-600 bg-red-50 border-red-200 animate-pulse";
    barColor = "bg-red-500";
  } else if (pct <= 0.5) {
    colorClass = "text-yellow-600 bg-yellow-50 border-yellow-200";
    barColor = "bg-yellow-500";
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
