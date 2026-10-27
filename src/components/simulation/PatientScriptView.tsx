import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import ClinicalCaseContent from "@/components/ClinicalCaseContent";
import { ACHADO_TIPO_LABEL, NIVEL_SELO, isPatientRoteiro, type PatientRoteiro } from "@/lib/vp-patient-roteiro";
import { NIVEIS, type NivelRevelacao } from "@/lib/vp-case-schema";

const NIVEL_TONE: Record<NivelRevelacao, StatusTone> = {
  espontanea: "ok",
  pergunta_aberta: "info",
  direta: "warn",
  vinculo: "bad",
};

const Secao = ({ titulo, children }: { titulo: string; children: ReactNode }) => (
  <section className="space-y-3">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">{titulo}</h3>
    {children}
  </section>
);

const Lista = ({ itens }: { itens: string[] }) => (
  <ul className="list-disc space-y-1.5 pl-5 text-sm">
    {itens.map((t, i) => <li key={i}>{t}</li>)}
  </ul>
);

/** Como funciona o papel de paciente padronizado: orientação ao colega que vai representar o caso. */
export function PatientScriptGuide({ local }: { local?: string }) {
  return (
    <Card className="space-y-3 p-5 text-sm">
      <p className="font-heading text-base font-medium">Como funciona</p>
      <p>
        Você será o <strong>paciente</strong>. Um colega farmacêutico vai atendê-lo{local ? <> em: <em>{local}</em></> : null}.
      </p>
      <p>O colega <strong>não conhece o caso</strong>. Ele precisa descobrir tudo pelas perguntas.</p>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>Responda como o paciente, com as palavras dele.</li>
        <li>Só revele cada informação quando a pergunta certa aparecer.</li>
        <li>Informe os cartões de achados só quando ele pedir ou aferir.</li>
        <li>Observe <em>como</em> ele pergunta: é isso que você está aprendendo.</li>
      </ul>
    </Card>
  );
}

function RoteiroConteudo({ roteiro: r, showGuide }: { roteiro: PatientRoteiro; showGuide: boolean }) {
  const id = r.identidade;
  const resumo = [
    `${id.nome} (${id.idade} anos, ${id.sexo.toLowerCase()}, ${id.ocupacao})`,
    [id.estado_civil, id.moradia].filter(Boolean).join(". "),
    id.escolaridade ? `Escolaridade: ${id.escolaridade}.` : "",
  ].filter(Boolean);
  const extras = [
    id.alergias ? `Alergias: ${id.alergias}` : "",
    id.habitos ? `Hábitos: ${id.habitos}` : "",
    id.historico_familiar ? `Histórico familiar: ${id.historico_familiar}` : "",
  ].filter(Boolean);
  const fatosPorNivel = NIVEIS.map((n) => ({ nivel: n, itens: r.fatos.filter((f) => f.nivel === n) })).filter((g) => g.itens.length);

  return (
    <div className="space-y-6">
      {showGuide && <PatientScriptGuide local={r.local} />}
      <Card className="space-y-8 p-6">
        <Secao titulo="Quem você é">
          <p className="text-sm"><strong>{resumo[0]}</strong>{resumo.slice(1).map((t) => ` ${t}`).join("")}</p>
          {extras.length > 0 && <p className="text-sm text-muted-foreground">{extras.join(" · ")}</p>}
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            {[["Temperamento", r.temperamento], ["Modo de falar", r.modo_de_falar], ["Letramento em saúde", r.letramento_saude]].map(([k, v]) => (
              <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="mt-0.5">{v}</dd></div>
            ))}
          </dl>
        </Secao>

        <Secao titulo="Por que você veio">
          <p className="text-sm text-muted-foreground">Local: {r.local}.</p>
          <p className="text-sm">{r.motivo_da_vinda}</p>
          <blockquote className="rounded-md border-l-4 border-success bg-success-soft px-4 py-3 text-sm italic">
            <span className="not-italic text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fala sugerida de abertura</span>
            <span className="mt-1 block">“{r.abertura}”</span>
          </blockquote>
          <p className="text-sm text-muted-foreground">Você trata o profissional por “{r.tratamento}”.</p>
        </Secao>

        <Secao titulo="O que você sabe (e quando contar)">
          <div className="flex flex-wrap gap-2">
            {NIVEIS.map((n) => <StatusBadge key={n} tone={NIVEL_TONE[n]}>{NIVEL_SELO[n]}</StatusBadge>)}
          </div>
          <div className="space-y-3">
            {fatosPorNivel.flatMap((g) => g.itens).map((f) => (
              <div key={f.id} className="space-y-1.5 rounded-lg border bg-card p-4 text-sm print:break-inside-avoid">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={NIVEL_TONE[f.nivel]}>{NIVEL_SELO[f.nivel]}</StatusBadge>
                  <span className="text-xs text-muted-foreground">{f.id} · {f.categoria}</span>
                </div>
                <p>{f.conteudo}</p>
                <p className="text-muted-foreground"><strong>Quando:</strong> {f.quando}</p>
                <p className="italic">“{f.fala}”</p>
              </div>
            ))}
          </div>
        </Secao>

        {r.medicamentos.length > 0 && (
          <Secao titulo="Seus medicamentos">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Como você chama</th>
                    <th className="py-2 pr-3 font-medium">Prescrito</th>
                    <th className="py-2 pr-3 font-medium">Como você realmente usa</th>
                    <th className="py-2 font-medium">Para que acha que serve</th>
                  </tr>
                </thead>
                <tbody>
                  {r.medicamentos.map((m, i) => (
                    <tr key={i} className="border-b align-top last:border-0 print:break-inside-avoid">
                      <td className="py-2.5 pr-3 font-medium">{m.como_chama}</td>
                      <td className="py-2.5 pr-3">{m.prescrito}</td>
                      <td className="py-2.5 pr-3">{m.uso_real}</td>
                      <td className="py-2.5">{m.acha_que_serve}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Secao>
        )}

        {r.achados.length > 0 && (
          <Secao titulo="Cartões de achados (só informe quando pedirem)">
            <div className="grid gap-3 sm:grid-cols-2">
              {r.achados.map((a, i) => (
                <div key={i} className="space-y-1 rounded-lg border border-dashed bg-sunken p-4 text-sm print:break-inside-avoid">
                  <p className="text-xs text-muted-foreground">{ACHADO_TIPO_LABEL[a.tipo]}</p>
                  <p className="font-medium">{a.titulo}: <span className="text-primary">{a.conteudo}</span></p>
                  <p className="text-xs text-muted-foreground">{a.quando}</p>
                </div>
              ))}
            </div>
          </Secao>
        )}

        <Secao titulo="Como você se sente">
          <p className="text-sm">{r.como_se_sente}</p>
          {r.perguntas_do_paciente.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Perguntas que você pode fazer:</p>
              <Lista itens={r.perguntas_do_paciente} />
            </div>
          )}
        </Secao>

        {r.fora_do_roteiro.length > 0 && <Secao titulo="Se perguntarem algo fora do roteiro"><Lista itens={r.fora_do_roteiro} /></Secao>}
        {r.dicas_de_atuacao.length > 0 && <Secao titulo="Dicas de atuação"><Lista itens={r.dicas_de_atuacao} /></Secao>}
      </Card>
    </div>
  );
}

/**
 * Roteiro do paciente padronizado, com o botão de impressão.
 * Ao imprimir, uma cópia do roteiro é desenhada direto no body (fora do layout do app, que tem áreas com rolagem e altura
 * fixa que cortariam o papel) e o resto da página fica escondido pelo CSS de impressão. O tema escuro é desligado durante
 * a impressão, para sair em fundo branco.
 */
export default function PatientScriptView({ roteiro, showGuide = false, className }: { roteiro: PatientRoteiro; showGuide?: boolean; className?: string }) {
  const [imprimindo, setImprimindo] = useState(false);

  useEffect(() => {
    if (!imprimindo) return;
    const html = document.documentElement;
    const tinhaEscuro = html.classList.contains("dark");
    const aoTerminar = () => setImprimindo(false);
    window.addEventListener("afterprint", aoTerminar);
    document.body.classList.add("imprimindo-roteiro");
    html.classList.remove("dark");
    const t = window.setTimeout(() => window.print(), 150); // dá tempo de a cópia ser desenhada
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("afterprint", aoTerminar);
      document.body.classList.remove("imprimindo-roteiro");
      if (tinhaEscuro) html.classList.add("dark");
    };
  }, [imprimindo]);

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => setImprimindo(true)} disabled={imprimindo}>
          <Printer className="h-4 w-4" />Imprimir ou salvar em PDF
        </Button>
      </div>
      <RoteiroConteudo roteiro={roteiro} showGuide={showGuide} />
      {imprimindo && createPortal(
        <div className="roteiro-print-root"><RoteiroConteudo roteiro={roteiro} showGuide /></div>,
        document.body,
      )}
    </div>
  );
}

/** Um caso do roteiro da simulação: mostra o roteiro estruturado (importado de paciente virtual) ou o texto simples. */
export function CaseScriptContent({ caseItem, showGuide = false }: { caseItem: { script: string; roteiro?: unknown }; showGuide?: boolean }) {
  if (isPatientRoteiro(caseItem.roteiro)) return <PatientScriptView roteiro={caseItem.roteiro} showGuide={showGuide} />;
  return <ClinicalCaseContent content={caseItem.script} />;
}
