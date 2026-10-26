import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link2, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import {
  CLASS_ACTIVITY_TYPES, CLASS_ACTIVITY_TYPE_KEYS, linkActivityToClass, loadClassActivities, loadLinkableActivities,
  unlinkActivity, type ClassActivityGroup, type ClassActivityItem, type ClassActivityType, type LinkableActivity,
} from "@/lib/class-activities";
import { cn } from "@/lib/utils";

const GROUPS: ClassActivityGroup[] = ["OSCE", "Simulação", "Formulários", "Júri Simulado"];

const statusTone = (status: string | null): StatusTone => {
  if (!status) return "neutral";
  if (["active", "ativo", "ativa", "published", "in_progress"].includes(status)) return "ok";
  if (["completed", "finished", "finalizado", "concluida", "concluída"].includes(status)) return "brand";
  if (["paused", "pausada"].includes(status)) return "warn";
  return "neutral";
};

const statusLabel = (status: string | null) => {
  const map: Record<string, string> = {
    draft: "Rascunho", active: "Ativa", ativo: "Ativo", ativa: "Ativa", published: "Publicado", in_progress: "Em andamento",
    completed: "Concluída", finished: "Finalizado", finalizado: "Finalizado", paused: "Pausada", pausada: "Pausada",
  };
  return status ? map[status] ?? status : "—";
};

// Atividades ligadas à turma pela tabela class_activity_links: OSCE, simulações e formulários.
export function ClassLinkedActivities({ classId, onChanged }: { classId: string; onChanged?: () => void }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<ClassActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [type, setType] = useState<ClassActivityType | null>(null);
  const [options, setOptions] = useState<LinkableActivity[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await loadClassActivities(classId));
    setLoading(false);
  }, [classId]);

  useEffect(() => { void load(); }, [load]);

  const pickType = async (next: ClassActivityType) => {
    setType(next);
    setOptionsLoading(true);
    setOptions(await loadLinkableActivities(next, classId));
    setOptionsLoading(false);
  };

  const openDialog = () => { setType(null); setOptions([]); setDialogOpen(true); };

  const link = async (activityId: string) => {
    if (!type) return;
    if (!(await linkActivityToClass(classId, type, activityId))) { toast.error("Erro ao vincular a atividade."); return; }
    toast.success("Atividade vinculada à turma!");
    setOptions((prev) => prev.filter((o) => o.id !== activityId));
    await load();
    onChanged?.();
  };

  const unlink = async (item: ClassActivityItem) => {
    if (!(await unlinkActivity(item.link.id))) { toast.error("Erro ao desvincular."); return; }
    toast.success("Atividade desvinculada da turma.");
    await load();
    onChanged?.();
  };

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-brand-soft text-brand-text"><Link2 className="h-4 w-4" /></span>
          <h3 className="font-heading text-xl font-medium">OSCE, simulações e formulários</h3>
          <span className="font-mono text-xs text-muted-foreground">{items.length}</span>
        </div>
        <Button variant="outline" size="sm" onClick={openDialog}><Plus className="h-4 w-4" />Vincular atividade</Button>
      </div>

      {loading ? (
        <Card className="shadow-none"><CardContent className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>
      ) : items.length === 0 ? (
        <Card className="shadow-none"><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhum OSCE, simulação ou formulário vinculado a esta turma.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((item) => {
            const cfg = CLASS_ACTIVITY_TYPES[item.link.activity_type];
            return (
              <Card key={item.link.id} className="surface-hover">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      className="min-w-0 text-left disabled:cursor-default"
                      disabled={item.missing}
                      onClick={() => navigate(cfg.route(item.link.activity_id, item.moduleType))}
                    >
                      <p className="label-mono">{cfg.group} · {cfg.label}</p>
                      <p className={cn("mt-1 truncate font-medium", !item.missing && "hover:underline")}>{item.title}</p>
                    </button>
                    {item.missing ? <StatusBadge tone="bad">Removida</StatusBadge> : <StatusBadge tone={statusTone(item.status)} dot>{statusLabel(item.status)}</StatusBadge>}
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t pt-3">
                    <p className="text-xs text-muted-foreground">Vinculada em {new Date(item.link.created_at).toLocaleDateString("pt-BR")}</p>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => unlink(item)} title="Desvincular" aria-label="Desvincular atividade">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>Vincular atividade à turma</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Escolha o tipo e depois a atividade. O acesso dos alunos continua por PIN ou e-mail.</p>
          <div className="space-y-4">
            {GROUPS.map((group) => (
              <div key={group}>
                <p className="label-mono mb-2">{group}</p>
                <div className="flex flex-wrap gap-2">
                  {CLASS_ACTIVITY_TYPE_KEYS.filter((k) => CLASS_ACTIVITY_TYPES[k].group === group).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => pickType(k)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        type === k ? "border-transparent bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {CLASS_ACTIVITY_TYPES[k].label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {type && (
            <div className="space-y-2 border-t pt-4">
              {optionsLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              ) : options.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma atividade de {CLASS_ACTIVITY_TYPES[type].label} disponível para vincular.</p>
              ) : (
                options.map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{o.title}</p>
                      <div className="mt-1"><StatusBadge tone={statusTone(o.status)}>{statusLabel(o.status)}</StatusBadge></div>
                    </div>
                    <Button size="sm" onClick={() => link(o.id)}>Vincular</Button>
                  </div>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
