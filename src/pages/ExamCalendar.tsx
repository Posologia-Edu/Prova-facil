import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  addDays, addMonths, addWeeks, eachDayOfInterval, endOfDay, endOfMonth, endOfWeek, format, isBefore, isSameDay, isSameMonth,
  startOfDay, startOfMonth, startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Bell, CalendarDays, ChevronLeft, ChevronRight, Clock, Download, FileEdit, GraduationCap, Stethoscope, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { computeExamStatus } from "@/lib/exam-status";
import { parseSlot, SHIFT_LABELS } from "@/lib/class-schedule-notation";
import { buildIcs, downloadIcs, type IcsEvent } from "@/lib/ics";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Kind = "exam" | "lesson" | "osce" | "holiday";
type View = "month" | "week" | "list";

interface CalEvent {
  id: string;
  kind: Kind;
  title: string;
  start: Date;
  end: Date | null;
  allDay: boolean;
  classId: string | null;
  className: string | null;
  meta: string;
  statusLabel: string;
  statusTone: StatusTone;
  action: { to: string; label: string } | null;
  description: string;
}

const KIND_META: Record<Kind, { label: string; plural: string; dot: string; icon: typeof FileEdit }> = {
  exam: { label: "Prova", plural: "Provas", dot: "bg-primary", icon: FileEdit },
  lesson: { label: "Aula", plural: "Aulas", dot: "bg-info", icon: GraduationCap },
  osce: { label: "OSCE", plural: "OSCE", dot: "bg-success", icon: Stethoscope },
  holiday: { label: "Feriado", plural: "Feriados", dot: "bg-warning", icon: Sun },
};
const KIND_ORDER: Kind[] = ["exam", "lesson", "osce", "holiday"];

const EXAM_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  draft: { label: "Em elaboração", tone: "warn" },
  in_progress: { label: "Em aplicação", tone: "info" },
  grading: { label: "Em correção", tone: "brand" },
  completed: { label: "Concluída", tone: "ok" },
};
const LESSON_TYPES: Record<string, string> = { theoretical: "Teórica", practical: "Prática" };
const LESSON_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  planned: { label: "Planejada", tone: "neutral" },
  scheduled: { label: "Planejada", tone: "neutral" },
  done: { label: "Realizada", tone: "ok" },
  completed: { label: "Realizada", tone: "ok" },
  cancelled: { label: "Cancelada", tone: "bad" },
};
const OSCE_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  draft: { label: "Rascunho", tone: "warn" },
  setup: { label: "Preparando", tone: "warn" },
  active: { label: "Em andamento", tone: "info" },
  in_progress: { label: "Em andamento", tone: "info" },
  completed: { label: "Concluído", tone: "ok" },
  finished: { label: "Concluído", tone: "ok" },
};

// "2025-03-10" vira a data local, sem o deslocamento de fuso que new Date("2025-03-10") causaria
const parseLocalDate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const slotLabel = (slot: string | null) => {
  if (!slot) return "";
  const parsed = parseSlot(slot)[0];
  if (!parsed) return slot;
  return `${SHIFT_LABELS[parsed.shift]} · ${parsed.periods.join("º/")}º horário`;
};

const occursOn = (e: CalEvent, day: Date) => {
  const from = startOfDay(e.start);
  const to = endOfDay(e.end ?? e.start);
  return from <= endOfDay(day) && to >= startOfDay(day);
};

async function fetchEvents(): Promise<{ events: CalEvent[]; classes: { id: string; name: string }[] }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { events: [], classes: [] };

  const [pubsRes, classesRes, circuitsRes] = await Promise.all([
    supabase.from("exam_publications")
      .select("id, exam_id, start_at, end_at, access_code, is_active, time_limit_minutes, exams(title, status)")
      .eq("user_id", user.id),
    supabase.from("classes").select("id, name").eq("user_id", user.id).is("deleted_at", null),
    supabase.from("osce_circuits")
      .select("id, class_id, started_at, created_at, status, osce_exams(title)")
      .eq("user_id", user.id),
  ]);
  if (pubsRes.error) throw pubsRes.error;

  const classes = ((classesRes.data || []) as any[]).map((c) => ({ id: c.id as string, name: c.name as string }));
  const classNames = new Map(classes.map((c) => [c.id, c.name]));
  const events: CalEvent[] = [];

  for (const pub of (pubsRes.data || []) as any[]) {
    const start = pub.start_at ? new Date(pub.start_at) : pub.end_at ? new Date(pub.end_at) : null;
    if (!start) continue;
    const end = pub.end_at ? new Date(pub.end_at) : null;
    const eff = computeExamStatus(pub.exams?.status || "draft", { is_active: pub.is_active, start_at: pub.start_at, end_at: pub.end_at });
    const st = EXAM_STATUS[eff] || EXAM_STATUS.draft;
    const title = pub.exams?.title || "Sem título";
    events.push({
      id: `exam-${pub.id}`, kind: "exam", title, start, end, allDay: false, classId: null, className: null,
      meta: `${pub.start_at ? "Início " + format(new Date(pub.start_at), "dd/MM HH:mm") : ""}${pub.end_at ? " · Fim " + format(new Date(pub.end_at), "dd/MM HH:mm") : ""} · ${pub.time_limit_minutes} min · Código ${pub.access_code}`.replace(/^ · /, ""),
      statusLabel: st.label, statusTone: st.tone,
      action: { to: `/monitoring/${pub.id}`, label: "Ver monitoramento" },
      description: `Prova online · código ${pub.access_code}`,
    });
  }

  for (const c of (circuitsRes.data || []) as any[]) {
    const when = c.started_at || c.created_at;
    if (!when) continue;
    const st = OSCE_STATUS[c.status] || { label: c.status, tone: "neutral" as StatusTone };
    const title = c.osce_exams?.title || "Circuito OSCE";
    events.push({
      id: `osce-${c.id}`, kind: "osce", title, start: new Date(when), end: null, allDay: false,
      classId: c.class_id, className: c.class_id ? classNames.get(c.class_id) ?? null : null,
      meta: c.class_id && classNames.get(c.class_id) ? `Turma ${classNames.get(c.class_id)}` : "Sem turma vinculada",
      statusLabel: st.label, statusTone: st.tone,
      action: { to: `/osce/${c.id}/control`, label: "Abrir circuito" },
      description: "Circuito OSCE",
    });
  }

  if (classes.length) {
    const { data: sems } = await supabase.from("class_semesters").select("id, class_id").in("class_id", classes.map((c) => c.id));
    const semToClass = new Map(((sems || []) as any[]).map((s) => [s.id as string, s.class_id as string]));
    if (semToClass.size) {
      const { data: items } = await supabase.from("class_schedule_items")
        .select("id, semester_id, lesson_date, lesson_type, title, time_slot, is_holiday, holiday_name, status")
        .in("semester_id", [...semToClass.keys()])
        .not("lesson_date", "is", null);
      for (const it of (items || []) as any[]) {
        const classId = semToClass.get(it.semester_id) ?? null;
        const className = classId ? classNames.get(classId) ?? null : null;
        const date = parseLocalDate(it.lesson_date);
        if (it.is_holiday) {
          events.push({
            id: `holiday-${it.id}`, kind: "holiday", title: it.holiday_name || it.title || "Feriado", start: date, end: null, allDay: true,
            classId, className, meta: className ? `Turma ${className}` : "", statusLabel: "Sem aula", statusTone: "warn", action: null,
            description: className ? `Feriado · turma ${className}` : "Feriado",
          });
          continue;
        }
        const st = LESSON_STATUS[it.status] || { label: it.status || "Planejada", tone: "neutral" as StatusTone };
        const parts = [LESSON_TYPES[it.lesson_type] || it.lesson_type, slotLabel(it.time_slot), className ? `Turma ${className}` : ""].filter(Boolean);
        events.push({
          id: `lesson-${it.id}`, kind: "lesson", title: it.title || "Aula", start: date, end: null, allDay: true, classId, className,
          meta: parts.join(" · "), statusLabel: st.label, statusTone: st.tone,
          action: classId ? { to: `/classes/${classId}`, label: "Abrir turma" } : null,
          description: parts.join(" · "),
        });
      }
    }
  }

  events.sort((a, b) => a.start.getTime() - b.start.getTime());
  return { events, classes };
}

export default function ExamCalendarPage() {
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [selected, setSelected] = useState<Date>(new Date());
  const [classFilter, setClassFilter] = useState("all");
  const [kinds, setKinds] = useState<Record<Kind, boolean>>({ exam: true, lesson: true, osce: true, holiday: true });

  const { data, isLoading } = useQuery({ queryKey: ["calendar-events"], queryFn: fetchEvents });
  const classes = data?.classes ?? [];

  const events = useMemo(() => {
    const all = data?.events ?? [];
    return all.filter((e) => {
      if (!kinds[e.kind]) return false;
      if (classFilter === "all") return true;
      if (e.kind === "exam") return false;
      return e.classId === classFilter;
    });
  }, [data, kinds, classFilter]);

  const counts = useMemo(() => {
    const c: Record<Kind, number> = { exam: 0, lesson: 0, osce: 0, holiday: 0 };
    (data?.events ?? []).forEach((e) => {
      if (classFilter !== "all" && (e.kind === "exam" || e.classId !== classFilter)) return;
      c[e.kind]++;
    });
    return c;
  }, [data, classFilter]);

  const eventsOn = (day: Date) => events.filter((e) => occursOn(e, day));

  const notifications = useMemo(() => {
    const now = new Date();
    const notes: { type: "urgent" | "warning" | "info"; message: string }[] = [];
    (data?.events ?? []).forEach((e) => {
      if (e.kind === "exam") {
        if (isBefore(now, e.start) && isBefore(e.start, addDays(now, 3))) {
          notes.push({ type: "warning", message: `"${e.title}" começa em ${format(e.start, "dd/MM 'às' HH:mm", { locale: ptBR })}` });
        }
        if (e.statusLabel === "Em elaboração") {
          notes.push({ type: "urgent", message: `"${e.title}" ainda está em elaboração e tem data agendada!` });
        }
        if (e.end && isSameDay(e.end, now)) {
          notes.push({ type: "info", message: `"${e.title}" encerra hoje às ${format(e.end, "HH:mm")}` });
        }
      }
    });
    const lessonsToday = (data?.events ?? []).filter((e) => e.kind === "lesson" && isSameDay(e.start, now)).length;
    if (lessonsToday) notes.push({ type: "info", message: `Você tem ${lessonsToday} ${lessonsToday === 1 ? "aula" : "aulas"} hoje` });
    return notes;
  }, [data]);

  const move = (dir: -1 | 1) => setCursor((c) => (view === "month" ? addMonths(c, dir) : view === "week" ? addWeeks(c, dir) : addMonths(c, dir)));
  const goToday = () => { const t = new Date(); setCursor(t); setSelected(t); };

  const monthDays = eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor)), end: endOfWeek(endOfMonth(cursor)) });
  const weekDays = eachDayOfInterval({ start: startOfWeek(cursor), end: endOfWeek(cursor) });

  const listGroups = useMemo(() => {
    const from = startOfMonth(cursor), to = endOfMonth(cursor);
    const days = eachDayOfInterval({ start: from, end: to });
    return days.map((d) => ({ day: d, items: events.filter((e) => occursOn(e, d)) })).filter((g) => g.items.length > 0);
  }, [events, cursor]);

  const title = view === "week"
    ? `${format(weekDays[0], "d MMM", { locale: ptBR })} – ${format(weekDays[6], "d MMM yyyy", { locale: ptBR })}`
    : format(cursor, "MMMM 'de' yyyy", { locale: ptBR });

  const exportIcs = () => {
    const list: IcsEvent[] = events.map((e) => ({
      uid: e.id, title: `${KIND_META[e.kind].label}: ${e.title}`, description: e.description, start: e.start, end: e.end ?? undefined, allDay: e.allDay,
    }));
    downloadIcs("calendario-provafacil.ics", buildIcs(list));
  };

  const renderEvent = (e: CalEvent) => {
    const K = KIND_META[e.kind];
    return (
      <div key={e.id} className="flex items-start gap-3 p-4">
        <span className={cn("mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md text-white", K.dot)}><K.icon className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{e.title}</p>
            <StatusBadge tone={e.statusTone} dot>{e.statusLabel}</StatusBadge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{K.label}{e.meta ? ` · ${e.meta}` : ""}</p>
        </div>
        {e.action && (
          <Button variant="outline" size="sm" asChild><Link to={e.action.to}>{e.action.label}</Link></Button>
        )}
      </div>
    );
  };

  const selectedEvents = eventsOn(selected);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Gestão"
        title="Calendário"
        description="Provas, aulas das turmas, feriados e circuitos OSCE em um só lugar."
        actions={
          <Button variant="outline" onClick={exportIcs} disabled={events.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Exportar para o calendário (.ics)
          </Button>
        }
      />

      {notifications.length > 0 && (
        <Card className="border-warning/30 bg-warning/5 p-4 space-y-2">
          <div className="flex items-center gap-2 font-heading text-base font-medium">
            <Bell className="h-4 w-4 text-warning-ink" /> Lembretes <span className="font-mono text-xs text-muted-foreground">{notifications.length}</span>
          </div>
          {notifications.map((n, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              {n.type === "urgent" ? <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                : n.type === "warning" ? <Clock className="h-4 w-4 text-warning-ink mt-0.5 shrink-0" />
                : <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
              <span className={n.type === "urgent" ? "text-destructive" : "text-foreground"}>{n.message}</span>
            </div>
          ))}
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Turma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as turmas</SelectItem>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap gap-1.5">
          {KIND_ORDER.map((k) => (
            <Button key={k} size="sm" variant={kinds[k] ? "default" : "outline"} onClick={() => setKinds((p) => ({ ...p, [k]: !p[k] }))}>
              <span className={cn("mr-1.5 h-2 w-2 rounded-full", KIND_META[k].dot)} />
              {KIND_META[k].plural} <span className="ml-1.5 font-mono text-xs opacity-80">{counts[k]}</span>
            </Button>
          ))}
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as View)} className="ml-auto">
          <TabsList>
            <TabsTrigger value="month">Mês</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="list">Lista</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {classFilter !== "all" && (
        <p className="-mt-3 text-xs text-muted-foreground">Provas online não são ligadas a turmas e aparecem só em “Todas as turmas”.</p>
      )}

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => move(-1)} aria-label="Anterior"><ChevronLeft className="h-4 w-4" /></Button>
        <h2 className="min-w-[12rem] text-center font-heading text-xl font-medium capitalize">{title}</h2>
        <Button variant="outline" size="icon" onClick={() => move(1)} aria-label="Próximo"><ChevronRight className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={goToday}>Hoje</Button>
      </div>

      {isLoading ? (
        <Card className="animate-pulse p-8"><div className="h-5 bg-muted rounded w-1/3" /></Card>
      ) : view === "list" ? (
        listGroups.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">Nenhum evento neste mês.</Card>
        ) : (
          <div className="space-y-4">
            {listGroups.map((g) => (
              <Card key={g.day.toISOString()} className="overflow-hidden">
                <div className="border-b bg-sunken px-4 py-2 label-mono capitalize">{format(g.day, "EEEE, d 'de' MMMM", { locale: ptBR })}</div>
                <div className="divide-y">{g.items.map(renderEvent)}</div>
              </Card>
            ))}
          </div>
        )
      ) : (
        <>
          {view === "month" ? (
            <Card className="overflow-hidden">
              <div className="grid grid-cols-7 border-b bg-sunken">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => <div key={d} className="px-2 py-2 text-center label-mono">{d}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {monthDays.map((day) => {
                  const dayEvents = eventsOn(day);
                  const kindsOn = KIND_ORDER.filter((k) => dayEvents.some((e) => e.kind === k));
                  const isSel = isSameDay(day, selected);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => setSelected(day)}
                      className={cn(
                        "flex min-h-[4.5rem] flex-col items-start gap-1 border-b border-r p-2 text-left transition-colors hover:bg-muted/50",
                        !isSameMonth(day, cursor) && "bg-muted/20 text-muted-foreground",
                        isSel && "bg-brand-soft",
                      )}
                    >
                      <span className={cn("grid h-6 w-6 place-items-center rounded-full text-xs font-medium", isToday && "bg-primary text-primary-foreground")}>{format(day, "d")}</span>
                      {dayEvents.length > 0 && (
                        <span className="flex items-center gap-1">
                          {kindsOn.map((k) => <span key={k} className={cn("h-1.5 w-1.5 rounded-full", KIND_META[k].dot)} />)}
                          <span className="font-mono text-[10px] text-muted-foreground">{dayEvents.length}</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
              {weekDays.map((day) => {
                const dayEvents = eventsOn(day);
                const isSel = isSameDay(day, selected);
                return (
                  <Card key={day.toISOString()} className={cn("flex min-h-[8rem] flex-col gap-2 p-3", isSel && "border-primary")} onClick={() => setSelected(day)}>
                    <div className="label-mono capitalize">{format(day, "EEE d", { locale: ptBR })}</div>
                    {dayEvents.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                    {dayEvents.map((e) => (
                      <div key={e.id} className="flex items-start gap-1.5 text-xs">
                        <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", KIND_META[e.kind].dot)} />
                        <span className="min-w-0 break-words">{e.title}</span>
                      </div>
                    ))}
                  </Card>
                );
              })}
            </div>
          )}

          <Card className="overflow-hidden">
            <div className="border-b px-4 py-3 font-heading text-lg font-medium capitalize">
              {format(selected, "EEEE, d 'de' MMMM", { locale: ptBR })}
              <span className="ml-2 font-mono text-xs text-muted-foreground">{selectedEvents.length} {selectedEvents.length === 1 ? "evento" : "eventos"}</span>
            </div>
            {selectedEvents.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nada marcado para este dia.</p>
            ) : (
              <div className="divide-y">{selectedEvents.map(renderEvent)}</div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
