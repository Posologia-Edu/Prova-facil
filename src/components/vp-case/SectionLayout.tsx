import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionDef {
  id: string;
  label: string;
  /** contador mostrado ao lado do nome na navegação lateral */
  count?: string | number;
}

const PrefixContext = createContext("sec");

const domId = (prefix: string, id: string) => `${prefix}-${id}`;

/** Abre a seção (se estiver recolhida) e rola até ela. */
function goTo(prefix: string, id: string) {
  const el = document.getElementById(domId(prefix, id));
  if (!el) return;
  if (el instanceof HTMLDetailsElement) el.open = true;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Editor em seções recolhíveis com um índice fixo à esquerda (no celular o índice some e as seções empilham).
 * `prefix` precisa ser único na página: ele compõe o id de cada seção.
 */
export function SectionLayout({ prefix, sections, children }: { prefix: string; sections: SectionDef[]; children: ReactNode }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const key = sections.map((s) => s.id).join("|");

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(domId(prefix, s.id))).filter(Boolean) as HTMLElement[];
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id.slice(prefix.length + 1));
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefix, key]);

  return (
    <PrefixContext.Provider value={prefix}>
      <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="Seções" className="hidden lg:block">
          <ul className="sticky top-20 space-y-0.5 border-l">
            {sections.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => { setActive(s.id); goTo(prefix, s.id); }}
                  className={cn(
                    "-ml-px flex w-full items-center justify-between gap-2 border-l-2 py-1.5 pl-3 pr-1 text-left text-sm transition-colors",
                    active === s.id
                      ? "border-highlight font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="truncate">{s.label}</span>
                  {s.count !== undefined && s.count !== "" && <span className="font-mono text-xs text-muted-foreground">{s.count}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 space-y-4">{children}</div>
      </div>
    </PrefixContext.Provider>
  );
}

/** Cartão recolhível de uma seção do editor. */
export function SectionCard({
  id, title, count, badge, defaultOpen = false, children,
}: {
  id: string;
  title: string;
  count?: string | number;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const prefix = useContext(PrefixContext);
  return (
    <details id={domId(prefix, id)} open={defaultOpen} className="group scroll-mt-24 rounded-card border bg-card shadow-elev-1">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="font-heading text-base font-medium">{title}</span>
        <span className="flex items-center gap-2">
          {badge}
          {count !== undefined && count !== "" && <span className="font-mono text-xs text-muted-foreground">{count}</span>}
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="space-y-4 border-t px-5 py-5">{children}</div>
    </details>
  );
}
