/**
 * Unified exam status computation.
 * 
 * Status flow:
 *   draft → in_progress → grading → completed
 */

export type ExamEffectiveStatus = "draft" | "in_progress" | "grading" | "completed";

export interface PublicationInfo {
  is_active: boolean;
  end_at?: string | null;
  start_at?: string | null;
}

export function computeExamStatus(
  dbStatus: string,
  publication?: PublicationInfo | null,
): ExamEffectiveStatus {
  // Manual completed always wins
  if (dbStatus === "completed") return "completed";

  if (!publication) return (dbStatus as ExamEffectiveStatus) || "draft";

  const now = new Date();

  // Active publication within time window → in_progress
  if (publication.is_active) {
    // If there's an end_at and it's past → grading (shouldn't happen if is_active, but safety)
    if (publication.end_at && now > new Date(publication.end_at)) {
      return "grading";
    }
    return "in_progress";
  }

  // Inactive publication → grading (publication was deactivated or expired)
  if (publication.end_at && now > new Date(publication.end_at)) {
    return "grading";
  }

  // Publication exists but inactive and not expired yet → still grading (was manually deactivated)
  if (!publication.is_active) {
    return "grading";
  }

  return (dbStatus as ExamEffectiveStatus) || "draft";
}

export const examStatusConfig: Record<ExamEffectiveStatus, { label: string; className: string }> = {
  draft: { label: "EM ELABORAÇÃO", className: "bg-muted text-muted-foreground" },
  in_progress: { label: "EM APLICAÇÃO", className: "bg-warning text-warning-foreground" },
  grading: { label: "EM CORREÇÃO", className: "bg-primary text-primary-foreground" },
  completed: { label: "CONCLUÍDA", className: "bg-success text-success-foreground" },
};

export const examStatusBadgeVariant: Record<ExamEffectiveStatus, "secondary" | "default" | "destructive" | "outline"> = {
  draft: "secondary",
  in_progress: "default",
  grading: "default",
  completed: "secondary",
};
