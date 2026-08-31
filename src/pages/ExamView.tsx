import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileDown,
  Share2,
  Trash2,
  Copy,
  GraduationCap,
  CheckCircle2,
  HelpCircle,
  AlignLeft,
  ArrowLeftRight,
  Loader2,
  Pencil,
  Store,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import ExamPDFExporter, { type Section, type ExamQuestion } from "@/components/ExamPDFExporter";
import PublishExamDialog from "@/components/PublishExamDialog";
import { computeExamStatus, examStatusConfig } from "@/lib/exam-status";

const typeIcons: Record<string, React.ReactNode> = {
  multiple_choice: <CheckCircle2 className="h-3.5 w-3.5" />,
  true_false: <HelpCircle className="h-3.5 w-3.5" />,
  open_ended: <AlignLeft className="h-3.5 w-3.5" />,
  matching: <ArrowLeftRight className="h-3.5 w-3.5" />,
};

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "EM ELABORAÇÃO", className: "bg-muted text-muted-foreground" },
  applied: { label: "APLICADA", className: "bg-primary text-primary-foreground" },
  in_progress: { label: "EM APLICAÇÃO", className: "bg-warning text-warning-foreground" },
  graded: { label: "CONSOLIDADA", className: "bg-success text-success-foreground" },
};

export default function ExamViewPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [examTitle, setExamTitle] = useState("");
  const [examStatus, setExamStatus] = useState("draft");
  const [sections, setSections] = useState<Section[]>([]);
  const [institutionName, setInstitutionName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [instructions, setInstructions] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [feedbackMode, setFeedbackMode] = useState(false);

  const [publication, setPublication] = useState<{ id: string; is_active: boolean; end_at: string | null; start_at: string | null } | null>(null);
  const [unpublishing, setUnpublishing] = useState(false);

  const loadPublication = async (id: string) => {
    const { data: pubs } = await supabase
      .from("exam_publications")
      .select("id, is_active, start_at, end_at")
      .eq("exam_id", id)
      .order("created_at", { ascending: false });
    const list = pubs || [];
    setPublication(list.find((p) => p.is_active) || list[0] || null);
  };


  useEffect(() => {
    const loadExam = async () => {
      if (!examId) return;
      setLoading(true);

      const { data: exam } = await supabase
        .from("exams")
        .select("*")
        .eq("id", examId)
        .single();

      if (!exam) {
        toast.error("Prova não encontrada.");
        navigate("/exams");
        return;
      }

      setExamTitle(exam.title);
      setExamStatus(exam.status);
      await loadPublication(examId);

      const hc = exam.header_config_json as any;
      if (hc) {
        setInstitutionName(hc.institution || "");
        setTeacherName(hc.professor || "");
        setExamDate(hc.examDate || "");
        // Combine pre and during instructions
        const parts: string[] = [];
        if (hc.preInstructions) parts.push(hc.preInstructions);
        if (hc.duringInstructions) parts.push(hc.duringInstructions);
        setInstructions(parts.join(" | ") || hc.instructions || "");
      }

      // Load exam questions grouped by section
      const { data: eqs } = await supabase
        .from("exam_questions")
        .select("id, question_id, position, points, section_name")
        .eq("exam_id", examId)
        .order("position", { ascending: true });

      if (eqs && eqs.length > 0) {
        const qIds = eqs.map((eq) => eq.question_id);
        const { data: qBank } = await supabase
          .from("question_bank")
          .select("id, type, content_json")
          .in("id", qIds);

        const qMap: Record<string, any> = {};
        (qBank || []).forEach((q) => { qMap[q.id] = q; });

        // Group by section_name
        const sectionMap = new Map<string, ExamQuestion[]>();
        for (const eq of eqs) {
          const sName = eq.section_name || "Geral";
          if (!sectionMap.has(sName)) sectionMap.set(sName, []);
          const bq = qMap[eq.question_id];
          const cj = bq?.content_json as any;
          sectionMap.get(sName)!.push({
            id: eq.id,
            questionId: eq.question_id,
            title: cj?.question_text || cj?.title || "Questão",
            type: bq?.type || "multiple_choice",
            points: eq.points != null ? Number(eq.points) : 1,
            contentJson: cj,
          });
        }

        const secs: Section[] = [];
        sectionMap.forEach((questions, name) => {
          secs.push({ id: name, name, questions, collapsed: false });
        });
        setSections(secs);
      }

      setLoading(false);
    };
    loadExam();
  }, [examId, navigate]);

  const handleDelete = async () => {
    if (!examId) return;
    await supabase.from("exams").update({ deleted_at: new Date().toISOString() }).eq("id", examId);
    toast.success("Prova movida para a lixeira.");
    navigate("/exams");
  };

  const handleDuplicate = async () => {
    if (!examId) return;
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data } = await supabase
      .from("exams")
      .insert({
        user_id: user.user.id,
        title: `${examTitle} (cópia)`,
        status: "draft",
        header_config_json: { institution: institutionName, professor: teacherName, examDate, instructions },
      })
      .select("id")
      .single();

    if (!data) { toast.error("Erro ao duplicar."); return; }

    const { data: eqs } = await supabase
      .from("exam_questions")
      .select("question_id, position, points, section_name")
      .eq("exam_id", examId);

    if (eqs && eqs.length > 0) {
      await supabase.from("exam_questions").insert(
        eqs.map((q) => ({ exam_id: data.id, question_id: q.question_id, position: q.position, points: q.points, section_name: q.section_name }))
      );
    }
    toast.success("Prova duplicada!");
  };

  const handleShareToMarketplace = async () => {
    if (!examId) return;
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data: existing } = await supabase
      .from("marketplace_exams")
      .select("id")
      .eq("exam_id", examId)
      .maybeSingle();

    if (existing) {
      toast.info("Esta prova já está no Marketplace.");
      return;
    }

    const totalQuestions = sections.reduce((s, sec) => s + sec.questions.length, 0);

    const { error } = await supabase.from("marketplace_exams").insert({
      exam_id: examId,
      user_id: user.user.id,
      title: examTitle,
      description: "",
      question_count: totalQuestions,
      tags: [],
    });

    if (error) {
      toast.error("Erro ao compartilhar no Marketplace.");
      return;
    }
    toast.success("Prova compartilhada no Marketplace!");
  };

  const handleUnpublish = async () => {
    if (!publication || !examId) return;
    setUnpublishing(true);
    const { error } = await supabase
      .from("exam_publications")
      .update({ is_active: false })
      .eq("id", publication.id);
    setUnpublishing(false);
    if (error) { toast.error("Erro ao despublicar."); return; }
    await supabase.from("exams").update({ status: "grading" }).eq("id", examId);
    setExamStatus("grading");
    await loadPublication(examId);
    toast.success("Prova despublicada. Os alunos não podem mais acessá-la.");
  };

  const totalQuestions = sections.reduce((s, sec) => s + sec.questions.length, 0);
  const totalPoints = sections.reduce((s, sec) => s + sec.questions.reduce((qs, q) => qs + q.points, 0), 0);
  const effectiveStatus = computeExamStatus(examStatus, publication);
  const status = examStatusConfig[effectiveStatus];
  const isPublished = !!publication?.is_active;

  const getAnswerKey = (q: ExamQuestion) => {
    const cj: any = q.contentJson || {};
    const parts: { label: string; value: string }[] = [];

    if (q.type === "multiple_choice" && cj.correct_answer) {
      const opts = cj.options;
      let text = "";
      if (opts && typeof opts === "object" && !Array.isArray(opts)) {
        text = (opts as Record<string, string>)[cj.correct_answer] || "";
      } else if (Array.isArray(opts)) {
        const idx = String(cj.correct_answer).length === 1
          ? String(cj.correct_answer).toLowerCase().charCodeAt(0) - 97
          : Number(cj.correct_answer);
        const o = opts[idx];
        text = typeof o === "string" ? o : o?.text || "";
      }
      parts.push({ label: "Alternativa correta", value: `${String(cj.correct_answer).toUpperCase()}) ${text}`.trim() });
    } else if (q.type === "true_false" && cj.correct_answer != null) {
      const v = String(cj.correct_answer).toLowerCase();
      parts.push({ label: "Resposta correta", value: v === "true" || v === "v" || v === "verdadeiro" ? "Verdadeiro" : "Falso" });
    } else if (q.type === "matching" && cj.correct_matches) {
      const value = typeof cj.correct_matches === "string"
        ? cj.correct_matches
        : Object.entries(cj.correct_matches as Record<string, string>).map(([a, b]) => `${a} → ${b}`).join("  |  ");
      parts.push({ label: "Associações corretas", value });
    }

    if (cj.expected_answer) parts.push({ label: "Resposta esperada", value: String(cj.expected_answer) });
    if (cj.answer_key) parts.push({ label: "Espelho de correção", value: String(cj.answer_key) });
    if (cj.explanation) parts.push({ label: "Comentário / justificativa", value: String(cj.explanation) });

    return parts;
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Toolbar */}
      <div className="px-6 py-3 border-b bg-card flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate("/exams")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Voltar
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">{examTitle}</h1>
          <div className="flex items-center gap-3 mt-0.5">
            <Badge className={`text-[10px] px-2 py-0.5 font-bold uppercase ${status.className}`}>
              {status.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {totalQuestions} questões · {totalPoints} pontos
            </span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(`/exams/${examId}/edit`)}>
          <Pencil className="h-3.5 w-3.5 mr-1.5" />
          Editar
        </Button>
        <Button variant="outline" size="sm" onClick={handleDuplicate}>
          <Copy className="h-3.5 w-3.5 mr-1.5" />
          Duplicar
        </Button>
        <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
          <FileDown className="h-3.5 w-3.5 mr-1.5" />
          Exportar PDF
        </Button>
        <Button variant="outline" size="sm" onClick={handleShareToMarketplace}>
          <Store className="h-3.5 w-3.5 mr-1.5" />
          Marketplace
        </Button>
        {isPublished ? (
          <Button size="sm" variant="secondary" onClick={handleUnpublish} disabled={unpublishing}>
            {unpublishing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Ban className="h-3.5 w-3.5 mr-1.5" />}
            Despublicar
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setPublishOpen(true)}>
            <Share2 className="h-3.5 w-3.5 mr-1.5" />
            Publicar Online
          </Button>
        )}

        <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Excluir
        </Button>
      </div>

      {/* Exam preview */}
      <div className="flex-1 overflow-auto p-8 flex justify-center bg-muted/50">
        <div className="w-[210mm] exam-paper-bg shadow-xl rounded-sm border p-12 font-exam text-sm leading-relaxed" style={{ minHeight: "297mm" }}>
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-secondary" />
                <span className="text-sm font-bold text-foreground">ProvaFácil</span>
              </div>
              <div className="w-16 h-16 border border-dashed border-muted-foreground/30 rounded flex items-center justify-center">
                <span className="text-[8px] text-muted-foreground">QR Code</span>
              </div>
            </div>
            {institutionName && <h2 className="text-base font-bold uppercase tracking-wide">{institutionName}</h2>}
            <Separator className="my-3 bg-foreground/20" />
            <h3 className="text-lg font-bold mt-2">{examTitle}</h3>
            <div className="flex justify-between text-xs mt-3 text-muted-foreground">
              {teacherName && <span>Professor(a): {teacherName}</span>}
              {examDate && <span>Data: {(() => { try { return new Date(examDate).toLocaleDateString("pt-BR"); } catch { return examDate; } })()}</span>}
            </div>
            <div className="mt-3 border-b border-dashed pb-2">
              <p className="text-xs">Nome do Aluno: ________________________________________ RA: _______________</p>
            </div>
            {instructions && (
              <p className="text-xs italic mt-3 text-muted-foreground text-left">
                <strong>Instruções:</strong> {instructions}
              </p>
            )}
          </div>

          {/* Sections */}
          {sections.map((section) => {
            let questionNum = 0;
            const sectionPts = section.questions
              .filter((q) => q.type !== "case_stem")
              .reduce((s, q) => s + q.points, 0);
            return (
              <div key={section.id} className="mb-6">
                <h4 className="font-bold text-sm uppercase tracking-wider mb-3 flex items-center justify-between">
                  {section.name}
                  <span className="text-xs text-muted-foreground font-normal">
                    {sectionPts} pts
                  </span>
                </h4>
                <div className="space-y-4 pl-2">
                  {section.questions.map((q) => {
                    const isStem = q.type === "case_stem";
                    if (!isStem) questionNum++;
                    if (isStem) {
                      return (
                        <div
                          key={q.id}
                          className="px-3 py-2 my-2 rounded-sm border-l-4 border-foreground bg-muted/40"
                        >
                          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground mb-1">
                            Enunciado base
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{q.title}</p>
                        </div>
                      );
                    }
                    return (
                      <div key={q.id}>
                        <p className="text-sm">
                          <span className="font-semibold">{questionNum}.</span> {q.title}{" "}
                          <span className="text-[10px] text-muted-foreground">[{q.points} pts]</span>
                        </p>

                        {q.type === "multiple_choice" && (() => {
                          const opts = q.contentJson?.options;
                          if (opts && typeof opts === "object" && !Array.isArray(opts)) {
                            const entries = Object.entries(opts as Record<string, string>).sort(([a], [b]) => a.localeCompare(b));
                            return (
                              <div className="mt-2 space-y-1 pl-4 text-xs text-muted-foreground">
                                {entries.map(([letter, text]) => (
                                  <p key={letter}>{letter}) {text}</p>
                                ))}
                              </div>
                            );
                          }
                          if (Array.isArray(opts) && opts.length > 0) {
                            return (
                              <div className="mt-2 space-y-1 pl-4 text-xs text-muted-foreground">
                                {opts.map((opt: any, i: number) => (
                                  <p key={i}>{String.fromCharCode(97 + i)}) {typeof opt === "string" ? opt : opt.text}</p>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {q.type === "true_false" && (
                          <p className="mt-2 pl-4 text-xs text-muted-foreground">( ) Verdadeiro &nbsp;&nbsp; ( ) Falso</p>
                        )}

                        {q.type === "open_ended" && (
                          <div className="mt-2 border-b border-dashed" style={{ height: "60px" }} />
                        )}

                        {q.type === "matching" && (() => {
                          const colA = q.contentJson?.column_a as string[] | undefined;
                          const colB = q.contentJson?.column_b as string[] | undefined;
                          if (colA && colB && colA.length > 0) {
                            return (
                              <div className="mt-2 pl-4 text-xs text-muted-foreground">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <p className="font-semibold text-foreground mb-1">Coluna A</p>
                                    {colA.map((item, i) => (
                                      <p key={i} className="mb-0.5">{i + 1}. {item}</p>
                                    ))}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-foreground mb-1">Coluna B</p>
                                    {colB.map((item, i) => (
                                      <p key={i} className="mb-0.5">{String.fromCharCode(97 + i)}) {item}</p>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Footer */}
          <div className="mt-8 pt-3 border-t border-muted-foreground/20 text-center">
            <p className="text-[9px] text-muted-foreground/50">Gerado por <strong>ProvaFácil</strong> — provafacil.com</p>
          </div>
        </div>
      </div>

      <ExamPDFExporter
        open={exportOpen}
        onOpenChange={setExportOpen}
        examTitle={examTitle}
        sections={sections}
        institutionName={institutionName}
        teacherName={teacherName}
        examDate={examDate}
        instructions={instructions}
      />

      <PublishExamDialog
        open={publishOpen}
        onOpenChange={(o) => { setPublishOpen(o); if (!o && examId) loadPublication(examId); }}
        examId={examId || null}
        examTitle={examTitle}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir prova?</AlertDialogTitle>
            <AlertDialogDescription>
              A prova será movida para a lixeira.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}