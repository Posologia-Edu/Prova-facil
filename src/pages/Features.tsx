import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LandingFooter } from "@/components/LandingFooter";
import {
  GraduationCap, ArrowLeft, ArrowRight, Brain, FileText, BookOpen,
  BarChart3, Users, Calendar, Shield, MonitorPlay, Shuffle,
  Download, Zap, CheckCircle, Globe
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Geração de Questões com IA",
    description: "Crie questões automaticamente a partir de temas, textos ou documentos usando inteligência artificial avançada. Escolha o tipo (múltipla escolha, V/F, dissertativa), dificuldade e taxonomia de Bloom. Economize horas de trabalho na elaboração de avaliações.",
    highlights: ["Múltiplos tipos de questão", "Taxonomia de Bloom automática", "Personalização de dificuldade"],
  },
  {
    icon: FileText,
    title: "Compositor Visual de Provas",
    description: "Monte provas completas com um editor visual intuitivo. Arraste questões do banco, organize em seções, configure cabeçalhos personalizados com logo da instituição, instruções e campos do aluno. Tudo pronto para impressão ou aplicação online.",
    highlights: ["Drag & drop de questões", "Cabeçalho personalizado", "Organização por seções"],
  },
  {
    icon: BookOpen,
    title: "Banco de Questões Inteligente",
    description: "Armazene, organize e reutilize suas questões com filtros avançados por tipo, dificuldade, tags e nível de Bloom. Importe questões via CSV/JSON e nunca perca uma questão bem elaborada.",
    highlights: ["Filtros avançados", "Importação CSV/JSON", "Tags e categorias"],
  },
  {
    icon: MonitorPlay,
    title: "Provas Online com Monitoramento",
    description: "Publique provas online com código de acesso, controle de tempo e monitoramento em tempo real. Acompanhe o progresso dos alunos durante a aplicação e receba as respostas automaticamente.",
    highlights: ["Código de acesso seguro", "Timer configurável", "Monitoramento ao vivo"],
  },
  {
    icon: BarChart3,
    title: "Análises e Relatórios Detalhados",
    description: "Visualize o desempenho dos alunos com gráficos de distribuição de notas, taxa de aprovação, questões mais erradas e tendências ao longo do tempo. Tome decisões pedagógicas baseadas em dados reais.",
    highlights: ["Distribuição de notas", "Taxa de aprovação", "Questões mais erradas"],
  },
  {
    icon: Users,
    title: "Gestão de Turmas e Alunos",
    description: "Crie turmas, cadastre alunos e associe provas a classes específicas. Gerencie listas de alunos com nome, e-mail e matrícula. Ideal para professores com múltiplas disciplinas.",
    highlights: ["Múltiplas turmas", "Cadastro de alunos", "Associação com provas"],
  },
  {
    icon: Download,
    title: "Exportação em PDF Profissional",
    description: "Exporte suas provas em PDF com layout profissional, pronto para impressão. Inclui cabeçalho institucional, numeração automática, gabarito separado e formatação tipográfica elegante.",
    highlights: ["Layout profissional", "Gabarito automático", "Pronto para impressão"],
  },
  {
    icon: Calendar,
    title: "Calendário de Provas",
    description: "Visualize todas as suas provas publicadas em um calendário interativo. Planeje avaliações, evite conflitos de datas e tenha uma visão geral do semestre letivo.",
    highlights: ["Visão mensal", "Provas publicadas", "Planejamento semestral"],
  },
  {
    icon: Shield,
    title: "Segurança e Privacidade",
    description: "Seus dados e questões são protegidos com criptografia, controle de acesso por função (professor/admin) e políticas rigorosas de segurança. Cada professor só acessa seus próprios dados.",
    highlights: ["Criptografia de dados", "Controle por função", "Isolamento de dados"],
  },
];

export default function Features() {
  return (
    <div className="min-h-screen bg-background">
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
                Criar Conta Grátis
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-12 bg-muted/40">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground mb-4">
            <Zap className="h-4 w-4 text-secondary" />
            Tudo que você precisa para criar provas
          </div>
          <h1 className="text-4xl font-extrabold text-foreground md:text-5xl">
            Funcionalidades do <span className="text-secondary">ProvaFácil</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Conheça todas as ferramentas que vão transformar a forma como você cria, aplica e corrige avaliações.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-6xl space-y-12">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`flex flex-col gap-6 rounded-2xl border bg-card p-8 md:flex-row md:items-center ${
                index % 2 === 1 ? "md:flex-row-reverse" : ""
              }`}
            >
              <div className="flex-shrink-0 flex items-center justify-center">
                <div className="rounded-2xl bg-secondary/10 p-6">
                  <feature.icon className="h-12 w-12 text-secondary" />
                </div>
              </div>
              <div className="flex-1 space-y-4">
                <h2 className="text-2xl font-bold text-foreground">{feature.title}</h2>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                <div className="flex flex-wrap gap-2">
                  {feature.highlights.map((h) => (
                    <span
                      key={h}
                      className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary"
                    >
                      <CheckCircle className="h-3 w-3" />
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl rounded-2xl bg-primary p-10 md:p-14 text-center">
            <h2 className="text-3xl font-bold text-primary-foreground md:text-4xl">
              Pronto para simplificar suas provas?
            </h2>
            <p className="mt-4 text-primary-foreground/80 text-lg">
              Crie sua conta gratuitamente e comece a usar todas as funcionalidades agora mesmo.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth?tab=signup">
                <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 gap-2 text-base px-8 py-6">
                  Criar Conta Grátis
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="text-base px-8 py-6 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                  Já tenho conta — Entrar
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
