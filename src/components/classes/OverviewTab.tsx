import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, GraduationCap, CheckCircle2, Clock, FileText } from "lucide-react";
import { getLessonTypeStyle } from "@/lib/lesson-type-style";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { AnnouncementsBoard } from "./AnnouncementsBoard";

interface Props {
  classId: string;
  semesterId: string | null;
  onNavigateTab?: (tab: string) => void;
}

interface Stats {
  students: number;
  lessonsTotal: number;
  lessonsDone: number;
  attendanceAvg: number | null;
  upcoming: Array<{ id: string; title: string; lesson_date: string | null; lesson_type: string; status: string }>;
  recentDone: number;
}

export function OverviewTab({ classId, semesterId, onNavigateTab }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!semesterId) { setStats(null); return; }
    (async () => {
      setStats(null);
      const today = new Date().toISOString().slice(0, 10);

      const [stu, lessons, att] = await Promise.all([
        supabase.from("class_students").select("id", { count: "exact", head: true }).eq("semester_id", semesterId),
        supabase.from("class_schedule_items").select("id,title,lesson_date,lesson_type,status").eq("semester_id", semesterId).order("lesson_date", { ascending: true, nullsFirst: false }),
        supabase.from("class_attendance").select("status, lesson_id, class_schedule_items!inner(semester_id)").eq("class_schedule_items.semester_id", semesterId),
      ]);

      const lessonList = (lessons.data as any[]) || [];
      const lessonsDone = lessonList.filter(l => l.status === "done").length;
      const upcoming = lessonList.filter(l => l.lesson_date && l.lesson_date >= today && l.status !== "cancelled").slice(0, 5);

      const attRows = (att.data as any[]) || [];
      let attendanceAvg: number | null = null;
      if (attRows.length) {
        const presentLike = attRows.filter(r => r.status === "present" || r.status === "justified").length;
        attendanceAvg = (presentLike / attRows.length) * 100;
      }

      setStats({
        students: stu.count ?? 0,
        lessonsTotal: lessonList.length,
        lessonsDone,
        attendanceAvg,
        upcoming,
        recentDone: lessonList.filter(l => l.lesson_date && l.lesson_date <= today && l.status === "done").length,
      });
    })();
  }, [semesterId, classId]);

  if (!semesterId) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">
        Selecione ou crie um semestre para ver o dashboard.
      </CardContent></Card>
    );
  }

  if (!stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  const kpis = [
    { label: "Alunos", value: stats.students },
    { label: "Aulas planejadas", value: stats.lessonsTotal },
    { label: "Aulas realizadas", value: `${stats.lessonsDone}/${stats.lessonsTotal}` },
    { label: "Presença média", value: stats.attendanceAvg !== null ? `${stats.attendanceAvg.toFixed(0)}%` : "—" },
  ];

  const progressPct = stats.lessonsTotal ? (stats.lessonsDone / stats.lessonsTotal) * 100 : 0;
  const dayLabel = (iso: string | null) =>
    iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }).replace(".,", "") : "—";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5">
            <p className="label-mono">{k.label}</p>
            <p className="mt-2 font-heading text-4xl font-medium leading-none">{k.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h3 className="font-heading text-base font-medium">Próximas aulas</h3>
              {onNavigateTab && <button onClick={() => onNavigateTab("schedule")} className="text-xs font-medium text-primary hover:underline">Ver cronograma →</button>}
            </div>
            {stats.upcoming.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">Sem aulas futuras planejadas.</p>
            ) : (
              <div className="divide-y">
                {stats.upcoming.map((l) => {
                  const style = getLessonTypeStyle(l.lesson_type);
                  const Icon = style.icon;
                  return (
                    <div key={l.id} className="flex items-center gap-4 px-5 py-3">
                      <span className="w-20 shrink-0 font-mono text-xs capitalize text-muted-foreground">{dayLabel(l.lesson_date)}</span>
                      <p className="min-w-0 flex-1 truncate text-sm font-medium">{l.title}</p>
                      <Badge variant="outline" className={cn("shrink-0 gap-1", style.badge)}><Icon className="h-3 w-3" />{style.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <AnnouncementsBoard classId={classId} semesterId={semesterId} />
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <p className="label-mono">Progresso do semestre</p>
            <p className="my-2 font-heading text-4xl font-medium leading-none">{progressPct.toFixed(0)}%</p>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-highlight transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{stats.lessonsDone} de {stats.lessonsTotal} aulas realizadas</p>
          </Card>

          {onNavigateTab && (
            <Card>
              <div className="border-b px-5 py-4"><h3 className="font-heading text-base font-medium">Atalhos</h3></div>
              <div className="divide-y text-sm">
                {[
                  { tab: "attendance", label: "Marcar presença" },
                  { tab: "grades", label: "Lançar notas" },
                  { tab: "students", label: "Gerenciar alunos" },
                ].map((a) => (
                  <button key={a.tab} onClick={() => onNavigateTab(a.tab)} className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-muted/50">
                    {a.label}<span className="text-muted-foreground">→</span>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
