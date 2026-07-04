import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LayoutList, GitBranch, CalendarDays, Search, ClipboardList, Trash2, Download, Columns3, MapPin, Phone, User as UserIcon, FileSpreadsheet, FileText as FileTextIcon, ChevronDown } from "lucide-react";
import { parseSlot } from "@/lib/class-schedule-notation";
import { getLessonTypeStyle, LESSON_TYPE_STYLE } from "@/lib/lesson-type-style";
import { cn } from "@/lib/utils";
import { buildIcs, downloadIcs } from "@/lib/ics-export";
import { exportScheduleToExcel, exportScheduleToPdf, ScheduleExportLesson } from "@/lib/schedule-export";
import { toast } from "sonner";

export interface ScheduleVisit {
  id?: string;
  title: string;
  location: string | null;
  notes: string | null;
  teacher_id: string | null;
  time_slot: string | null;
  student_ids: string[];
  preceptor_name?: string | null;
  preceptor_phone?: string | null;
}

export interface ScheduleLesson {
  id: string;
  title: string;
  lesson_date: string | null;
  lesson_type: string;
  status: string;
  teacher_id?: string | null;
  time_slot?: string | null;
  is_holiday?: boolean;
  holiday_name?: string | null;
  visits_count?: number;
  visits?: ScheduleVisit[];
  notes?: string | null;
}

interface Teacher { id: string; name: string }
interface Student { id: string; student_name: string }

interface Props {
  teachers?: Teacher[];
  students?: Student[];
  lessons: ScheduleLesson[];
  onOpenLesson: (l: ScheduleLesson) => void;
  onDeleteLesson: (l: ScheduleLesson) => void;
  onOpenSeminarEval?: (l: ScheduleLesson) => void;
  onReschedule?: (lessonId: string, newDate: string) => Promise<void> | void;
  calendarName?: string;
}

type View = "list" | "shifts" | "timeline" | "calendar";

function shiftOf(l: ScheduleLesson): "M" | "T" | "N" | null {
  const s = (l.time_slot || "").toUpperCase();
  const parsed = parseSlot(s);
  if (parsed[0]) return parsed[0].shift;
  const m = /[MTN]/.exec(s);
  return (m?.[0] as any) ?? null;
}

function ptMonth(date: Date) {
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function ScheduleViews({ lessons, teachers = [], students = [], onOpenLesson, onDeleteLesson, onOpenSeminarEval, onReschedule, calendarName }: Props) {
  const teacherMap = new Map(teachers.map(t => [t.id, t.name]));
  const studentMap = new Map(students.map(s => [s.id, s.student_name]));
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

  function toExportRows(): ScheduleExportLesson[] {
    return filtered.map((l) => ({
      lesson_date: l.lesson_date,
      title: l.title,
      lesson_type: getLessonTypeStyle(l.lesson_type).label,
      status: l.status === "done" ? "Realizada" : l.status === "cancelled" ? "Cancelada" : "Planejada",
      teacher_name: l.teacher_id ? teacherMap.get(l.teacher_id) ?? null : null,
      time_slot: l.time_slot ?? null,
      notes: l.notes ?? null,
      visits: (l.visits || []).map((v) => ({
        title: v.title,
        location: v.location,
        teacher_name: v.teacher_id ? teacherMap.get(v.teacher_id) ?? null : null,
        time_slot: v.time_slot,
        preceptor_name: v.preceptor_name ?? null,
        preceptor_phone: v.preceptor_phone ?? null,
        students: (v.student_ids || []).map((id) => studentMap.get(id) || id),
      })),
    }));
  }

  function handleExportExcel() {
    if (filtered.length === 0) { toast.error("Nada para exportar."); return; }
    exportScheduleToExcel(calendarName || "Cronograma", toExportRows());
    toast.success("Arquivo Excel exportado");
  }
  function handleExportPdf() {
    if (filtered.length === 0) { toast.error("Nada para exportar."); return; }
    exportScheduleToPdf(calendarName || "Cronograma", toExportRows());
    toast.success("PDF exportado");
  }

  const filtered = useMemo(() => {
    return lessons.filter(l => {
      if (typeFilter !== "all" && l.lesson_type !== typeFilter) return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (query && !l.title.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    }).sort((a, b) => {
      const da = a.lesson_date || "";
      const db = b.lesson_date || "";
      if (da !== db) return da.localeCompare(db);
      return (a.time_slot || "").localeCompare(b.time_slot || "");
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
            <Button variant={view === "shifts" ? "secondary" : "ghost"} size="sm" className="h-8" onClick={() => setView("shifts")}>
              <Columns3 className="h-4 w-4 mr-1" />Turnos
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Download className="h-4 w-4 mr-1" />Exportar<ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPdf}>
                  <FileTextIcon className="h-4 w-4 mr-2" />PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportIcs}>
                  <CalendarDays className="h-4 w-4 mr-2" />Calendário (ICS)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma aula corresponde aos filtros.</CardContent></Card>
      ) : view === "list" ? (
        (() => {
          // Merge lessons that share (date, title, teacher_id, lesson_type, status) — differ only by time_slot.
          // Visit lessons (technical_visit) are NOT merged since each has its own visit set.
          type Merged = { ids: string[]; base: ScheduleLesson; time_slots: string[] };
          const merged: Merged[] = [];
          filtered.forEach((l) => {
            const isVisit = l.lesson_type === "technical_visit";
            if (!isVisit) {
              const key = [l.lesson_date, l.title, l.teacher_id || "", l.lesson_type, l.status].join("|");
              const found = merged.find((m) =>
                !((m.base.lesson_type === "technical_visit") || (m.base.id === l.id)) &&
                [m.base.lesson_date, m.base.title, m.base.teacher_id || "", m.base.lesson_type, m.base.status].join("|") === key
              );
              if (found) {
                found.ids.push(l.id);
                if (l.time_slot && !found.time_slots.includes(l.time_slot)) found.time_slots.push(l.time_slot);
                return;
              }
            }
            merged.push({ ids: [l.id], base: l, time_slots: l.time_slot ? [l.time_slot] : [] });
          });

          return (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Data</TableHead>
                    <TableHead>Aula</TableHead>
                    <TableHead className="w-40">Turnos</TableHead>
                    <TableHead className="w-44">Tipo</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-28"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {merged.map((m, idx) => {
                    const l = m.base;
                    const style = getLessonTypeStyle(l.lesson_type);
                    const Icon = style.icon;
                    const teacherName = l.teacher_id ? teacherMap.get(l.teacher_id) : null;
                    const isHoliday = l.is_holiday || l.lesson_type === "holiday";
                    const isVisit = l.lesson_type === "technical_visit";
                    const prev = merged[idx - 1];
                    const sameAsPrev = !!prev && (prev.base.lesson_date || "—") === (l.lesson_date || "—");
                    let rowSpan = 1;
                    if (!sameAsPrev) {
                      for (let j = idx + 1; j < merged.length; j++) {
                        if ((merged[j].base.lesson_date || "—") === (l.lesson_date || "—")) rowSpan++;
                        else break;
                      }
                    }
                    return (
                      <TableRow key={m.ids.join("+")} className={cn("cursor-pointer border-l-4 align-top", style.accent, style.rowBg, isHoliday && "bg-amber-50/60", sameAsPrev && "border-t-0")} onClick={() => onOpenLesson(l)}>
                        {!sameAsPrev && (
                          <TableCell className="tabular-nums align-top" rowSpan={rowSpan}>
                            <div>{l.lesson_date ?? "—"}</div>
                          </TableCell>
                        )}
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{l.title}</span>
                            {!!l.visits_count && l.visits_count > 0 && (
                              <Badge variant="secondary" className="text-[10px]">{l.visits_count} visita{l.visits_count > 1 ? "s" : ""}</Badge>
                            )}
                          </div>
                          {!isVisit && teacherName && (
                            <div className="text-xs text-muted-foreground mt-0.5">Prof. {teacherName}</div>
                          )}
                          {isVisit && (l.visits?.length ?? 0) > 0 && (() => {
                            const shiftOfVisit = (ts: string | null | undefined): "M" | "T" | "N" | null => {
                              const s = (ts || "").toUpperCase();
                              const parsed = parseSlot(s);
                              if (parsed[0]) return parsed[0].shift;
                              const mm = /[MTN]/.exec(s);
                              return (mm?.[0] as any) ?? null;
                            };
                            const morning = l.visits!.filter((v) => shiftOfVisit(v.time_slot) === "M");
                            const night = l.visits!.filter((v) => shiftOfVisit(v.time_slot) === "N");
                            const others = l.visits!.filter((v) => {
                              const sh = shiftOfVisit(v.time_slot);
                              return sh !== "M" && sh !== "N";
                            });
                            const renderVisit = (v: ScheduleVisit, i: number) => {
                              const vTeacher = v.teacher_id ? teacherMap.get(v.teacher_id) : null;
                              return (
                                <div key={v.id ?? i} className="text-xs bg-muted/40 rounded-md px-2 py-1.5 border">
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    <span className="font-medium">{v.title || `Visita ${i + 1}`}</span>
                                    {v.time_slot && <Badge variant="outline" className="text-[9px] font-mono h-4 px-1">{v.time_slot}</Badge>}
                                    {vTeacher && <span className="text-muted-foreground">Prof. {vTeacher}</span>}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-muted-foreground">
                                    {v.location && (
                                      <a href={v.location} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-primary hover:underline">
                                        <MapPin className="h-3 w-3" />Local
                                      </a>
                                    )}
                                    {v.preceptor_name && (
                                      <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" />{v.preceptor_name}</span>
                                    )}
                                    {v.preceptor_phone && (
                                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{v.preceptor_phone}</span>
                                    )}
                                    <span>{(v.student_ids || []).length} aluno{(v.student_ids || []).length === 1 ? "" : "s"}</span>
                                  </div>
                                </div>
                              );
                            };
                            return (
                              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div className="space-y-1.5">
                                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Matutino ({morning.length})</div>
                                  {morning.length === 0 ? (
                                    <div className="text-xs text-muted-foreground italic">—</div>
                                  ) : morning.map(renderVisit)}
                                </div>
                                <div className="space-y-1.5">
                                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Noturno ({night.length})</div>
                                  {night.length === 0 ? (
                                    <div className="text-xs text-muted-foreground italic">—</div>
                                  ) : night.map(renderVisit)}
                                </div>
                                {others.length > 0 && (
                                  <div className="space-y-1.5 md:col-span-2">
                                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Outros ({others.length})</div>
                                    {others.map(renderVisit)}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {m.time_slots.length === 0 ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              m.time_slots.map((ts) => (
                                <Badge key={ts} variant="outline" className="text-[10px] font-mono">{ts}</Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isHoliday ? (
                            <Badge variant="outline" className="gap-1 bg-amber-100 text-amber-900 border-amber-300">Feriado</Badge>
                          ) : (
                            <Badge variant="outline" className={cn("gap-1", style.badge)}><Icon className="h-3 w-3" />{style.label}</Badge>
                          )}
                        </TableCell>
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
          );
        })()
      ) : view === "shifts" ? (
        (() => {
          // Group by date, then by shift
          const dateOrder: string[] = [];
          const byDateShift = new Map<string, Record<"M" | "T" | "N" | "X", ScheduleLesson[]>>();
          filtered.forEach((l) => {
            const key = l.lesson_date || "—";
            if (!byDateShift.has(key)) {
              dateOrder.push(key);
              byDateShift.set(key, { M: [], T: [], N: [], X: [] });
            }
            const sh = shiftOf(l) ?? "X";
            byDateShift.get(key)![sh].push(l);
          });
          const shiftsPresent: Array<"M" | "T" | "N"> = (["M", "T", "N"] as const).filter((s) =>
            filtered.some((l) => shiftOf(l) === s)
          );
          const showUnassigned = filtered.some((l) => shiftOf(l) === null);
          const shiftLabels: Record<"M" | "T" | "N" | "X", string> = { M: "Manhã", T: "Tarde", N: "Noite", X: "Sem turno" };

          const renderCell = (items: ScheduleLesson[]) => {
            if (!items.length) return <span className="text-muted-foreground/50">—</span>;
            return (
              <div className="space-y-1.5">
                {items.map((l) => {
                  const style = getLessonTypeStyle(l.lesson_type);
                  const Icon = style.icon;
                  const teacherName = l.teacher_id ? teacherMap.get(l.teacher_id) : null;
                  const isHoliday = l.is_holiday || l.lesson_type === "holiday";
                  return (
                    <div
                      key={l.id}
                      className={cn(
                        "group cursor-pointer rounded-md border border-l-4 px-2 py-1.5 hover:bg-muted/40 transition-colors",
                        style.accent,
                        isHoliday && "bg-amber-50/60"
                      )}
                      onClick={() => onOpenLesson(l)}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 flex-wrap">
                            <Icon className="h-3 w-3 shrink-0" />
                            <span className="text-sm font-medium truncate">{l.title}</span>
                          </div>
                          {teacherName && (
                            <div className="text-xs text-muted-foreground mt-0.5 truncate">Prof. {teacherName}</div>
                          )}
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            {l.time_slot && (
                              <Badge variant="outline" className="text-[9px] font-mono h-4 px-1">
                                {l.time_slot}
                              </Badge>
                            )}
                            {l.status === "cancelled" && (
                              <Badge variant="destructive" className="text-[9px] h-4 px-1">Cancelada</Badge>
                            )}
                            {l.status === "done" && (
                              <Badge className="text-[9px] h-4 px-1">Realizada</Badge>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteLesson(l); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Excluir"
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          };

          const cols: Array<"M" | "T" | "N" | "X"> = [...shiftsPresent, ...(showUnassigned ? (["X"] as const) : [])];

          return (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28 align-middle">Data</TableHead>
                    {cols.map((s) => (
                      <TableHead key={s} className="text-center">{shiftLabels[s]}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dateOrder.map((iso) => {
                    const row = byDateShift.get(iso)!;
                    const dateLabel = iso === "—" ? "—" : new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
                    return (
                      <TableRow key={iso} className="align-top">
                        <TableCell className="tabular-nums font-medium">{dateLabel}</TableCell>
                        {cols.map((s) => (
                          <TableCell key={s} className="p-2">{renderCell(row[s])}</TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          );
        })()
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
