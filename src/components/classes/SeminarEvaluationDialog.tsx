import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, Plus, Trash2, Star, Save, Users, Settings2, Loader2, Calendar,
  Lightbulb, Presentation as PresentationIcon, MessagesSquare, Award, CircleDot,
  RotateCcw, Play, Pause, Timer, Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_SEMINAR_RUBRIC, SeminarRubric, RubricDimension, RubricCriterion,
  RubricAnswers, scoreRubric,
} from "@/lib/seminar-rubric";
import { cn } from "@/lib/utils";

interface Student { id: string; student_name: string; student_email: string | null; }
interface Evaluation {
  id?: string;
  student_id: string;
  answers: RubricAnswers;
  total_score: number;
  max_score: number;
  percent: number;
  notes: string | null;
  time_seconds: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lessonId: string;
  lessonTitle: string;
  semesterId: string;
  initialRubric: SeminarRubric | null;
}

const DIM_ICONS: Record<string, any> = {
  calendar: Calendar, lightbulb: Lightbulb, presentation: PresentationIcon,
  messages: MessagesSquare, award: Award,
};

function DimIcon({ name }: { name?: string }) {
  const Ic = (name && DIM_ICONS[name]) || CircleDot;
  return <Ic className="w-4 h-4" />;
}

function StarPicker({
  value, max, onChange,
}: { value: number; max: number; onChange: (n: number) => void; }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => {
        const v = i + 1;
        const filled = v <= value;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(value === v ? v - 1 : v)}
            className="p-0.5 transition-transform hover:scale-110"
            aria-label={`${v} estrela${v > 1 ? "s" : ""}`}
          >
            <Star className={cn("w-5 h-5", filled ? "fill-amber-400 text-amber-500" : "text-muted-foreground/40")} />
          </button>
        );
      })}
    </div>
  );
}

export function SeminarEvaluationDialog({
  open, onOpenChange, lessonId, lessonTitle, semesterId, initialRubric,
}: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [evaluations, setEvaluations] = useState<Record<string, Evaluation>>({});
  const [rubric, setRubric] = useState<SeminarRubric>(
    initialRubric && initialRubric.dimensions?.length ? initialRubric : DEFAULT_SEMINAR_RUBRIC
  );
  const [loading, setLoading] = useState(false);
  const [savingRubric, setSavingRubric] = useState(false);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRubric(initialRubric && initialRubric.dimensions?.length ? initialRubric : DEFAULT_SEMINAR_RUBRIC);
    load();
    // eslint-disable-next-line
  }, [open, lessonId]);

  async function load() {
    setLoading(true);
    const [stu, evs] = await Promise.all([
      supabase.from("class_students").select("id,student_name,student_email")
        .eq("semester_id", semesterId).order("student_name"),
      supabase.from("class_seminar_evaluations").select("*").eq("lesson_id", lessonId),
    ]);
    const list = (stu.data as Student[]) || [];
    setStudents(list);
    const evMap: Record<string, Evaluation> = {};
    const sel = new Set<string>();
    (evs.data as any[] || []).forEach((e) => {
      evMap[e.student_id] = {
        id: e.id, student_id: e.student_id, answers: e.answers || {},
        total_score: Number(e.total_score) || 0, max_score: Number(e.max_score) || 0,
        percent: Number(e.percent) || 0, notes: e.notes,
        time_seconds: Number(e.time_seconds) || 0,
      };
      sel.add(e.student_id);
    });
    setEvaluations(evMap);
    setSelected(sel);
    setLoading(false);
  }

  async function saveRubric() {
    setSavingRubric(true);
    const { error } = await supabase.from("class_schedule_items")
      .update({ rubric_json: rubric as any }).eq("id", lessonId);
    setSavingRubric(false);
    if (error) toast.error("Erro: " + error.message);
    else toast.success("Instrumento salvo");
  }

  async function resetEvaluation(studentId: string) {
    if (!window.confirm("Tem certeza que deseja resetar esta avaliação? Os dados serão perdidos.")) return;
    const { error } = await supabase.from("class_seminar_evaluations").delete()
      .eq("lesson_id", lessonId).eq("student_id", studentId);
    if (error) { toast.error(error.message); return; }
    setEvaluations((prev) => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(studentId);
      return next;
    });
    toast.success("Avaliação resetada");
  }

  function toggleStudent(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
    if (on && !evaluations[id]) {
      setEvaluations((prev) => ({
        ...prev, [id]: { student_id: id, answers: {}, total_score: 0, max_score: 0, percent: 0, notes: "", time_seconds: 0 },
      }));
    }
  }

  async function persistEvaluation(studentId: string, opts?: { silent?: boolean }) {
    const ev = evaluations[studentId];
    if (!ev) return;
    const sc = scoreRubric(rubric, ev.answers);
    const payload = {
      lesson_id: lessonId,
      student_id: studentId,
      answers: ev.answers as any,
      total_score: sc.finalScore,
      max_score: sc.scale,
      percent: sc.totalPercent,
      notes: ev.notes,
      time_seconds: ev.time_seconds ?? 0,
    };
    const { data, error } = await supabase
      .from("class_seminar_evaluations")
      .upsert(payload as any, { onConflict: "lesson_id,student_id" })
      .select().single();
    if (error) { toast.error(error.message); return; }
    setEvaluations((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId], id: (data as any).id,
        total_score: sc.finalScore, max_score: sc.scale, percent: sc.totalPercent,
      },
    }));
    if (!opts?.silent) toast.success("Avaliação salva");
  }

  function updateAnswer(studentId: string, criterionId: string, value: number) {
    setEvaluations((prev) => {
      const cur: Evaluation = prev[studentId] || { student_id: studentId, answers: {}, total_score: 0, max_score: 0, percent: 0, notes: "", time_seconds: 0 };
      const answers = { ...cur.answers, [criterionId]: value };
      const sc = scoreRubric(rubric, answers);
      return {
        ...prev,
        [studentId]: { ...cur, answers, total_score: sc.finalScore, max_score: sc.scale, percent: sc.totalPercent },
      };
    });
  }

  const activeStudent = students.find((s) => s.id === activeStudentId) || null;
  const activeEval = activeStudentId ? evaluations[activeStudentId] : null;
  const liveScore = useMemo(
    () => (activeEval ? scoreRubric(rubric, activeEval.answers) : null),
    [activeEval, rubric]
  );

  // ============ Autosave ============
  type SaveStatus = "idle" | "saving" | "saved" | "error";
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipFirstAutosave = useRef<string | null>(null);

  // Track which student was just activated so we don't autosave immediately on open
  useEffect(() => {
    skipFirstAutosave.current = activeStudentId;
  }, [activeStudentId]);

  // Serializable snapshot used to detect meaningful changes
  const evalSignature = useMemo(() => {
    if (!activeStudentId || !activeEval) return "";
    return JSON.stringify({
      a: activeEval.answers,
      n: activeEval.notes,
      t: activeEval.time_seconds,
    });
  }, [activeStudentId, activeEval]);

  useEffect(() => {
    if (!activeStudentId || !activeEval) return;
    if (skipFirstAutosave.current === activeStudentId) {
      skipFirstAutosave.current = null;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        await persistEvaluation(activeStudentId, { silent: true });
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line
  }, [evalSignature]);

  function setTimeSeconds(studentId: string, seconds: number) {
    setEvaluations((prev) => {
      const cur = prev[studentId];
      if (!cur) return prev;
      return { ...prev, [studentId]: { ...cur, time_seconds: Math.max(0, Math.floor(seconds)) } };
    });
  }


  // ============ Rubric editor helpers ============
  function updateDim(idx: number, patch: Partial<RubricDimension>) {
    setRubric((r) => {
      const dims = [...r.dimensions];
      dims[idx] = { ...dims[idx], ...patch };
      return { ...r, dimensions: dims };
    });
  }
  function removeDim(idx: number) {
    setRubric((r) => ({ ...r, dimensions: r.dimensions.filter((_, i) => i !== idx) }));
  }
  function addDim() {
    setRubric((r) => ({
      ...r,
      dimensions: [...r.dimensions, {
        id: crypto.randomUUID(), label: "Nova dimensão", weight: 10, criteria: [],
      }],
    }));
  }
  function updateCrit(di: number, ci: number, patch: Partial<RubricCriterion>) {
    setRubric((r) => {
      const dims = [...r.dimensions];
      const crits = [...dims[di].criteria];
      crits[ci] = { ...crits[ci], ...patch };
      dims[di] = { ...dims[di], criteria: crits };
      return { ...r, dimensions: dims };
    });
  }
  function addCrit(di: number) {
    setRubric((r) => {
      const dims = [...r.dimensions];
      dims[di] = {
        ...dims[di],
        criteria: [...dims[di].criteria, { id: crypto.randomUUID(), label: "Novo critério", type: "stars", max: 3 }],
      };
      return { ...r, dimensions: dims };
    });
  }
  function removeCrit(di: number, ci: number) {
    setRubric((r) => {
      const dims = [...r.dimensions];
      dims[di] = { ...dims[di], criteria: dims[di].criteria.filter((_, i) => i !== ci) };
      return { ...r, dimensions: dims };
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PresentationIcon className="w-5 h-5 text-amber-500" />
            Avaliação · {lessonTitle}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : activeStudent ? (
          <StudentEvaluator
            student={activeStudent}
            evaluation={activeEval!}
            rubric={rubric}
            liveScore={liveScore!}
            saveStatus={saveStatus}
            onBack={() => setActiveStudentId(null)}
            onAnswer={(cid, v) => updateAnswer(activeStudent.id, cid, v)}
            onNotes={(n) => setEvaluations((p) => ({ ...p, [activeStudent.id]: { ...p[activeStudent.id], notes: n } }))}
            onTimeChange={(s) => setTimeSeconds(activeStudent.id, s)}
            onSave={() => persistEvaluation(activeStudent.id)}
            onReset={() => resetEvaluation(activeStudent.id)}
          />

        ) : (
          <Tabs defaultValue="students" className="flex-1 flex flex-col overflow-hidden">
            <TabsList>
              <TabsTrigger value="students"><Users className="w-4 h-4 mr-1" />Alunos</TabsTrigger>
              <TabsTrigger value="rubric"><Settings2 className="w-4 h-4 mr-1" />Instrumento</TabsTrigger>
            </TabsList>

            {/* STUDENTS LIST */}
            <TabsContent value="students" className="flex-1 overflow-hidden">
              <ScrollArea className="h-[60vh] pr-3">
                {students.length === 0 ? (
                  <Card><CardContent className="py-10 text-center text-muted-foreground">
                    Nenhum aluno neste semestre.
                  </CardContent></Card>
                ) : (
                  <div className="space-y-2">
                    {students.map((s) => {
                      const ev = evaluations[s.id];
                      const isSelected = selected.has(s.id);
                      return (
                        <Card key={s.id} className={cn("transition-colors", isSelected && "border-amber-500/40")}>
                          <CardContent className="p-3 flex items-center gap-3">
                            <Checkbox checked={isSelected} onCheckedChange={(v) => toggleStudent(s.id, !!v)} />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{s.student_name}</div>
                              {s.student_email && <div className="text-xs text-muted-foreground truncate">{s.student_email}</div>}
                            </div>
                            {ev && (
                              <div className="text-right">
                                <div className="text-lg font-bold text-amber-600">
                                  {ev.total_score.toFixed(1)}<span className="text-xs text-muted-foreground">/{ev.max_score}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {ev.percent.toFixed(0)}%
                                  {ev.time_seconds > 0 && (
                                    <> · <Timer className="inline w-3 h-3 -mt-0.5" /> {formatTime(ev.time_seconds)}</>
                                  )}
                                </div>
                              </div>
                            )}
                            {ev && (
                              <Button variant="ghost" size="icon" onClick={() => resetEvaluation(s.id)} className="text-destructive hover:bg-destructive/10">
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="sm" variant={isSelected ? "default" : "outline"}
                              disabled={!isSelected}
                              onClick={() => setActiveStudentId(s.id)}
                            >Avaliar</Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* RUBRIC EDITOR */}
            <TabsContent value="rubric" className="flex-1 overflow-hidden">
              <ScrollArea className="h-[58vh] pr-3">
                <div className="space-y-3">
                  <Card className="border-amber-500/30 bg-amber-500/5">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Label className="text-sm font-medium whitespace-nowrap">Nota máxima da avaliação</Label>
                      <Input
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={rubric.scale ?? 10}
                        onChange={(e) => setRubric((r) => ({ ...r, scale: Number(e.target.value) || 10 }))}
                        className="w-24"
                      />
                      <span className="text-xs text-muted-foreground">
                        A nota de cada aluno será calculada proporcionalmente a este valor.
                      </span>
                    </CardContent>
                  </Card>
                  {rubric.dimensions.map((d, di) => (
                    <Card key={d.id}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start gap-2">
                          <DimIcon name={d.icon} />
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_120px] gap-2">
                            <Input value={d.label} onChange={(e) => updateDim(di, { label: e.target.value })} placeholder="Dimensão" />
                            <div className="flex items-center gap-2">
                              <Label className="text-xs whitespace-nowrap">Peso</Label>
                              <Input type="number" min={0} value={d.weight}
                                onChange={(e) => updateDim(di, { weight: Number(e.target.value) || 0 })} />
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeDim(di)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="space-y-2 pl-6">
                          {d.criteria.map((c, ci) => (
                            <div key={c.id} className="flex items-center gap-2">
                              <Input value={c.label} onChange={(e) => updateCrit(di, ci, { label: e.target.value })} className="flex-1" />
                              <select
                                value={c.type}
                                onChange={(e) => updateCrit(di, ci, { type: e.target.value as any })}
                                className="h-9 rounded-md border bg-background px-2 text-sm"
                              >
                                <option value="stars">Estrelas</option>
                                <option value="checkbox">Sim/Não</option>
                              </select>
                              {c.type === "stars" && (
                                <Input type="number" min={1} max={5} value={c.max ?? 3}
                                  onChange={(e) => updateCrit(di, ci, { max: Number(e.target.value) || 3 })}
                                  className="w-16" />
                              )}
                              <Button variant="ghost" size="icon" onClick={() => removeCrit(di, ci)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                          <Button variant="outline" size="sm" onClick={() => addCrit(di)}>
                            <Plus className="w-3 h-3 mr-1" />Critério
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Button variant="outline" onClick={addDim}>
                    <Plus className="w-4 h-4 mr-1" />Adicionar dimensão
                  </Button>
                </div>
              </ScrollArea>
              <div className="flex justify-end pt-3">
                <Button onClick={saveRubric} disabled={savingRubric}>
                  {savingRubric && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Save className="w-4 h-4 mr-1" />Salvar instrumento
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatTime(total: number): string {
  const s = Math.max(0, Math.floor(total));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function SaveIndicator({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" /> Salvando…
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600">
        <Check className="w-3 h-3" /> Salvo automaticamente
      </span>
    );
  }
  if (status === "error") {
    return <span className="text-xs text-destructive">Falha ao salvar</span>;
  }
  return <span className="text-xs text-muted-foreground/70">Salvamento automático ativo</span>;
}

function PresentationTimer({
  seconds, onChange,
}: { seconds: number; onChange: (s: number) => void; }) {
  const [running, setRunning] = useState(false);
  const startRef = useRef<number | null>(null);
  const baseRef = useRef<number>(seconds);
  const [tick, setTick] = useState(0);

  // Sync base when external value changes and timer is not running
  useEffect(() => {
    if (!running) baseRef.current = seconds;
  }, [seconds, running]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [running]);

  const display = running && startRef.current
    ? baseRef.current + Math.floor((Date.now() - startRef.current) / 1000)
    : seconds;

  function start() {
    baseRef.current = seconds;
    startRef.current = Date.now();
    setRunning(true);
  }
  function pause() {
    if (startRef.current) {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      onChange(baseRef.current + elapsed);
    }
    startRef.current = null;
    setRunning(false);
  }
  function reset() {
    startRef.current = null;
    baseRef.current = 0;
    setRunning(false);
    onChange(0);
  }

  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1">
      <Timer className="w-4 h-4 text-primary" />
      <span className="font-mono text-base tabular-nums min-w-[52px] text-center">
        {formatTime(display)}
      </span>
      {running ? (
        <Button size="icon" variant="outline" className="h-7 w-7" onClick={pause} aria-label="Pausar">
          <Pause className="w-3.5 h-3.5" />
        </Button>
      ) : (
        <Button size="icon" variant="outline" className="h-7 w-7" onClick={start} aria-label="Iniciar">
          <Play className="w-3.5 h-3.5" />
        </Button>
      )}
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={reset} aria-label="Zerar">
        <RotateCcw className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

function StudentEvaluator({
  student, evaluation, rubric, liveScore, saveStatus, onBack, onAnswer, onNotes, onTimeChange, onSave, onReset,
}: {
  student: Student;
  evaluation: Evaluation;
  rubric: SeminarRubric;
  liveScore: ReturnType<typeof scoreRubric>;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onBack: () => void;
  onAnswer: (criterionId: string, v: number) => void;
  onNotes: (n: string) => void;
  onTimeChange: (seconds: number) => void;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex items-center gap-3 pb-3 border-b flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" />Voltar</Button>
        <div className="flex-1 min-w-[160px]">
          <div className="font-semibold">{student.student_name}</div>
          {student.student_email && <div className="text-xs text-muted-foreground">{student.student_email}</div>}
          <div className="mt-1"><SaveIndicator status={saveStatus} /></div>
        </div>
        <PresentationTimer seconds={evaluation.time_seconds ?? 0} onChange={onTimeChange} />
        <div className="text-right">
          <div className="text-2xl font-bold text-amber-600">
            {liveScore.finalScore.toFixed(2)}<span className="text-sm text-muted-foreground">/{liveScore.scale}</span>
          </div>
          <div className="text-xs text-muted-foreground">{liveScore.totalPercent.toFixed(1)}%</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onReset} className="text-destructive border-destructive/30 hover:bg-destructive/10">
            <RotateCcw className="w-4 h-4 mr-1" />Resetar
          </Button>
          <Button onClick={onSave}><Save className="w-4 h-4 mr-1" />Salvar</Button>
        </div>
      </div>

      <ScrollArea className="h-[70vh] pr-3">
        <div className="space-y-3 py-3">
          {rubric.dimensions.map((d) => {
            const dimScore = liveScore.perDimension.find((x) => x.id === d.id);
            return (
              <Card key={d.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <DimIcon name={d.icon} />
                    <div className="font-semibold flex-1">{d.label}</div>
                    <Badge variant="outline">peso {d.weight}</Badge>
                    {dimScore && (
                      <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30">
                        {dimScore.earned}/{dimScore.max} · {dimScore.percent.toFixed(0)}%
                      </Badge>
                    )}
                  </div>
                  {dimScore && <Progress value={dimScore.percent} className="h-1.5" />}
                  <div className="space-y-2">
                    {d.criteria.map((c) => {
                      const v = evaluation.answers[c.id] ?? 0;
                      return (
                        <div key={c.id} className="flex items-center gap-3 py-1.5 border-b last:border-b-0">
                          <div className="flex-1 text-sm">{c.label}</div>
                          {c.type === "checkbox" ? (
                            <Checkbox checked={v >= 1} onCheckedChange={(b) => onAnswer(c.id, b ? 1 : 0)} />
                          ) : (
                            <StarPicker value={v} max={c.max ?? 3} onChange={(n) => onAnswer(c.id, n)} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={evaluation.notes ?? ""} onChange={(e) => onNotes(e.target.value)} rows={3} />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
