import {
  LayoutDashboard,
  Library,
  FileEdit,
  GraduationCap,
  Stethoscope,
  BarChart3,
  BookOpen,
  CalendarDays,
  Store,
  HeartPulse,
  UserRound,
  ClipboardList,
  Gavel,
  Rocket,
  Brain,
  Link2,
  type LucideIcon,
} from "lucide-react";

export interface NavChild { title: string; url: string }
export interface NavItem { title: string; url: string; icon: LucideIcon; children?: NavChild[]; flat?: boolean; premium?: boolean }
export interface NavGroup { label: string; items: NavItem[] }

type T = (key: any) => string;

// Menu por intenção: Avaliar (provas e formulários), Praticar (atendimento e simulação) e Gestão (turmas e análises).
// O mesmo modelo alimenta o menu lateral, a paleta Ctrl K e o caminho de navegação do cabeçalho.
export function buildNav(t: T): NavGroup[] {
  return [
    { label: t("sidebar_principal"), items: [{ title: t("nav_dashboard"), url: "/dashboard", icon: LayoutDashboard }] },
    {
      label: t("sidebar_assess"),
      items: [
        { title: t("nav_questions"), url: "/questions", icon: Library },
        { title: t("nav_composer"), url: "/composer", icon: FileEdit },
        { title: t("sidebar_my_exams"), url: "/exams", icon: BookOpen },
        {
          title: t("sidebar_forms"),
          url: "/forms",
          icon: ClipboardList,
          // uma entrada só no menu lateral; os filhos servem à paleta, ao caminho do cabeçalho e ao item ativo
          flat: true,
          children: [
            { title: "Todos os formulários", url: "/forms" },
            { title: "SCT", url: "/sct" },
            { title: "KFE", url: "/kfe" },
            { title: "Mini-CEX/DOPS", url: "/clinical-observations" },
            { title: "SJT", url: "/sjt" },
            { title: "Progress Test", url: "/progress-test" },
          ],
        },
      ],
    },
    {
      label: t("sidebar_practice"),
      items: [
        { title: "Pacientes Virtuais", url: "/virtual-patients", icon: UserRound, premium: true },
        { title: t("sim_nav"), url: "/simulations", icon: HeartPulse, premium: true },
        { title: "OSCE", url: "/osce", icon: Stethoscope, premium: true },
        { title: "Júri Simulado", url: "/mock-trials", icon: Gavel },
      ],
    },
    {
      label: t("sidebar_management"),
      items: [
        { title: t("nav_classes"), url: "/classes", icon: GraduationCap },
        { title: t("nav_calendar"), url: "/calendar", icon: CalendarDays },
        { title: t("nav_analytics"), url: "/analytics", icon: BarChart3 },
        { title: "Análises VP", url: "/virtual-patients/analytics", icon: BarChart3, premium: true },
        { title: "Marketplace", url: "/marketplace", icon: Store },
        { title: "Competências", url: "/competency-analysis", icon: Brain },
        { title: "Integração LMS", url: "/lms-integration", icon: Link2 },
        { title: "Atualizações", url: "/updates", icon: Rocket },
      ],
    },
  ];
}

const pathMatches = (pathname: string, url: string) => pathname === url || pathname.startsWith(url + "/");

/** Item (ou filho) cujo endereço melhor corresponde à página atual: usado no caminho de navegação do cabeçalho. */
export function findNavMatch(groups: NavGroup[], pathname: string): { group: string; title: string } | null {
  let best: { group: string; title: string; len: number } | null = null;
  for (const g of groups) {
    for (const item of g.items) {
      const candidates: NavChild[] = [{ title: item.title, url: item.url }, ...(item.children || [])];
      for (const c of candidates) {
        if (pathMatches(pathname, c.url) && (!best || c.url.length > best.len)) {
          best = { group: g.label, title: c.title, len: c.url.length };
        }
      }
    }
  }
  return best ? { group: best.group, title: best.title } : null;
}

export { pathMatches };
