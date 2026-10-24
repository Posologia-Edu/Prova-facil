import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, Search } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { OracleAgent } from "@/components/OracleAgent";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useLanguage } from "@/i18n/LanguageContext";
import { buildNav, findNavMatch } from "@/lib/app-nav";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const groups = buildNav(t);
  const match = findNavMatch(groups, pathname);

  // Ctrl K (ou ⌘ K) abre a paleta "Ir para…".
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (url: string) => {
    setPaletteOpen(false);
    navigate(url);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-h-screen min-w-0">
          <header className="flex h-[60px] shrink-0 items-center gap-4 border-b bg-card px-4">
            <SidebarTrigger />
            {match && (
              <nav aria-label="Você está em" className="hidden min-w-0 items-center gap-2 text-[13px] text-muted-foreground sm:flex">
                <span className="truncate">{match.group}</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                <b className="truncate font-medium text-foreground">{match.title}</b>
              </nav>
            )}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="ml-auto flex w-[260px] max-w-full items-center gap-2 rounded-[10px] bg-sunken px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="truncate">{t("nav_go_to")}</span>
              <kbd className="ml-auto rounded-[5px] border border-input bg-card px-1.5 py-px font-mono text-[11px]">Ctrl K</kbd>
            </button>
          </header>
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
      <OracleAgent />

      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <CommandInput placeholder={t("nav_go_to_hint")} />
        <CommandList>
          <CommandEmpty>—</CommandEmpty>
          {groups.map((g) => (
            <CommandGroup key={g.label} heading={g.label}>
              {g.items.flatMap((item) =>
                (item.children ? item.children.map((c) => ({ title: c.title, url: c.url, icon: item.icon })) : [{ title: item.title, url: item.url, icon: item.icon }]),
              ).map((i) => (
                <CommandItem key={i.url} value={`${g.label} ${i.title}`} onSelect={() => go(i.url)}>
                  <i.icon className="mr-2 h-4 w-4" />
                  {i.title}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </SidebarProvider>
  );
}
