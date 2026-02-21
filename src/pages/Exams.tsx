import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  FileText,
  MoreVertical,
  BarChart3,
  Mail,
  Search,
  Pencil,
  Copy,
  Trash2,
  CheckSquare,
  Loader2,
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

interface Exam {
  id: string;
  title: string;
  status: string;
  questionCount: number;
  participantCount: number;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "EM ELABORAÇÃO", className: "bg-muted text-muted-foreground" },
  applied: { label: "APLICADA", className: "bg-primary text-primary-foreground" },
  in_progress: { label: "EM APLICAÇÃO", className: "bg-warning text-warning-foreground" },
  graded: { label: "CONSOLIDADA", className: "bg-success text-success-foreground" },
};

export default function ExamsPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

    // Fetch participant counts
    const { data: pubs } = await supabase
      .from("exam_publications")
      .select("id, exam_id")
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

    setExams(
      (examsData || []).map((e) => ({
        id: e.id,
        title: e.title,
        status: e.status,
        questionCount: countMap[e.id] || 0,
        participantCount: participantMap[e.id] || 0,
        createdAt: e.created_at,
      }))
    );
    setLoading(false);
  };

  useEffect(() => { fetchExams(); }, []);

  const filtered = exams.filter(
    (e) => e.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateExam = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) { toast.error("Faça login primeiro."); return; }

    const { data, error } = await supabase
      .from("exams")
      .insert({ user_id: user.user.id, title: "Nova Prova", status: "draft" })
      .select("id")
      .single();

    if (error) { toast.error("Erro ao criar prova."); return; }
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minhas Provas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {exams.length} provas criadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectMode(!selectMode);
              setSelectedIds(new Set());
            }}
          >
            <CheckSquare className="h-4 w-4 mr-1.5" />
            SELECIONAR PROVAS
          </Button>
        </div>
      </div>

      {/* Search and Sort */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
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
              const status = statusConfig[exam.status] || statusConfig.draft;
              return (
                <Card
                  key={exam.id}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer group relative"
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
                      className={`absolute top-3 left-3 h-5 w-5 rounded border-2 flex items-center justify-center ${
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
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold leading-snug line-clamp-1">
                          {exam.title}
                        </h3>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">
                          Criada por mim
                        </p>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/exams/${exam.id}`); }}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(exam); }}>
                          <Copy className="h-3.5 w-3.5 mr-2" /> Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); setDeleteId(exam.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <Badge className={`text-[10px] px-2 py-0.5 font-bold uppercase ${status.className}`}>
                      {status.label}
                    </Badge>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{exam.questionCount}</span>{" "}
                      Questões
                      <span className="font-semibold text-foreground">{exam.participantCount}</span>{" "}
                      Participantes
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground/50" />
                        <BarChart3 className="h-3.5 w-3.5 text-muted-foreground/50" />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Nenhuma prova encontrada.</p>
              <Button className="mt-4" onClick={handleCreateExam}>
                <Plus className="h-4 w-4 mr-1.5" /> Criar Prova
              </Button>
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
    </div>
  );
}
