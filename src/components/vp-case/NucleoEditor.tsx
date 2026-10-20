import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Achado, ExameFixo, Fato, Medicamento, Nucleo } from "@/lib/vp-case-schema";
import { RowList, StringList, TextField } from "./fields";

type Mut = (fn: (n: Nucleo) => void) => void;

const TIPOS_ACHADO = [
  { value: "documento", label: "Documento" },
  { value: "parametro_clinico", label: "Parâmetro clínico" },
  { value: "sinal_vital", label: "Sinal vital" },
  { value: "exame_fisico", label: "Exame físico" },
];

const num = (v: string) => (v.trim() === "" ? (undefined as unknown as number) : Number(v));

export function NucleoEditor({ nucleo, onChange, disabled }: { nucleo: Nucleo; onChange: Mut; disabled?: boolean }) {
  const idt = nucleo.identidade;
  const v = nucleo.vitais_baseline;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        O núcleo reúne os fatos clínicos do paciente, iguais para todas as profissões. Cada versão só decide <em>quando</em> cada fato é revelado.
      </p>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Identidade</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          <TextField label="Hábitos" value={idt.habitos} disabled={disabled} onChange={(x) => onChange((n) => { n.identidade.habitos = x; })} />
          <TextField label="Histórico familiar" value={idt.historico_familiar} disabled={disabled} onChange={(x) => onChange((n) => { n.identidade.historico_familiar = x; })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Personalidade</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <TextField label="Temperamento" multiline value={nucleo.temperamento} disabled={disabled} onChange={(x) => onChange((n) => { n.temperamento = x; })} />
          <TextField label="Modo de falar" multiline value={nucleo.modo_de_falar} disabled={disabled} onChange={(x) => onChange((n) => { n.modo_de_falar = x; })} />
          <TextField label="Letramento em saúde" multiline value={nucleo.letramento_saude} disabled={disabled} onChange={(x) => onChange((n) => { n.letramento_saude = x; })} />
          <TextField label="Como se sente" multiline value={nucleo.como_se_sente} disabled={disabled} onChange={(x) => onChange((n) => { n.como_se_sente = x; })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Fatos clínicos</CardTitle></CardHeader>
        <CardContent>
          <RowList<Fato>
            label="O que o paciente sabe"
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Medicamentos</CardTitle></CardHeader>
        <CardContent>
          <RowList<Medicamento>
            label="Medicamentos do paciente"
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Achados e exames</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <RowList<Achado>
            label="Achados (cartões)"
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
          <RowList<ExameFixo>
            label="Exames com resultado fixo"
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Sinais vitais</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <TextField label="PA (ex.: 140/90)" value={v.PA} disabled={disabled} onChange={(x) => onChange((n) => { n.vitais_baseline.PA = x; })} />
          <TextField label="FC (bpm)" type="number" value={v.FC} disabled={disabled} onChange={(x) => onChange((n) => { n.vitais_baseline.FC = num(x); })} />
          <TextField label="FR (irpm)" type="number" value={v.FR} disabled={disabled} onChange={(x) => onChange((n) => { n.vitais_baseline.FR = num(x); })} />
          <TextField label="Temperatura (°C)" type="number" value={v.Temp} disabled={disabled} onChange={(x) => onChange((n) => { n.vitais_baseline.Temp = num(x); })} />
          <TextField label="SatO₂ (%)" type="number" value={v.SatO2} disabled={disabled} onChange={(x) => onChange((n) => { n.vitais_baseline.SatO2 = num(x); })} />
          <TextField label="Glicemia (opcional)" type="number" value={v.Glicemia} disabled={disabled} onChange={(x) => onChange((n) => { n.vitais_baseline.Glicemia = x.trim() === "" ? null : Number(x); })} />
          <div className="col-span-2 md:col-span-3">
            <TextField label="Contexto para ajustar os vitais" multiline value={nucleo.contexto_vitais} disabled={disabled} hint="Medicamentos e fatores que mudam os vitais ao longo dos encontros." onChange={(x) => onChange((n) => { n.contexto_vitais = x; })} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Reexporta para uso em listas simples de outras telas.
export { StringList };
