import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClipboardList, Copy, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SystemPromptViewer from "@/components/SystemPromptViewer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { Tabs, TabsListLine, TabsTriggerLine } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Kind = "sct" | "kfe" | "mini_cex" | "dops" | "sjt" | "progress";
type TabValue = "all" | "sct" | "kfe" | "mini" | "sjt" | "progress";

interface KindConfig {
  label: string;
  tone: StatusTone;
  table: string;
  summary: string;
  letter: string;
  tab: TabValue;
  itemLabel: string;
  responseLabel: string;
  // tabelas filhas contadas por formulário (nulo = não se aplica)
  items: { table: string; col: string } | null;
  responses: { table: string; col: string };
  editor: (id: string) => string;
  links: { label: string; path: (id: string) => string }[];
  promptKey: string;
}

const KINDS: Record<Kind, KindConfig> = {
  sct: {
    label: "SCT", tone: "brand", table: "sct_exams", letter: "S", tab: "sct",
    summary: "Raciocínio clínico sob incerteza, comparado a um painel de especialistas.",
    itemLabel: "cenários", responseLabel: "alunos",
    items: { table: "sct_scenarios", col: "sct_exam_id" },
    responses: { table: "sct_student_sessions", col: "sct_exam_id" },
    editor: (id) => `/sct/${id}/edit`,
    links: [
      { label: "Copiar link dos alunos", path: (id) => `/sct/student/${id}` },
      { label: "Copiar link do painel de especialistas", path: (id) => `/sct/expert/${id}` },
    ],
    promptKey: "sct",
  },
  kfe: {
    label: "KFE", tone: "info", table: "kfe_exams", letter: "K", tab: "kfe",
    summary: "Decisões-chave em casos clínicos.",
    itemLabel: "casos", responseLabel: "alunos",
    items: { table: "kfe_cases", col: "kfe_exam_id" },
    responses: { table: "kfe_sessions", col: "kfe_exam_id" },
    editor: (id) => `/kfe/${id}/edit`,
    links: [{ label: "Copiar link dos alunos", path: (id) => `/kfe/student/${id}` }],
    promptKey: "kfe",
  },
  mini_cex: {
    label: "Mini-CEX", tone: "accent", table: "clinical_observations", letter: "M", tab: "mini",
    summary: "Observação direta de uma consulta, com escala de 1 a 9 por domínio.",
    itemLabel: "domínios", responseLabel: "avaliações",
    items: null,
    responses: { table: "clinical_observation_sessions", col: "observation_id" },
    editor: (id) => `/clinical-observations/${id}/edit`,
    links: [{ label: "Copiar link do avaliador", path: (id) => `/clinical-observations/eval/${id}` }],
    promptKey: "clinical-observations",
  },
  dops: {
    label: "DOPS", tone: "accent", table: "clinical_observations", letter: "D", tab: "mini",
    summary: "Observação direta de um procedimento, com escala de 1 a 9 por domínio.",
    itemLabel: "domínios", responseLabel: "avaliações",
    items: null,
    responses: { table: "clinical_observation_sessions", col: "observation_id" },
    editor: (id) => `/clinical-observations/${id}/edit`,
    links: [{ label: "Copiar link do avaliador", path: (id) => `/clinical-observations/eval/${id}` }],
    promptKey: "clinical-observations",
  },
  sjt: {
    label: "SJT", tone: "warn", table: "sjt_exams", letter: "J", tab: "sjt",
    summary: "Ordenar condutas em situações éticas ou profissionais.",
    itemLabel: "cenários", responseLabel: "alunos",
    items: { table: "sjt_scenarios", col: "sjt_exam_id" },
    responses: { table: "sjt_sessions", col: "sjt_exam_id" },
    editor: (id) => `/sjt/${id}/edit`,
    links: [{ label: "Copiar link dos alunos", path: (id) => `/sjt/student/${id}` }],
    promptKey: "sjt",
  },
  progress: {
    label: "Progress Test", tone: "ok", table: "progress_tests", letter: "P", tab: "progress",
    summary: "Teste de progresso por ano do curso, com questões do banco ou geradas por IA.",
    itemLabel: "questões", responseLabel: "alunos",
    items: { table: "progress_test_questions", col: "test_id" },
    responses: { table: "progress_test_sessions", col: "test_id" },
    editor: (id) => `/progress-test/${id}/edit`,
    links: [{ label: "Copiar link dos alunos", path: (id) => `/progress-test/student/${id}` }],
    promptKey: "progress-test",
  },
};

const CREATE_ORDER: Kind[] = ["sct", "kfe", "mini_cex", "dops", "sjt", "progress"];
const DEFAULT_TITLE: Record<Kind, string> = {
  sct: "Novo SCT", kfe: "Novo KFE", mini_cex: "Novo Mini-CEX", dops: "Novo DOPS", sjt: "Novo SJT", progress: "Novo Progress Test",
};

const MINI_CEX_DOMAINS = [
  { id: "1", name: "Anamnese", description: "Qualidade da coleta de história" },
  { id: "2", name: "Exame Físico", description: "Técnica e sistematização" },
  { id: "3", name: "Raciocínio Clínico", description: "Diagnóstico diferencial e plano" },
  { id: "4", name: "Comunicação", description: "Relação médico-paciente" },
  { id: "5", name: "Profissionalismo", description: "Ética e postura" },
  { id: "6", name: "Organização", description: "Eficiência e gestão do tempo" },
  { id: "7", name: "Competência Global", description: "Avaliação geral" },
];
const DOPS_DOMAINS = [
  { id: "1", name: "Indicação", description: "Justificativa para o procedimento" },
  { id: "2", name: "Consentimento", description: "Obtenção do consentimento informado" },
  { id: "3", name: "Preparação", description: "Preparo do material e do paciente" },
  { id: "4", name: "Técnica", description: "Execução do procedimento" },
  { id: "5", name: "Assepsia", description: "Técnica asséptica" },
  { id: "6", name: "Cuidados Pós", description: "Orientações pós-procedimento" },
  { id: "7", name: "Competência Global", description: "Avaliação geral" },
];

type StateGroup = "active" | "draft" | "finished";
const STATE_FILTERS: { value: "all" | StateGroup; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "draft", label: "Rascunhos" },
  { value: "finished", label: "Finalizados" },
];

function stateOf(status: string): { group: StateGroup; label: string; tone: StatusTone } {
  if (status === "active") return { group: "active", label: "Ativo", tone: "ok" };
  if (status === "published") return { group: "active", label: "Publicado", tone: "ok" };
  if (status === "collecting") return { group: "active", label: "Coletando especialistas", tone: "info" };
  if (status === "finished") return { group: "finished", label: "Finalizado", tone: "neutral" };
  return { group: "draft", label: "Rascunho", tone: "warn" };
}

interface FormRow {
  id: string;
  kind: Kind;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  itemCount: number;
  responseCount: number;
}

async function countRows(table: string, col: string, id: string): Promise<number> {
  const { count } = await (supabase.from(table as any) as any).select("*", { count: "exact", head: true }).eq(col, id);
  return count || 0;
}

async function fetchForms(): Promise<FormRow[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];
  const tables = Array.from(new Set(Object.values(KINDS).map((k) => k.table)));
  const results = await Promise.all(
    tables.map(async (table) => {
      const { data, error } = await (supabase.from(table as any) as any)
        .select("*")
        .eq("user_id", session.user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return { table, rows: (data || []) as any[] };
    }),
  );

  const flat: { kind: Kind; row: any }[] = [];
  for (const { table, rows } of results) {
    for (const row of rows) {
      const kind: Kind = table === "clinical_observations"
        ? (row.type === "dops" ? "dops" : "mini_cex")
        : (Object.keys(KINDS) as Kind[]).find((k) => KINDS[k].table === table)!;
      flat.push({ kind, row });
    }
  }

  const rows = await Promise.all(
    flat.map(async ({ kind, row }): Promise<FormRow> => {
      const cfg = KINDS[kind];
      const [itemCount, responseCount] = await Promise.all([
        cfg.items ? countRows(cfg.items.table, cfg.items.col, row.id) : Promise.resolve((row.competency_domains_json || []).length),
        countRows(cfg.responses.table, cfg.responses.col, row.id),
      ]);
      return {
        id: row.id, kind, title: row.title || DEFAULT_TITLE[kind], description: row.description ?? null,
        status: row.status, created_at: row.created_at, itemCount, responseCount,
      };
    }),
  );
  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export default function Forms() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabValue>("all");
  const [stateFilter, setStateFilter] = useState<"all" | StateGroup>("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newKind, setNewKind] = useState<Kind>("sct");
  const [newTitle, setNewTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<FormRow | null>(null);

  const { data: forms, isLoading } = useQuery({ queryKey: ["forms-all"], queryFn: fetchForms });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const cfg = KINDS[newKind];
      const title = newTitle.trim() || DEFAULT_TITLE[newKind];
      const payload: Record<string, any> = { user_id: session.user.id, title };
      if (newKind === "mini_cex" || newKind === "dops") {
        payload.type = newKind;
        payload.competency_domains_json = newKind === "mini_cex" ? MINI_CEX_DOMAINS : DOPS_DOMAINS;
      }
      const { data, error } = await (supabase.from(cfg.table as any) as any).insert(payload).select().single();
      if (error) throw error;
      return { id: data.id as string, kind: newKind };
    },
    onSuccess: ({ id, kind }) => {
      queryClient.invalidateQueries({ queryKey: ["forms-all"] });
      setShowCreate(false);
      setNewTitle("");
      navigate(KINDS[kind].editor(id));
    },
    onError: () => toast.error("Erro ao criar o formulário"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (f: FormRow) => {
      const { error } = await (supabase.from(KINDS[f.kind].table as any) as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Formulário movido para a lixeira");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["forms-all"] });
    },
    onError: () => toast.error("Erro ao excluir"),
  });

  const copyLink = async (path: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  const all = forms || [];
  const tabCount = (t: TabValue) => (t === "all" ? all.length : all.filter((f) => KINDS[f.kind].tab === t).length);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((f) => {
      if (tab !== "all" && KINDS[f.kind].tab !== tab) return false;
      if (stateFilter !== "all" && stateOf(f.status).group !== stateFilter) return false;
      if (q && !f.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [all, tab, stateFilter, search]);

  const TABS: { value: TabValue; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "sct", label: "SCT" },
    { value: "kfe", label: "KFE" },
    { value: "mini", label: "Mini-CEX / DOPS" },
    { value: "sjt", label: "SJT" },
    { value: "progress", label: "Progress Test" },
  ];
  const promptKeys: Partial<Record<TabValue, string>> = {
    sct: "sct", kfe: "kfe", mini: "clinical-observations", sjt: "sjt", progress: "progress-test",
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Avaliar"
        title="Formulários"
        description="Cinco instrumentos de avaliação com a mesma lista e o mesmo fluxo: criar, editar, compartilhar um link e acompanhar os resultados. Os alunos entram pelo link, sem login."
        actions={
          <>
            {promptKeys[tab] && <SystemPromptViewer toolKey={promptKeys[tab]!} />}
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" /> Novo formulário
            </Button>
          </>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsListLine className="overflow-x-auto">
          {TABS.map((t) => (
            <TabsTriggerLine key={t.value} value={t.value}>
              {t.label} <span className="font-mono text-xs text-muted-foreground">{tabCount(t.value)}</span>
            </TabsTriggerLine>
          ))}
        </TabsListLine>
      </Tabs>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar formulário" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATE_FILTERS.map((s) => (
            <Button key={s.value} size="sm" variant={stateFilter === s.value ? "default" : "outline"} onClick={() => setStateFilter(s.value)}>
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Card className="animate-pulse p-8"><div className="h-5 bg-muted rounded w-1/3" /></Card>
      ) : visible.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-14 text-center">
          <ClipboardList className="h-10 w-10 mb-3 text-muted-foreground/40" />
          <p className="font-heading text-lg">{all.length === 0 ? "Nenhum formulário ainda" : "Nada encontrado"}</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {all.length === 0
              ? "Crie o primeiro para começar a coletar respostas dos alunos por link."
              : "Ajuste a busca, o tipo ou o estado para ver outros formulários."}
          </p>
          {all.length === 0 && (
            <Button className="mt-4" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> Novo formulário</Button>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Itens</TableHead>
                <TableHead className="text-right">Respostas</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((f) => {
                const cfg = KINDS[f.kind];
                const st = stateOf(f.status);
                return (
                  <TableRow key={`${f.kind}-${f.id}`} className="cursor-pointer" onClick={() => navigate(cfg.editor(f.id))}>
                    <TableCell className="font-medium">
                      {f.title}
                      <div className="text-xs font-normal text-muted-foreground">
                        {format(new Date(f.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge tone={cfg.tone}>{cfg.label}</StatusBadge></TableCell>
                    <TableCell><StatusBadge tone={st.tone} dot>{st.label}</StatusBadge></TableCell>
                    <TableCell className="text-right whitespace-nowrap font-mono text-sm">{f.itemCount} <span className="font-sans text-xs text-muted-foreground">{cfg.itemLabel}</span></TableCell>
                    <TableCell className="text-right whitespace-nowrap font-mono text-sm">
                      {f.responseCount > 0 ? <>{f.responseCount} <span className="font-sans text-xs text-muted-foreground">{cfg.responseLabel}</span></> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais ações"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => navigate(cfg.editor(f.id))}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                          {cfg.links.map((l) => (
                            <DropdownMenuItem key={l.label} onSelect={() => copyLink(l.path(f.id))}><Copy className="mr-2 h-4 w-4" />{l.label}</DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleteTarget(f)}>
                            <Trash2 className="mr-2 h-4 w-4" />Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-medium">Novo formulário</DialogTitle>
            <DialogDescription>Escolha o instrumento. Ele nasce em rascunho e abre no editor do tipo.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {CREATE_ORDER.map((k) => {
              const cfg = KINDS[k];
              const selected = newKind === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setNewKind(k)}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                    selected ? "border-primary bg-brand-soft" : "hover:bg-muted",
                  )}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-sunken font-mono text-xs font-medium">{cfg.letter}</span>
                  <span>
                    <span className="block font-medium">{cfg.label}</span>
                    <span className="block text-sm text-muted-foreground">{cfg.summary}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-form-title">Título</Label>
            <Input id="new-form-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={DEFAULT_TITLE[newKind]} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>Criar e editar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{deleteTarget?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>O formulário vai para a Lixeira, de onde você pode restaurá-lo.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
