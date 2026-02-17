import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isSameDay, startOfMonth, endOfMonth, isWithinInterval, addDays, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Bell, Clock, FileEdit, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface ExamEvent {
  id: string;
  examTitle: string;
  examId: string;
  examStatus: string;
  startAt: Date | null;
  endAt: Date | null;
  accessCode: string;
  isActive: boolean;
  timeLimitMinutes: number;
}

export default function ExamCalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [month, setMonth] = useState<Date>(new Date());

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["exam-calendar-events"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("exam_publications")
        .select("id, exam_id, start_at, end_at, access_code, is_active, time_limit_minutes, exams(title, status)")
        .eq("user_id", user.id);

      if (error) throw error;

      return (data || []).map((pub: any) => ({
        id: pub.id,
        examTitle: pub.exams?.title || "Sem título",
        examId: pub.exam_id,
        examStatus: pub.exams?.status || "draft",
        startAt: pub.start_at ? new Date(pub.start_at) : null,
        endAt: pub.end_at ? new Date(pub.end_at) : null,
        accessCode: pub.access_code,
        isActive: pub.is_active,
        timeLimitMinutes: pub.time_limit_minutes,
      })) as ExamEvent[];
    },
  });

  const eventsForDate = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter((e) => {
      if (e.startAt && isSameDay(e.startAt, selectedDate)) return true;
      if (e.endAt && isSameDay(e.endAt, selectedDate)) return true;
      if (e.startAt && e.endAt && isWithinInterval(selectedDate, { start: e.startAt, end: e.endAt })) return true;
      return false;
    });
  }, [events, selectedDate]);

  const notifications = useMemo(() => {
    const now = new Date();
    const notes: { type: "warning" | "info" | "urgent"; message: string; examId: string }[] = [];

    events.forEach((e) => {
      // Exams starting in the next 3 days
      if (e.startAt && isBefore(now, e.startAt) && isBefore(e.startAt, addDays(now, 3))) {
        notes.push({
          type: "warning",
          message: `"${e.examTitle}" começa em ${format(e.startAt, "dd/MM 'às' HH:mm", { locale: ptBR })}`,
          examId: e.examId,
        });
      }
      // Draft exams with scheduled dates
      if (e.examStatus === "draft" && e.startAt) {
        notes.push({
          type: "urgent",
          message: `"${e.examTitle}" ainda está em rascunho e tem data agendada!`,
          examId: e.examId,
        });
      }
      // Exams ending today
      if (e.endAt && isSameDay(e.endAt, now)) {
        notes.push({
          type: "info",
          message: `"${e.examTitle}" encerra hoje às ${format(e.endAt, "HH:mm")}`,
          examId: e.examId,
        });
      }
    });

    return notes;
  }, [events]);

  const datesWithEvents = useMemo(() => {
    const dates: Date[] = [];
    events.forEach((e) => {
      if (e.startAt) dates.push(e.startAt);
      if (e.endAt) dates.push(e.endAt);
    });
    return dates;
  }, [events]);

  const modifiers = useMemo(() => ({
    hasEvent: (date: Date) => datesWithEvents.some((d) => isSameDay(d, date)),
  }), [datesWithEvents]);

  const modifiersStyles = {
    hasEvent: {
      fontWeight: 700,
      textDecoration: "underline",
      textDecorationColor: "hsl(var(--primary))",
      textUnderlineOffset: "4px",
    },
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CalendarIcon className="h-6 w-6 text-primary" />
          Calendário de Provas
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visualize suas provas agendadas e receba lembretes importantes.
        </p>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Lembretes ({notifications.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifications.map((n, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                {n.type === "urgent" ? (
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                ) : n.type === "warning" ? (
                  <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                )}
                <span className={n.type === "urgent" ? "text-destructive" : "text-foreground"}>
                  {n.message}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-1">
          <CardContent className="p-4 flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={month}
              onMonthChange={setMonth}
              locale={ptBR}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              className="p-3 pointer-events-auto"
            />
          </CardContent>
        </Card>

        {/* Events for selected date */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              {selectedDate
                ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                : "Selecione uma data"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
            ) : eventsForDate.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Nenhuma prova agendada para esta data.
              </p>
            ) : (
              <div className="space-y-3">
                {eventsForDate.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
                          <FileEdit className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{event.examTitle}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {event.startAt && (
                              <span>Início: {format(event.startAt, "dd/MM HH:mm")}</span>
                            )}
                            {event.endAt && (
                              <>
                                <span>·</span>
                                <span>Fim: {format(event.endAt, "dd/MM HH:mm")}</span>
                              </>
                            )}
                            <span>·</span>
                            <span>{event.timeLimitMinutes}min</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={event.isActive ? "default" : "secondary"}>
                          {event.isActive ? "Ativa" : "Inativa"}
                        </Badge>
                        <Badge variant={event.examStatus === "draft" ? "secondary" : "default"}>
                          {event.examStatus === "draft" ? "Rascunho" : "Publicada"}
                        </Badge>
                      </div>
                    </div>
                    <Separator className="my-3" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Código: <span className="font-mono font-medium">{event.accessCode}</span>
                      </span>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/monitoring/${event.id}`}>
                          Ver monitoramento
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
