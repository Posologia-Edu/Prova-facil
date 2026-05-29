import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LayoutList, GitBranch, CalendarDays, Search, ClipboardList, Trash2, Download } from "lucide-react";
import { getLessonTypeStyle, LESSON_TYPE_STYLE } from "@/lib/lesson-type-style";
import { cn } from "@/lib/utils";
import { buildIcs, downloadIcs } from "@/lib/ics-export";
import { toast } from "sonner";

export interface ScheduleLesson {
  id: string;
  title: string;
  lesson_date: string | null;
  lesson_type: string;
  status: string;
}

interface Props {
  lessons: ScheduleLesson[];
  onOpenLesson: (l: ScheduleLesson) => void;
  onDeleteLesson: (l: ScheduleLesson) => void;
  onOpenSeminarEval?: (l: ScheduleLesson) => void;
  onReschedule?: (lessonId: string, newDate: string) => Promise<void> | void;
  calendarName?: string;
}

type View = "list" | "timeline" | "calendar";

function ptMonth(date: Date) {
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function ScheduleViews({ lessons, onOpenLesson, onDeleteLesson, onOpenSeminarEval, onReschedule, calendarName }: Props) {
  const [view, setView] = useState<View>("list");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [calMonth, setCalMonth] = useState<Date>(() => new Date());
  const [dragOverIso, setDragOverIso] = useState<string | null>(null);

  function handleExportIcs() {
    const dated = lessons.filter(l => l.lesson_date);
    if (dated.length === 0) {
      toast.error("Nenhuma aula com data definida.");
      return;
    }
    const ics = buildIcs(calendarName || "Cronograma da turma", dated.map(l => ({
      uid: l.id,
      title: l.title,
      date: l.lesson_date!,
      description: `${getLessonTypeStyle(l.lesson_type).label} · ${l.status}`,
    })));
    downloadIcs(`${(calendarName || "cronograma").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`, ics);
    toast.success("Arquivo ICS exportado");
  }

  const filtered = useMemo(() => {
    return lessons.filter(l => {
      if (typeFilter !== "all" && l.lesson_type !== typeFilter) return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (query && !l.title.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [lessons, query, typeFilter, statusFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, ScheduleLesson[]>();
    filtered.forEach(l => {
      const key = l.lesson_date ? new Date(l.lesson_date + "T00:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : "Sem data";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const byDate = useMemo(() => {
    const map = new Map<string, ScheduleLesson[]>();
    filtered.forEach(l => {
      if (!l.lesson_date) return;
      if (!map.has(l.lesson_date)) map.set(l.lesson_date, []);
      map.get(l.lesson_date)!.push(l);
    });
    return map;
  }, [filtered]);

  const calendarDays = useMemo(() => {
    const first = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
    const last = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0);
    const startWeekday = first.getDay();
    const days: Array<{ date: Date; iso: string; inMonth: boolean }> = [];
    for (let i = 0; i < startWeekday; i++) {
      const d = new Date(first); d.setDate(first.getDate() - (startWeekday - i));
      days.push({ date: d, iso: d.toISOString().slice(0, 10), inMonth: false });
    }
    for (let day = 1; day <= last.getDate(); day++) {
      const d = new Date(calMonth.getFullYear(), calMonth.getMonth(), day);
      days.push({ date: d, iso: d.toISOString().slice(0, 10), inMonth: true });
    }
    while (days.length % 7 !== 0) {
      const d = new Date(days[days.length - 1].date); d.setDate(d.getDate() + 1);
      days.push({ date: d, iso: d.toISOString().slice(0, 10), inMonth: false });
    }
    return days;
  }, [calMonth]);

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-2">
          <div className="flex gap-1 border rounded-md p-0.5">
            <Button variant={view === "list" ? "secondary" : "ghost"} size="sm" className="h-8" onClick={() => setView("list")}>
              <LayoutList className="h-4 w-4 mr-1" />Lista
            </Button>
            <Button variant={view === "timeline" ? "secondary" : "ghost"} size="sm" className="h-8" onClick={() => setView("timeline")}>
              <GitBranch className="h-4 w-4 mr-1" />Timeline
            </Button>
            <Button variant={view === "calendar" ? "secondary" : "ghost"} size="sm" className="h-8" onClick={() => setView("calendar")}>
              <CalendarDays className="h-4 w-4 mr-1" />Calendário
            </Button>
          </div>
          <div className="relative max-w-xs flex-1 min-w-[160px]">
            <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar aula..." className="pl-8 h-9" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(LESSON_TYPE_STYLE).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="planned">Planejada</SelectItem>
              <SelectItem value="done">Realizada</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto">
            <Button variant="outline" size="sm" className="h-9" onClick={handleExportIcs} title="Exportar para Google/Outlook/Apple Calendar">
              <Download className="h-4 w-4 mr-1" />Exportar ICS
            </Button>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma aula corresponde aos filtros.</CardContent></Card>
      ) : view === "list" ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Data</TableHead>
                <TableHead>Aula</TableHead>
                <TableHead className="w-44">Tipo</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-28"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(l => {
                const style = getLessonTypeStyle(l.lesson_type);
                const Icon = style.icon;
                return (
                  <TableRow key={l.id} className={cn("cursor-pointer border-l-4", style.accent, style.rowBg)} onClick={() => onOpenLesson(l)}>
                    <TableCell className="tabular-nums">{l.lesson_date ?? "—"}</TableCell>
                    <TableCell className="font-medium">{l.title}</TableCell>
                    <TableCell><Badge variant="outline" className={cn("gap-1", style.badge)}><Icon className="h-3 w-3" />{style.label}</Badge></TableCell>
                    <TableCell><Badge variant={l.status === "done" ? "default" : l.status === "cancelled" ? "destructive" : "secondary"}>
                      {l.status === "done" ? "Realizada" : l.status === "cancelled" ? "Cancelada" : "Planejada"}
                    </Badge></TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        {l.lesson_type === "seminar" && onOpenSeminarEval && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenSeminarEval(l)} title="Avaliar alunos">
                            <ClipboardList className="h-4 w-4 text-amber-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDeleteLesson(l)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : view === "timeline" ? (
        <div className="space-y-6">
          {grouped.map(([month, items]) => (
            <div key={month}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">{month}</h3>
              <ol className="relative border-l-2 border-border ml-3 space-y-3">
                {items.map(l => {
                  const style = getLessonTypeStyle(l.lesson_type);
                  const Icon = style.icon;
                  return (
                    <li key={l.id} className="ml-5 group">
                      <div className={cn("absolute -left-[9px] h-4 w-4 rounded-full border-2 border-background mt-2", style.accent.replace("border-l-", "bg-"))} />
                      <Card className={cn("cursor-pointer border-l-4 transition-shadow hover:shadow-md", style.accent)} onClick={() => onOpenLesson(l)}>
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="text-xs tabular-nums text-muted-foreground w-20 shrink-0">{l.lesson_date ?? "—"}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{l.title}</div>
                            <div className="flex items-center gap-1 mt-1">
                              <Badge variant="outline" className={cn("gap-1 text-[10px]", style.badge)}><Icon className="h-3 w-3" />{style.label}</Badge>
                              {l.status === "done" && <Badge className="text-[10px]">Realizada</Badge>}
                              {l.status === "cancelled" && <Badge variant="destructive" className="text-[10px]">Cancelada</Badge>}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-3">
              <Button variant="outline" size="sm" onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}>←</Button>
              <div className="font-semibold capitalize">{ptMonth(calMonth)}</div>
              <Button variant="outline" size="sm" onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}>→</Button>
            </div>
            <div className="grid grid-cols-7 text-[11px] uppercase tracking-wider text-muted-foreground text-center mb-1">
              {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(({ date, iso, inMonth }) => {
                const items = byDate.get(iso) || [];
                const isDropTarget = !!onReschedule;
                const isOver = dragOverIso === iso;
                return (
                  <div
                    key={iso}
                    className={cn(
                      "min-h-[80px] rounded-md border p-1 text-xs transition-colors",
                      !inMonth && "opacity-40 bg-muted/30",
                      isOver && "border-primary bg-primary/10 ring-2 ring-primary/30",
                    )}
                    onDragOver={isDropTarget ? (e) => { e.preventDefault(); setDragOverIso(iso); } : undefined}
                    onDragLeave={isDropTarget ? () => setDragOverIso((c) => (c === iso ? null : c)) : undefined}
                    onDrop={isDropTarget ? async (e) => {
                      e.preventDefault();
                      setDragOverIso(null);
                      const id = e.dataTransfer.getData("text/lesson-id");
                      if (!id) return;
                      try {
                        await onReschedule!(id, iso);
                        toast.success(`Aula movida para ${date.toLocaleDateString("pt-BR")}`);
                      } catch (err: any) {
                        toast.error(err?.message || "Erro ao mover aula");
                      }
                    } : undefined}
                  >
                    <div className="text-right text-[10px] text-muted-foreground tabular-nums">{date.getDate()}</div>
                    <div className="space-y-0.5 mt-0.5">
                      {items.slice(0, 3).map(l => {
                        const s = getLessonTypeStyle(l.lesson_type);
                        return (
                          <button
                            key={l.id}
                            onClick={() => onOpenLesson(l)}
                            draggable={isDropTarget}
                            onDragStart={isDropTarget ? (e) => {
                              e.dataTransfer.setData("text/lesson-id", l.id);
                              e.dataTransfer.effectAllowed = "move";
                            } : undefined}
                            className={cn("w-full text-left truncate px-1 py-0.5 rounded border cursor-grab active:cursor-grabbing", s.badge)}
                          >
                            {l.title}
                          </button>
                        );
                      })}
                      {items.length > 3 && <div className="text-[10px] text-muted-foreground">+{items.length - 3}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
