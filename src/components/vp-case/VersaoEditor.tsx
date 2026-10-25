import { StatusBadge } from "@/components/ui/status-badge";
import type { Encontro, Gabarito, GatilhoAchado, Nucleo, Revelacao, Versao } from "@/lib/vp-case-schema";
import { RowList, SelectField, StringList, TextField, type Option } from "./fields";
import { SectionCard, SectionLayout, type SectionDef } from "./SectionLayout";

type Mut = (fn: (v: Versao) => void) => void;

const NIVEIS: Option[] = [
  { value: "espontanea", label: "Fala espontaneamente" },
  { value: "pergunta_aberta", label: "Revela em pergunta aberta" },
  { value: "direta", label: "Só se perguntado diretamente" },
  { value: "vinculo", label: "Só com empatia e vínculo" },
];
const PENALIDADES: Option[] = [
  { value: "0.5", label: "0,5 (dano grave)" },
  { value: "0.3", label: "0,3 (omissão de orientação ou monitorização)" },
];

const IMPORTANCIAS: Option[] = [
  { value: "Essencial", label: "Essencial" },
  { value: "Importante", label: "Importante" },
  { value: "Complementar", label: "Complementar" },
];
const TIPOS_ENCONTRO: Option[] = [
  { value: "anamnese", label: "Anamnese" },
  { value: "discussao_prescritor", label: "Discussão com o prescritor" },
  { value: "retorno", label: "Retorno e acompanhamento" },
  { value: "orientacao", label: "Orientação" },
  { value: "passagem_caso", label: "Passagem de caso" },
];
const INTERLOCUTORES: Option[] = [
  { value: "paciente", label: "Paciente" },
  { value: "cuidador", label: "Cuidador" },
  { value: "prescritor", label: "Prescritor" },
  { value: "equipe", label: "Equipe" },
];

export function VersaoEditor({ versaoKey, versao, nucleo, onChange, disabled }: { versaoKey: string; versao: Versao; nucleo: Nucleo; onChange: Mut; disabled?: boolean }) {
  const fatoOptions: Option[] = nucleo.fatos.map((f) => ({ value: f.id, label: `${f.id} · ${(f.conteudo || "").slice(0, 60)}` }));
  const achadoOptions: Option[] = nucleo.achados.map((a) => ({ value: a.id, label: `${a.id} · ${a.titulo}` }));
  const g = versao.gabarito;
  const setG = (fn: (g: Gabarito) => void) => onChange((v) => fn(v.gabarito));

  const sections: SectionDef[] = [
    { id: "cenario", label: "Cenário" },
    { id: "revelacao", label: "Quando cada fato é revelado", count: versao.revelacao.length },
    { id: "achados", label: "Quando cada achado aparece", count: versao.gatilhos_achados.length },
    { id: "falas", label: "Perguntas, fora do roteiro e dicas" },
    { id: "gabarito", label: "Gabarito", count: g.problemas_esperados.length + g.informacoes_alvo.length || "" },
    { id: "encontros", label: "Encontros", count: versao.encontros.length },
  ];

  return (
    <SectionLayout prefix={`versao-${versaoKey}`} sections={sections}>
      <SectionCard id="cenario" title="Cenário de entrada" defaultOpen>
        <div className="space-y-4">
          <TextField label="Local do atendimento" value={versao.cenario.local} disabled={disabled} hint="Ex.: farmácia comunitária do bairro, consultório da UBS" onChange={(x) => onChange((v) => { v.cenario.local = x; })} />
          <TextField label="Como o paciente trata o profissional" value={versao.cenario.tratamento} disabled={disabled} hint='Ex.: "moço(a)", "doutor(a)", "enfermeiro(a)"' onChange={(x) => onChange((v) => { v.cenario.tratamento = x; })} />
          <TextField label="Por que o paciente veio" multiline rows={4} value={versao.cenario.motivo_da_vinda} disabled={disabled} onChange={(x) => onChange((v) => { v.cenario.motivo_da_vinda = x; })} />
          <TextField label="Fala de abertura" multiline rows={3} value={versao.cenario.abertura} disabled={disabled} hint="A primeira coisa que o paciente diz ao iniciar o 1º encontro." onChange={(x) => onChange((v) => { v.cenario.abertura = x; })} />
        </div>
      </SectionCard>

      <SectionCard id="revelacao" title="Quando cada fato é revelado" count={versao.revelacao.length}>
        <div className="space-y-4">
          <RowList<Revelacao>
            label=""
            hint="Todo fato do núcleo deve ser revelado em algum nível."
            items={versao.revelacao}
            disabled={disabled}
            titleOf={(r) => r.id || "Revelação"}
            newRow={() => ({ id: "", nivel: "direta", quando: "", fala: "" })}
            onChange={(items) => onChange((v) => { v.revelacao = items; })}
            columns={[
              { key: "id", label: "Fato", kind: "select", options: fatoOptions },
              { key: "nivel", label: "Nível", kind: "select", options: NIVEIS },
              { key: "quando", label: "Quando (gatilho)", kind: "area" },
              { key: "fala", label: "Exemplo de fala", kind: "area" },
            ]}
          />
        </div>
      </SectionCard>

      <SectionCard id="achados" title="Quando cada achado é apresentado" count={versao.gatilhos_achados.length}>
        <div className="space-y-4">
          <RowList<GatilhoAchado>
            label=""
            items={versao.gatilhos_achados}
            disabled={disabled}
            titleOf={(r) => r.achado || "Gatilho"}
            newRow={() => ({ achado: "", quando: "" })}
            onChange={(items) => onChange((v) => { v.gatilhos_achados = items; })}
            columns={[
              { key: "achado", label: "Achado", kind: "select", options: achadoOptions },
              { key: "quando", label: "Quando", kind: "area" },
            ]}
          />
        </div>
      </SectionCard>

      <SectionCard id="falas" title="Perguntas, fora do roteiro e dicas de atuação">
        <div className="space-y-4">
          <StringList label="Perguntas que o paciente pode fazer" items={versao.perguntas_do_paciente} disabled={disabled} onChange={(items) => onChange((v) => { v.perguntas_do_paciente = items; })} />
          <StringList label="Se perguntarem algo fora do roteiro" items={versao.fora_do_roteiro} disabled={disabled} onChange={(items) => onChange((v) => { v.fora_do_roteiro = items; })} />
          <StringList label="Dicas de atuação" items={versao.dicas_de_atuacao} disabled={disabled} onChange={(items) => onChange((v) => { v.dicas_de_atuacao = items; })} />
        </div>
      </SectionCard>

      <SectionCard id="encontros" title="Encontros" count={versao.encontros.length} defaultOpen>
        <div className="space-y-4">
          {versao.encontros.map((e, i) => (
            <EncontroCard key={e.numero} encontro={e} disabled={disabled} onChange={(fn) => onChange((v) => fn(v.encontros[i]))} />
          ))}
        </div>
      </SectionCard>

      <SectionCard id="gabarito" title="Gabarito da correção">
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Referência usada pela IA na correção. Condutas alternativas clinicamente válidas não são penalizadas apenas por diferirem daqui.
          </p>
          <RowList<Gabarito["problemas_esperados"][number]>
            label="Problemas esperados"
            items={g.problemas_esperados}
            disabled={disabled}
            titleOf={(r) => r.problema || "Problema"}
            newRow={() => ({ problema: "", tipo: "", justificativa: "" })}
            onChange={(items) => setG((x) => { x.problemas_esperados = items; })}
            columns={[
              { key: "problema", label: "Problema", kind: "area" },
              { key: "tipo", label: "Tipo", hint: "Ex.: PRM de segurança; problema de adesão; hipótese diagnóstica; sinal de alerta" },
              { key: "justificativa", label: "Justificativa", kind: "area" },
            ]}
          />
          <RowList<Gabarito["red_flags"][number]>
            label="Red flags"
            items={g.red_flags}
            disabled={disabled}
            titleOf={(r) => r.sinal || "Red flag"}
            newRow={() => ({ sinal: "", conduta_esperada: "" })}
            onChange={(items) => setG((x) => { x.red_flags = items; })}
            columns={[
              { key: "sinal", label: "Sinal", kind: "area" },
              { key: "conduta_esperada", label: "Conduta esperada", kind: "area" },
            ]}
          />
          <RowList<Gabarito["informacoes_alvo"][number]>
            label="Informações alvo"
            hint="O que o aluno deve descobrir na anamnese. Define a cobertura (Essencial pesa 3, Importante 2, Complementar 1)."
            items={g.informacoes_alvo}
            disabled={disabled}
            titleOf={(r) => r.id_informacao || "Informação"}
            newRow={() => ({ id_informacao: "", descricao: "", importancia: "Importante" })}
            onChange={(items) => setG((x) => { x.informacoes_alvo = items; })}
            columns={[
              { key: "id_informacao", label: "Fato", kind: "select", options: fatoOptions },
              { key: "importancia", label: "Importância", kind: "select", options: IMPORTANCIAS },
              { key: "descricao", label: "Descrição", kind: "area" },
            ]}
          />
          <RowList<{ conduta: string; motivo: string; valor: string }>
            label="Penalidades críticas"
            hint="Condutas que valem penalidade de segurança neste caso. A correção usa esta lista (0,5 para dano grave; 0,3 para omissão de orientação ou monitorização). Sem a lista, vale uma tabela genérica de segurança."
            items={(g.penalidades_criticas || []).map((p) => ({ conduta: p.conduta, motivo: p.motivo, valor: String(p.valor) }))}
            disabled={disabled}
            titleOf={(r) => r.conduta || "Conduta crítica"}
            newRow={() => ({ conduta: "", motivo: "", valor: "0.5" })}
            onChange={(items) => setG((x) => { x.penalidades_criticas = items.map((i) => ({ conduta: i.conduta, motivo: i.motivo, valor: Number(i.valor) || 0.5 })); })}
            columns={[
              { key: "conduta", label: "Conduta", kind: "area" },
              { key: "motivo", label: "Motivo (por que é inseguro neste paciente)", kind: "area" },
              { key: "valor", label: "Penalidade", kind: "select", options: PENALIDADES },
            ]}
          />
          <StringList label="Conduta esperada" items={g.conduta_esperada} disabled={disabled} onChange={(items) => setG((x) => { x.conduta_esperada = items; })} />
          <StringList label="Orientações esperadas" items={g.orientacoes_esperadas} disabled={disabled} onChange={(items) => setG((x) => { x.orientacoes_esperadas = items; })} />
          <StringList label="Encaminhamentos" items={g.encaminhamentos} disabled={disabled} onChange={(items) => setG((x) => { x.encaminhamentos = items; })} />
          <StringList label="Objetivos de aprendizagem" items={g.objetivos_aprendizagem} disabled={disabled} onChange={(items) => setG((x) => { x.objetivos_aprendizagem = items; })} />
          <StringList label="Referências" items={g.referencias} disabled={disabled} onChange={(items) => setG((x) => { x.referencias = items; })} />
        </div>
      </SectionCard>
    </SectionLayout>
  );
}

function EncontroCard({ encontro, onChange, disabled }: { encontro: Encontro; onChange: (fn: (e: Encontro) => void) => void; disabled?: boolean }) {
  const persona = encontro.persona_interlocutor;
  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-heading text-base font-medium">{encontro.numero}º encontro</h4>
        <StatusBadge tone="neutral">{TIPOS_ENCONTRO.find((t) => t.value === encontro.tipo)?.label ?? encontro.tipo}</StatusBadge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SelectField label="Tipo" value={encontro.tipo} options={TIPOS_ENCONTRO} disabled={disabled} onChange={(x) => onChange((e) => { e.tipo = x as Encontro["tipo"]; })} />
        <SelectField
          label="Interlocutor"
          value={encontro.interlocutor}
          options={INTERLOCUTORES}
          disabled={disabled}
          onChange={(x) => onChange((e) => {
            e.interlocutor = x as Encontro["interlocutor"];
            if ((x === "prescritor" || x === "equipe") && !e.persona_interlocutor) {
              e.persona_interlocutor = { nome: "", perfil: "", temperamento: "", resistencias: [], criterios_para_ceder: [] };
            }
          })}
        />
      </div>
      <TextField label="Cartão de passagem: cenário" multiline value={encontro.cartao.cenario} disabled={disabled} hint="O que aconteceu desde o último encontro e onde o aluno está." onChange={(x) => onChange((e) => { e.cartao.cenario = x; })} />
      <TextField label="Cartão de passagem: tarefa" multiline value={encontro.cartao.tarefa} disabled={disabled} hint="O que o aluno vai fazer, sem listar os passos." onChange={(x) => onChange((e) => { e.cartao.tarefa = x; })} />
      <TextField
        label="Tempo sugerido (minutos)"
        type="number"
        value={encontro.cartao.tempo_min != null ? String(encontro.cartao.tempo_min) : ""}
        disabled={disabled}
        hint="Opcional. Sem valor, a sala usa 15, 10 e 10 minutos nos encontros 1, 2 e 3. É só uma referência: o cronômetro não bloqueia nada."
        onChange={(x) => onChange((e) => {
          const n = Number(x);
          e.cartao.tempo_min = x.trim() !== "" && Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
        })}
      />

      {(encontro.interlocutor === "prescritor" || encontro.interlocutor === "equipe") && persona && (
        <div className="rounded-md border bg-background p-3 space-y-3">
          <p className="text-sm font-medium">Persona do interlocutor (prescritor ou equipe)</p>
          <TextField label="Nome" value={persona.nome} disabled={disabled} onChange={(x) => onChange((e) => { e.persona_interlocutor!.nome = x; })} />
          <TextField label="Perfil" multiline value={persona.perfil} disabled={disabled} onChange={(x) => onChange((e) => { e.persona_interlocutor!.perfil = x; })} />
          <TextField label="Temperamento" multiline value={persona.temperamento} disabled={disabled} onChange={(x) => onChange((e) => { e.persona_interlocutor!.temperamento = x; })} />
          <StringList label="Resistências" items={persona.resistencias} disabled={disabled} onChange={(items) => onChange((e) => { e.persona_interlocutor!.resistencias = items; })} />
          <StringList label="Critérios para ceder" items={persona.criterios_para_ceder} disabled={disabled} onChange={(items) => onChange((e) => { e.persona_interlocutor!.criterios_para_ceder = items; })} />
        </div>
      )}

      {encontro.numero > 1 && (
        <div className="space-y-3">
          <RowList<NonNullable<Encontro["evolucao"]>[number]>
            label="Evolução do paciente conforme o que foi implementado"
            hint="O ramo vale conforme o que foi efetivamente aceito/implementado, nunca aparece no cartão do aluno."
            items={encontro.evolucao || []}
            disabled={disabled}
            titleOf={(r) => (r.quando ? `Se ${r.quando}`.slice(0, 70) : "Evolução")}
            newRow={() => ({ quando: "", paciente_relata: "" })}
            onChange={(items) => onChange((e) => { e.evolucao = items; })}
            columns={[
              { key: "quando", label: "Quando", kind: "area" },
              { key: "paciente_relata", label: "O paciente relata", kind: "area" },
            ]}
          />
          <TextField label="Se nada foi implementado" multiline value={encontro.evolucao_sem_mudanca} disabled={disabled} onChange={(x) => onChange((e) => { e.evolucao_sem_mudanca = x; })} />
        </div>
      )}
    </div>
  );
}
