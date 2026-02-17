import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Stethoscope,
  Scale,
  Cog,
  FlaskConical,
  BookOpen,
  Calculator,
  Brain,
  Laptop,
  Search,
  ArrowRight,
  Clock,
  FileText,
} from "lucide-react";

export interface TemplateQuestion {
  title: string;
  type: "multiple_choice" | "true_false" | "open_ended" | "matching";
  points: number;
}

export interface TemplateSection {
  name: string;
  questions: TemplateQuestion[];
}

export interface ExamTemplate {
  id: string;
  name: string;
  discipline: string;
  icon: React.ReactNode;
  description: string;
  duration: string;
  totalPoints: number;
  sections: TemplateSection[];
  tags: string[];
}

const TEMPLATES: ExamTemplate[] = [
  {
    id: "medicina-farmacologia",
    name: "Farmacologia — Prova Parcial",
    discipline: "Medicina",
    icon: <Stethoscope className="h-5 w-5" />,
    description: "Mecanismos de ação, farmacocinética e interações medicamentosas.",
    duration: "120 min",
    totalPoints: 40,
    tags: ["Farmacologia", "Parcial"],
    sections: [
      {
        name: "Parte I: Múltipla Escolha",
        questions: [
          { title: "Qual o principal mecanismo de ação dos inibidores da ECA?", type: "multiple_choice", points: 2 },
          { title: "Qual neurotransmissor é principalmente afetado pelos ISRSs?", type: "multiple_choice", points: 2 },
          { title: "Qual classe de antibióticos atua na subunidade 30S do ribossomo?", type: "multiple_choice", points: 2 },
          { title: "Qual é o antídoto para intoxicação por paracetamol?", type: "multiple_choice", points: 2 },
          { title: "Qual medicamento é considerado padrão-ouro para tratamento da epilepsia parcial?", type: "multiple_choice", points: 2 },
        ],
      },
      {
        name: "Parte II: Verdadeiro ou Falso",
        questions: [
          { title: "A aspirina inibe irreversivelmente as enzimas COX-1 e COX-2.", type: "true_false", points: 1 },
          { title: "A heparina pode ser administrada por via oral.", type: "true_false", points: 1 },
          { title: "Os benzodiazepínicos atuam potencializando o GABA.", type: "true_false", points: 1 },
          { title: "A metformina é uma sulfonilureia.", type: "true_false", points: 1 },
          { title: "Os AINEs podem causar lesão renal em uso prolongado.", type: "true_false", points: 1 },
        ],
      },
      {
        name: "Parte III: Dissertativas",
        questions: [
          { title: "Explique as diferenças farmacocinéticas entre varfarina e heparina.", type: "open_ended", points: 8 },
          { title: "Discuta o papel do sistema enzimático CYP450 no metabolismo de fármacos.", type: "open_ended", points: 8 },
          { title: "Compare os mecanismos de ação dos beta-bloqueadores seletivos e não-seletivos.", type: "open_ended", points: 9 },
        ],
      },
    ],
  },
  {
    id: "medicina-anatomia",
    name: "Anatomia Humana — Avaliação Final",
    discipline: "Medicina",
    icon: <Stethoscope className="h-5 w-5" />,
    description: "Anatomia sistêmica e topográfica com questões práticas.",
    duration: "150 min",
    totalPoints: 50,
    tags: ["Anatomia", "Final"],
    sections: [
      {
        name: "Parte I: Múltipla Escolha",
        questions: [
          { title: "Qual músculo é o principal flexor do antebraço?", type: "multiple_choice", points: 2 },
          { title: "Qual artéria irriga predominantemente o ventrículo esquerdo?", type: "multiple_choice", points: 2 },
          { title: "Qual nervo é responsável pela inervação do diafragma?", type: "multiple_choice", points: 2 },
          { title: "Onde se localiza o triângulo de Scarpa?", type: "multiple_choice", points: 2 },
          { title: "Qual estrutura passa pelo forame magno?", type: "multiple_choice", points: 2 },
        ],
      },
      {
        name: "Parte II: Associação",
        questions: [
          { title: "Associe os nervos cranianos às suas funções.", type: "matching", points: 5 },
          { title: "Associe os músculos do manguito rotador às suas ações.", type: "matching", points: 5 },
        ],
      },
      {
        name: "Parte III: Dissertativas",
        questions: [
          { title: "Descreva a vascularização do coração, incluindo artérias coronárias e suas principais ramificações.", type: "open_ended", points: 10 },
          { title: "Explique a anatomia do plexo braquial e suas implicações clínicas.", type: "open_ended", points: 10 },
          { title: "Descreva o trajeto do nervo vago e seus ramos principais.", type: "open_ended", points: 10 },
        ],
      },
    ],
  },
  {
    id: "direito-constitucional",
    name: "Direito Constitucional — Prova Bimestral",
    discipline: "Direito",
    icon: <Scale className="h-5 w-5" />,
    description: "Princípios fundamentais, direitos e garantias, e organização do Estado.",
    duration: "120 min",
    totalPoints: 40,
    tags: ["Constitucional", "Bimestral"],
    sections: [
      {
        name: "Parte I: Múltipla Escolha",
        questions: [
          { title: "Qual o fundamento da República Federativa do Brasil que trata da dignidade?", type: "multiple_choice", points: 2 },
          { title: "Quais são os poderes da União conforme a CF/88?", type: "multiple_choice", points: 2 },
          { title: "O que é uma cláusula pétrea?", type: "multiple_choice", points: 2 },
          { title: "Qual a diferença entre emenda constitucional e lei complementar?", type: "multiple_choice", points: 2 },
          { title: "O mandado de segurança coletivo pode ser impetrado por quem?", type: "multiple_choice", points: 2 },
        ],
      },
      {
        name: "Parte II: Verdadeiro ou Falso",
        questions: [
          { title: "O STF é o guardião da Constituição Federal.", type: "true_false", points: 1 },
          { title: "Tratados internacionais sempre têm status de emenda constitucional.", type: "true_false", points: 1 },
          { title: "A ação popular pode ser ajuizada por pessoa jurídica.", type: "true_false", points: 1 },
          { title: "O habeas corpus é cabível contra punição disciplinar militar.", type: "true_false", points: 1 },
        ],
      },
      {
        name: "Parte III: Dissertativas",
        questions: [
          { title: "Analise o princípio da separação dos poderes e sua aplicação no sistema brasileiro.", type: "open_ended", points: 8 },
          { title: "Discorra sobre o controle de constitucionalidade difuso e concentrado no Brasil.", type: "open_ended", points: 8 },
          { title: "Explique a eficácia dos direitos fundamentais nas relações privadas.", type: "open_ended", points: 8 },
        ],
      },
    ],
  },
  {
    id: "engenharia-resistencia",
    name: "Resistência dos Materiais — Prova Parcial",
    discipline: "Engenharia",
    icon: <Cog className="h-5 w-5" />,
    description: "Tensão, deformação, flexão e torção em elementos estruturais.",
    duration: "120 min",
    totalPoints: 40,
    tags: ["Resistência", "Materiais"],
    sections: [
      {
        name: "Parte I: Múltipla Escolha",
        questions: [
          { title: "Qual a definição de tensão normal em um corpo sujeito a carga axial?", type: "multiple_choice", points: 2 },
          { title: "O que é o módulo de Young?", type: "multiple_choice", points: 2 },
          { title: "Qual o tipo de esforço predominante em uma viga biapoiada com carga concentrada no centro?", type: "multiple_choice", points: 2 },
          { title: "O que é o coeficiente de Poisson?", type: "multiple_choice", points: 2 },
        ],
      },
      {
        name: "Parte II: Verdadeiro ou Falso",
        questions: [
          { title: "A Lei de Hooke é válida apenas no regime elástico.", type: "true_false", points: 1 },
          { title: "O momento fletor é máximo onde o esforço cortante é nulo.", type: "true_false", points: 1 },
          { title: "Aço e concreto têm o mesmo módulo de elasticidade.", type: "true_false", points: 1 },
        ],
      },
      {
        name: "Parte III: Problemas",
        questions: [
          { title: "Calcule a tensão normal em uma barra de aço de seção circular com diâmetro de 20mm, submetida a uma carga axial de 50kN.", type: "open_ended", points: 8 },
          { title: "Determine o diagrama de momento fletor de uma viga engastada com carga uniformemente distribuída.", type: "open_ended", points: 10 },
          { title: "Calcule o ângulo de torção de um eixo circular submetido a torque de 500 N·m.", type: "open_ended", points: 10 },
        ],
      },
    ],
  },
  {
    id: "ciencias-quimica",
    name: "Química Geral — Avaliação Parcial",
    discipline: "Ciências",
    icon: <FlaskConical className="h-5 w-5" />,
    description: "Estequiometria, ligações químicas e reações.",
    duration: "90 min",
    totalPoints: 30,
    tags: ["Química", "Geral"],
    sections: [
      {
        name: "Parte I: Múltipla Escolha",
        questions: [
          { title: "Qual a diferença entre ligação iônica e covalente?", type: "multiple_choice", points: 2 },
          { title: "Quantos mols de CO₂ são produzidos na combustão completa de 1 mol de CH₄?", type: "multiple_choice", points: 2 },
          { title: "Qual o número de oxidação do Mn no KMnO₄?", type: "multiple_choice", points: 2 },
          { title: "O que é uma reação de neutralização?", type: "multiple_choice", points: 2 },
        ],
      },
      {
        name: "Parte II: Verdadeiro ou Falso",
        questions: [
          { title: "A massa molar da água é 18 g/mol.", type: "true_false", points: 1 },
          { title: "Gases nobres formam ligações covalentes facilmente.", type: "true_false", points: 1 },
          { title: "O pH de uma solução neutra a 25°C é 7.", type: "true_false", points: 1 },
        ],
      },
      {
        name: "Parte III: Dissertativas",
        questions: [
          { title: "Balanceie a equação da combustão do etanol e calcule a massa de CO₂ produzida pela queima de 46g de etanol.", type: "open_ended", points: 7 },
          { title: "Explique o conceito de eletronegatividade e sua influência na polaridade das moléculas.", type: "open_ended", points: 5 },
          { title: "Descreva o modelo atômico de Bohr e suas limitações.", type: "open_ended", points: 6 },
        ],
      },
    ],
  },
  {
    id: "pedagogia-didatica",
    name: "Didática e Prática de Ensino — Prova Parcial",
    discipline: "Pedagogia",
    icon: <BookOpen className="h-5 w-5" />,
    description: "Planejamento pedagógico, metodologias ativas e avaliação.",
    duration: "90 min",
    totalPoints: 30,
    tags: ["Didática", "Pedagogia"],
    sections: [
      {
        name: "Parte I: Múltipla Escolha",
        questions: [
          { title: "Qual a principal contribuição de Paulo Freire para a educação?", type: "multiple_choice", points: 2 },
          { title: "O que são metodologias ativas de aprendizagem?", type: "multiple_choice", points: 2 },
          { title: "Qual a diferença entre avaliação formativa e somativa?", type: "multiple_choice", points: 2 },
        ],
      },
      {
        name: "Parte II: Dissertativas",
        questions: [
          { title: "Elabore um plano de aula para uma turma do 5º ano sobre frações, utilizando metodologia ativa.", type: "open_ended", points: 8 },
          { title: "Discuta os desafios da educação inclusiva no contexto brasileiro atual.", type: "open_ended", points: 8 },
          { title: "Analise a importância do planejamento pedagógico para o processo de ensino-aprendizagem.", type: "open_ended", points: 8 },
        ],
      },
    ],
  },
  {
    id: "exatas-calculo",
    name: "Cálculo I — Prova Parcial",
    discipline: "Exatas",
    icon: <Calculator className="h-5 w-5" />,
    description: "Limites, derivadas e aplicações em funções de uma variável.",
    duration: "120 min",
    totalPoints: 40,
    tags: ["Cálculo", "Derivadas"],
    sections: [
      {
        name: "Parte I: Múltipla Escolha",
        questions: [
          { title: "Qual o limite de (sen x)/x quando x tende a 0?", type: "multiple_choice", points: 2 },
          { title: "Qual a derivada de f(x) = ln(x²+1)?", type: "multiple_choice", points: 2 },
          { title: "Quando uma função é contínua em um ponto?", type: "multiple_choice", points: 2 },
          { title: "Qual a regra da cadeia aplicada a f(g(x))?", type: "multiple_choice", points: 2 },
        ],
      },
      {
        name: "Parte II: Problemas",
        questions: [
          { title: "Calcule a derivada de f(x) = (3x² + 2x)·e^x usando a regra do produto.", type: "open_ended", points: 8 },
          { title: "Encontre os pontos críticos e classifique-os para f(x) = x³ - 6x² + 9x + 1.", type: "open_ended", points: 10 },
          { title: "Determine os intervalos de crescimento e decrescimento de f(x) = x⁴ - 4x³.", type: "open_ended", points: 8 },
          { title: "Calcule a área sob a curva f(x) = x² entre x=0 e x=3 usando somas de Riemann.", type: "open_ended", points: 6 },
        ],
      },
    ],
  },
  {
    id: "psicologia-desenvolvimento",
    name: "Psicologia do Desenvolvimento — Avaliação",
    discipline: "Psicologia",
    icon: <Brain className="h-5 w-5" />,
    description: "Teorias do desenvolvimento humano: Piaget, Vygotsky e Erikson.",
    duration: "90 min",
    totalPoints: 30,
    tags: ["Desenvolvimento", "Piaget"],
    sections: [
      {
        name: "Parte I: Múltipla Escolha",
        questions: [
          { title: "Quais são os estágios do desenvolvimento cognitivo segundo Piaget?", type: "multiple_choice", points: 2 },
          { title: "O que é a Zona de Desenvolvimento Proximal de Vygotsky?", type: "multiple_choice", points: 2 },
          { title: "Qual a crise psicossocial da adolescência segundo Erikson?", type: "multiple_choice", points: 2 },
        ],
      },
      {
        name: "Parte II: Verdadeiro ou Falso",
        questions: [
          { title: "Piaget defende que o desenvolvimento cognitivo é linear e contínuo.", type: "true_false", points: 1 },
          { title: "Para Vygotsky, a linguagem precede o pensamento.", type: "true_false", points: 1 },
          { title: "A teoria do apego de Bowlby se aplica apenas à infância.", type: "true_false", points: 1 },
        ],
      },
      {
        name: "Parte III: Dissertativas",
        questions: [
          { title: "Compare as abordagens de Piaget e Vygotsky sobre o papel da interação social no desenvolvimento.", type: "open_ended", points: 7 },
          { title: "Analise os estágios psicossociais de Erikson e sua aplicação na prática clínica.", type: "open_ended", points: 7 },
          { title: "Discuta a relevância das teorias do apego para a compreensão do desenvolvimento infantil.", type: "open_ended", points: 7 },
        ],
      },
    ],
  },
  {
    id: "computacao-estrutura",
    name: "Estrutura de Dados — Prova Parcial",
    discipline: "Computação",
    icon: <Laptop className="h-5 w-5" />,
    description: "Listas, pilhas, filas, árvores e complexidade algorítmica.",
    duration: "120 min",
    totalPoints: 40,
    tags: ["Algoritmos", "Estruturas"],
    sections: [
      {
        name: "Parte I: Múltipla Escolha",
        questions: [
          { title: "Qual a complexidade de busca em uma árvore binária de busca balanceada?", type: "multiple_choice", points: 2 },
          { title: "Qual estrutura de dados utiliza o princípio FIFO?", type: "multiple_choice", points: 2 },
          { title: "Qual a diferença entre uma lista encadeada simples e duplamente encadeada?", type: "multiple_choice", points: 2 },
          { title: "O que é uma tabela hash e qual sua complexidade média de acesso?", type: "multiple_choice", points: 2 },
        ],
      },
      {
        name: "Parte II: Verdadeiro ou Falso",
        questions: [
          { title: "A complexidade do QuickSort no pior caso é O(n²).", type: "true_false", points: 1 },
          { title: "Uma pilha permite inserção e remoção em ambas as extremidades.", type: "true_false", points: 1 },
          { title: "Árvores AVL são sempre balanceadas.", type: "true_false", points: 1 },
        ],
      },
      {
        name: "Parte III: Problemas",
        questions: [
          { title: "Implemente em pseudocódigo um algoritmo de busca em largura (BFS) em um grafo.", type: "open_ended", points: 10 },
          { title: "Explique o funcionamento do algoritmo MergeSort e analise sua complexidade temporal e espacial.", type: "open_ended", points: 9 },
          { title: "Projete uma estrutura de dados para um sistema de filas de prioridade e descreva suas operações.", type: "open_ended", points: 10 },
        ],
      },
    ],
  },
];

const DISCIPLINES = [...new Set(TEMPLATES.map((t) => t.discipline))];

interface ExamTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: ExamTemplate) => void;
}

export default function ExamTemplatesDialog({
  open,
  onOpenChange,
  onSelectTemplate,
}: ExamTemplatesDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedDiscipline, setSelectedDiscipline] = useState<string | null>(null);

  const filtered = TEMPLATES.filter((t) => {
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.discipline.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));
    const matchesDiscipline = !selectedDiscipline || t.discipline === selectedDiscipline;
    return matchesSearch && matchesDiscipline;
  });

  const handleSelect = (template: ExamTemplate) => {
    onSelectTemplate(template);
    onOpenChange(false);
    setSearch("");
    setSelectedDiscipline(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Templates de Prova por Disciplina
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar template..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Discipline filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedDiscipline === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDiscipline(null)}
              className="text-xs h-7"
            >
              Todos
            </Button>
            {DISCIPLINES.map((d) => (
              <Button
                key={d}
                variant={selectedDiscipline === d ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDiscipline(d === selectedDiscipline ? null : d)}
                className="text-xs h-7"
              >
                {d}
              </Button>
            ))}
          </div>

          {/* Template list */}
          <div className="flex-1 overflow-auto space-y-3 pr-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum template encontrado.
              </p>
            ) : (
              filtered.map((t) => {
                const totalQuestions = t.sections.reduce((s, sec) => s + sec.questions.length, 0);
                return (
                  <Card
                    key={t.id}
                    className="p-4 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
                    onClick={() => handleSelect(t)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                        {t.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold truncate">{t.name}</h3>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <Badge variant="secondary" className="text-[10px]">
                            {t.discipline}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {t.duration}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {totalQuestions} questões
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {t.totalPoints} pts
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {t.sections.length} seções
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
