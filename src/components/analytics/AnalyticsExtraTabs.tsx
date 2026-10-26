import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ClipboardList, HeartPulse, Stethoscope, UserRound, FileEdit } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchExamsSummary, fetchFormsAnalytics, fetchOsceAnalytics } from "@/lib/analytics-data";

export type AnalyticsTab = "overview" | "exams" | "vp" | "osce" | "forms";

const fmt = (v: number | null) => (v === null ? "—" : `${Math.round(v)}%`);
const toneOf = (v: number | null): StatusTone => (v === null ? "neutral" : v >= 60 ? "ok" : v >= 40 ? "warn" : "bad");

const FORM_EDITOR: Record<string, (id: string) => string> = {
  sct: (id) => `/sct/${id}/edit`,
  kfe: (id) => `/kfe/${id}/edit`,
  sjt: (id) => `/sjt/${id}/edit`,
  progress: (id) => `/progress-test/${id}/edit`,
};

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-5">
      <div className="label-mono">{label}</div>
      <div className="font-heading text-4xl font-medium mt-1">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </Card>
  );
}

function Loading() {
  return <Card className="animate-pulse p-8"><div className="h-5 bg-muted rounded w-1/3" /></Card>;
}

function Empty({ icon: Icon, title, text }: { icon: typeof ClipboardList; title: string; text: string }) {
  return (
    <Card className="flex flex-col items-center justify-center py-14 text-center">
      <Icon className="h-10 w-10 mb-3 text-muted-foreground/40" />
      <p className="font-heading text-lg">{title}</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{text}</p>
    </Card>
  );
}

export function OverviewTab({ classId, onGo }: { classId: string; onGo: (tab: AnalyticsTab) => void }) {
  const exams = useQuery({ queryKey: ["analytics-exams-summary", classId], queryFn: () => fetchExamsSummary(classId) });
  const osce = useQuery({ queryKey: ["analytics-osce", classId], queryFn: () => fetchOsceAnalytics(classId) });
  const forms = useQuery({ queryKey: ["analytics-forms", classId], queryFn: () => fetchFormsAnalytics(classId) });

  const cards = [
    { tab: "exams" as const, icon: FileEdit, label: "Provas online", count: exams.data?.sessions, avg: exams.data?.avgPct ?? null, unit: "envios", loading: exams.isLoading },
    { tab: "osce" as const, icon: Stethoscope, label: "OSCE", count: osce.data?.evaluations, avg: osce.data?.avgPct ?? null, unit: "avaliações", loading: osce.isLoading },
    { tab: "forms" as const, icon: ClipboardList, label: "Formulários", count: forms.data?.sessions, avg: forms.data?.avgPct ?? null, unit: "respostas", loading: forms.isLoading },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-medium">Desempenho por tipo de atividade</h2>
        <p className="text-sm text-muted-foreground mt-1">Média da nota (em %) sobre as avaliações concluídas. Cada aba traz o detalhe da atividade.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.tab} className="p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="label-mono flex items-center gap-2"><c.icon className="h-4 w-4" />{c.label}</span>
              {!c.loading && <StatusBadge tone={toneOf(c.avg)}>{c.count ? "Com dados" : "Sem dados"}</StatusBadge>}
            </div>
            <div className="font-heading text-4xl font-medium">{c.loading ? "…" : fmt(c.avg)}</div>
            <div className="text-xs text-muted-foreground">{c.loading ? "" : `${c.count ?? 0} ${c.unit}`}</div>
            <Button variant="outline" size="sm" className="mt-auto self-start" onClick={() => onGo(c.tab)}>Ver detalhes<ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-5 flex items-center justify-between gap-4">
          <div>
            <span className="label-mono flex items-center gap-2"><UserRound className="h-4 w-4" />Pacientes virtuais</span>
            <p className="text-sm text-muted-foreground mt-2">Notas, transcrições e correção das sessões com pacientes virtuais.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => onGo("vp")}>Abrir<ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button>
        </Card>
        <Card className="p-5 flex items-center justify-between gap-4">
          <div>
            <span className="label-mono flex items-center gap-2"><HeartPulse className="h-4 w-4" />Simulações</span>
            <p className="text-sm text-muted-foreground mt-2">As notas das simulações ficam no agregador de notas.</p>
          </div>
          <Button variant="outline" size="sm" asChild><Link to="/simulations/aggregator">Abrir<ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link></Button>
        </Card>
      </div>
    </div>
  );
}

export function OsceTab({ classId }: { classId: string }) {
  const { data, isLoading } = useQuery({ queryKey: ["analytics-osce", classId], queryFn: () => fetchOsceAnalytics(classId) });
  if (isLoading) return <Loading />;
  if (!data || data.rows.length === 0) {
    return <Empty icon={Stethoscope} title="Sem circuitos OSCE" text={classId === "all" ? "Quando você aplicar um circuito, o desempenho aparece aqui." : "Nenhum circuito foi aplicado a esta turma."} />;
  }
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi label="Avaliações concluídas" value={data.evaluations} />
        <Kpi label="Média geral" value={fmt(data.avgPct)} />
        <Kpi label="Aprovação" value={fmt(data.passRate)} hint="Sem reprovação em item crítico" />
      </div>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Exame</TableHead>
              <TableHead className="text-right">Aplicações</TableHead>
              <TableHead className="text-right">Avaliações</TableHead>
              <TableHead>Média</TableHead>
              <TableHead className="text-right">Reprovações</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((r) => (
              <TableRow key={r.examId}>
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell className="text-right font-mono">{r.circuits}</TableCell>
                <TableCell className="text-right font-mono">{r.evaluations}</TableCell>
                <TableCell><StatusBadge tone={toneOf(r.avgPct)} className="font-mono">{fmt(r.avgPct)}</StatusBadge></TableCell>
                <TableCell className="text-right">{r.failed > 0 ? <StatusBadge tone="bad" className="font-mono">{r.failed}</StatusBadge> : <span className="text-muted-foreground">0</span>}</TableCell>
                <TableCell><Button variant="ghost" size="sm" asChild><Link to={`/osce/${r.examId}/results`}>Resultados</Link></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export function FormsTab({ classId }: { classId: string }) {
  const { data, isLoading } = useQuery({ queryKey: ["analytics-forms", classId], queryFn: () => fetchFormsAnalytics(classId) });
  if (isLoading) return <Loading />;
  if (!data || data.rows.length === 0) {
    return <Empty icon={ClipboardList} title="Sem formulários" text={classId === "all" ? "Crie um SCT, KFE, SJT ou Progress Test para acompanhar as respostas aqui." : "Nenhum formulário está vinculado a esta turma."} />;
  }
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi label="Formulários" value={data.rows.length} />
        <Kpi label="Respostas concluídas" value={data.sessions} />
        <Kpi label="Média geral" value={fmt(data.avgPct)} />
      </div>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Formulário</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Respostas</TableHead>
              <TableHead>Média</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((r) => (
              <TableRow key={`${r.kind}-${r.id}`}>
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell><StatusBadge tone="neutral">{r.label}</StatusBadge></TableCell>
                <TableCell className="text-right font-mono">{r.sessions}</TableCell>
                <TableCell><StatusBadge tone={toneOf(r.avgPct)} className="font-mono">{fmt(r.avgPct)}</StatusBadge></TableCell>
                <TableCell><Button variant="ghost" size="sm" asChild><Link to={FORM_EDITOR[r.kind](r.id)}>Abrir</Link></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <p className="text-xs text-muted-foreground">Mini-CEX e DOPS usam escala de 1 a 9 por domínio e são analisados no próprio editor.</p>
    </div>
  );
}
