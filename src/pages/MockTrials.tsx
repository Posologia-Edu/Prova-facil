import { useState, useEffect } from "react";
import SystemPromptViewer from "@/components/SystemPromptViewer";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

      // 2. Duplicate cases
      const { data: cases } = await supabase
        .from("mock_trial_cases")
        .select("*")
        .eq("mock_trial_id", trial.id);
      if (cases && cases.length > 0) {
        await supabase.from("mock_trial_cases").insert(
          cases.map((c: any) => ({
            mock_trial_id: newTrial.id,
            position: c.position,
            case_number: c.case_number,
            title: c.title,
            process_content: c.process_content,
            learning_objectives: c.learning_objectives,
            characters_json: c.characters_json,
          }))
        );
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
    draft: "Rascunho",
    active: "Ativo",
    finished: "Finalizado",
  };

  const statusColors: Record<string, string> = {
    draft: "secondary",
    active: "default",
    finished: "outline",
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Gavel className="h-6 w-6" />
            Júri Simulado
          </h1>
          <p className="text-muted-foreground">Crie e gerencie sessões de júri simulado clínico</p>
        </div>
        <div className="flex items-center gap-2">
          <SystemPromptViewer toolKey="mock-trials" />
          <Button onClick={createTrial}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Júri Simulado
          </Button>
        </div>
      </div>

      {trials.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum júri simulado</h3>
            <p className="text-muted-foreground mb-4">Crie seu primeiro júri simulado clínico</p>
            <Button onClick={createTrial}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Júri Simulado
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trials.map(trial => (
            <Card key={trial.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base line-clamp-2">{trial.title}</CardTitle>
                  <Badge variant={statusColors[trial.status] as any}>
                    {statusLabels[trial.status] || trial.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {trial.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{trial.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <span>{trial._caseCount} processo(s)</span>
                  {trial.judge_name && <span>Juiz: {trial.judge_name}</span>}
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Criado em {format(new Date(trial.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/mock-trials/${trial.id}/edit`)}>
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteTrial(trial.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
