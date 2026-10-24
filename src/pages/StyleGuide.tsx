import { useEffect, useState } from "react";
import { Moon, Plus, Sparkles, Sun } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { ScoreRing } from "@/components/ui/score-ring";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsListLine, TabsTrigger, TabsTriggerLine } from "@/components/ui/tabs";
import { DebriefCardView, type Debrief } from "@/components/vp-room/DebriefCard";

const DEBRIEF_EXEMPLO: Debrief = {
  available: true,
  obtidas_disponivel: true,
  cobertura: 0.46,
  informacoes: [
    { id: "I1", descricao: "Tramadol 50 mg escalonado para 6 a 8 cápsulas por dia, por perda de eficácia.", importancia: "Essencial", obtida: true },
    { id: "I2", descricao: "Sertralina 50 mg ao dia há 2 anos, para depressão.", importancia: "Essencial", obtida: false },
    { id: "I3", descricao: "Mioclonias e episódios de apagão rápido na última semana.", importancia: "Essencial", obtida: false },
    { id: "I4", descricao: "Antecedente de osteoartrite há 5 anos e hipertensão há 10 anos.", importancia: "Importante", obtida: true },
    { id: "I5", descricao: "Sedentarismo por limitação dolorosa crônica, sem uso de álcool ou tabaco.", importancia: "Complementar", obtida: false },
  ],
  problemas: [
    { problema: "Síndrome serotoninérgica por interação tramadol + sertralina", tipo: "Segurança", justificativa: "A associação em doses crescentes eleva o risco de toxicidade serotoninérgica." },
  ],
  red_flags: [{ sinal: "Agitação, tremor e sudorese", conduta_esperada: "Suspender o tramadol e encaminhar ao serviço de urgência" }],
  objetivos_aprendizagem: ["Reconhecer sinais de toxicidade serotoninérgica", "Revisar a lista completa de medicamentos"],
};

const CORES: Array<[string, string, string]> = [
  ["Marinho · primary", "bg-primary", "Botão principal, menu"],
  ["Âmbar · highlight", "bg-highlight", "Destaque único (nos dois temas)"],
  ["Papel · background", "bg-background border", "Fundo da página"],
  ["Superfície · card", "bg-card border", "Cartões e painéis"],
  ["Rebaixado · sunken", "bg-sunken border", "Cabeçalhos de tabela"],
  ["Linha · border", "bg-border", "Divisórias"],
];

// Página interna de referência do sistema visual. Não aparece no menu; serve para conferir tokens e componentes
// nos dois temas antes de aplicá-los às telas.
export default function StyleGuide() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark") || new URLSearchParams(window.location.search).get("tema") === "escuro");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl space-y-12 px-4 py-10 md:px-8">
        <PageHeader
          eyebrow="Sistema visual"
          title="Guia de estilo"
          description="Tokens, tipografia e componentes do redesign. Tudo que aparece aqui é o que as telas passam a usar."
          actions={
            <>
              <Button variant="outline" onClick={() => setDark((d) => !d)}>
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {dark ? "Tema claro" : "Tema escuro"}
              </Button>
              <Button variant="ai"><Sparkles className="h-4 w-4" />Gerar com IA</Button>
              <Button><Plus className="h-4 w-4" />Nova prova</Button>
            </>
          }
        />

        <section className="space-y-4">
          <p className="eyebrow">Cor</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {CORES.map(([nome, cls, uso]) => (
              <div key={nome} className="overflow-hidden rounded-card border bg-card shadow-elev-1">
                <div className={`h-16 ${cls}`} />
                <div className="p-3 text-sm"><b className="font-medium">{nome}</b><p className="text-xs text-muted-foreground">{uso}</p></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-success-soft p-3 text-sm text-success"><b className="block font-medium">Sucesso</b>Obtido, correto</div>
            <div className="rounded-lg bg-warning-soft p-3 text-sm text-warning-ink"><b className="block font-medium">Atenção</b>Parcial, pendente</div>
            <div className="rounded-lg bg-destructive-soft p-3 text-sm text-destructive"><b className="block font-medium">Crítico</b>Erro, penalidade</div>
            <div className="rounded-lg bg-info-soft p-3 text-sm text-info"><b className="block font-medium">Informação</b>Treino, dica</div>
          </div>
        </section>

        <section className="space-y-4">
          <p className="eyebrow">Tipografia</p>
          <Card>
            <CardContent className="space-y-4 divide-y p-6 [&>*]:pt-4 first:[&>*]:pt-0">
              <div><p className="label-mono mb-2">Display · Fraunces</p><p className="font-heading text-[2.5rem] font-medium leading-none tracking-tight">Pacientes Virtuais</p></div>
              <div><p className="label-mono mb-2">Título · Fraunces</p><p className="font-heading text-[1.75rem] font-medium leading-tight">Caminho esperado do caso</p></div>
              <div><p className="label-mono mb-2">Texto · Geist</p><p className="text-sm leading-relaxed">Compare com o que você fez. Este é o gabarito do caso para a sua profissão, liberado junto com o feedback.</p></div>
              <div><p className="label-mono mb-2">Dados · Geist Mono</p><p className="font-mono text-lg tabular-nums">PA 148/92 mmHg · FC 106 bpm · 37,7 °C</p></div>
              <div><p className="label-mono mb-2">Número em destaque</p><p className="num text-5xl">7,4</p></div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <p className="eyebrow">Botões e selos</p>
          <Card>
            <CardContent className="space-y-5 p-6">
              <div className="flex flex-wrap items-center gap-3">
                <Button>Publicar</Button><Button variant="outline">Salvar rascunho</Button><Button variant="ghost">Cancelar</Button>
                <Button variant="ai"><Sparkles className="h-4 w-4" />Gerar com IA</Button><Button variant="destructive">Excluir</Button>
                <Button size="sm">Pequeno</Button><Button size="lg">Grande</Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="ok" dot>Corrigida</StatusBadge><StatusBadge tone="warn" dot>Pendente</StatusBadge>
                <StatusBadge tone="bad" dot>Crítico</StatusBadge><StatusBadge tone="info">Treino</StatusBadge>
                <StatusBadge tone="brand">Avaliativo</StatusBadge><StatusBadge tone="accent">Ajustada</StatusBadge><StatusBadge>Rascunho</StatusBadge>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <p className="eyebrow">Cartão, anel de progresso e campo</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="overflow-hidden">
              <div className="flex items-center gap-6 bg-gradient-to-br from-brand-soft to-card p-6">
                <ScoreRing value={0.75} size={116} label="7,5" tone="ok" aria-label="Nota 7,5" />
                <div className="space-y-1.5">
                  <p className="eyebrow">Nota final</p>
                  <p className="font-heading text-2xl font-medium leading-tight">Bom atendimento</p>
                  <p className="text-sm text-muted-foreground">Base <b className="font-mono text-foreground">6,80</b> · Eficiência <b className="font-mono text-foreground">+0,70</b></p>
                </div>
              </div>
            </Card>
            <Card>
              <CardHeader><CardTitle>Campo de texto</CardTitle><CardDescription>Foco azul, borda reforçada.</CardDescription></CardHeader>
              <CardContent className="space-y-2"><label className="text-sm font-medium" htmlFor="g1">Título do caso</label><Input id="g1" defaultValue="Hipertensão com baixa adesão" /></CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <p className="eyebrow">Abas e tabela</p>
          <Tabs defaultValue="a" className="space-y-4">
            <TabsListLine><TabsTriggerLine value="a">Atividades</TabsTriggerLine><TabsTriggerLine value="b">Alunos</TabsTriggerLine><TabsTriggerLine value="c">Análises</TabsTriggerLine></TabsListLine>
            <TabsContent value="a" className="mt-0">
              <Card>
                <Table>
                  <TableHeader><TableRow><TableHead>Aluno</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Nota</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
                  <TableBody>
                    <TableRow><TableCell className="font-medium">Ana Beatriz Lima</TableCell><TableCell><StatusBadge tone="info">Treino</StatusBadge></TableCell><TableCell className="text-right font-mono">5,7</TableCell><TableCell><StatusBadge tone="ok" dot>Corrigida</StatusBadge></TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Carlos Eduardo</TableCell><TableCell><StatusBadge tone="brand">Avaliativo</StatusBadge></TableCell><TableCell className="text-right font-mono">7,0</TableCell><TableCell><StatusBadge tone="accent" dot>Ajustada</StatusBadge></TableCell></TableRow>
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
          <Tabs defaultValue="x"><TabsList><TabsTrigger value="x">Segmentado</TabsTrigger><TabsTrigger value="y">Alternativa</TabsTrigger></TabsList></Tabs>
        </section>

        <section className="space-y-4">
          <p className="eyebrow">Tela-piloto · caminho esperado</p>
          <DebriefCardView data={DEBRIEF_EXEMPLO} />
        </section>
      </div>
    </div>
  );
}

// Prévia da estrutura do aplicativo (menu, cabeçalho e área de conteúdo) com uma página de exemplo, sem login.
export function StyleGuideApp() {
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tema") === "escuro") document.documentElement.classList.add("dark");
  }, []);
  return (
    <AppLayout>
      <div className="space-y-8 p-6 md:p-8">
        <PageHeader
          eyebrow="Praticar"
          title="Pacientes Virtuais"
          description="Converse com o paciente para testá-lo. O atendimento real, com avaliação, acontece nas salas com os alunos."
          actions={<><Button variant="outline">Biblioteca de casos</Button><Button variant="ai"><Sparkles className="h-4 w-4" />Gerar paciente</Button></>}
        />
        <div className="grid gap-4 md:grid-cols-3">
          {[["Roberto Mendes", "54 anos · Motorista de aplicativo", "Fácil"], ["Geraldo de Oliveira", "69 anos · Aposentado", "Médio"], ["Luciana Mendes", "34 anos · Professora", "Difícil"]].map(([n, s, d]) => (
            <Card key={n} className="surface-hover">
              <CardHeader><CardTitle className="font-heading text-xl font-medium">{n}</CardTitle><CardDescription>{s}</CardDescription></CardHeader>
              <CardContent className="space-y-4"><StatusBadge tone={d === "Fácil" ? "ok" : d === "Médio" ? "warn" : "bad"}>{d}</StatusBadge><Button className="w-full">Conversar</Button></CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
