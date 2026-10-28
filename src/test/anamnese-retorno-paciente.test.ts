import { describe, expect, it } from "vitest";
import type { FormField } from "@/components/forms/types";
import { observadorV2Template } from "@/lib/form-templates/pharmacy-avaliacao-anamnese-v2";
import { LABEL_OBS_PACIENTE, LABEL_SEGUIU_ROTEIRO } from "@/lib/form-templates/pharmacy-avaliacao-anamnese-v2";
import { montarRetornos, retornoDaRodada } from "@/lib/anamnese-retorno-paciente";

const fields = observadorV2Template.content_json as FormField[];
const idDe = (rotulo: string) => fields.find((f) => f.label === rotulo)!.id;

describe("retorno ao aluno-paciente", () => {
  it("o modelo do observador tem os dois campos de retorno", () => {
    expect(idDe(LABEL_SEGUIU_ROTEIRO)).toBeTruthy();
    expect(idDe(LABEL_OBS_PACIENTE)).toBeTruthy();
  });

  it("lê só os dois campos e ignora vazios", () => {
    expect(retornoDaRodada(fields, {})).toBeNull();
    expect(retornoDaRodada(fields, { [idDe(LABEL_OBS_PACIENTE)]: "   " })).toBeNull();
    expect(retornoDaRodada(fields, { [idDe(LABEL_SEGUIU_ROTEIRO)]: "Seguiu em parte", _feedback: "x" })).toEqual({
      seguiu_roteiro: "Seguiu em parte",
      observacoes: undefined,
    });
  });

  it("agrupa por e-mail do paciente e ordena as rodadas", () => {
    const resp = (txt: string) => ({ [idDe(LABEL_OBS_PACIENTE)]: txt });
    const itens = montarRetornos([
      { round_number: 3, patient: { email: "Ana@x.com", name: "Ana" }, observerFields: fields, observerAnswers: resp("c") },
      { round_number: 1, patient: { email: "ana@x.com", name: "Ana" }, observerFields: fields, observerAnswers: resp("a") },
      { round_number: 2, patient: { email: "bia@x.com", name: "Bia" }, observerFields: fields, observerAnswers: {} },
      { round_number: 4, patient: { email: null, name: "Sem e-mail" }, observerFields: fields, observerAnswers: resp("d") },
    ]);
    expect(itens).toHaveLength(1);
    expect(itens[0].email).toBe("ana@x.com");
    expect(itens[0].rodadas.map((r) => r.rodada)).toEqual([1, 3]);
  });
});
