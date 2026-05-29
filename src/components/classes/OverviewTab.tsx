import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, GraduationCap, CheckCircle2, Clock, FileText } from "lucide-react";
import { getLessonTypeStyle } from "@/lib/lesson-type-style";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

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
    { label: "Alunos", value: stats.students, icon: Users, cls: "from-blue-500/20 to-blue-500/5 text-blue-700 dark:text-blue-300" },
    { label: "Aulas planejadas", value: stats.lessonsTotal, icon: Calendar, cls: "from-purple-500/20 to-purple-500/5 text-purple-700 dark:text-purple-300" },
    { label: "Aulas realizadas", value: `${stats.lessonsDone}/${stats.lessonsTotal}`, icon: CheckCircle2, cls: "from-emerald-500/20 to-emerald-500/5 text-emerald-700 dark:text-emerald-300" },
    { label: "Presença média", value: stats.attendanceAvg !== null ? `${stats.attendanceAvg.toFixed(0)}%` : "—", icon: GraduationCap, cls: "from-amber-500/20 to-amber-500/5 text-amber-700 dark:text-amber-300" },
  ];

  const progressPct = stats.lessonsTotal ? (stats.lessonsDone / stats.lessonsTotal) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className={cn("bg-gradient-to-br border-0 shadow-sm", k.cls)}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-background/60 backdrop-blur flex items-center justify-center">
                <k.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-bold leading-none">{k.value}</div>
                <div className="text-xs opacity-80 mt-1">{k.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />Próximas aulas</div>
              {onNavigateTab && <button onClick={() => onNavigateTab("schedule")} className="text-xs text-primary hover:underline">Ver cronograma →</button>}
            </div>
            {stats.upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Sem aulas futuras planejadas.</p>
            ) : (
              <ol className="relative border-l-2 border-border ml-3 space-y-4">
                {stats.upcoming.map(l => {
                  const style = getLessonTypeStyle(l.lesson_type);
                  const Icon = style.icon;
                  return (
                    <li key={l.id} className="ml-4">
                      <div className={cn("absolute -left-[9px] mt-1 h-4 w-4 rounded-full border-2 border-background", style.accent.replace("border-l-", "bg-"))} />
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={cn("gap-1", style.badge)}><Icon className="h-3 w-3" />{style.label}</Badge>
                        <span className="text-xs text-muted-foreground">{l.lesson_date}</span>
                      </div>
                      <p className="font-medium mt-1">{l.title}</p>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div>
              <div className="font-semibold flex items-center gap-2 mb-2"><Clock className="h-4 w-4 text-primary" />Progresso do semestre</div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-secondary transition-all" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">{progressPct.toFixed(0)}% concluído</div>
            </div>
            <div className="pt-3 border-t">
              <div className="font-semibold flex items-center gap-2 mb-3"><FileText className="h-4 w-4 text-primary" />Atalhos</div>
              <div className="flex flex-col gap-1.5 text-sm">
                {onNavigateTab && (
                  <>
                    <button onClick={() => onNavigateTab("attendance")} className="text-left hover:text-primary">→ Marcar presença</button>
                    <button onClick={() => onNavigateTab("grades")} className="text-left hover:text-primary">→ Lançar notas</button>
                    <button onClick={() => onNavigateTab("students")} className="text-left hover:text-primary">→ Gerenciar alunos</button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
