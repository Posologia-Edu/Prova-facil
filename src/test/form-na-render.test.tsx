import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import FormRenderer from "@/components/forms/FormRenderer";
import type { FormField } from "@/components/forms/types";
import { observadorV2Template, professorV2Template } from "@/lib/form-templates/pharmacy-avaliacao-anamnese-v2";

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as any;

describe("Não se aplica nos modelos v2", () => {
  it.each([
    ["observador", observadorV2Template],
    ["professor", professorV2Template],
  ])("%s: cada critério pontuado mostra a caixa", (_n, t) => {
    const fields = t.content_json as FormField[];
    const pontuados = fields.filter((f) => (f.max_score || 0) > 0);
    render(<FormRenderer fields={fields} answers={{}} onChange={() => {}} showScores />);
    expect(screen.getAllByText("Não se aplica a este caso")).toHaveLength(pontuados.length);
  });
});
