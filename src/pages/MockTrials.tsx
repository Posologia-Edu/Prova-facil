import { useState, useEffect } from "react";
import SystemPromptViewer from "@/components/SystemPromptViewer";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Gavel, Copy, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MockTrial {
  id: string;
  title: string;
  description: string | null;
  status: string;
  judge_name: string | null;
  created_at: string;
  deleted_at: string | null;
  _caseCount?: number;
}

export default function MockTrials() {
  const navigate = useNavigate();
  const [trials, setTrials] = useState<MockTrial[]>([]);
  const [loading, setLoading] = useState(true);
  const [renameTrial, setRenameTrial] = useState<MockTrial | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [duplicating, setDuplicating] = useState<string | null>(null);

  const fetchTrials = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("mock_trials")
      .select("*")
      .eq("user_id", session.user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar júris simulados");
      return;
    }

    const enriched = await Promise.all((data || []).map(async (trial: any) => {
      const { count } = await supabase
        .from("mock_trial_cases")
        .select("*", { count: "exact", head: true })
        .eq("mock_trial_id", trial.id);
      return { ...trial, _caseCount: count || 0 };
    }));

    setTrials(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchTrials(); }, []);

  const createTrial = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("mock_trials")
      .insert({ user_id: session.user.id })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao criar júri simulado");
      return;
    }

    navigate(`/mock-trials/${data.id}/edit`);
  };

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const deleteTrial = async (id: string) => {
    const { error } = await supabase
      .from("mock_trials")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir");
      return;
    }

    toast.success("Júri simulado excluído");
    fetchTrials();
  };

  const openRename = (trial: MockTrial) => {
    setRenameTrial(trial);
    setRenameValue(trial.title);
  };

  const saveRename = async () => {
    if (!renameTrial) return;
    const newTitle = renameValue.trim();
    if (!newTitle) { toast.error("Título não pode ser vazio"); return; }
    const { error } = await supabase
      .from("mock_trials")
      .update({ title: newTitle })
      .eq("id", renameTrial.id);
    if (error) { toast.error("Erro ao renomear"); return; }
    toast.success("Nome atualizado");
    setRenameTrial(null);
    fetchTrials();
  };

  const duplicateTrial = async (trial: MockTrial) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setDuplicating(trial.id);
    try {
      // 1. Create new trial
      const { data: newTrial, error: trialErr } = await supabase
        .from("mock_trials")
        .insert({
          user_id: session.user.id,
          title: `${trial.title} (Cópia)`,
          description: trial.description,
          judge_name: trial.judge_name,
          status: "draft",
        })
        .select()
        .single();
      if (trialErr || !newTrial) throw trialErr || new Error("Falha ao criar");

      // 2. Duplicate cases (preserve sections + teacher guide) and remember id mapping
      const { data: cases } = await supabase
        .from("mock_trial_cases")
        .select("*")
        .eq("mock_trial_id", trial.id);
      const caseIdMap = new Map<string, string>();
      if (cases && cases.length > 0) {
        const { data: insertedCases } = await supabase
          .from("mock_trial_cases")
          .insert(
            cases.map((c: any) => ({
              mock_trial_id: newTrial.id,
              position: c.position,
              case_number: c.case_number,
              title: c.title,
              process_content: c.process_content,
              learning_objectives: c.learning_objectives,
              characters_json: c.characters_json,
              sections_json: c.sections_json ?? [],
              generation_status: c.generation_status ?? "ready",
              teacher_guide: c.teacher_guide ?? null,
            }))
          )
          .select("id, position, case_number, title");
        // Map old → new by (position + case_number + title)
        for (const oldC of cases) {
          const match = (insertedCases || []).find(
            (n: any) =>
              n.position === oldC.position &&
              n.case_number === oldC.case_number &&
              n.title === oldC.title
          );
          if (match) caseIdMap.set(oldC.id, match.id);
        }

        // 2b. Duplicate case images (already-generated assets stay available in the copy)
        const oldCaseIds = cases.map((c: any) => c.id);
        const { data: oldImages } = await (supabase as any)
          .from("mock_trial_case_images")
          .select("*")
          .in("case_id", oldCaseIds);
        if (oldImages && oldImages.length > 0) {
          const newImageRows = oldImages
            .map((img: any) => {
              const newCaseId = caseIdMap.get(img.case_id);
              if (!newCaseId) return null;
              return {
                case_id: newCaseId,
                slug: img.slug,
                anchor: img.anchor,
                title: img.title,
                caption: img.caption,
                prompt: img.prompt,
                image_url: img.image_url,
                status: img.status,
              };
            })
            .filter(Boolean);
          if (newImageRows.length > 0) {
            await (supabase as any).from("mock_trial_case_images").insert(newImageRows);
          }
        }
      }

      // 3. Duplicate groups
      const { data: groups } = await supabase
        .from("mock_trial_groups")
        .select("*")
        .eq("mock_trial_id", trial.id);
      if (groups && groups.length > 0) {
        await supabase.from("mock_trial_groups").insert(
          groups.map((g: any) => ({
            mock_trial_id: newTrial.id,
            group_number: g.group_number,
            name: g.name,
          }))
        );
      }

      // 4. Duplicate forms
      const { data: forms } = await supabase
        .from("mock_trial_forms")
        .select("*")
        .eq("mock_trial_id", trial.id);
      if (forms && forms.length > 0) {
        await supabase.from("mock_trial_forms").insert(
          forms.map((f: any) => ({
            mock_trial_id: newTrial.id,
            target_role: f.target_role,
            title: f.title,
            fields_json: f.fields_json,
          }))
        );
      }

      toast.success("Júri simulado duplicado");
      fetchTrials();
    } catch (e: any) {
      toast.error("Erro ao duplicar: " + (e?.message || ""));
    } finally {
      setDuplicating(null);
    }
  };

  const statusLabels: Record<string, string> = {
    draft: "Rascunho",
    active: "Ativo",
    finished: "Finalizado",
  };

  const statusTones: Record<string, StatusTone> = {
    draft: "warn",
    active: "ok",
    finished: "neutral",
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-40 bg-muted rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Praticar"
        title="Júri Simulado"
        description="Processos clínicos julgados pelos alunos em grupos de acusação, defesa e júri técnico, com a mediação de um juiz."
        actions={
          <>
            <SystemPromptViewer toolKey="mock-trials" />
            <Button onClick={createTrial}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Júri Simulado
            </Button>
          </>
        }
      />

      {trials.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-14 text-center">
          <Gavel className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <h3 className="font-heading text-lg font-medium">Nenhum júri simulado</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Comece pelos processos.</p>
          <Button onClick={createTrial}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Júri Simulado
          </Button>
        </Card>
      ) : (
        <Card className="divide-y overflow-hidden">
          {trials.map(trial => (
            <div key={trial.id} className="flex flex-wrap items-center gap-4 p-4 hover:bg-muted/40 transition-colors">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-text"><Gavel className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className="font-medium truncate text-left hover:underline" onClick={() => navigate(`/mock-trials/${trial.id}/edit`)}>{trial.title}</button>
                  <StatusBadge tone={statusTones[trial.status] || "neutral"} dot={trial.status !== "finished"}>
                    {statusLabels[trial.status] || trial.status}
                  </StatusBadge>
                </div>
                {trial.description && <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{trial.description}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  {trial._caseCount} processo(s)
                  {trial.judge_name ? ` · Juiz: ${trial.judge_name}` : ""}
                  {` · Criado em ${format(new Date(trial.created_at), "dd/MM/yyyy", { locale: ptBR })}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={() => navigate(`/mock-trials/${trial.id}/edit`)}>
                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                  Abrir
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" title="Renomear" onClick={() => openRename(trial)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" title="Duplicar" disabled={duplicating === trial.id} onClick={() => duplicateTrial(trial)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Excluir" onClick={() => setDeleteTarget({ id: trial.id, title: trial.title })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{deleteTarget?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>O Júri Simulado vai para a Lixeira, de onde você pode restaurá-lo.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteTarget) deleteTrial(deleteTarget.id); setDeleteTarget(null); }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!renameTrial} onOpenChange={(o) => !o && setRenameTrial(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-medium">Renomear Júri Simulado</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="trial-name">Nome</Label>
            <Input
              id="trial-name"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveRename()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTrial(null)}>Cancelar</Button>
            <Button onClick={saveRename}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
