import {
  BookOpen, FlaskConical, Stethoscope, Presentation, ClipboardCheck, CircleDot,
  type LucideIcon,
} from "lucide-react";

export interface LessonTypeStyle {
  label: string;
  icon: LucideIcon;
  /** tailwind classes for badge */
  badge: string;
  /** colored left border for table row / card accent */
  accent: string;
  /** subtle row background */
  rowBg: string;
}

export const LESSON_TYPE_STYLE: Record<string, LessonTypeStyle> = {
  theoretical: {
    label: "Teórica",
    icon: BookOpen,
    badge: "bg-info-soft text-info border-info/30",
    accent: "border-l-info",
    rowBg: "hover:bg-info-soft/50",
  },
  practical: {
    label: "Prática",
    icon: FlaskConical,
    badge: "bg-success-soft text-success border-success/30",
    accent: "border-l-success",
    rowBg: "hover:bg-success-soft/50",
  },
  simulation: {
    label: "Simulação",
    icon: Stethoscope,
    badge: "bg-brand-soft text-brand-text border-primary/20",
    accent: "border-l-primary",
    rowBg: "hover:bg-brand-soft/50",
  },
  seminar: {
    label: "Seminário / Caso clínico",
    icon: Presentation,
    badge: "bg-warning-soft text-warning-ink border-warning/30",
    accent: "border-l-warning",
    rowBg: "hover:bg-warning-soft/50",
  },
  assessment: {
    label: "Avaliação / Prova",
    icon: ClipboardCheck,
    badge: "bg-destructive/10 text-destructive border-destructive/30",
    accent: "border-l-destructive",
    rowBg: "hover:bg-destructive/5",
  },
  other: {
    label: "Outro",
    icon: CircleDot,
    badge: "bg-muted text-muted-foreground border-border",
    accent: "border-l-muted-foreground/40",
    rowBg: "hover:bg-muted/30",
  },
};

export function getLessonTypeStyle(type: string): LessonTypeStyle {
  return LESSON_TYPE_STYLE[type] ?? LESSON_TYPE_STYLE.other;
}
