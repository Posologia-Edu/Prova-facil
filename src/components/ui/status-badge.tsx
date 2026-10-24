import * as React from "react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Um selo para todo estado do sistema. O significado da cor é fixo:
// ok = concluído/correto · warn = atenção/pendente · bad = erro/crítico · info = treino/neutro · brand = avaliativo · accent = destaque
export type StatusTone = "ok" | "warn" | "bad" | "info" | "brand" | "accent" | "neutral";

const TONE_VARIANT: Record<StatusTone, NonNullable<BadgeProps["variant"]>> = {
  ok: "success",
  warn: "warning",
  bad: "destructive",
  info: "info",
  brand: "default",
  accent: "secondary",
  neutral: "neutral",
};

interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  tone?: StatusTone;
  /** mostra o ponto de estado antes do texto (usar em estados que mudam: Ao vivo, Rascunho) */
  dot?: boolean;
}

function StatusBadge({ tone = "neutral", dot = false, className, children, ...props }: StatusBadgeProps) {
  return (
    <Badge variant={TONE_VARIANT[tone]} className={cn(className)} {...props}>
      {dot && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </Badge>
  );
}

export { StatusBadge };
