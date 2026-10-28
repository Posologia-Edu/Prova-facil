import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Activity, Apple, ArrowRight, Check, ClipboardList, Gavel, HeartHandshake, HeartPulse, LayoutGrid,
  MessagesSquare, Microscope, Pill, Plug, ShieldCheck, Smile, Sparkles, Stethoscope, Store, Accessibility, FileText, type LucideIcon,
} from "lucide-react";
import { LandingFooter } from "@/components/LandingFooter";
import { SalesAgent } from "@/components/SalesAgent";
import { useLanguage } from "@/i18n/LanguageContext";
import { LANDING_CONTENT, type LandingContent } from "@/lib/landing-content";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { EASE, NAVY_BG, Reveal, Eyebrow, SectionHead, LandingNav, CountUp, Typewriter, useLandingTheme } from "@/components/landing/landing-shared";

const AREA_ICONS: LucideIcon[] = [Pill, HeartPulse, Stethoscope, Smile, Apple, Activity, Microscope];
const MODULE_ICONS: LucideIcon[] = [ClipboardList, MessagesSquare, Stethoscope, FileText, Gavel, LayoutGrid];
const TRUST_ICONS: LucideIcon[] = [ShieldCheck, Accessibility, Plug, Store];

/** Cartões do produto (conteúdo de exemplo, sempre marcado como exemplo). */
function HeroCards({ c }: { c: LandingContent["cards"] }) {
  const reduce = useReducedMotion();
  const enter = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay: 0.25 + i * 0.12, ease: EASE },
  });
  return (
    <div className="flex min-w-0 flex-col gap-3" aria-label={c.example}>
      <motion.div {...enter(0)} className="flex flex-col gap-2.5 rounded-xl bg-[#eaf0ff] p-4 text-[13px] text-[#0c1a38] shadow-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#55627f]">{c.debrief} · {c.example}</span>
        <div className="flex flex-wrap gap-2">
          <div className="min-w-[110px] flex-1 rounded-lg bg-[#dbe5fb] px-3 py-2"><b className="block font-heading text-2xl tabular-nums"><CountUp text="4/5" delay={0.9} /></b>{c.found}</div>
          <div className="min-w-[110px] flex-1 rounded-lg bg-[#dbe5fb] px-3 py-2"><b className="block font-heading text-2xl tabular-nums"><CountUp text="4/4" delay={1} /></b>{c.essential}</div>
        </div>
        <motion.div
          initial={reduce ? false : { opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 1.3, ease: EASE }}
          className="rounded-r-lg border-l-[3px] border-[#e08a1e] bg-[#fdf0dc] px-3 py-1.5"
        ><b>{c.improveLabel}</b> {c.improveText}</motion.div>
      </motion.div>
      <motion.div {...enter(1)} className="flex flex-col gap-2.5 rounded-xl bg-[#eaf0ff] p-4 text-[13px] text-[#0c1a38] shadow-3 sm:ml-8">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#55627f]">{c.grade} · {c.example}</span>
        <div className="flex flex-wrap gap-2">
          <div className="min-w-[110px] flex-1 rounded-lg bg-[#dbe5fb] px-3 py-2"><b className="block font-heading text-2xl tabular-nums"><CountUp text="7,9" delay={1.1} /></b>{c.gradeSub}</div>
          <div className="min-w-[110px] flex-1 rounded-lg bg-[#dbe5fb] px-3 py-2"><b className="block font-heading text-2xl">{c.naCount}</b>{c.naSub}</div>
        </div>
      </motion.div>
      <motion.div {...enter(2)} className="flex flex-col gap-2.5 rounded-xl bg-[#eaf0ff] p-4 text-[13px] text-[#0c1a38] shadow-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#55627f]">{c.feedback} · {c.example}</span>
        <div className="rounded-r-lg border-l-[3px] border-[#1d7a4f] bg-[#def3e7] px-3 py-1.5"><Typewriter text={c.feedbackText} delay={1.4} /></div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-[#0c1a38] px-3 py-1 text-xs font-semibold text-[#f7b93b]">
          <Sparkles className="h-3 w-3" />{c.aiBadge}
        </span>
      </motion.div>
    </div>
  );
}

/** Ponto da linha dos passos: acende quando o traço chega nele. */
function RailDot({ progress, at, reduce, className }: { progress: MotionValue<number>; at: number; reduce: boolean | null; className: string }) {
  const opacity = useTransform(progress, [at - 0.05, at], [0, 1]);
  return (
    <span className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-border bg-sunken ${className}`}>
      <motion.span style={{ opacity: reduce ? 1 : opacity }} className="absolute -inset-0.5 rounded-full bg-highlight" />
    </span>
  );
}

/** Como funciona: a linha se desenha ligando os passos 1, 2 e 3 conforme a rolagem (só em telas largas). */
function HowSteps({ steps }: { steps: { title: string; desc: string }[] }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "start 35%"] });
  return (
    <div ref={ref} className="relative md:pt-9">
      <div aria-hidden="true" className="pointer-events-none absolute left-[16.67%] right-[16.67%] top-2 hidden h-0.5 md:block">
        <div className="absolute inset-0 rounded-full bg-border" />
        <motion.div className="absolute inset-0 origin-left rounded-full bg-highlight" style={{ scaleX: reduce ? 1 : scrollYProgress }} />
        <RailDot progress={scrollYProgress} at={0} reduce={reduce} className="left-0 -translate-x-1/2" />
        <RailDot progress={scrollYProgress} at={0.5} reduce={reduce} className="left-1/2 -translate-x-1/2" />
        <RailDot progress={scrollYProgress} at={1} reduce={reduce} className="left-full -translate-x-1/2" />
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((s, i) => (
          <Reveal key={s.title} delay={i * 0.08}>
            <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-6">
              <span className="font-heading text-5xl font-semibold text-highlight">{i + 1}</span>
              <h3 className="font-heading text-xl font-semibold">{s.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

const Index = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const c = LANDING_CONTENT[language] ?? LANDING_CONTENT.pt;
  const reduce = useReducedMotion();
  const [role, setRole] = useState<"teacher" | "student">("teacher");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate("/dashboard");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useLandingTheme();

  const rolePoints = role === "teacher" ? c.roles.teacher.points : c.roles.student.points;

  return (
    <div className="landing-root min-h-screen overflow-x-hidden bg-background text-foreground">
      <LandingNav home />

      {/* Hero */}
      <section className="relative overflow-hidden pb-20 pt-32 text-white md:pb-28 md:pt-40" style={{ background: NAVY_BG }}>
        <div className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full opacity-20 blur-3xl" style={{ background: "radial-gradient(circle, #f7b93b, transparent 70%)" }} />
        <div className="container relative mx-auto grid items-center gap-12 px-4 lg:grid-cols-[1.05fr_1fr]">
          <div className="flex flex-col gap-6">
            <motion.span
              initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
              className="inline-flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-xs uppercase tracking-wide text-white/80"
            >
              <Sparkles className="h-3.5 w-3.5 text-highlight" />{c.hero.badge}
            </motion.span>
            <motion.div initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.08, ease: EASE }} className="flex flex-col gap-5">
              <Eyebrow light>{c.hero.eyebrow}</Eyebrow>
              <h1 className="font-heading text-5xl font-semibold leading-[1.05] tracking-tight [text-wrap:balance] md:text-6xl">
                {c.hero.title1}<em className="italic text-highlight">{c.hero.titleEm}</em>
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-white/70">{c.hero.subtitle}</p>
            </motion.div>
            <motion.div initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.16, ease: EASE }} className="flex flex-wrap gap-3">
              <Link to="/planos">
                <Button size="lg" className="gap-2 bg-highlight text-[#1a1303] hover:brightness-95">{c.hero.primary}<ArrowRight className="h-4 w-4" /></Button>
              </Link>
              <a href="#como-funciona">
                <Button size="lg" variant="outline" className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white">{c.hero.secondary}</Button>
              </a>
            </motion.div>
          </div>
          <HeroCards c={c.cards} />
        </div>
      </section>

      {/* Áreas */}
      <section id="areas" className="border-b border-border py-20 md:py-28">
        <div className="container mx-auto flex flex-col gap-12 px-4">
          <SectionHead eyebrow={c.areas.eyebrow} title={c.areas.heading} sub={c.areas.sub} />
          <Reveal className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
            {c.areas.items.map((name, i) => {
              const Icon = AREA_ICONS[i];
              return (
                <div key={name} className={`relative flex flex-col items-start gap-3 rounded-xl border p-4 ${i === 0 ? "border-highlight bg-accent-soft/40" : "border-border bg-card"}`}>
                  <Icon className={`h-6 w-6 ${i === 0 ? "text-accent-ink dark:text-highlight" : "text-brand-text"}`} strokeWidth={1.6} />
                  <span className="font-medium">{name}</span>
                  {i === 0 && <span className="font-mono text-[10px] uppercase tracking-wide text-accent-ink dark:text-highlight">{c.areas.mostComplete}</span>}
                </div>
              );
            })}
          </Reveal>
        </div>
      </section>

      {/* Módulos */}
      <section id="plataforma" className="py-20 md:py-28">
        <div className="container mx-auto flex flex-col gap-12 px-4">
          <SectionHead eyebrow={c.modules.eyebrow} title={c.modules.heading} sub={c.modules.sub} />
          <div className="grid gap-4 lg:grid-cols-12">
            {c.modules.items.map((m, i) => {
              const Icon = MODULE_ICONS[i];
              const span = ["lg:col-span-7 lg:row-span-2", "lg:col-span-5", "lg:col-span-5", "lg:col-span-4", "lg:col-span-4", "lg:col-span-4"][i];
              return (
                <Reveal key={m.title} delay={(i % 3) * 0.06} className={span}>
                  <motion.div
                    whileHover={reduce ? undefined : { y: -4 }} transition={{ duration: 0.25, ease: EASE }}
                    className={`flex h-full flex-col justify-between gap-6 rounded-2xl border border-border bg-card p-6 transition-[box-shadow,border-color] duration-300 hover:border-highlight/60 hover:shadow-[0_14px_36px_-14px_rgba(247,185,59,0.5)] ${i === 0 ? "md:p-9" : ""}`}
                  >
                    <div className="flex flex-col gap-3">
                      <Icon className={`${i === 0 ? "h-11 w-11" : "h-7 w-7"} text-accent-ink dark:text-highlight`} strokeWidth={1.4} />
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className={`font-heading font-semibold tracking-tight ${i === 0 ? "text-3xl" : "text-xl"}`}>{m.title}</h3>
                        {m.premium && <span className="rounded-full bg-highlight/15 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-accent-ink dark:text-highlight">Premium</span>}
                      </div>
                      <p className={`leading-relaxed text-muted-foreground ${i === 0 ? "max-w-lg text-base" : "text-sm"}`}>{m.desc}</p>
                    </div>
                    {i === 0 && (
                      <div className="flex flex-col gap-2 rounded-xl border border-border bg-sunken p-4" aria-hidden="true">
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{c.modules.sim.tag}</span>
                        {c.modules.sim.rows.map((label, r) => {
                          const level = [4, 2, null][r];
                          return (
                            <div key={label} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-sm">
                              <span className="min-w-0">{label}</span>
                              {level === null ? (
                                <motion.span
                                  initial={reduce ? false : { opacity: 0, scale: 0.85 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                                  transition={{ duration: 0.4, delay: 1.9, ease: EASE }}
                                  className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-muted-foreground"
                                >{c.modules.sim.na}</motion.span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  {[1, 2, 3, 4].map((n) => (
                                    <span key={n} className="relative h-2 w-7 overflow-hidden rounded-full bg-border">
                                      {n <= level && (
                                        <motion.span
                                          initial={reduce ? false : { scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }}
                                          transition={{ duration: 0.4, delay: 0.5 + r * 0.5 + n * 0.12, ease: EASE }}
                                          className="absolute inset-0 origin-left rounded-full bg-highlight"
                                        />
                                      )}
                                    </span>
                                  ))}
                                  <span className="ml-1 font-mono text-xs text-muted-foreground">{level}/4</span>
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {m.tags.map((t) => <span key={t} className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs text-brand-text">{t}</span>)}
                    </div>
                  </motion.div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* IA: o professor decide */}
      <section className="py-20 text-white md:py-28" style={{ background: NAVY_BG }}>
        <div className="container mx-auto flex flex-col gap-12 px-4">
          <SectionHead eyebrow={c.ai.eyebrow} title={c.ai.heading} sub={c.ai.sub} light />
          <div className="grid gap-4 sm:grid-cols-2">
            {c.ai.items.map((it, i) => (
              <Reveal key={it.title} delay={(i % 2) * 0.08}>
                <div className="flex h-full flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                  <Sparkles className="h-5 w-5 text-highlight" />
                  <h3 className="font-heading text-xl font-semibold">{it.title}</h3>
                  <p className="text-sm leading-relaxed text-white/70">{it.desc}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-md bg-white/10 px-2.5 py-1 font-mono text-xs text-white/85">{it.sample}</span>
                    <motion.span
                      initial={reduce ? false : { opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 1 + (i % 2) * 0.15, ease: EASE }}
                      className="inline-flex items-center gap-1 rounded-full bg-[#1d7a4f]/25 px-2.5 py-1 text-xs font-medium text-[#7fe0ae]"
                    ><Check className="h-3 w-3" />{c.ai.confirm}</motion.span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal><p className="font-heading text-2xl italic text-highlight md:text-3xl">“{c.ai.quote}”</p></Reveal>
        </div>
      </section>

      {/* Professor e aluno */}
      <section className="border-b border-border py-20 md:py-28">
        <div className="container mx-auto flex flex-col gap-10 px-4">
          <SectionHead eyebrow={c.roles.eyebrow} title={c.roles.heading} />
          <Reveal className="flex flex-col gap-6">
            <div role="tablist" className="inline-flex self-start rounded-lg border border-border bg-sunken p-1">
              {(["teacher", "student"] as const).map((r) => (
                <button
                  key={r} type="button" role="tab" aria-selected={role === r} onClick={() => setRole(r)}
                  className={`rounded-md px-5 py-2 text-sm font-medium transition-colors ${role === r ? "bg-card text-foreground shadow-1" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {r === "teacher" ? c.roles.teacher.label : c.roles.student.label}
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.ul
                key={role} className="grid gap-3 md:grid-cols-2"
                initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: EASE }}
              >
              {rolePoints.map((p, pi) => (
                <motion.li
                  key={p} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
                  initial={reduce ? false : { opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: 0.06 + pi * 0.06, ease: EASE }}
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-soft text-success"><Check className="h-3.5 w-3.5" /></span>
                  <span>{p}</span>
                </motion.li>
              ))}
              </motion.ul>
            </AnimatePresence>
          </Reveal>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="bg-sunken py-20 md:py-28">
        <div className="container mx-auto flex flex-col gap-12 px-4">
          <SectionHead eyebrow={c.how.eyebrow} title={c.how.heading} />
          <HowSteps steps={c.how.steps} />
        </div>
      </section>

      {/* Confiança */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto flex flex-col gap-12 px-4">
          <SectionHead eyebrow={c.trust.eyebrow} title={c.trust.heading} />
          <Reveal className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
            {c.trust.stats.map((s) => (
              <div key={s.label} className="flex flex-col gap-1 bg-card p-6">
                <span className="font-heading text-5xl font-semibold tabular-nums text-brand-text"><CountUp text={s.value} /></span>
                <span className="text-sm text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {c.trust.items.map((it, i) => {
              const Icon = TRUST_ICONS[i] ?? HeartHandshake;
              return (
                <Reveal key={it.title} delay={i * 0.06}>
                  <div className="flex h-full flex-col gap-2 rounded-xl border border-border bg-card p-5">
                    <Icon className="h-6 w-6 text-brand-text" strokeWidth={1.5} />
                    <h3 className="font-semibold">{it.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{it.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Chamada final */}
      <section className="pb-20 md:pb-28">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl p-10 text-center text-white md:p-16" style={{ background: NAVY_BG }}>
              <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full opacity-20 blur-3xl" style={{ background: "radial-gradient(circle, #f7b93b, transparent 70%)" }} />
              <h2 className="relative mx-auto max-w-3xl font-heading text-4xl font-semibold leading-[1.1] tracking-tight [text-wrap:balance] md:text-5xl">{c.cta.heading}</h2>
              <p className="relative mx-auto mt-5 max-w-xl text-lg text-white/70">{c.cta.sub}</p>
              <div className="relative mt-8 flex flex-wrap justify-center gap-3">
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

      <LandingFooter description={c.footer} />
      <SalesAgent />
    </div>
  );
};

export default Index;
