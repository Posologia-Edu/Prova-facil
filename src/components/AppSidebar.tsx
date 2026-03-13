import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Library,
  FileEdit,
  GraduationCap,
  Stethoscope,
  BarChart3,
  MessageSquare,
  Crown,
  BookOpen,
  LogOut,
  ShieldCheck,
  CalendarDays,
  Globe,
  Settings,
  Trash2,
  Store,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/use-admin";
import { useLanguage, LANGUAGE_LABELS, LANGUAGE_FLAGS, type Language } from "@/i18n/LanguageContext";
import { useState, useEffect } from "react";
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

export function AppSidebar() {
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const { t, language, setLanguage } = useLanguage();
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const fetchName = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (data?.full_name) setUserName(data.full_name);
      }
    };
    fetchName();
  }, []);

  const principalNav = [
    { title: t("nav_dashboard"), url: "/dashboard", icon: LayoutDashboard },
  ];

  const contentNav = [
    { title: t("nav_questions"), url: "/questions", icon: Library },
    { title: t("nav_composer"), url: "/composer", icon: FileEdit },
    { title: t("sidebar_my_exams"), url: "/exams", icon: BookOpen },
    { title: "OSCE", url: "/osce", icon: Stethoscope },
  ];

  const managementNav = [
    { title: t("nav_classes"), url: "/classes", icon: GraduationCap },
    { title: t("nav_calendar"), url: "/calendar", icon: CalendarDays },
    { title: t("nav_analytics"), url: "/analytics", icon: BarChart3 },
    { title: "Marketplace", url: "/marketplace", icon: Store },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const languages: Language[] = ["pt", "en", "es"];

  const renderNavGroup = (label: string, items: typeof principalNav) => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-sidebar-foreground/40 text-[11px] font-semibold uppercase tracking-wider px-3 mb-1">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
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
  );

  return (
    <Sidebar className="w-64 gradient-sidebar border-r-0">
      <SidebarHeader className="p-5 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-bold text-sidebar-primary-foreground tracking-tight">ProvaFácil</h1>
            <p className="text-xs text-sidebar-foreground/60 truncate max-w-[140px]">{userName || t("app_subtitle")}</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4 space-y-2">
        {renderNavGroup(t("sidebar_principal"), principalNav)}
        {renderNavGroup(t("sidebar_content"), contentNav)}
        {renderNavGroup(t("sidebar_management"), managementNav)}
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

          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/pricing"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
              >
                <Crown className="h-4 w-4" />
                <span>{t("nav_pricing")}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/trash"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
              >
                <Trash2 className="h-4 w-4" />
                <span>{t("sidebar_trash")}</span>
              </NavLink>
            </SidebarMenuButton>
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
                to="/contato"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Contato</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>

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
