import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Download, Loader2, BookOpenCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface GradeColumn {
  id: string;
  label: string;
  source_type: string;
  weight: number;
  max_score: number;
  order_index: number;
}
interface Student { id: string; student_name: string; }
interface Entry { id?: string; column_id: string; student_id: string; score: number | null; comment?: string | null; }

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual", exam: "Prova", virtual_patient: "Paciente Virtual",
  simulation: "Simulação", seminar: "Seminário",
};

interface Props { classId: string; semesterId: string; }

export function GradebookTab({ classId, semesterId }: Props) {
  const [columns, setColumns] = useState<GradeColumn[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [entries, setEntries] = useState<Record<string, Entry>>({}); // key = `${columnId}:${studentId}`
  const [loading, setLoading] = useState(true);
  const [colDialog, setColDialog] = useState<{ open: boolean; editing?: GradeColumn | null }>({ open: false });
  const [colForm, setColForm] = useState<Partial<GradeColumn>>({ source_type: "manual", weight: 1, max_score: 10 });

  async function load() {
    setLoading(true);
    const [c, s] = await Promise.all([
      supabase.from("class_grade_columns").select("*").eq("semester_id", semesterId).order("order_index"),
      supabase.from("class_students").select("id,student_name").eq("semester_id", semesterId).order("student_name"),
    ]);
    const cols = (c.data as GradeColumn[]) || [];
    setColumns(cols);
    setStudents((s.data as Student[]) || []);
    if (cols.length) {
      const { data: ent } = await supabase.from("class_grade_entries").select("*").in("column_id", cols.map(c => c.id));
      const map: Record<string, Entry> = {};
      (ent as Entry[] || []).forEach(e => { map[`${e.column_id}:${e.student_id}`] = e; });
      setEntries(map);
    } else setEntries({});
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [semesterId]);

  async function saveColumn() {
    if (!colForm.label?.trim()) return toast.error("Informe o nome da coluna.");
    const payload = {
      class_id: classId, semester_id: semesterId,
      label: colForm.label.trim(),
      source_type: colForm.source_type || "manual",
      weight: Number(colForm.weight) || 1,
      max_score: Number(colForm.max_score) || 10,
      order_index: colForm.order_index ?? columns.length,
    };
    const { error } = colDialog.editing
      ? await supabase.from("class_grade_columns").update(payload).eq("id", colDialog.editing.id)
      : await supabase.from("class_grade_columns").insert(payload);
    if (error) return toast.error("Erro ao salvar coluna.");
    toast.success("Coluna salva.");
    setColDialog({ open: false });
    load();
  }

  async function deleteColumn(id: string) {
    if (!confirm("Excluir esta coluna e todas as notas?")) return;
    await supabase.from("class_grade_columns").delete().eq("id", id);
    toast.success("Coluna excluída.");
    load();
  }

  async function setScore(columnId: string, studentId: string, raw: string) {
    const key = `${columnId}:${studentId}`;
    const score = raw === "" ? null : Number(raw);
    if (score !== null && (isNaN(score) || score < 0)) return;
    const existing = entries[key];
    const { data, error } = existing?.id
      ? await supabase.from("class_grade_entries").update({ score }).eq("id", existing.id).select().single()
      : await supabase.from("class_grade_entries").insert({ column_id: columnId, student_id: studentId, score }).select().single();
    if (error) return toast.error("Erro ao salvar nota.");
    setEntries(prev => ({ ...prev, [key]: data as Entry }));
  }

  const weightedAverage = useMemo(() => {
    return (studentId: string) => {
      let sumW = 0, sumWeighted = 0;
      columns.forEach(c => {
        const e = entries[`${c.id}:${studentId}`];
        if (e?.score == null) return;
        const normalized = (Number(e.score) / Number(c.max_score)) * 10;
        sumWeighted += normalized * Number(c.weight);
        sumW += Number(c.weight);
      });
      if (!sumW) return null;
      return sumWeighted / sumW;
    };
  }, [columns, entries]);

  function exportCsv() {
    const header = ["Aluno", ...columns.map(c => `${c.label} (peso ${c.weight}, max ${c.max_score})`), "Média ponderada"];
    const rows = students.map(s => {
      const cells = columns.map(c => entries[`${c.id}:${s.id}`]?.score ?? "");
      const avg = weightedAverage(s.id);
      return [s.student_name, ...cells, avg !== null ? avg.toFixed(2) : ""];
    });
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "caderno-de-notas.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function gradeColor(value: number | null, max = 10) {
    if (value == null) return "";
    const pct = value / max;
    if (pct >= 0.7) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    if (pct >= 0.5) return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
    return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><BookOpenCheck className="h-4 w-4 text-primary" />Caderno de notas</h3>
          <p className="text-xs text-muted-foreground">Configure colunas com peso e nota máxima. A média é calculada normalizando cada nota para a escala 0–10.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!students.length || !columns.length}>
            <Download className="h-4 w-4 mr-1" />Exportar CSV
          </Button>
          <Button size="sm" onClick={() => { setColForm({ source_type: "manual", weight: 1, max_score: 10 }); setColDialog({ open: true, editing: null }); }}>
            <Plus className="h-4 w-4 mr-1" />Nova coluna
          </Button>
        </div>
      </div>

      {!columns.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <BookOpenCheck className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
          Nenhuma coluna criada. Comece adicionando avaliações (provas, simulações, seminários, etc.).
        </CardContent></Card>
      ) : !students.length ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Cadastre alunos para lançar notas.</CardContent></Card>
      ) : (
        <Card className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left p-3 sticky left-0 bg-muted/40 z-10 min-w-[200px]">Aluno</th>
                {columns.map(c => (
                  <th key={c.id} className="text-left p-3 min-w-[150px] border-l">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{c.label}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">{SOURCE_LABELS[c.source_type] || c.source_type}</Badge>
                          peso {c.weight} · max {c.max_score}
                        </div>
                      </div>
                      <div className="flex shrink-0">
                        <Button variant="ghost" size="icon" className="h-6 w-6"
                          onClick={() => { setColForm(c); setColDialog({ open: true, editing: c }); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6"
                          onClick={() => deleteColumn(c.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </th>
                ))}
                <th className="text-left p-3 min-w-[110px] border-l bg-primary/5">Média</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => {
                const avg = weightedAverage(s.id);
                return (
                  <tr key={s.id} className="border-t hover:bg-muted/20">
                    <td className="p-2 sticky left-0 bg-background z-10 font-medium">{s.student_name}</td>
                    {columns.map(c => {
                      const e = entries[`${c.id}:${s.id}`];
                      const sc = e?.score ?? null;
                      return (
                        <td key={c.id} className="p-1 border-l">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max={c.max_score}
                            defaultValue={sc ?? ""}
                            onBlur={(ev) => setScore(c.id, s.id, ev.target.value)}
                            className={cn("h-8 text-sm", gradeColor(sc, c.max_score))}
                          />
                        </td>
                      );
                    })}
                    <td className={cn("p-2 border-l font-bold tabular-nums", gradeColor(avg, 10))}>
                      {avg !== null ? avg.toFixed(2) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Dialog open={colDialog.open} onOpenChange={(o) => !o && setColDialog({ open: false })}>
        <DialogContent>
          <DialogHeader><DialogTitle>{colDialog.editing ? "Editar coluna" : "Nova coluna de avaliação"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome da avaliação</Label>
              <Input value={colForm.label ?? ""} onChange={e => setColForm({ ...colForm, label: e.target.value })} placeholder="Ex.: P1, Simulação SOAP, Seminário caso 3" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={colForm.source_type ?? "manual"} onValueChange={(v) => setColForm({ ...colForm, source_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Peso</Label><Input type="number" min="0" step="0.5" value={colForm.weight ?? 1} onChange={e => setColForm({ ...colForm, weight: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>Nota máxima</Label><Input type="number" min="0" step="0.5" value={colForm.max_score ?? 10} onChange={e => setColForm({ ...colForm, max_score: Number(e.target.value) })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setColDialog({ open: false })}>Cancelar</Button>
            <Button onClick={saveColumn}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
