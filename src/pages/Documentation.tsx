import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LandingFooter } from "@/components/LandingFooter";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  GraduationCap, ArrowLeft, BookOpen, Brain, FileText, BarChart3,
  Users, Calendar, Shield, Zap, HelpCircle, Settings, Upload,
  Download, Eye, Shuffle, LayoutTemplate, Globe, CreditCard,
  MonitorPlay, CheckCircle, Search, Stethoscope, Store, Bot,
  Code, Server, Database, Plug, Lock, CloudCog, HardDrive, Radio
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Documentation = () => {
  const { t } = useLanguage();

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
    { id: "osce", icon: Stethoscope, title: t("docs_osce"), content: t("docs_osce_content") },
    { id: "marketplace", icon: Store, title: t("docs_marketplace"), content: t("docs_marketplace_content") },
    { id: "ai-tutor", icon: Bot, title: t("docs_ai_tutor"), content: t("docs_ai_tutor_content") },
    { id: "plans", icon: CreditCard, title: t("docs_plans"), content: t("docs_plans_content") },
    { id: "security", icon: Shield, title: t("docs_security"), content: t("docs_security_content") },
  ];

  const techSections = [
    { id: "tech-stack", icon: Code, title: t("docs_tech_stack"), content: t("docs_tech_stack_content") },
    { id: "tech-architecture", icon: Server, title: t("docs_tech_architecture"), content: t("docs_tech_architecture_content") },
    { id: "tech-database", icon: Database, title: t("docs_tech_database"), content: t("docs_tech_database_content") },
    { id: "tech-api", icon: Plug, title: t("docs_tech_api"), content: t("docs_tech_api_content") },
    { id: "tech-auth", icon: Lock, title: t("docs_tech_auth"), content: t("docs_tech_auth_content") },
    { id: "tech-edge-functions", icon: CloudCog, title: t("docs_tech_edge_functions"), content: t("docs_tech_edge_functions_content") },
    { id: "tech-storage", icon: HardDrive, title: t("docs_tech_storage"), content: t("docs_tech_storage_content") },
    { id: "tech-realtime", icon: Radio, title: t("docs_tech_realtime"), content: t("docs_tech_realtime_content") },
  ];

  const faqs = [
    { q: t("docs_faq_q1"), a: t("docs_faq_a1") },
    { q: t("docs_faq_q2"), a: t("docs_faq_a2") },
    { q: t("docs_faq_q3"), a: t("docs_faq_a3") },
    { q: t("docs_faq_q4"), a: t("docs_faq_a4") },
    { q: t("docs_faq_q5"), a: t("docs_faq_a5") },
    { q: t("docs_faq_q6"), a: t("docs_faq_a6") },
  ];

  const renderSections = (items: typeof sections) => (
    <div className="space-y-12">
      {items.map((s) => (
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
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-card/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-secondary" />
            <span className="text-xl font-bold text-foreground">ProvaFácil</span>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              {t("docs_back_home")}
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-12 bg-muted/40">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground mb-4">
            <BookOpen className="h-4 w-4 text-secondary" />
            {t("docs_badge")}
          </div>
          <h1 className="text-4xl font-extrabold text-foreground md:text-5xl">
            {t("docs_title")}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("docs_subtitle")}
          </p>
        </div>
      </section>

      {/* Tabs: Features vs Technical */}
      <section className="py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Tabs defaultValue="features" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="features" className="gap-2">
                <BookOpen className="h-4 w-4" />
                {t("docs_title")}
              </TabsTrigger>
              <TabsTrigger value="technical" className="gap-2">
                <Code className="h-4 w-4" />
                {t("docs_tech_header")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="features">
              {/* Quick Nav - Features */}
              <div className="flex flex-wrap gap-2 justify-center mb-10 pb-8 border-b">
                {sections.map((s) => (
                  <a key={s.id} href={`#${s.id}`}>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      <s.icon className="h-3.5 w-3.5" />
                      {s.title}
                    </Button>
                  </a>
                ))}
              </div>
              {renderSections(sections)}
            </TabsContent>

            <TabsContent value="technical">
              {/* Tech Header */}
              <div className="text-center mb-8 pb-8 border-b">
                <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground mb-3">
                  <Server className="h-4 w-4 text-secondary" />
                  {t("docs_tech_header")}
                </div>
                <p className="text-muted-foreground text-sm max-w-xl mx-auto">
                  {t("docs_tech_header_subtitle")}
                </p>
              </div>

              {/* Quick Nav - Technical */}
              <div className="flex flex-wrap gap-2 justify-center mb-10 pb-8 border-b">
                {techSections.map((s) => (
                  <a key={s.id} href={`#${s.id}`}>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      <s.icon className="h-3.5 w-3.5" />
                      {s.title}
                    </Button>
                  </a>
                ))}
              </div>
              {renderSections(techSections)}
            </TabsContent>
          </Tabs>
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

      <LandingFooter />
    </div>
  );
};

export default Documentation;
