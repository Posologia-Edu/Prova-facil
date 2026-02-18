import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Library,
  FileEdit,
  GraduationCap,
  BarChart3,
  Crown,
  BookOpen,
  LogOut,
  ShieldCheck,
  CalendarDays,
  Globe,
  Settings,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/use-admin";
import { useLanguage, LANGUAGE_LABELS, LANGUAGE_FLAGS, type Language } from "@/i18n/LanguageContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navIcons = {
  dashboard: LayoutDashboard,
  questions: Library,
  composer: FileEdit,
  classes: GraduationCap,
  analytics: BarChart3,
  calendar: CalendarDays,
  pricing: Crown,
};

export function AppSidebar() {
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const { t, language, setLanguage } = useLanguage();

  const mainNav = [
    { title: t("nav_dashboard"), url: "/dashboard", icon: navIcons.dashboard },
    { title: t("nav_questions"), url: "/questions", icon: navIcons.questions },
    { title: t("nav_composer"), url: "/composer", icon: navIcons.composer },
    { title: t("nav_classes"), url: "/classes", icon: navIcons.classes },
    { title: t("nav_analytics"), url: "/analytics", icon: navIcons.analytics },
    { title: t("nav_calendar"), url: "/calendar", icon: navIcons.calendar },
    { title: t("nav_pricing"), url: "/pricing", icon: navIcons.pricing },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const languages: Language[] = ["pt", "en", "es"];

  return (
    <Sidebar className="w-64 gradient-sidebar border-r-0">
      <SidebarHeader className="p-5 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-bold text-sidebar-primary-foreground tracking-tight">ProvaFácil</h1>
            <p className="text-xs text-sidebar-foreground/60">{t("app_subtitle")}</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[11px] font-semibold uppercase tracking-wider px-3 mb-1">
            {t("nav_menu")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <SidebarMenu>
          {/* Language Switcher */}
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer w-full">
                  <Globe className="h-4 w-4" />
                  <span>{LANGUAGE_FLAGS[language]} {LANGUAGE_LABELS[language]}</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={language === lang ? "bg-accent" : ""}
                  >
                    {LANGUAGE_FLAGS[lang]} {LANGUAGE_LABELS[lang]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>

          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink
                  to="/admin"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{t("nav_admin")}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/settings"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
              >
                <Settings className="h-4 w-4" />
                <span>{t("nav_settings")}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer">
              <LogOut className="h-4 w-4" />
              <span>{t("nav_logout")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
