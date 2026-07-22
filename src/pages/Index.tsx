import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Brain, FileText, BarChart3, Shield, Zap,
  ArrowRight, Star, GraduationCap, Globe,
  Stethoscope, Store, MonitorPlay, Sparkles, ArrowUpRight,
  CircleDot, Layers, Waves, Trophy
} from "lucide-react";
import FloatingAuth from "@/components/FloatingAuth";
import { LandingFooter } from "@/components/LandingFooter";
import { SalesAgent } from "@/components/SalesAgent";
import { useLanguage, LANGUAGE_FLAGS, LANGUAGE_LABELS, type Language } from "@/i18n/LanguageContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring, type Variants } from "framer-motion";
import { useState as useReactState, useEffect as useReactEffect } from "react";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  show: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
  })
};

const Index = () => {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const languages: Language[] = ["pt", "en", "es"];

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 60, damping: 20 });
  const smy = useSpring(my, { stiffness: 60, damping: 20 });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate("/dashboard");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const onMouseMove = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    mx.set(((e.clientX - rect.left) / rect.width - 0.5) * 20);
    my.set(((e.clientY - rect.top) / rect.height - 0.5) * 20);
  };

  const features = [
    { icon: Brain, tag: "01", title: t("landing_feat_ai_title"), description: t("landing_feat_ai_desc") },
    { icon: Stethoscope, tag: "02", title: t("landing_feat_osce_title"), description: t("landing_feat_osce_desc") },
    { icon: MonitorPlay, tag: "03", title: t("landing_feat_online_title"), description: t("landing_feat_online_desc") },
    { icon: FileText, tag: "04", title: t("landing_feat_wysiwyg_title"), description: t("landing_feat_wysiwyg_desc") },
    { icon: BookOpen, tag: "05", title: t("landing_feat_bank_title"), description: t("landing_feat_bank_desc") },
    { icon: BarChart3, tag: "06", title: t("landing_feat_analytics_title"), description: t("landing_feat_analytics_desc") },
    { icon: Store, tag: "07", title: t("landing_feat_marketplace_title"), description: t("landing_feat_marketplace_desc") },
    { icon: Shield, tag: "08", title: t("landing_feat_security_title"), description: t("landing_feat_security_desc") },
    { icon: Zap, tag: "09", title: t("landing_feat_fast_title"), description: t("landing_feat_fast_desc") },
  ];

  const stats = [
    { value: "9+", label: t("landing_stats_questions") },
    { value: "4", label: t("landing_stats_teachers") },
    { value: "3", label: t("landing_stats_time") },
    { value: "100%", label: t("landing_stats_rating") },
  ];

  const marqueeItems = [
    "IA Generativa", "OSCE Digital", "Paciente Virtual", "SOAP", "Reconciliação",
    "Documentação Clínica", "Marketplace", "Analytics", "QR Check-in", "Cronograma Inteligente",
  ];

  return (
    <div className="landing-root min-h-screen relative overflow-x-hidden">
      {/* Navbar */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a1a]/70 backdrop-blur-xl"
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 blur-md opacity-60 animate-[landing-pulse-glow_3s_ease-in-out_infinite]" />
              <GraduationCap className="h-7 w-7 relative" style={{ color: "#7c74ff" }} />
            </div>
            <span className="text-xl font-bold font-display tracking-tight">ProvaFácil</span>
          </div>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-white/80 hover:text-white hover:bg-white/5">
                  <Globe className="h-4 w-4" />
                  {LANGUAGE_FLAGS[language]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#141432] border-white/10 text-white">
                {languages.map((lang) => (
                  <DropdownMenuItem key={lang} onClick={() => setLanguage(lang)}
                    className={`focus:bg-white/10 focus:text-white ${language === lang ? "bg-white/5" : ""}`}>
                    {LANGUAGE_FLAGS[lang]} {LANGUAGE_LABELS[lang]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/student/auth">
              <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/5 gap-1.5">
                <GraduationCap className="h-4 w-4" />
                {t("auth_student")}
              </Button>
            </Link>
            <FloatingAuth />
          </div>
        </div>
      </motion.nav>

      {/* HERO */}
      <section
        ref={heroRef}
        onMouseMove={onMouseMove}
        className="relative pt-40 pb-32 md:pt-52 md:pb-40 overflow-hidden"
      >
        {/* Background stack */}
        <motion.div style={{ y: bgY }} className="absolute inset-0 -z-10">
          <div className="absolute inset-0 landing-aurora" />
          <div className="absolute inset-0 landing-grid-bg opacity-40" />
          <div className="absolute inset-0 landing-noise opacity-[0.04] mix-blend-overlay" />
        </motion.div>

        {/* Orbiting orbs */}
        <motion.div
          style={{ x: smx, y: smy }}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -z-10 pointer-events-none"
        >
          <div className="relative w-[600px] h-[600px]">
            <div className="absolute inset-0 rounded-full border border-white/5 animate-[landing-orbit_60s_linear_infinite]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-indigo-400 shadow-[0_0_30px_10px_rgba(124,116,255,0.6)]" />
            </div>
            <div className="absolute inset-8 rounded-full border border-white/5 animate-[landing-orbit_40s_linear_infinite_reverse]">
              <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_20px_6px_rgba(255,255,255,0.5)]" />
            </div>
            <div className="absolute inset-20 rounded-full border border-white/5" />
          </div>
        </motion.div>

        <motion.div style={{ opacity: heroOpacity }} className="container mx-auto px-4 relative">
          <motion.div
            variants={fadeUp} initial="hidden" animate="show" custom={0}
            className="flex justify-center mb-8"
          >
            <div className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-md px-4 py-1.5 text-xs text-white/70">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-400" />
              </span>
              <span className="font-mono-alt tracking-wide uppercase">v2.0 · {t("landing_ai_badge")}</span>
              <ArrowUpRight className="h-3 w-3 opacity-60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </motion.div>

          <motion.h1
            variants={fadeUp} initial="hidden" animate="show" custom={1}
            className="mx-auto max-w-5xl text-center text-5xl md:text-7xl lg:text-8xl font-display font-semibold leading-[0.95]"
          >
            {t("landing_hero_title_1")}
            <span className="relative inline-block mx-2">
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(120deg, #7c74ff 0%, #4f46e5 50%, #a78bfa 100%)" }}
              >
                {t("landing_hero_title_2")}
              </span>
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.2, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="absolute -bottom-1 left-0 right-0 h-[3px] origin-left"
                style={{ background: "linear-gradient(90deg, transparent, #7c74ff, transparent)" }}
              />
            </span>
            {t("landing_hero_title_3")}
          </motion.h1>

          <motion.p
            variants={fadeUp} initial="hidden" animate="show" custom={2}
            className="mx-auto mt-8 max-w-2xl text-center text-lg md:text-xl text-white/60 leading-relaxed"
          >
            {t("landing_hero_subtitle")}
          </motion.p>

          <motion.div
            variants={fadeUp} initial="hidden" animate="show" custom={3}
            className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <Link to="/planos">
              <Button
                size="lg"
                className="relative overflow-hidden group text-base px-8 py-6 rounded-full border-0"
                style={{
                  background: "linear-gradient(135deg, #4f46e5 0%, #7c74ff 100%)",
                  boxShadow: "0 10px 40px -10px rgba(79,70,229,0.6), inset 0 1px 0 rgba(255,255,255,0.2)"
                }}
              >
                <span className="absolute inset-0 landing-shine opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative flex items-center gap-2 text-white font-medium">
                  {t("landing_start_free")}
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
            </Link>
            <a href="#features">
              <Button
                size="lg" variant="ghost"
                className="text-base px-8 py-6 rounded-full border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-white/90 backdrop-blur-md gap-2"
              >
                <Sparkles className="h-4 w-4 opacity-70" />
                {t("landing_see_features")}
              </Button>
            </a>
          </motion.div>

          {/* Floating stats card */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-24 max-w-4xl relative"
          >
            <div
              className="absolute -inset-px rounded-2xl opacity-60 blur-xl"
              style={{ background: "linear-gradient(120deg, #4f46e5, transparent 40%, #7c74ff)" }}
            />
            <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-2xl p-8 md:p-10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4 divide-x divide-white/5">
                {stats.map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.8 + i * 0.1 }}
                    className="text-center px-4 first:pl-0"
                  >
                    <div className="font-display text-4xl md:text-5xl font-semibold bg-clip-text text-transparent"
                      style={{ backgroundImage: "linear-gradient(180deg, #ffffff, #b4b4d8)" }}>
                      {s.value}
                    </div>
                    <div className="mt-2 text-xs md:text-sm uppercase tracking-wider text-white/50 font-mono-alt">
                      {s.label}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Marquee */}
      <section className="relative py-6 border-y border-white/5 bg-[#05050f] overflow-hidden">
        <div className="flex landing-marquee-track whitespace-nowrap">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <div key={i} className="flex items-center gap-6 px-6 text-white/40 text-sm uppercase tracking-widest font-mono-alt">
              <CircleDot className="h-3 w-3 text-indigo-400" />
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES — Magazine grid */}
      <section id="features" className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full blur-3xl opacity-30"
            style={{ background: "radial-gradient(circle, #4f46e5, transparent 70%)" }} />
        </div>

        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mb-20"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-12 bg-indigo-400" />
              <span className="text-xs uppercase tracking-[0.3em] text-indigo-400 font-mono-alt">Recursos</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-display font-semibold leading-tight">
              {t("landing_features_heading")}
            </h2>
            <p className="mt-6 text-lg text-white/60 max-w-xl">{t("landing_features_sub")}</p>
          </motion.div>

          {/* Magazine layout: 1 hero + grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Feature spotlight */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-7 lg:row-span-2 group relative overflow-hidden rounded-3xl border border-white/10 p-10 min-h-[420px]"
              style={{
                background: "linear-gradient(135deg, rgba(79,70,229,0.18) 0%, rgba(20,20,50,0.4) 60%)"
              }}
            >
              <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full blur-3xl opacity-40"
                style={{ background: "radial-gradient(circle, #7c74ff, transparent 70%)" }} />
              <div className="relative h-full flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-mono-alt uppercase tracking-widest text-indigo-300 mb-8">
                    <span>01</span>
                    <span className="h-px w-8 bg-indigo-400/40" />
                    <span>Destaque</span>
                  </div>
                  <Brain className="h-14 w-14 text-indigo-300 mb-6" strokeWidth={1.2} />
                  <h3 className="font-display text-3xl md:text-4xl font-semibold leading-tight max-w-lg">
                    {features[0].title}
                  </h3>
                  <p className="mt-4 text-white/60 text-lg max-w-md leading-relaxed">
                    {features[0].description}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-indigo-300 group-hover:gap-3 transition-all">
                  <span>Explorar recurso</span>
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>
            </motion.div>

            {/* Small tiles */}
            {features.slice(1, 5).map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                className="lg:col-span-5 group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] backdrop-blur-sm p-6 transition-all"
                style={{ minHeight: i < 2 ? "200px" : undefined }}
              >
                <div className="flex items-start justify-between mb-4">
                  <f.icon className="h-8 w-8 text-indigo-300" strokeWidth={1.4} />
                  <span className="text-xs font-mono-alt text-white/30">{f.tag}</span>
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed line-clamp-2">{f.description}</p>
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.1), transparent 50%)" }} />
              </motion.div>
            )).slice(0, 2)}

            {/* Remaining features - bottom row */}
            {features.slice(5).map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.06 }}
                className="lg:col-span-3 group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] backdrop-blur-sm p-6 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <f.icon className="h-7 w-7 text-indigo-300" strokeWidth={1.4} />
                  <span className="text-xs font-mono-alt text-white/30">{f.tag}</span>
                </div>
                <h3 className="font-display text-base font-semibold mb-2 leading-snug">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed line-clamp-2">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — Split animated */}
      <section className="relative py-32 border-t border-white/5 overflow-hidden">
        <div className="absolute inset-0 landing-grid-bg opacity-20 -z-10" />
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-px w-12 bg-indigo-400" />
              <span className="text-xs uppercase tracking-[0.3em] text-indigo-400 font-mono-alt">Processo</span>
              <div className="h-px w-12 bg-indigo-400" />
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-semibold">{t("landing_how_heading")}</h2>
          </motion.div>

          <div className="relative max-w-5xl mx-auto">
            {/* Vertical line */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-indigo-500/30 to-transparent hidden md:block" />

            {[
              { step: "01", title: t("landing_step1_title"), desc: t("landing_step1_desc"), icon: Layers },
              { step: "02", title: t("landing_step2_title"), desc: t("landing_step2_desc"), icon: Waves },
              { step: "03", title: t("landing_step3_title"), desc: t("landing_step3_desc"), icon: Trophy },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, delay: i * 0.1 }}
                className={`relative flex flex-col md:flex-row items-center gap-8 md:gap-16 mb-16 last:mb-0 ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}
              >
                <div className="flex-1 text-center md:text-left">
                  <div className={`inline-flex items-center gap-3 mb-4 ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}>
                    <span className="font-mono-alt text-xs text-indigo-400 tracking-widest">STEP {item.step}</span>
                    <div className="h-px w-8 bg-indigo-400/40" />
                  </div>
                  <h3 className="font-display text-2xl md:text-3xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-white/60 leading-relaxed">{item.desc}</p>
                </div>

                {/* Center node */}
                <div className="relative shrink-0">
                  <div className="absolute inset-0 blur-2xl opacity-60 animate-[landing-pulse-glow_3s_ease-in-out_infinite]"
                    style={{ background: "#4f46e5", borderRadius: "50%" }} />
                  <div className="relative w-20 h-20 rounded-full border border-white/10 bg-gradient-to-br from-[#1e1e5a] to-[#0a0a1a] flex items-center justify-center backdrop-blur-lg">
                    <item.icon className="h-8 w-8 text-indigo-300" strokeWidth={1.5} />
                  </div>
                </div>

                <div className="flex-1 hidden md:block" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS / Value cards */}
      <section className="relative py-32 border-t border-white/5">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mb-16"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-12 bg-indigo-400" />
              <span className="text-xs uppercase tracking-[0.3em] text-indigo-400 font-mono-alt">Por que escolher</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-semibold">{t("landing_testimonials_heading")}</h2>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: "🧠", title: "IA em cada módulo", text: "Geração de questões, correção automática, paciente virtual e tutor de IA — tudo integrado sem configuração extra." },
              { icon: "🔄", title: "Fluxo pedagógico completo", text: "Simulação → SOAP → Reconciliação → Documentação: um ciclo integrado que acompanha o aluno do início ao fim." },
              { icon: "👥", title: "Individual ou em grupo", text: "Aplique avaliações individuais ou em grupo com notas sincronizadas. Ideal para atividades práticas colaborativas." },
            ].map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                whileHover={{ y: -6 }}
                className="group relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-8 backdrop-blur-sm overflow-hidden"
              >
                <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-40 transition-opacity"
                  style={{ background: "#4f46e5" }} />
                <div className="relative">
                  <div className="text-4xl mb-6">{c.icon}</div>
                  <h3 className="font-display text-xl font-semibold mb-3">{c.title}</h3>
                  <p className="text-white/60 leading-relaxed">{c.text}</p>
                  <div className="mt-6 flex gap-1">
                    {[...Array(5)].map((_, s) => (
                      <Star key={s} className="h-3.5 w-3.5 fill-indigo-400 text-indigo-400" />
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-32 overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto max-w-5xl rounded-[2rem] overflow-hidden border border-white/10"
          >
            <div className="absolute inset-0"
              style={{ background: "radial-gradient(120% 100% at 50% 0%, #4f46e5 0%, #1e1e5a 40%, #0a0a1a 100%)" }} />
            <div className="absolute inset-0 landing-grid-bg opacity-30" />
            <div className="absolute inset-0 landing-noise opacity-10 mix-blend-overlay" />

            {/* animated orbs */}
            <motion.div
              animate={{ x: [0, 40, 0], y: [0, -20, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-10 right-10 w-40 h-40 rounded-full blur-3xl opacity-50"
              style={{ background: "#7c74ff" }}
            />
            <motion.div
              animate={{ x: [0, -30, 0], y: [0, 30, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-10 left-10 w-52 h-52 rounded-full blur-3xl opacity-40"
              style={{ background: "#4f46e5" }}
            />

            <div className="relative p-12 md:p-20 text-center">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="text-4xl md:text-6xl font-display font-semibold leading-tight max-w-3xl mx-auto"
              >
                {t("landing_cta_heading")}
              </motion.h2>
              <p className="mt-6 text-white/70 text-lg max-w-xl mx-auto">{t("landing_cta_sub")}</p>
              <Link to="/auth?tab=signup" className="inline-block mt-10">
                <Button
                  size="lg"
                  className="relative overflow-hidden group text-base px-10 py-7 rounded-full border-0 bg-white text-[#0a0a1a] hover:bg-white/90"
                  style={{ boxShadow: "0 20px 60px -20px rgba(255,255,255,0.5)" }}
                >
                  <span className="relative flex items-center gap-2 font-semibold">
                    {t("landing_cta_button")}
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <LandingFooter />
      <SalesAgent />
    </div>
  );
};

export default Index;
