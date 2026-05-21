import { Check, Loader2, AlertCircle, Save } from "lucide-react";
import type { DraftStatus } from "@/hooks/use-form-draft";

interface Props {
  status: DraftStatus;
  lastSavedAt: Date | null;
}

export default function DraftStatusBadge({ status, lastSavedAt }: Props) {
  const time = lastSavedAt
    ? lastSavedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;

  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Salvando rascunho…
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-destructive">
        <AlertCircle className="h-3 w-3" /> Falha ao salvar rascunho
      </span>
    );
  }
  if (status === "saved" && time) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Check className="h-3 w-3 text-green-600" /> Rascunho salvo às {time}
      </span>
    );
  }
  if (lastSavedAt && time) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Save className="h-3 w-3" /> Último rascunho às {time}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70">
      <Save className="h-3 w-3" /> Salvamento automático ativo
    </span>
  );
}
