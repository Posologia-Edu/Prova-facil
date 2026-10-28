import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Crown, Loader2, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingFooter } from "@/components/LandingFooter";
import { FREE_LIMITS } from "@/hooks/use-subscription";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { PLANS_PAGE } from "@/lib/landing-pages-content";
import { EASE, NAVY_BG, Reveal, Eyebrow, LandingNav, useLandingTheme } from "@/components/landing/landing-shared";

// Valores de cada recurso por plano, na mesma ordem dos nomes em PLANS_PAGE[idioma].rows.
// "unlimited" vira o texto "Ilimitado" do idioma. Dados dos planos inalterados.
const PLAN_VALUES: { free: string | boolean; premium: string | boolean }[] = [
  { free: `${FREE_LIMITS.questionsPerMonth}`, premium: "unlimited" },
  { free: `${FREE_LIMITS.examsPerMonth}`, premium: "unlimited" },
  { free: false, premium: true },
  { free: false, premium: true },
  { free: `${FREE_LIMITS.studentsPerExam}`, premium: "unlimited" },
  { free: false, premium: true },
  { free: false, premium: true },
  { free: false, premium: true },
];

export default function PublicPricing() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const c = PLANS_PAGE[language] ?? PLANS_PAGE.pt;
  const reduce = useReducedMotion();
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  useLandingTheme();

  const renderValue = (value: string | boolean) => {
    if (typeof value === "boolean") {
      return value
        ? <Check className="h-4 w-4 text-success" aria-label="✓" />
        : <X className="h-4 w-4 text-muted-foreground/40" aria-label="—" />;
    }
    return <span className="text-sm font-medium">{value === "unlimited" ? c.unlimited : value}</span>;
  };

  const handleSubscribe = async () => {
    setLoadingCheckout(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Usuário sem login: vai ao cadastro com a intenção de assinar
        navigate("/auth?tab=signup&redirect=premium");
        return;
      }
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: c.errorTitle, description: err.message || c.errorFallback, variant: "destructive" });
    } finally {
      setLoadingCheckout(false);
    }
  };

  return (
    <div className="landing-root min-h-screen overflow-x-hidden bg-background text-foreground">
      <LandingNav />

      <section className="relative overflow-hidden pb-24 pt-32 text-white md:pt-40" style={{ background: NAVY_BG }}>
        <div className="pointer-events-none absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full opacity-20 blur-3xl" style={{ background: "radial-gradient(circle, #f7b93b, transparent 70%)" }} />
        <div className="container relative mx-auto flex max-w-3xl flex-col items-center gap-5 px-4 text-center">
          <motion.div initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }} className="flex flex-col items-center gap-5">
            <Eyebrow light>{c.eyebrow}</Eyebrow>
            <h1 className="font-heading text-5xl font-semibold leading-[1.05] tracking-tight [text-wrap:balance] md:text-6xl">{c.title}</h1>
            <p className="text-lg leading-relaxed text-white/70">{c.sub}</p>
          </motion.div>
        </div>
      </section>

      {/* Cartões dos planos sobem sobre a faixa do topo */}
      <section className="pb-20 md:pb-28">
        <div className="container relative z-10 mx-auto -mt-14 px-4">
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            <Reveal>
              <div className="flex h-full flex-col gap-6 rounded-2xl border border-border bg-card p-7 shadow-2">
                <div className="flex flex-col gap-1.5">
                  <h2 className="flex items-center gap-2 font-heading text-2xl font-semibold"><Zap className="h-5 w-5 text-brand-text" />{c.free.name}</h2>
                  <p className="text-sm text-muted-foreground">{c.free.desc}</p>
                  <p className="mt-2 font-heading text-5xl font-semibold tracking-tight">R$ 0<span className="text-base font-normal text-muted-foreground">{c.perMonth}</span></p>
                </div>
                <ul className="flex flex-col gap-3">
                  {c.rows.map((name, i) => (
                    <li key={name} className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 text-sm last:border-0 last:pb-0">
                      <span>{name}</span>
                      {renderValue(PLAN_VALUES[i].free)}
                    </li>
                  ))}
                </ul>
                <Link to="/auth?tab=signup" className="mt-auto">
                  <Button variant="outline" className="w-full gap-2">{c.free.cta}<ArrowRight className="h-4 w-4" /></Button>
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="flex h-full flex-col gap-6 rounded-2xl border-2 border-highlight bg-card p-7 shadow-3">
                <div className="flex flex-col gap-1.5">
                  <h2 className="flex items-center gap-2 font-heading text-2xl font-semibold"><Crown className="h-5 w-5 text-accent-ink dark:text-highlight" />{c.premium.name}</h2>
                  <p className="text-sm text-muted-foreground">{c.premium.desc}</p>
                  <p className="mt-2 font-heading text-5xl font-semibold tracking-tight">R$ 29,90<span className="text-base font-normal text-muted-foreground">{c.perMonth}</span></p>
                  <p className="text-xs font-medium text-success">{c.premium.trial}</p>
                </div>
                <ul className="flex flex-col gap-3">
                  {c.rows.map((name, i) => (
                    <li key={name} className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 text-sm last:border-0 last:pb-0">
                      <span>{name}</span>
                      {renderValue(PLAN_VALUES[i].premium)}
                    </li>
                  ))}
                </ul>
                <Button onClick={handleSubscribe} disabled={loadingCheckout} className="mt-auto w-full gap-2 bg-highlight text-[#1a1303] hover:brightness-95">
                  {loadingCheckout ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                  {loadingCheckout ? c.premium.loading : c.premium.cta}
                </Button>
              </div>
            </Reveal>
          </div>

          <Reveal className="mt-10 text-center text-muted-foreground">
            {c.featuresLink}{" "}
            <Link to="/funcionalidades" className="font-medium text-foreground underline underline-offset-4 hover:text-accent-ink dark:hover:text-highlight">{c.featuresLinkCta}</Link>
          </Reveal>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
