import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Globe, Menu } from "lucide-react";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import FloatingAuth from "@/components/FloatingAuth";
import { useLanguage, LANGUAGE_FLAGS, LANGUAGE_LABELS, type Language } from "@/i18n/LanguageContext";
import { LANDING_CONTENT } from "@/lib/landing-content";

// Peças compartilhadas pela landing (Index), por Funcionalidades e por Planos.

export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
// Hero e faixas de destaque são sempre marinho, nos dois temas; o resto segue os tokens do sistema.
export const NAVY_BG = "linear-gradient(160deg, #0c1a38 0%, #14264d 60%, #1b3470 100%)";

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Conta de zero até o número que abre o texto ("4/5", "7,9", "13") quando entra na tela.
 * Em repouso (e com movimento reduzido) mostra exatamente o texto original.
 */
export function CountUp({ text, duration = 1.2, delay = 0 }: { text: string; duration?: number; delay?: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const m = /^(d+(?:[.,]d+)?)(.*)$/.exec(text);
  const [value, setValue] = useState<number | null>(m && !reduce ? 0 : null);

  useEffect(() => {
    if (!m || reduce) { setValue(null); return; }
    if (!inView) return;
    const target = parseFloat(m[1].replace(",", "."));
    const controls = animate(0, target, { duration, delay, ease: EASE, onUpdate: setValue, onComplete: () => setValue(null) });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduce, text, duration, delay]);

  if (!m || value === null) return <span ref={ref}>{text}</span>;
  const decimals = (m[1].split(/[.,]/)[1] ?? "").length;
  const sep = m[1].includes(",") ? "," : ".";
  return <span ref={ref}>{value.toFixed(decimals).replace(".", sep)}{m[2]}</span>;
}

/** Escreve o texto letra a letra quando entra na tela; o espaço do texto inteiro fica reservado, sem pulo de layout. */
export function Typewriter({ text, delay = 0, cps = 60 }: { text: string; delay?: number; cps?: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [n, setN] = useState(reduce ? text.length : 0);

  useEffect(() => {
    if (reduce) { setN(text.length); return; }
    if (!inView) return;
    let raf = 0;
    const timer = window.setTimeout(() => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const k = Math.min(text.length, Math.floor(((now - t0) / 1000) * cps));
        setN(k);
        if (k < text.length) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay * 1000);
    return () => { window.clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [inView, reduce, text, delay, cps]);

  return (
    <span ref={ref}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{text.slice(0, n)}<span className="opacity-0">{text.slice(n)}</span></span>
    </span>
  );
}

export function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <span className={`font-mono text-xs uppercase tracking-[0.18em] ${light ? "text-highlight" : "text-accent-ink dark:text-highlight"}`}>{children}</span>;
}

export function SectionHead({ eyebrow, title, sub, light = false, center = false }: { eyebrow: string; title: string; sub?: string; light?: boolean; center?: boolean }) {
  return (
    <Reveal className={`flex max-w-3xl flex-col gap-4 ${center ? "mx-auto items-center text-center" : ""}`}>
      <Eyebrow light={light}>{eyebrow}</Eyebrow>
      <h2 className={`font-heading text-4xl font-semibold leading-[1.1] tracking-tight [text-wrap:balance] md:text-5xl ${light ? "text-white" : ""}`}>{title}</h2>
      {sub && <p className={`text-lg leading-relaxed ${light ? "text-white/70" : "text-muted-foreground"}`}>{sub}</p>}
    </Reveal>
  );
}

/**
 * Tema claro/escuro segue o aparelho só nas páginas da landing (o resto do app não tem alternância); restaura ao sair.
 * ?tema=escuro ou ?tema=claro força o tema (útil para conferir e compartilhar).
 */
export function useLandingTheme() {
  useEffect(() => {
    const html = document.documentElement;
    const tinhaEscuro = html.classList.contains("dark");
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const forcado = new URLSearchParams(window.location.search).get("tema");
    const apply = () => html.classList.toggle("dark", forcado === "escuro" ? true : forcado === "claro" ? false : mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      html.classList.toggle("dark", tinhaEscuro);
    };
  }, []);
}

/** Barra fixa da landing. Na página inicial as âncoras rolam a página; nas outras levam de volta à inicial. */
export function LandingNav({ home = false }: { home?: boolean }) {
  const { language, setLanguage } = useLanguage();
  const languages: Language[] = ["pt", "en", "es"];
  const n = (LANDING_CONTENT[language] ?? LANDING_CONTENT.pt).nav;
  const prefix = home ? "" : "/";
  const anchors = [
    { href: `${prefix}#plataforma`, label: n.platform },
    { href: `${prefix}#areas`, label: n.areas },
    { href: `${prefix}#como-funciona`, label: n.how },
  ];
  const pages = [
    { to: "/funcionalidades", label: n.features },
    { to: "/planos", label: n.plans },
    { to: "/documentacao", label: n.docs },
  ];
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4">
        <Link to="/" className="flex items-center gap-2" aria-label="ProvaFácil">
          <GraduationCap className="h-7 w-7 text-highlight" />
          <span className="font-heading text-xl font-semibold tracking-tight">ProvaFácil</span>
        </Link>
        <div className="hidden items-center gap-1 lg:flex">
          {anchors.map((l) => (
            <a key={l.href} href={l.href} className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">{l.label}</a>
          ))}
          {pages.map((l) => (
            <Link key={l.to} to={l.to} className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">{l.label}</Link>
          ))}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 lg:hidden" aria-label={n.menu}><Menu className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {anchors.map((l) => (
                <DropdownMenuItem key={l.href} asChild><a href={l.href}>{l.label}</a></DropdownMenuItem>
              ))}
              {pages.map((l) => (
                <DropdownMenuItem key={l.to} asChild><Link to={l.to}>{l.label}</Link></DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5"><Globe className="h-4 w-4" />{LANGUAGE_FLAGS[language]}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {languages.map((lang) => (
                <DropdownMenuItem key={lang} onClick={() => setLanguage(lang)} className={language === lang ? "bg-accent" : ""}>
                  {LANGUAGE_FLAGS[lang]} {LANGUAGE_LABELS[lang]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Link to="/student/auth" className="hidden sm:block">
            <Button variant="ghost" size="sm" className="gap-1.5"><GraduationCap className="h-4 w-4" />{n.student}</Button>
          </Link>
          <FloatingAuth />
        </div>
      </div>
    </nav>
  );
}
