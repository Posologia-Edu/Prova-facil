import { useState, useEffect } from "react";
import {
  Library,
  GraduationCap,
  Plus,
  ArrowRight,
  Loader2,
  Stethoscope,
  HeartPulse,
  UserRound,
  BrainCircuit,
  Target,
  ClipboardCheck,
  Scale,
  TrendingUp,
  Gavel,
  BookOpen,
  CalendarDays,
  Activity,
  Sparkles,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useVpCatalog } from "@/lib/vp-catalog";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { RoadmapProactiveDialog } from "@/components/RoadmapProactiveDialog";

interface RecentActivity {
  id: string;
  title: string;
  type: string;
  date: string;
  icon: typeof BookOpen;
  url: string;
  status?: string;
}

interface Todo {
  key: string;
  icon: typeof BookOpen;
  title: string;
  detail: string;
  action: string;
  url: string;
  primary?: boolean;
}

const MODULE_CARDS = [
  { label: "Provas", icon: BookOpen, url: "/exams", key: "exams" },
  { label: "OSCE", icon: Stethoscope, url: "/osce", key: "osce" },
  { label: "Simulações", icon: HeartPulse, url: "/simulations", key: "simulations" },
  { label: "Pacientes Virtuais", icon: UserRound, url: "/virtual-patients", key: "virtual_patients" },
  { label: "SCT", icon: BrainCircuit, url: "/sct", key: "sct" },
  { label: "KFE", icon: Target, url: "/kfe", key: "kfe" },
  { label: "Mini-CEX", icon: ClipboardCheck, url: "/clinical-observations", key: "minicex" },
  { label: "SJT", icon: Scale, url: "/sjt", key: "sjt" },
  { label: "Progress Test", icon: TrendingUp, url: "/progress-test", key: "progress_test" },
  { label: "Júri Simulado", icon: Gavel, url: "/mock-trials", key: "mock_trials" },
];

const QUICK_ACTIONS = [
  { label: "Nova prova", icon: Plus, url: "/composer" },
  { label: "Banco de questões", icon: Library, url: "/questions" },
  { label: "Gerenciar turmas", icon: GraduationCap, url: "/classes" },
  { label: "Nova simulação", icon: HeartPulse, url: "/simulations" },
  { label: "Novo OSCE", icon: Stethoscope, url: "/osce" },
  { label: "Calendário", icon: CalendarDays, url: "/calendar" },
];

const STATUS: Record<string, { label: string; tone: StatusTone }> = {
  draft: { label: "Rascunho", tone: "neutral" },
  applied: { label: "Aplicada", tone: "info" },
  in_progress: { label: "Em aplicação", tone: "ok" },
  grading: { label: "Em correção", tone: "info" },
  graded: { label: "Concluída", tone: "neutral" },
  active: { label: "Ativo", tone: "ok" },
  published: { label: "Publicado", tone: "ok" },
  open: { label: "Aberto", tone: "ok" },
};

export default function DashboardPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { byId: vpById } = useVpCatalog();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [stats, setStats] = useState({
    questions: 0,
    exams: 0,
    classes: 0,
    students: 0,
    osce: 0,
    simulations: 0,
    virtualPatients: 0,
    sct: 0,
    kfe: 0,
    observations: 0,
    sjt: 0,
    progressTests: 0,
    mockTrials: 0,
    activeExams: 0,
    completedExams: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [moduleCounts, setModuleCounts] = useState<Record<string, number>>({});
  const [endingExams, setEndingExams] = useState<{ id: string; title: string; endAt: string }[]>([]);
  const [pendingVp, setPendingVp] = useState<{ cvpId: string; patientId: string; classId: string; count: number }[]>([]);

  useEffect(() => {
    const loadDashboard = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile?.full_name) setUserName(profile.full_name.split(" ")[0]);

      // Parallel fetch all counts
      const [
        questionsRes, examsRes, classesRes, studentsRes,
        osceRes, simMedRes, simNurRes, simPharmRes, simBioRes, simDentRes, simNutRes, simPhysioRes,
        vpRes, sctRes, kfeRes, obsRes, sjtRes, ptRes, mtRes,
        activeExamsRes, completedExamsRes,
      ] = await Promise.all([
        supabase.from("question_bank").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("deleted_at", null),
        supabase.from("exams").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("deleted_at", null),
        supabase.from("classes").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("deleted_at", null),
        supabase.from("class_students").select("id, class_id, classes!inner(user_id)", { count: "exact", head: true }).eq("classes.user_id", user.id),
        // OSCE
        supabase.from("osce_exams" as any).select("id", { count: "exact", head: true }).eq("user_id", user.id).is("deleted_at", null),
        // Simulations (multiple areas)
        supabase.from("medicine_rooms").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("nursing_rooms" as any).select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("reconciliation_rooms" as any).select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("biomedicine_rooms").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("dentistry_rooms").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("nutrition_rooms" as any).select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("physiotherapy_rooms" as any).select("id", { count: "exact", head: true }).eq("user_id", user.id),
        // Other modules
        supabase.from("virtual_patients" as any).select("id", { count: "exact", head: true }).eq("user_id", user.id).is("deleted_at", null),
        supabase.from("sct_exams").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("deleted_at", null),
        supabase.from("kfe_exams").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("deleted_at", null),
        supabase.from("clinical_observations").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("deleted_at", null),
        supabase.from("sjt_exams" as any).select("id", { count: "exact", head: true }).eq("user_id", user.id).is("deleted_at", null),
        supabase.from("progress_tests" as any).select("id", { count: "exact", head: true }).eq("user_id", user.id).is("deleted_at", null),
        supabase.from("mock_trials").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("deleted_at", null),
        // Active & completed exams
        supabase.from("exam_publications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_active", true),
        supabase.from("exams").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "graded").is("deleted_at", null),
      ]);

      const totalSimulations = (simMedRes.count || 0) + (simNurRes.count || 0) + (simPharmRes.count || 0) +
        (simBioRes.count || 0) + (simDentRes.count || 0) + (simNutRes.count || 0) + (simPhysioRes.count || 0);

      setStats({
        questions: questionsRes.count || 0,
        exams: examsRes.count || 0,
        classes: classesRes.count || 0,
        students: studentsRes.count || 0,
        osce: osceRes.count || 0,
        simulations: totalSimulations,
        virtualPatients: vpRes.count || 0,
        sct: sctRes.count || 0,
        kfe: kfeRes.count || 0,
        observations: obsRes.count || 0,
        sjt: sjtRes.count || 0,
        progressTests: ptRes.count || 0,
        mockTrials: mtRes.count || 0,
        activeExams: activeExamsRes.count || 0,
        completedExams: completedExamsRes.count || 0,
      });

      setModuleCounts({
        exams: examsRes.count || 0,
        osce: osceRes.count || 0,
        simulations: totalSimulations,
        virtual_patients: vpRes.count || 0,
        sct: sctRes.count || 0,
        kfe: kfeRes.count || 0,
        minicex: obsRes.count || 0,
        sjt: sjtRes.count || 0,
        progress_test: ptRes.count || 0,
        mock_trials: mtRes.count || 0,
      });

      // Recent activities - fetch latest from multiple sources
      const activities: RecentActivity[] = [];

      const { data: recentExams } = await supabase
        .from("exams")
        .select("id, title, status, created_at")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(3);

      (recentExams || []).forEach(e => {
        activities.push({
          id: e.id,
          title: e.title,
          type: "Prova",
          date: e.created_at,
          icon: BookOpen,
          url: `/exams/${e.id}`,
          status: e.status,
        });
      });

      const { data: recentSims } = await supabase
        .from("medicine_rooms")
        .select("id, title, created_at, status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(2);

      (recentSims || []).forEach(s => {
        activities.push({
          id: s.id,
          title: s.title,
          type: "Simulação",
          date: s.created_at,
          icon: HeartPulse,
          url: `/simulations/medicine/${s.id}/edit`,
          status: s.status,
        });
      });

      const { data: recentOsce } = await supabase
        .from("osce_exams" as any)
        .select("id, title, created_at, status")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(2);

      ((recentOsce as any[]) || []).forEach(o => {
        activities.push({
          id: o.id,
          title: o.title,
          type: "OSCE",
          date: o.created_at,
          icon: Stethoscope,
          url: `/osce/${o.id}/edit`,
          status: o.status,
        });
      });

      // Sort all activities by date
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivities(activities.slice(0, 6));

      // "Para fazer agora": provas que encerram em até 48 h e sessões de paciente virtual sem correção.
      // Consultas tolerantes a erro: se alguma falhar, a lista só fica menor.
      try {
        const now = new Date();
        const limit = new Date(now.getTime() + 48 * 3600 * 1000);
        const { data: ending } = await supabase
          .from("exam_publications")
          .select("id, end_at, exams(title)")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .gte("end_at", now.toISOString())
          .lte("end_at", limit.toISOString())
          .order("end_at", { ascending: true })
          .limit(3);
        setEndingExams(((ending as any[]) || []).map((p) => ({ id: p.id, title: p.exams?.title || "Prova", endAt: p.end_at })));
      } catch { /* sem a lista de provas */ }

      try {
        const { data: cvps } = await supabase
          .from("class_virtual_patients")
          .select("id, patient_id, class_id, classes!inner(user_id)")
          .eq("classes.user_id", user.id);
        const cvpList = (cvps as any[]) || [];
        if (cvpList.length > 0) {
          const cvpIds = cvpList.map((c) => c.id);
          const { data: sessions } = await supabase
            .from("virtual_patient_sessions")
            .select("id, class_virtual_patient_id, group_id, status")
            .in("class_virtual_patient_id", cvpIds)
            .eq("status", "completed");
          const sessionRows = (sessions as any[]) || [];
          if (sessionRows.length > 0) {
            const { data: grades } = await supabase
              .from("virtual_patient_grades")
              .select("session_id")
              .in("session_id", sessionRows.map((s) => s.id));
            const graded = new Set(((grades as any[]) || []).map((g) => g.session_id));
            const byCvp = new Map<string, Set<string>>();
            sessionRows.filter((s) => !graded.has(s.id)).forEach((s) => {
              if (!byCvp.has(s.class_virtual_patient_id)) byCvp.set(s.class_virtual_patient_id, new Set());
              byCvp.get(s.class_virtual_patient_id)!.add(s.group_id || s.id);
            });
            setPendingVp(
              cvpList
                .filter((c) => byCvp.has(c.id))
                .map((c) => ({ cvpId: c.id, patientId: c.patient_id, classId: c.class_id, count: byCvp.get(c.id)!.size }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 3),
            );
          }
        }
      } catch { /* sem a lista de correções */ }

      setLoading(false);
    };
    loadDashboard();
  }, []);

  const isNewUser = !loading && stats.questions === 0 && stats.exams === 0 && stats.classes === 0;

  const totalContent = stats.exams + stats.osce + stats.simulations + stats.virtualPatients +
    stats.sct + stats.kfe + stats.observations + stats.sjt + stats.progressTests + stats.mockTrials;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "agora mesmo";
    if (hours < 24) return `há ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "ontem";
    if (days < 7) return `há ${days} dias`;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  const endLabel = (iso: string) => {
    const d = new Date(iso);
    const sameDay = d.toDateString() === new Date().toDateString();
    const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return sameDay ? `hoje às ${time}` : `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} às ${time}`;
  };

  const todos: Todo[] = [
    ...pendingVp.map((p) => ({
      key: `vp-${p.cvpId}`,
      icon: UserRound,
      title: `Corrigir “${vpById[p.patientId]?.label || "paciente virtual"}”`,
      detail: `${p.count} ${p.count === 1 ? "atendimento aguarda" : "atendimentos aguardam"} correção`,
      action: "Corrigir turma",
      url: `/classes/${p.classId}?aba=analytics`,
      primary: true,
    })),
    ...endingExams.map((e) => ({
      key: `exam-${e.id}`,
      icon: BookOpen,
      title: `${e.title} encerra ${endLabel(e.endAt)}`,
      detail: "Acompanhe as entregas em tempo real",
      action: "Monitorar",
      url: `/monitoring/${e.id}`,
    })),
  ];

  const summary = todos.length > 0
    ? `Você tem ${todos.length} ${todos.length === 1 ? "pendência" : "pendências"} para hoje.`
    : "Tudo em dia. Escolha por onde começar.";

  const overview = [
    { label: "Provas", count: stats.exams },
    { label: "Simulações", count: stats.simulations },
    { label: "OSCE", count: stats.osce },
    { label: "Pacientes Virtuais", count: stats.virtualPatients },
    { label: "Questões", count: stats.questions },
  ];
  const overviewMax = Math.max(1, ...overview.map((o) => o.count));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-6">
      {isNewUser && <OnboardingWizard />}
      <RoadmapProactiveDialog />

      <PageHeader
        eyebrow={new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        title={userName ? `${getGreeting()}, ${userName}.` : `${getGreeting()}.`}
        description={summary}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/calendar")}><CalendarDays className="h-4 w-4" />Calendário</Button>
            <Button onClick={() => navigate("/composer")}><Plus className="h-4 w-4" />Nova prova</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Conteúdos criados", value: totalContent },
          { label: "Questões no banco", value: stats.questions },
          { label: "Provas ativas", value: stats.activeExams },
          { label: "Alunos cadastrados", value: stats.students, detail: stats.classes ? `em ${stats.classes} ${stats.classes === 1 ? "turma" : "turmas"}` : undefined },
        ].map((k) => (
          <Card key={k.label} className="p-5">
            <p className="label-mono">{k.label}</p>
            <p className="mt-2 font-heading text-4xl font-medium leading-none">{k.value}</p>
            {k.detail && <p className="mt-2 text-xs text-muted-foreground">{k.detail}</p>}
          </Card>
        ))}
      </div>

      {todos.length > 0 && (
        <section>
          <h2 className="eyebrow mb-3">Para fazer agora</h2>
          <Card className="divide-y">
            {todos.map((todo) => (
              <div key={todo.key} className="flex items-center gap-4 px-5 py-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-text">
                  <todo.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{todo.title}</p>
                  <p className="text-xs text-muted-foreground">{todo.detail}</p>
                </div>
                <Button size="sm" variant={todo.primary ? "default" : "outline"} onClick={() => navigate(todo.url)}>{todo.action}</Button>
              </div>
            ))}
          </Card>
        </section>
      )}

      <section>
        <h2 className="eyebrow mb-3">Ações rápidas</h2>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <Button key={action.url} variant="outline" size="sm" onClick={() => navigate(action.url)}>
              <action.icon className="h-4 w-4" />{action.label}
            </Button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="eyebrow mb-3">Seus módulos</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {MODULE_CARDS.map((mod) => {
            const count = moduleCounts[mod.key] || 0;
            return (
              <Card
                key={mod.key}
                className="group cursor-pointer p-4 transition-shadow hover:shadow-elev-2"
                role="link"
                tabIndex={0}
                onClick={() => navigate(mod.url)}
                onKeyDown={(e) => { if (e.key === "Enter") navigate(mod.url); }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-brand-soft group-hover:text-brand-text">
                    <mod.icon className="h-4 w-4" />
                  </span>
                  {count > 0 && <span className="font-heading text-2xl font-medium leading-none">{count}</span>}
                </div>
                <p className="text-sm font-medium">{mod.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{count === 0 ? "Começar" : `${count} criado(s)`}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="eyebrow">Atividade recente</h2>
            <Link to="/analytics" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Ver análises <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <Card>
            {recentActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                <Activity className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhuma atividade ainda</p>
                <p className="mt-1 text-xs text-muted-foreground">Crie sua primeira avaliação para começar</p>
              </div>
            ) : (
              <div className="divide-y">
                {recentActivities.map((activity) => {
                  const st = activity.status ? STATUS[activity.status] : undefined;
                  return (
                    <Link
                      key={`${activity.type}-${activity.id}`}
                      to={activity.url}
                      className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-brand-soft group-hover:text-brand-text">
                        <activity.icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{activity.title}</p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <StatusBadge>{activity.type}</StatusBadge>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{formatDate(activity.date)}</span>
                        </div>
                      </div>
                      {activity.status && (
                        <StatusBadge tone={st?.tone ?? "neutral"} dot={!!st && st.tone === "ok"} className="shrink-0">
                          {st?.label || activity.status}
                        </StatusBadge>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </section>

        <section className="lg:col-span-2">
          <h2 className="eyebrow mb-3">Visão geral</h2>
          <Card className="space-y-4 p-5">
            {overview.map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-mono font-medium">{item.count}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(item.count / overviewMax) * 100}%` }} />
                </div>
              </div>
            ))}
            <div className="space-y-2 border-t pt-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Turmas ativas</span>
                <span className="font-mono font-medium">{stats.classes}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Provas concluídas</span>
                <span className="font-mono font-medium">{stats.completedExams}</span>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
