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
    badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
    accent: "border-l-blue-500",
    rowBg: "hover:bg-blue-500/5",
  },
  practical: {
    label: "Prática",
    icon: FlaskConical,
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    accent: "border-l-emerald-500",
    rowBg: "hover:bg-emerald-500/5",
  },
  simulation: {
    label: "Simulação",
    icon: Stethoscope,
    badge: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
    accent: "border-l-purple-500",
    rowBg: "hover:bg-purple-500/5",
  },
  seminar: {
    label: "Seminário / Caso clínico",
    icon: Presentation,
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    accent: "border-l-amber-500",
    rowBg: "hover:bg-amber-500/5",
  },
  assessment: {
    label: "Avaliação / Prova",
    icon: ClipboardCheck,
    badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
    accent: "border-l-rose-500",
    rowBg: "hover:bg-rose-500/5",
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
