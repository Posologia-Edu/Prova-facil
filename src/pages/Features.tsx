import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  Award, BarChart3, Brain, ClipboardList, FileText, Gavel, Layers, MessagesSquare, MonitorPlay, NotebookPen,
  QrCode, ShieldCheck, Sparkles, Stethoscope, Store, Users, ArrowRight, Check, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingFooter } from "@/components/LandingFooter";
import { useLanguage } from "@/i18n/LanguageContext";
import { FEATURES_PAGE } from "@/lib/landing-pages-content";
import { EASE, NAVY_BG, Reveal, Eyebrow, LandingNav, useLandingTheme } from "@/components/landing/landing-shared";

// Ícone de cada funcionalidade, na mesma ordem dos grupos em landing-pages-content.ts
const ICONS: Record<string, LucideIcon[]> = {
  avaliacao: [Brain, FileText, MonitorPlay, Layers],
  clinica: [Stethoscope, ClipboardList, NotebookPen],
  virtual: [MessagesSquare, Gavel],
  ia: [Sparkles],
  turmas: [Users, BarChart3, Award],
  plataforma: [Store, QrCode, ShieldCheck],
};

export default function Features() {
  const { language } = useLanguage();
  const c = FEATURES_PAGE[language] ?? FEATURES_PAGE.pt;
  const reduce = useReducedMotion();
  useLandingTheme();

  return (
    <div className="landing-root min-h-screen overflow-x-hidden bg-background text-foreground">
      <LandingNav />

      {/* Topo */}
      <section className="relative overflow-hidden pb-16 pt-32 text-white md:pb-20 md:pt-40" style={{ background: NAVY_BG }}>
        <div className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full opacity-20 blur-3xl" style={{ background: "radial-gradient(circle, #f7b93b, transparent 70%)" }} />
        <div className="container relative mx-auto flex flex-col gap-6 px-4">
          <motion.div initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }} className="flex max-w-3xl flex-col gap-5">
            <Eyebrow light>{c.eyebrow}</Eyebrow>
            <h1 className="font-heading text-5xl font-semibold leading-[1.05] tracking-tight [text-wrap:balance] md:text-6xl">
              {c.title}<em className="italic text-highlight">{c.titleEm}</em>
            </h1>
            <p className="text-lg leading-relaxed text-white/70">{c.sub}</p>
          </motion.div>
          <motion.nav initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.12, ease: EASE }} aria-label={c.jump} className="flex flex-wrap items-center gap-2">
            <span className="mr-1 font-mono text-xs uppercase tracking-wide text-white/50">{c.jump}</span>
            {c.groups.map((g) => (
              <a key={g.id} href={`#${g.id}`} className="rounded-full border border-white/20 px-3.5 py-1.5 text-sm text-white/85 transition-colors hover:bg-white/10">{g.label}</a>
            ))}
          </motion.nav>
        </div>
      </section>

      {/* Grupos */}
      <div>
        {c.groups.map((g, gi) => (
          <section key={g.id} id={g.id} className={`border-b border-border py-16 md:py-20 ${gi % 2 === 1 ? "bg-sunken" : ""}`}>
            <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-[280px_1fr]">
              <Reveal className="flex flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
                <Eyebrow>{String(gi + 1).padStart(2, "0")}</Eyebrow>
                <h2 className="font-heading text-3xl font-semibold leading-tight tracking-tight [text-wrap:balance] md:text-4xl">{g.label}</h2>
                <p className="text-muted-foreground">{g.intro}</p>
              </Reveal>
              <div className="grid gap-4 md:grid-cols-2">
                {g.items.map((it, i) => {
                  const Icon = ICONS[g.id]?.[i] ?? Sparkles;
                  const wide = g.items.length % 2 === 1 && i === g.items.length - 1;
                  return (
                    <Reveal key={it.title} delay={(i % 2) * 0.06} className={wide ? "md:col-span-2" : ""}>
                      <div className="flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-6">
                        <Icon className="h-7 w-7 text-accent-ink dark:text-highlight" strokeWidth={1.4} />
                        <div className="flex flex-col gap-2">
                          <h3 className="font-heading text-xl font-semibold tracking-tight">{it.title}</h3>
                          <p className="text-sm leading-relaxed text-muted-foreground">{it.desc}</p>
                        </div>
                        <ul className="mt-auto flex flex-wrap gap-1.5">
                          {it.highlights.map((h) => (
                            <li key={h} className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs text-brand-text">
                              <Check className="h-3 w-3" />{h}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Chamada final */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl p-10 text-center text-white md:p-14" style={{ background: NAVY_BG }}>
              <h2 className="font-heading text-3xl font-semibold leading-tight tracking-tight md:text-4xl">{c.cta.heading}</h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">{c.cta.sub}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link to="/auth?tab=signup">
                  <Button size="lg" className="gap-2 bg-highlight text-[#1a1303] hover:brightness-95">{c.cta.primary}<ArrowRight className="h-4 w-4" /></Button>
                </Link>
                <Link to="/planos">
                  <Button size="lg" variant="outline" className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white">{c.cta.secondary}</Button>
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
