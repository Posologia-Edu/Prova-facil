import { useState, useEffect } from "react";
import SystemPromptViewer from "@/components/SystemPromptViewer";
import { useNavigate } from "react-router-dom";
import { useSubscription, FREE_LIMITS } from "@/hooks/use-subscription";
import { useMonthlyExamCount } from "@/hooks/use-monthly-usage";
import {
  Plus,
  FileText,
  MoreVertical,
  Search,
  Pencil,
  Copy,
  Trash2,
  CheckSquare,
  Loader2,
  Store,
  StoreIcon,
  Shield,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { computeExamStatus, examStatusConfig } from "@/lib/exam-status";
import { StatusBadge } from "@/components/ui/status-badge";
import ReopenExamDialog from "@/components/ReopenExamDialog";


interface Exam {
  id: string;
  title: string;
  status: string;
  effectiveStatus: string;
  questionCount: number;
  participantCount: number;
  createdAt: string;
  publicationId?: string;
  accessCode?: string;
  isImported?: boolean;
  marketplaceId?: string;
}

export default function ExamsPage() {
  const navigate = useNavigate();
  const { isPremium } = useSubscription();
  const { count: monthlyExamCount, refresh: refreshExamCount } = useMonthlyExamCount();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reopenExam, setReopenExam] = useState<Exam | null>(null);


  const fetchExams = async () => {
    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) { setLoading(false); return; }

    const { data: examsData, error } = await supabase
      .from("exams")
      .select("id, title, status, created_at")
      .eq("user_id", user.user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar provas.");
      setLoading(false);
      return;
    }

    // Fetch question counts
    const examIds = (examsData || []).map((e) => e.id);
    const { data: qCounts } = await supabase
      .from("exam_questions")
      .select("exam_id")
      .in("exam_id", examIds.length > 0 ? examIds : ["__none__"]);

    const countMap: Record<string, number> = {};
    (qCounts || []).forEach((q) => {
      countMap[q.exam_id] = (countMap[q.exam_id] || 0) + 1;
    });

    // Fetch publications with dates to compute effective status
    const { data: pubs } = await supabase
      .from("exam_publications")
      .select("id, exam_id, is_active, start_at, end_at, access_code")
      .in("exam_id", examIds.length > 0 ? examIds : ["__none__"]);

    const pubIds = (pubs || []).map((p) => p.id);
    const { data: sessions } = await supabase
      .from("exam_sessions")
      .select("publication_id")
      .in("publication_id", pubIds.length > 0 ? pubIds : ["__none__"]);

    const pubToExam: Record<string, string> = {};
    (pubs || []).forEach((p) => { pubToExam[p.id] = p.exam_id; });

    const participantMap: Record<string, number> = {};
    (sessions || []).forEach((s) => {
      const eid = pubToExam[s.publication_id];
      if (eid) participantMap[eid] = (participantMap[eid] || 0) + 1;
    });

    // Build publication status map per exam
    const pubStatusMap: Record<string, { id: string; is_active: boolean; end_at: string | null; access_code: string }> = {};
    (pubs || []).forEach((p) => {
      // Keep the most relevant publication (active takes priority)
      if (!pubStatusMap[p.exam_id] || p.is_active) {
        pubStatusMap[p.exam_id] = { id: p.id, is_active: p.is_active, end_at: p.end_at, access_code: p.access_code };
      }
    });

    // Fetch marketplace status for user's exams
    const { data: marketplaceData } = await supabase
      .from("marketplace_exams")
      .select("id, exam_id")
      .eq("user_id", user.user.id);

    const marketplaceMap: Record<string, string> = {};
    (marketplaceData || []).forEach((m) => {
      marketplaceMap[m.exam_id] = m.id;
    });

    const computeEffective = (dbStatus: string, examId: string): string => {
      const pub = pubStatusMap[examId];
      return computeExamStatus(dbStatus, pub || null);
    };

    setExams(
      (examsData || []).map((e) => ({
        id: e.id,
        title: e.title,
        status: e.status,
        effectiveStatus: computeEffective(e.status, e.id),
        questionCount: countMap[e.id] || 0,
        participantCount: participantMap[e.id] || 0,
        createdAt: e.created_at,
        publicationId: pubStatusMap[e.id]?.id,
        accessCode: pubStatusMap[e.id]?.access_code,
        isImported: e.title.endsWith("(Marketplace)"),
        marketplaceId: marketplaceMap[e.id] || undefined,
      }))
    );
    setLoading(false);
  };

  useEffect(() => { fetchExams(); }, []);

  const [statusFilter, setStatusFilter] = useState("all");
  const statusOrder: Record<string, number> = { in_progress: 0, grading: 1, draft: 2, completed: 3 };
  const filtered = exams
    .filter((e) => e.title.toLowerCase().includes(search.toLowerCase()))
    .filter((e) => statusFilter === "all" || e.effectiveStatus === statusFilter)
    .sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title, "pt-BR");
      if (sortBy === "status") return (statusOrder[a.effectiveStatus] ?? 9) - (statusOrder[b.effectiveStatus] ?? 9);
      return b.createdAt.localeCompare(a.createdAt);
    });
  const countByStatus = (s: string) => exams.filter((e) => e.effectiveStatus === s).length;

  const handleCreateExam = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) { toast.error("Faça login primeiro."); return; }

    if (!isPremium && monthlyExamCount >= FREE_LIMITS.examsPerMonth) {
      toast.error(`Limite de ${FREE_LIMITS.examsPerMonth} prova(s) por mês no plano gratuito. Faça upgrade para criar mais.`);
      return;
    }

    const { data, error } = await supabase
      .from("exams")
      .insert({ user_id: user.user.id, title: "Nova Prova", status: "draft" })
      .select("id")
      .single();

    if (error) { toast.error("Erro ao criar prova."); return; }
    refreshExamCount();
    navigate(`/exams/${data.id}`);
  };

  const handleDeleteExam = async (id: string) => {
    const { error } = await supabase
      .from("exams")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) { toast.error("Erro ao excluir."); return; }
    setExams((prev) => prev.filter((e) => e.id !== id));
    setDeleteId(null);
    toast.success("Prova movida para a lixeira.");
  };

  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const { error } = await supabase
      .from("exams")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", ids);
    if (error) { toast.error("Erro ao excluir as provas selecionadas."); return; }
    setExams((prev) => prev.filter((e) => !selectedIds.has(e.id)));
    setSelectedIds(new Set());
    setSelectMode(false);
    setBulkDeleteOpen(false);
    toast.success(ids.length === 1 ? "Prova movida para a lixeira." : `${ids.length} provas movidas para a lixeira.`);
  };

  const handleDuplicate = async (exam: Exam) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data, error } = await supabase
      .from("exams")
      .insert({ user_id: user.user.id, title: `${exam.title} (cópia)`, status: "draft" })
      .select("id")
      .single();

    if (error) { toast.error("Erro ao duplicar."); return; }

    // Copy questions
    const { data: questions } = await supabase
      .from("exam_questions")
      .select("question_id, position, points, section_name")
      .eq("exam_id", exam.id);

    if (questions && questions.length > 0) {
      await supabase.from("exam_questions").insert(
        questions.map((q) => ({ exam_id: data.id, question_id: q.question_id, position: q.position, points: q.points, section_name: q.section_name }))
      );
    }

    toast.success("Prova duplicada.");
    fetchExams();
  };

  const handleShareToMarketplace = async (exam: Exam) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    if (exam.isImported) {
      toast.error("Provas importadas do Marketplace não podem ser compartilhadas novamente.");
      return;
    }

    // Check if already shared
    const { data: existing } = await supabase
      .from("marketplace_exams")
      .select("id")
      .eq("exam_id", exam.id)
      .maybeSingle();

    if (existing) {
      toast.info("Esta prova já está no Marketplace.");
      return;
    }

    const { error } = await supabase.from("marketplace_exams").insert({
      exam_id: exam.id,
      user_id: user.user.id,
      title: exam.title,
      description: "",
      question_count: exam.questionCount,
      tags: [],
    });

    if (error) {
      toast.error("Erro ao compartilhar no Marketplace.");
      return;
    }
    toast.success("Prova compartilhada no Marketplace!");
    fetchExams();
  };

  const handleRevokeMarketplace = async (exam: Exam) => {
    if (!exam.marketplaceId) return;

    const { error } = await supabase
      .from("marketplace_exams")
      .delete()
      .eq("id", exam.marketplaceId);

    if (error) {
      toast.error("Erro ao revogar compartilhamento.");
      return;
    }
    toast.success("Prova removida do Marketplace.");
    fetchExams();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow mb-2.5">Avaliar</p>
          <h1 className="font-heading text-[2rem] font-medium leading-[1.1]">Minhas Provas</h1>
          <p className="mt-2 max-w-[62ch] text-sm text-muted-foreground">
            {exams.length} {exams.length === 1 ? "prova criada" : "provas criadas"}
            {countByStatus("in_progress") > 0 && ` · ${countByStatus("in_progress")} em aplicação`}
            {countByStatus("grading") > 0 && ` · ${countByStatus("grading")} em correção`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SystemPromptViewer toolKey="exams" />
          <Button
            variant="outline"
            onClick={() => {
              setSelectMode(!selectMode);
              setSelectedIds(new Set());
            }}
          >
            <CheckSquare className="h-4 w-4 mr-1.5" />
            {selectMode ? "Cancelar seleção" : "Selecionar provas"}
          </Button>
          <Button onClick={() => navigate("/composer")}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nova prova
          </Button>
        </div>
      </div>

      {selectMode && (
        <div className="flex items-center gap-3 rounded-card border bg-brand-soft px-4 py-2.5">
          <span className="text-sm font-medium">{selectedIds.size} selecionada(s)</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(selectedIds.size === filtered.length ? new Set() : new Set(filtered.map((e) => e.id)))}
          >
            {selectedIds.size === filtered.length && filtered.length > 0 ? "Limpar seleção" : "Selecionar todas"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="ml-auto"
            disabled={selectedIds.size === 0}
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Mover para a lixeira
          </Button>
        </div>
      )}

      {/* Search and Sort */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar provas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Ordenado por data de criação</SelectItem>
            <SelectItem value="title">Ordenado por título</SelectItem>
            <SelectItem value="status">Ordenado por status</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex flex-wrap gap-2" role="group" aria-label="Status da prova">
          {[
            { value: "all", label: "Todas", n: exams.length },
            { value: "draft", label: "Em elaboração", n: countByStatus("draft") },
            { value: "in_progress", label: "Em aplicação", n: countByStatus("in_progress") },
            { value: "grading", label: "Em correção", n: countByStatus("grading") },
            { value: "completed", label: "Concluídas", n: countByStatus("completed") },
          ].map((c) => (
            <Button key={c.value} size="sm" variant={statusFilter === c.value ? "default" : "outline"} aria-pressed={statusFilter === c.value} onClick={() => setStatusFilter(c.value)}>
              {c.label}<span className={`ml-1.5 font-mono text-xs ${statusFilter === c.value ? "opacity-80" : "text-muted-foreground"}`}>{c.n}</span>
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Exam Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((exam) => {
              const status = examStatusConfig[exam.effectiveStatus as keyof typeof examStatusConfig] || examStatusConfig.draft;
              return (
                <Card
                  key={exam.id}
                  className="group relative cursor-pointer p-5 transition-shadow hover:shadow-elev-2"
                  onClick={() => {
                    if (selectMode) {
                      toggleSelect(exam.id);
                    } else {
                      navigate(`/exams/${exam.id}`);
                    }
                  }}
                >
                  {selectMode && (
                    <div
                      className={`absolute left-3 top-3 z-10 flex h-5 w-5 items-center justify-center rounded border-2 ${
                        selectedIds.has(exam.id)
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/40"
                      }`}
                    >
                      {selectedIds.has(exam.id) && (
                        <CheckSquare className="h-3.5 w-3.5" />
                      )}
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <div className={`min-w-0 ${selectMode ? "pl-7" : ""}`}>
                        <h3 className="line-clamp-1 font-heading text-lg font-medium leading-snug">
                          {exam.title}
                        </h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {exam.isImported ? "Importada do Marketplace" : "Criada por mim"} · {new Date(exam.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                          {exam.marketplaceId && <span className="text-[hsl(var(--accent-ink))]"> · Publicada no Marketplace</span>}
                        </p>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => navigate(`/exams/${exam.id}`)}>
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(exam)}>
                          <Copy className="h-4 w-4 mr-2" /> Duplicar para reaplicar
                        </DropdownMenuItem>
                        {exam.publicationId && (
                          <DropdownMenuItem onClick={() => setReopenExam(exam)}>
                            <RotateCcw className="h-4 w-4 mr-2" /> Reabrir prova
                          </DropdownMenuItem>
                        )}
                        {!exam.isImported && !exam.marketplaceId && (
                          <DropdownMenuItem onClick={() => handleShareToMarketplace(exam)}>
                            <Store className="h-4 w-4 mr-2" /> Compartilhar no Marketplace
                          </DropdownMenuItem>
                        )}
                        {exam.marketplaceId && (
                          <DropdownMenuItem onClick={() => handleRevokeMarketplace(exam)}>
                            <StoreIcon className="h-4 w-4 mr-2" /> Remover do Marketplace
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(exam.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>


                  <div className="mt-4 flex items-center justify-between border-t pt-4">
                    <StatusBadge tone={status.tone} dot={status.tone === "ok" || status.tone === "info"}>
                      {status.label}
                    </StatusBadge>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        <span className="font-mono font-medium text-foreground">{exam.questionCount}</span> questões
                      </span>
                      <span>
                        <span className="font-mono font-medium text-foreground">{exam.participantCount}</span> participantes
                      </span>
                      {exam.publicationId && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/monitoring/${exam.publicationId}`);
                          }}
                        >
                          <Shield className="h-3.5 w-3.5" />
                          Monitoramento
                        </Button>
                      )}
                    </div>
                  </div>
                  {exam.accessCode && exam.effectiveStatus === "in_progress" && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Código de acesso <b className="font-mono font-medium text-foreground">{exam.accessCode}</b>
                    </p>
                  )}
                </Card>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="font-heading text-xl font-medium text-foreground">Nenhuma prova encontrada</p>
              <p className="text-sm text-muted-foreground mt-1 mb-5">
                {exams.length === 0 ? "Use o Compositor para montar sua primeira prova com questões do banco." : "Tente ajustar os filtros de busca."}
              </p>
              {exams.length === 0 && (
                <div className="flex items-center justify-center gap-3">
                  <Button onClick={() => navigate("/composer")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Prova no Compositor
                  </Button>
                  <Button variant="outline" onClick={handleCreateExam}>
                    <FileText className="h-4 w-4 mr-2" />
                    Criar Prova em Branco
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir prova?</AlertDialogTitle>
            <AlertDialogDescription>
              A prova será movida para a lixeira. Você poderá restaurá-la posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDeleteExam(deleteId)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover {selectedIds.size} prova(s) para a lixeira?</AlertDialogTitle>
            <AlertDialogDescription>
              As provas selecionadas vão para a lixeira e podem ser restauradas depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete}>Mover para a lixeira</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReopenExamDialog
        open={!!reopenExam}
        onOpenChange={(o) => !o && setReopenExam(null)}
        examId={reopenExam?.id ?? null}
        examTitle={reopenExam?.title ?? ""}
        publicationId={reopenExam?.publicationId ?? null}
        onReopened={fetchExams}
      />
    </div>

  );
}
