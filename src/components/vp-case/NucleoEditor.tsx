import type { ReactNode } from "react";
import type { Achado, ExameFixo, Fato, Medicamento, Nucleo } from "@/lib/vp-case-schema";
import { RowList, StringList, TextField } from "./fields";
import { SectionCard, SectionLayout, type SectionDef } from "./SectionLayout";

type Mut = (fn: (n: Nucleo) => void) => void;

const TIPOS_ACHADO = [
  { value: "documento", label: "Documento" },
  { value: "parametro_clinico", label: "Parâmetro clínico" },
  { value: "sinal_vital", label: "Sinal vital" },
  { value: "exame_fisico", label: "Exame físico" },
];

const num = (v: string) => (v.trim() === "" ? (undefined as unknown as number) : Number(v));

interface Props {
  nucleo: Nucleo;
  onChange: Mut;
  disabled?: boolean;
  /** seção extra no topo (a revisão de consistência), com a entrada correspondente no índice lateral */
  topo?: { section: SectionDef; node: ReactNode };
}

export function NucleoEditor({ nucleo, onChange, disabled, topo }: Props) {
  const idt = nucleo.identidade;
  const v = nucleo.vitais_baseline;
  const sections: SectionDef[] = [
    ...(topo ? [topo.section] : []),
    { id: "identidade", label: "Identidade" },
    { id: "personalidade", label: "Personalidade" },
    { id: "fatos", label: "O que o paciente sabe", count: nucleo.fatos.length },
    { id: "medicamentos", label: "Medicamentos", count: nucleo.medicamentos.length },
    { id: "achados", label: "Achados", count: nucleo.achados.length },
    { id: "exames", label: "Exames", count: nucleo.exames.length },
    { id: "vitais", label: "Vitais de base" },
  ];
  return (
    <SectionLayout prefix="nucleo" sections={sections}>
      <p className="text-sm text-muted-foreground">
        O núcleo reúne os fatos clínicos do paciente, iguais para todas as profissões. Cada versão só decide <em>quando</em> cada fato é revelado.
      </p>

      {topo?.node}

      <SectionCard id="identidade" title="Identidade" count="12 campos" defaultOpen>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <TextField label="Nome" value={idt.nome} disabled={disabled} onChange={(x) => onChange((n) => { n.identidade.nome = x; })} />
          <TextField label="Idade" type="number" value={idt.idade} disabled={disabled} onChange={(x) => onChange((n) => { n.identidade.idade = num(x); })} />
          <TextField label="Sexo" value={idt.sexo} disabled={disabled} onChange={(x) => onChange((n) => { n.identidade.sexo = x; })} />
          <TextField label="Ocupação" value={idt.ocupacao} disabled={disabled} onChange={(x) => onChange((n) => { n.identidade.ocupacao = x; })} />
          <TextField label="Estado civil" value={idt.estado_civil} disabled={disabled} onChange={(x) => onChange((n) => { n.identidade.estado_civil = x; })} />
          <TextField label="Moradia" value={idt.moradia} disabled={disabled} onChange={(x) => onChange((n) => { n.identidade.moradia = x; })} />
          <TextField label="Escolaridade" value={idt.escolaridade} disabled={disabled} onChange={(x) => onChange((n) => { n.identidade.escolaridade = x; })} />
          <TextField label="Alergias" value={idt.alergias} disabled={disabled} onChange={(x) => onChange((n) => { n.identidade.alergias = x; })} />
          <TextField label="Peso (kg)" type="number" value={idt.peso_kg} disabled={disabled} onChange={(x) => onChange((n) => { n.identidade.peso_kg = num(x); })} />
          <TextField label="Altura (m)" type="number" value={idt.altura_m} disabled={disabled} onChange={(x) => onChange((n) => { n.identidade.altura_m = num(x); })} />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <TextField label="Hábitos" multiline rows={2} value={idt.habitos} disabled={disabled} onChange={(x) => onChange((n) => { n.identidade.habitos = x; })} />
          <TextField label="Histórico familiar" multiline rows={2} value={idt.historico_familiar} disabled={disabled} onChange={(x) => onChange((n) => { n.identidade.historico_familiar = x; })} />
        </div>
      </SectionCard>

      <SectionCard id="personalidade" title="Personalidade" count="4 campos">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <TextField label="Temperamento" multiline value={nucleo.temperamento} disabled={disabled} onChange={(x) => onChange((n) => { n.temperamento = x; })} />
          <TextField label="Modo de falar" multiline value={nucleo.modo_de_falar} disabled={disabled} onChange={(x) => onChange((n) => { n.modo_de_falar = x; })} />
          <TextField label="Letramento em saúde" multiline value={nucleo.letramento_saude} disabled={disabled} onChange={(x) => onChange((n) => { n.letramento_saude = x; })} />
          <TextField label="Como se sente" multiline value={nucleo.como_se_sente} disabled={disabled} onChange={(x) => onChange((n) => { n.como_se_sente = x; })} />
        </div>
      </SectionCard>

      <SectionCard id="fatos" title="O que o paciente sabe" count={`${nucleo.fatos.length} fatos`}>
        <RowList<Fato>
          label=""
          hint="Cada fato tem um id (I1, I2…). As versões e o gabarito se referem a eles."
          items={nucleo.fatos}
          disabled={disabled}
          titleOf={(r) => r.id || "Fato"}
          newRow={() => ({ id: `I${nucleo.fatos.length + 1}`, categoria: "", conteudo: "" })}
          onChange={(items) => onChange((n) => { n.fatos = items; })}
          columns={[
            { key: "id", label: "Id" },
            { key: "categoria", label: "Categoria", hint: "Ex.: queixa e sintomas, medicamentos, adesao, automedicacao e fitoterapicos" },
            { key: "conteudo", label: "Conteúdo", kind: "area" },
          ]}
        />
      </SectionCard>

      <SectionCard id="medicamentos" title="Medicamentos" count={nucleo.medicamentos.length}>
        <RowList<Medicamento>
          label=""
          items={nucleo.medicamentos}
          disabled={disabled}
          titleOf={(r) => r.como_chama || "Medicamento"}
          newRow={() => ({ como_chama: "", prescrito: "", uso_real: "", acha_que_serve: "", observacao_clinica: "" })}
          onChange={(items) => onChange((n) => { n.medicamentos = items; })}
          columns={[
            { key: "como_chama", label: "Como o paciente chama" },
            { key: "prescrito", label: "Prescrito" },
            { key: "uso_real", label: "Como realmente usa" },
            { key: "acha_que_serve", label: "Para que acha que serve" },
            { key: "observacao_clinica", label: "Observação clínica (o paciente não diz)", kind: "area" },
          ]}
        />
      </SectionCard>

      <SectionCard id="achados" title="Achados" count={`${nucleo.achados.length} cartões`}>
        <RowList<Achado>
          label=""
          hint="Documentos, parâmetros e exame físico. Só aparecem quando o aluno pedir (o gatilho é definido em cada versão)."
          items={nucleo.achados}
          disabled={disabled}
          titleOf={(r) => `${r.id || "Achado"} · ${r.titulo || ""}`}
          newRow={() => ({ id: `A${nucleo.achados.length + 1}`, tipo: "documento", titulo: "", conteudo: "" })}
          onChange={(items) => onChange((n) => { n.achados = items; })}
          columns={[
            { key: "id", label: "Id" },
            { key: "tipo", label: "Tipo", kind: "select", options: TIPOS_ACHADO },
            { key: "titulo", label: "Título", wide: true },
            { key: "conteudo", label: "Conteúdo", kind: "area" },
          ]}
        />
      </SectionCard>

      <SectionCard id="exames" title="Exames com resultado fixo" count={nucleo.exames.length}>
        <RowList<ExameFixo>
          label=""
          hint="Exames não listados aqui são inventados uma vez e repetidos idênticos se pedidos de novo."
          items={nucleo.exames}
          disabled={disabled}
          titleOf={(r) => r.nome || "Exame"}
          newRow={() => ({ nome: "", resultado: "", referencia: "" })}
          onChange={(items) => onChange((n) => { n.exames = items; })}
          columns={[
            { key: "nome", label: "Exame" },
            { key: "resultado", label: "Resultado" },
            { key: "referencia", label: "Valor de referência" },
          ]}
        />
      </SectionCard>

      <SectionCard id="vitais" title="Vitais de base" count="6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <TextField label="PA (ex.: 140/90)" value={v.PA} disabled={disabled} onChange={(x) => onChange((n) => { n.vitais_baseline.PA = x; })} />
          <TextField label="FC (bpm)" type="number" value={v.FC} disabled={disabled} onChange={(x) => onChange((n) => { n.vitais_baseline.FC = num(x); })} />
          <TextField label="FR (irpm)" type="number" value={v.FR} disabled={disabled} onChange={(x) => onChange((n) => { n.vitais_baseline.FR = num(x); })} />
          <TextField label="Temperatura (°C)" type="number" value={v.Temp} disabled={disabled} onChange={(x) => onChange((n) => { n.vitais_baseline.Temp = num(x); })} />
          <TextField label="SatO₂ (%)" type="number" value={v.SatO2} disabled={disabled} onChange={(x) => onChange((n) => { n.vitais_baseline.SatO2 = num(x); })} />
          <TextField label="Glicemia (opcional)" type="number" value={v.Glicemia} disabled={disabled} onChange={(x) => onChange((n) => { n.vitais_baseline.Glicemia = x.trim() === "" ? null : Number(x); })} />
          <div className="col-span-2 md:col-span-3">
            <TextField label="Contexto para ajustar os vitais" multiline value={nucleo.contexto_vitais} disabled={disabled} hint="Medicamentos e fatores que mudam os vitais ao longo dos encontros." onChange={(x) => onChange((n) => { n.contexto_vitais = x; })} />
          </div>
        </div>
      </SectionCard>
    </SectionLayout>
  );
}

// Reexporta para uso em listas simples de outras telas.
export { StringList };
