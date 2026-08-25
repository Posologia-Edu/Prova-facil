import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, RotateCcw, KeyRound } from "lucide-react";
import { toast } from "sonner";

interface ReopenExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: string | null;
  examTitle: string;
  publicationId: string | null;
  onReopened?: () => void;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ReopenExamDialog({
  open,
  onOpenChange,
  examId,
  examTitle,
  publicationId,
  onReopened,
}: ReopenExamDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [prevStart, setPrevStart] = useState<string | null>(null);
  const [prevEnd, setPrevEnd] = useState<string | null>(null);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [timeLimit, setTimeLimit] = useState("60");
  const [justification, setJustification] = useState("");

  useEffect(() => {
    if (!open || !publicationId) return;
    setLoading(true);
    setJustification("");
    (async () => {
      const { data, error } = await supabase
        .from("exam_publications")
        .select("access_code, start_at, end_at, time_limit_minutes")
        .eq("id", publicationId)
        .maybeSingle();
      setLoading(false);
      if (error || !data) {
        toast.error("Erro ao carregar a publicação da prova.");
        return;
      }
      setAccessCode(data.access_code);
      setPrevStart(data.start_at);
      setPrevEnd(data.end_at);
      setStartAt(toLocalInput(data.start_at));
      setEndAt(toLocalInput(data.end_at));
      setTimeLimit(String(data.time_limit_minutes ?? 60));
    })();
  }, [open, publicationId]);

  const handleReopen = async () => {
    if (!publicationId || !examId) return;
    if (justification.trim().length < 10) {
      toast.error("Descreva a justificativa da reabertura (mín. 10 caracteres).");
      return;
    }
    if (!endAt) {
      toast.error("Informe a nova data limite da aplicação.");
      return;
    }

    const newStart = startAt ? new Date(startAt).toISOString() : null;
    const newEnd = new Date(endAt).toISOString();
    if (new Date(newEnd) <= new Date()) {
      toast.error("A nova data limite deve ser no futuro.");
      return;
    }

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setSaving(false);
      toast.error("Faça login primeiro.");
      return;
    }

    const { error: pubError } = await supabase
      .from("exam_publications")
      .update({
        is_active: true,
        start_at: newStart,
        end_at: newEnd,
        time_limit_minutes: parseInt(timeLimit) || 60,
      })
      .eq("id", publicationId);

    if (pubError) {
      setSaving(false);
      toast.error("Erro ao reabrir a prova.");
      return;
    }

    const { error: logError } = await supabase.from("exam_reopen_logs").insert({
      publication_id: publicationId,
      exam_id: examId,
      user_id: session.user.id,
      justification: justification.trim(),
      previous_start_at: prevStart,
      previous_end_at: prevEnd,
      new_start_at: newStart,
      new_end_at: newEnd,
    });

    // Reactivate the exam so it leaves the "grading" state
    await supabase.from("exams").update({ status: "in_progress" }).eq("id", examId);

    setSaving(false);

    if (logError) {
      toast.warning("Prova reaberta, mas houve falha ao registrar a justificativa.");
    } else {
      toast.success("Prova reaberta e justificativa registrada.");
    }
    onReopened?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Reabrir prova
          </DialogTitle>
          <DialogDescription className="line-clamp-2">{examTitle}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-1">
            <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">PIN mantido</p>
                <p className="font-mono text-lg font-bold tracking-widest uppercase">
                  {accessCode ?? "—"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Novo início (opcional)</Label>
                <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Nova data limite</Label>
                <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Tempo limite (minutos)</Label>
              <Input type="number" min={5} max={300} value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Justificativa da reabertura *</Label>
              <Textarea
                rows={4}
                placeholder="Ex.: A turma não conseguiu concluir a prova dentro da janela original por instabilidade de internet no laboratório."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A justificativa fica registrada no sistema com data, hora e autor.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleReopen} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
            Reabrir prova
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
