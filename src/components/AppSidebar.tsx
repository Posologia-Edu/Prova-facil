import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  ChevronDown,
  ChevronsUpDown,
  Crown,
  Globe,
  LogOut,
  MessageSquare,
  Settings,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/use-admin";
import { useLanguage, LANGUAGE_LABELS, LANGUAGE_FLAGS, type Language } from "@/i18n/LanguageContext";
import { buildNav, pathMatches, type NavItem } from "@/lib/app-nav";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LINK_BASE =
  "relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground";
// A barra âmbar à esquerda marca a página atual.
const LINK_ACTIVE =
  "bg-sidebar-accent font-medium text-sidebar-accent-foreground before:absolute before:-left-3 before:bottom-2 before:top-2 before:w-[3px] before:rounded-r before:bg-highlight";

export function AppSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isAdmin } = useAdmin();
  const { t, language, setLanguage } = useLanguage();
  const [userName, setUserName] = useState<string>("");
  const [formsOpen, setFormsOpen] = useState(false);

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

  const groups = buildNav(t);
  const languages: Language[] = ["pt", "en", "es"];
  const initials = (userName || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const renderItem = (item: NavItem) => {
    if (item.children && !item.flat) {
      const hasActiveChild = item.children.some((c) => pathMatches(pathname, c.url));
      const open = formsOpen || hasActiveChild;
      return (
        <SidebarMenuItem key={item.title}>
          <button
            type="button"
            onClick={() => setFormsOpen((v) => !v)}
            aria-expanded={open}
            className={cn(LINK_BASE, "w-full", hasActiveChild && "text-sidebar-accent-foreground")}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
            <ChevronDown className={cn("ml-auto h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
          </button>
          {open && (
            <div className="mt-0.5 space-y-0.5">
              {item.children.map((c) => (
                <NavLink
                  key={c.url}
                  to={c.url}
                  className={cn(LINK_BASE, "py-1.5 pl-10 text-[13px]")}
                  activeClassName={LINK_ACTIVE}
                >
                  {c.title}
                </NavLink>
              ))}
            </div>
          )}
        </SidebarMenuItem>
      );
    }
    return (
      <SidebarMenuItem key={item.url}>
        <NavLink
          to={item.url}
          end={item.url === "/dashboard"}
          className={cn(LINK_BASE, item.children?.some((c) => pathMatches(pathname, c.url)) && LINK_ACTIVE)}
          activeClassName={LINK_ACTIVE}
        >
          <item.icon className="h-4 w-4" />
          <span>{item.title}</span>
        </NavLink>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar className="w-64 gradient-sidebar border-r-0">
      <SidebarHeader className="border-b border-sidebar-border p-5">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#F7B93B] to-[#E39500] shadow-elev-1">
            <BookOpen className="h-5 w-5 text-[#1A1200]" />
          </div>
          <div className="min-w-0">
            <div className="font-heading text-[17px] font-medium leading-tight tracking-tight text-white">ProvaFácil</div>
            <p className="truncate text-[11px] text-sidebar-foreground">{t("app_subtitle")}</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3 py-3">
        {groups.map((g) => (
          <SidebarGroup key={g.label} className="p-0 pb-2">
            <SidebarGroupLabel className="mb-1 h-auto px-3 pb-1 pt-4 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-sidebar-foreground/55">
              {g.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">{g.items.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sidebar-accent-foreground transition-colors hover:bg-sidebar-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[hsl(var(--accent-soft))] font-heading text-[13px] font-medium text-[hsl(var(--accent-ink))]">
                {initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium">{userName || t("app_subtitle")}</span>
                <span className="block truncate text-[11px] text-sidebar-foreground">{t("nav_settings")}</span>
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-60">
            <DropdownMenuItem onSelect={() => navigate("/settings")}><Settings className="mr-2 h-4 w-4" />{t("nav_settings")}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate("/pricing")}><Crown className="mr-2 h-4 w-4" />{t("nav_pricing")}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate("/trash")}><Trash2 className="mr-2 h-4 w-4" />{t("sidebar_trash")}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate("/contato")}><MessageSquare className="mr-2 h-4 w-4" />Contato</DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onSelect={() => navigate("/admin")}><ShieldCheck className="mr-2 h-4 w-4" />{t("nav_admin")}</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger><Globe className="mr-2 h-4 w-4" />{LANGUAGE_FLAGS[language]} {LANGUAGE_LABELS[language]}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {languages.map((lang) => (
                  <DropdownMenuItem key={lang} onSelect={() => setLanguage(lang)} className={language === lang ? "bg-accent" : ""}>
                    {LANGUAGE_FLAGS[lang]} {LANGUAGE_LABELS[lang]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout}><LogOut className="mr-2 h-4 w-4" />{t("nav_logout")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
