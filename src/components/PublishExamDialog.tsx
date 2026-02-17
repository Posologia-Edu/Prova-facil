import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Share2, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface PublishExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: string | null;
  examTitle: string;
}

export default function PublishExamDialog({ open, onOpenChange, examId, examTitle }: PublishExamDialogProps) {
  const [timeLimit, setTimeLimit] = useState("60");
  const [hasStartDate, setHasStartDate] = useState(false);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handlePublish = async () => {
    if (!examId) return;
    setPublishing(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Faça login primeiro."); return; }

    const { data, error } = await supabase
      .from("exam_publications")
      .insert({
        exam_id: examId,
        user_id: session.user.id,
        time_limit_minutes: parseInt(timeLimit) || 60,
        start_at: hasStartDate && startAt ? new Date(startAt).toISOString() : null,
        end_at: hasEndDate && endAt ? new Date(endAt).toISOString() : null,
        is_active: true,
      })
      .select("access_code")
      .single();

    setPublishing(false);

    if (error) {
      toast.error("Erro ao publicar prova.");
      console.error(error);
      return;
    }

    setAccessCode(data.access_code);
    toast.success("Prova publicada com sucesso!");
  };

  const copyCode = () => {
    if (accessCode) {
      navigator.clipboard.writeText(accessCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Código copiado!");
    }
  };

  const handleClose = () => {
    setAccessCode(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Publicar Prova Online
          </DialogTitle>
        </DialogHeader>

        {accessCode ? (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
            <p className="font-medium">Prova publicada!</p>
            <p className="text-sm text-muted-foreground">Compartilhe o código de acesso com seus alunos:</p>
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono text-3xl font-bold tracking-widest uppercase">{accessCode}</span>
              <Button variant="outline" size="icon" onClick={copyCode}>
                {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Os alunos devem acessar o Portal do Aluno e digitar este código.
            </p>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            <div>
              <p className="text-sm font-medium mb-1">{examTitle}</p>
              <p className="text-xs text-muted-foreground">Configure as opções de aplicação online.</p>
            </div>

            <div className="space-y-2">
              <Label>Tempo limite (minutos)</Label>
              <Input type="number" min={5} max={300} value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Data de início</Label>
                <Switch checked={hasStartDate} onCheckedChange={setHasStartDate} />
              </div>
              {hasStartDate && (
                <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Data limite</Label>
                <Switch checked={hasEndDate} onCheckedChange={setHasEndDate} />
              </div>
              {hasEndDate && (
                <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {accessCode ? (
            <Button onClick={handleClose}>Fechar</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handlePublish} disabled={publishing}>
                {publishing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Share2 className="h-4 w-4 mr-2" />}
                Publicar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
