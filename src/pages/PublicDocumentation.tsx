import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LandingFooter } from "@/components/LandingFooter";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  GraduationCap, ArrowLeft, ArrowRight, BookOpen, Brain, FileText, BarChart3,
  Users, Calendar, Shield, Zap, HelpCircle, MonitorPlay,
  LayoutTemplate, Download, CreditCard, Search
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";

export default function PublicDocumentation() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");

  const sections = [
    { id: "getting-started", icon: Zap, title: t("docs_getting_started"), content: t("docs_getting_started_content") },
    { id: "question-bank", icon: BookOpen, title: t("docs_question_bank"), content: t("docs_question_bank_content") },
    { id: "ai-generation", icon: Brain, title: t("docs_ai_generation"), content: t("docs_ai_generation_content") },
    { id: "composer", icon: FileText, title: t("docs_composer"), content: t("docs_composer_content") },
    { id: "templates", icon: LayoutTemplate, title: t("docs_templates"), content: t("docs_templates_content") },
    { id: "export-pdf", icon: Download, title: t("docs_export_pdf"), content: t("docs_export_pdf_content") },
    { id: "online-exams", icon: MonitorPlay, title: t("docs_online_exams"), content: t("docs_online_exams_content") },
    { id: "classes", icon: Users, title: t("docs_classes"), content: t("docs_classes_content") },
    { id: "analytics", icon: BarChart3, title: t("docs_analytics"), content: t("docs_analytics_content") },
    { id: "calendar", icon: Calendar, title: t("docs_calendar"), content: t("docs_calendar_content") },
    { id: "student-portal", icon: GraduationCap, title: t("docs_student_portal"), content: t("docs_student_portal_content") },
    { id: "plans", icon: CreditCard, title: t("docs_plans"), content: t("docs_plans_content") },
    { id: "security", icon: Shield, title: t("docs_security"), content: t("docs_security_content") },
  ];

  const faqs = [
    { q: t("docs_faq_q1"), a: t("docs_faq_a1") },
    { q: t("docs_faq_q2"), a: t("docs_faq_a2") },
    { q: t("docs_faq_q3"), a: t("docs_faq_a3") },
    { q: t("docs_faq_q4"), a: t("docs_faq_a4") },
    { q: t("docs_faq_q5"), a: t("docs_faq_a5") },
  ];

  const filteredSections = useMemo(() => {
    if (!search.trim()) return sections;
    const q = search.toLowerCase();
    return sections.filter(
      (s) => s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)
    );
  }, [search, sections]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-card/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-secondary" />
            <span className="text-xl font-bold text-foreground">ProvaFácil</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Início
              </Button>
            </Link>
            <Link to="/auth?tab=signup">
              <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                Criar Conta
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-12 bg-muted/40">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground mb-4">
            <BookOpen className="h-4 w-4 text-secondary" />
            {t("docs_badge")}
          </div>
          <h1 className="text-4xl font-extrabold text-foreground md:text-5xl">{t("docs_title")}</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">{t("docs_subtitle")}</p>

          {/* Search */}
          <div className="mt-8 max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar na documentação..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </section>

      {/* Quick Nav */}
      {!search && (
        <section className="py-8 border-b">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap gap-2 justify-center">
              {sections.map((s) => (
                <a key={s.id} href={`#${s.id}`}>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <s.icon className="h-3.5 w-3.5" />
                    {s.title}
                  </Button>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sections */}
      <section className="py-12 flex-1">
        <div className="container mx-auto px-4 max-w-4xl space-y-12">
          {filteredSections.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-4 opacity-40" />
              <p>Nenhum resultado encontrado para "{search}"</p>
            </div>
          )}
          {filteredSections.map((s) => (
            <div key={s.id} id={s.id} className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-lg bg-secondary/10 p-2.5">
                  <s.icon className="h-5 w-5 text-secondary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">{s.title}</h2>
              </div>
              <div className="rounded-xl border bg-card p-6 text-muted-foreground leading-relaxed whitespace-pre-line text-sm">
                {s.content}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 bg-muted/40">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <HelpCircle className="h-6 w-6 text-secondary" />
            <h2 className="text-2xl font-bold text-foreground">{t("docs_faq_title")}</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border rounded-xl bg-card px-4">
                <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Pronto para começar?</h2>
          <p className="text-muted-foreground mb-6">Crie sua conta gratuitamente e explore todas as funcionalidades.</p>
          <Link to="/auth?tab=signup">
            <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 gap-2">
              Criar Conta Grátis
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
