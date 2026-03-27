import { useState, useEffect } from "react";
import {
  Library,
  FileEdit,
  GraduationCap,
  BarChart3,
  Plus,
  ArrowRight,
  Clock,
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
  Sparkles,
  Activity,
  Users,
  Zap,
  Trophy,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { RoadmapProactiveDialog } from "@/components/RoadmapProactiveDialog";

interface RecentActivity {
  id: string;
  title: string;
  type: string;
  date: string;
  icon: typeof FileEdit;
  url: string;
  status?: string;
}

const MODULE_CARDS = [
  { label: "Provas", icon: BookOpen, url: "/exams", color: "from-blue-500/20 to-blue-600/10", iconColor: "text-blue-600 dark:text-blue-400", key: "exams" },
  { label: "OSCE", icon: Stethoscope, url: "/osce", color: "from-emerald-500/20 to-emerald-600/10", iconColor: "text-emerald-600 dark:text-emerald-400", key: "osce" },
  { label: "Simulações", icon: HeartPulse, url: "/simulations", color: "from-rose-500/20 to-rose-600/10", iconColor: "text-rose-600 dark:text-rose-400", key: "simulations" },
  { label: "Pac. Virtuais", icon: UserRound, url: "/virtual-patients", color: "from-purple-500/20 to-purple-600/10", iconColor: "text-purple-600 dark:text-purple-400", key: "virtual_patients" },
  { label: "SCT", icon: BrainCircuit, url: "/sct", color: "from-amber-500/20 to-amber-600/10", iconColor: "text-amber-600 dark:text-amber-400", key: "sct" },
  { label: "KFE", icon: Target, url: "/kfe", color: "from-cyan-500/20 to-cyan-600/10", iconColor: "text-cyan-600 dark:text-cyan-400", key: "kfe" },
  { label: "Mini-CEX", icon: ClipboardCheck, url: "/clinical-observations", color: "from-teal-500/20 to-teal-600/10", iconColor: "text-teal-600 dark:text-teal-400", key: "minicex" },
  { label: "SJT", icon: Scale, url: "/sjt", color: "from-indigo-500/20 to-indigo-600/10", iconColor: "text-indigo-600 dark:text-indigo-400", key: "sjt" },
  { label: "Progress Test", icon: TrendingUp, url: "/progress-test", color: "from-orange-500/20 to-orange-600/10", iconColor: "text-orange-600 dark:text-orange-400", key: "progress_test" },
  { label: "Júri Simulado", icon: Gavel, url: "/mock-trials", color: "from-slate-500/20 to-slate-600/10", iconColor: "text-slate-600 dark:text-slate-400", key: "mock_trials" },
];

const QUICK_ACTIONS = [
  { label: "Nova Prova", icon: Plus, url: "/composer", description: "Criar prova do zero" },
  { label: "Banco de Questões", icon: Library, url: "/questions", description: "Gerenciar questões" },
  { label: "Gerenciar Turmas", icon: GraduationCap, url: "/classes", description: "Turmas e alunos" },
  { label: "Nova Simulação", icon: HeartPulse, url: "/simulations", description: "Criar simulação clínica" },
  { label: "Novo OSCE", icon: Stethoscope, url: "/osce", description: "Criar estação OSCE" },
  { label: "Calendário", icon: CalendarDays, url: "/calendar", description: "Ver agenda" },
];

export default function DashboardPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
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

      setLoading(false);
    };
    loadDashboard();
  }, []);

  const isNewUser = !loading && stats.questions === 0 && stats.exams === 0 && stats.classes === 0;

  const totalContent = stats.exams + stats.osce + stats.simulations + stats.virtualPatients +
    stats.sct + stats.kfe + stats.observations + stats.sjt + stats.progressTests + stats.mockTrials;

  const welcomeText = userName
    ? `Bem-vindo(a) de volta, ${userName}`
    : t("dash_welcome");

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
    if (hours < 1) return "Agora mesmo";
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Ontem";
    if (days < 7) return `${days} dias atrás`;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  const statusLabels: Record<string, string> = {
    draft: "Rascunho",
    applied: "Aplicada",
    in_progress: "Em aplicação",
    grading: "Em correção",
    graded: "Concluída",
    active: "Ativo",
    published: "Publicado",
    open: "Aberto",
  };

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
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {isNewUser && <OnboardingWizard />}
      <RoadmapProactiveDialog />

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 md:p-8 text-primary-foreground">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzMuMyAwIDYgMi43IDYgNnMtMi43IDYtNiA2LTZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        <div className="relative z-10">
          <p className="text-primary-foreground/70 text-sm font-medium">{getGreeting()} 👋</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1 tracking-tight">
            {userName ? `${userName}, seu painel está atualizado` : "Seu painel está atualizado"}
          </h1>
          <p className="text-primary-foreground/70 text-sm mt-2 max-w-lg">
            Gerencie todas as suas avaliações, simulações e atividades acadêmicas em um só lugar.
          </p>
        </div>

        {/* Floating stats on hero */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {[
            { label: "Conteúdos Criados", value: totalContent, icon: Layers },
            { label: "Questões no Banco", value: stats.questions, icon: Library },
            { label: "Provas Ativas", value: stats.activeExams, icon: Activity },
            { label: "Alunos Cadastrados", value: stats.students, icon: Users },
          ].map(s => (
            <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className="h-4 w-4 text-primary-foreground/60" />
                <span className="text-xs text-primary-foreground/60">{s.label}</span>
              </div>
              <p className="text-xl md:text-2xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4" /> Ações Rápidas
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {QUICK_ACTIONS.map(action => (
            <Button
              key={action.url}
              variant="outline"
              className="h-auto py-3 px-3 flex flex-col items-center gap-1.5 hover:bg-primary/5 hover:border-primary/30 transition-all group"
              onClick={() => navigate(action.url)}
            >
              <action.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-xs font-medium">{action.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Modules Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Seus Módulos
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {MODULE_CARDS.map(mod => (
            <Card
              key={mod.key}
              className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border border-border/50 group overflow-hidden"
              onClick={() => navigate(mod.url)}
            >
              <CardContent className="p-4 relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${mod.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`h-9 w-9 rounded-lg bg-muted flex items-center justify-center group-hover:bg-white/80 dark:group-hover:bg-white/10 transition-colors`}>
                      <mod.icon className={`h-4.5 w-4.5 ${mod.iconColor}`} />
                    </div>
                    {(moduleCounts[mod.key] || 0) > 0 && (
                      <span className="text-lg font-bold text-foreground">{moduleCounts[mod.key]}</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground">{mod.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(moduleCounts[mod.key] || 0) === 0 ? "Começar" : `${moduleCounts[mod.key]} criado(s)`}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Bottom Section: Activity + Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Atividade Recente
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/analytics">
                Ver análises <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma atividade ainda</p>
                <p className="text-xs text-muted-foreground mt-1">Crie sua primeira avaliação para começar</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentActivities.map(activity => (
                  <Link
                    key={`${activity.type}-${activity.id}`}
                    to={activity.url}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                        <activity.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{activity.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{activity.type}</Badge>
                          <span className="text-xs text-muted-foreground">{formatDate(activity.date)}</span>
                        </div>
                      </div>
                    </div>
                    {activity.status && (
                      <Badge variant="secondary" className="text-[10px] shrink-0 ml-2">
                        {statusLabels[activity.status] || activity.status}
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-secondary" />
              Visão Geral
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Provas", count: stats.exams, total: Math.max(stats.exams, 10), color: "bg-blue-500" },
              { label: "Simulações", count: stats.simulations, total: Math.max(stats.simulations, 10), color: "bg-rose-500" },
              { label: "OSCE", count: stats.osce, total: Math.max(stats.osce, 10), color: "bg-emerald-500" },
              { label: "Pac. Virtuais", count: stats.virtualPatients, total: Math.max(stats.virtualPatients, 10), color: "bg-purple-500" },
              { label: "Questões", count: stats.questions, total: Math.max(stats.questions, 100), color: "bg-amber-500" },
            ].map(item => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-semibold">{item.count}</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min((item.count / item.total) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}

            <div className="pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Turmas ativas</span>
                <span className="text-sm font-semibold">{stats.classes}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-muted-foreground">Provas concluídas</span>
                <span className="text-sm font-semibold">{stats.completedExams}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
