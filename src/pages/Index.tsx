import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, Brain, FileText, BarChart3, Shield, Zap, 
  CheckCircle, ArrowRight, Star, Users, GraduationCap, Globe
} from "lucide-react";
import { useLanguage, LANGUAGE_FLAGS, LANGUAGE_LABELS, type Language } from "@/i18n/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Index = () => {
  const { t, language, setLanguage } = useLanguage();
  const languages: Language[] = ["pt", "en", "es"];

  const features = [
    { icon: Brain, title: t("landing_feat_ai_title"), description: t("landing_feat_ai_desc") },
    { icon: FileText, title: t("landing_feat_wysiwyg_title"), description: t("landing_feat_wysiwyg_desc") },
    { icon: BookOpen, title: t("landing_feat_bank_title"), description: t("landing_feat_bank_desc") },
    { icon: BarChart3, title: t("landing_feat_analytics_title"), description: t("landing_feat_analytics_desc") },
    { icon: Shield, title: t("landing_feat_security_title"), description: t("landing_feat_security_desc") },
    { icon: Zap, title: t("landing_feat_fast_title"), description: t("landing_feat_fast_desc") },
  ];

  const stats = [
    { value: "10.000+", label: t("landing_stats_questions") },
    { value: "2.500+", label: t("landing_stats_teachers") },
    { value: "80%", label: t("landing_stats_time") },
    { value: "4.9/5", label: t("landing_stats_rating") },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-card/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-secondary" />
            <span className="text-xl font-bold text-foreground">ProvaFácil</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Globe className="h-4 w-4" />
                  {LANGUAGE_FLAGS[language]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {languages.map((lang) => (
                  <DropdownMenuItem key={lang} onClick={() => setLanguage(lang)} className={language === lang ? "bg-accent" : ""}>
                    {LANGUAGE_FLAGS[lang]} {LANGUAGE_LABELS[lang]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/student/auth">
              <Button variant="outline" size="sm">
                <GraduationCap className="h-4 w-4 mr-1.5" />
                {t("auth_student")}
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                {t("landing_enter")}
              </Button>
            </Link>
            <Link to="/auth?tab=signup">
              <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                {t("landing_create_free")}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        </div>
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground mb-6">
            <Zap className="h-4 w-4 text-secondary" />
            {t("landing_ai_badge")}
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            {t("landing_hero_title_1")}<span className="text-secondary">{t("landing_hero_title_2")}</span>{t("landing_hero_title_3")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            {t("landing_hero_subtitle")}
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link to="/auth?tab=signup">
              <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 gap-2 text-base px-8 py-6 shadow-lg">
                {t("landing_start_free")}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="text-base px-8 py-6">
                {t("landing_see_features")}
              </Button>
            </a>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-6 sm:grid-cols-4 mx-auto max-w-3xl">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-muted/40">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">{t("landing_features_heading")}</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">{t("landing_features_sub")}</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {features.map((f) => (
              <div key={f.title} className="group rounded-xl border bg-card p-6 transition-all hover:shadow-lg hover:border-secondary/40">
                <div className="mb-4 inline-flex rounded-lg bg-secondary/10 p-3">
                  <f.icon className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">{t("landing_how_heading")}</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
            {[
              { step: "1", title: t("landing_step1_title"), desc: t("landing_step1_desc") },
              { step: "2", title: t("landing_step2_title"), desc: t("landing_step2_desc") },
              { step: "3", title: t("landing_step3_title"), desc: t("landing_step3_desc") },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-muted/40">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">{t("landing_testimonials_heading")}</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {[
              { name: "Profa. Maria Santos", role: "Medicina — UFMG", text: "Reduzi de 6 horas para 45 minutos o tempo de criação das minhas provas." },
              { name: "Prof. Carlos Lima", role: "Engenharia — USP", text: "O banco de questões com Bloom's Taxonomy mudou minha forma de avaliar." },
              { name: "Profa. Ana Oliveira", role: "Biologia — UNICAMP", text: "A funcionalidade de importar questões e o compositor visual são incríveis." },
            ].map((testimonial) => (
              <div key={testimonial.name} className="rounded-xl border bg-card p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-secondary text-secondary" />
                  ))}
                </div>
                <p className="text-foreground text-sm mb-4 italic">"{testimonial.text}"</p>
                <div>
                  <div className="font-semibold text-foreground text-sm">{testimonial.name}</div>
                  <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl rounded-2xl bg-primary p-10 md:p-14 text-center">
            <h2 className="text-3xl font-bold text-primary-foreground md:text-4xl">{t("landing_cta_heading")}</h2>
            <p className="mt-4 text-primary-foreground/80 text-lg">{t("landing_cta_sub")}</p>
            <Link to="/auth?tab=signup">
              <Button size="lg" className="mt-8 bg-secondary text-secondary-foreground hover:bg-secondary/90 gap-2 text-base px-8 py-6 shadow-lg">
                {t("landing_cta_button")}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10">
        <div className="container mx-auto px-4 flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-secondary" />
            <span className="font-semibold text-foreground">ProvaFácil</span>
          </div>
          <p className="text-sm text-muted-foreground">{t("landing_footer")}</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
