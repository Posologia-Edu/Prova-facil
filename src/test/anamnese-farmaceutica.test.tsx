import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import FormRenderer from "@/components/forms/FormRenderer";
import { FIELD_TYPE_LABELS, tableColumns, tableRowCount, type FormField } from "@/components/forms/types";
import { getNativeTemplates } from "@/lib/form-templates";
import { anamneseFarmaceuticaTemplate } from "@/lib/form-templates/pharmacy-anamnese-farmaceutica";

const saved = vi.hoisted(() => vi.fn());
// jsPDF grava o arquivo no navegador; no teste só registramos a chamada de save.
vi.mock("jspdf", async (importOriginal) => {
  const mod: any = await importOriginal();
  const Real = mod.default;
  class Fake extends Real {
    constructor(...a: any[]) { super(...a); (this as any).save = (...x: any[]) => saved(...x); }
  }
  return { ...mod, default: Fake };
});

const fields = anamneseFarmaceuticaTemplate.content_json as FormField[];

describe("modelo nativo: formulário de anamnese farmacêutica", () => {
  it("aparece nos nativos da anamnese de Farmácia, antes do modelo antigo", () => {
    const lista = getNativeTemplates("pharmacy", "anamnese");
    expect(lista[0].title).toBe("Formulário de anamnese farmacêutica");
    expect(lista.some((t) => t.title === "Formulário de Anamnese")).toBe(true);
  });

  it("tem as 10 seções do PDF mais o registro de raciocínio, sem ids repetidos", () => {
    const secoes = fields.filter((f) => f.type === "section_header").map((f) => f.label);
    expect(secoes).toHaveLength(11);
    expect(secoes[0]).toMatch(/^1 Identificação/);
    expect(secoes[9]).toMatch(/^10 Avaliação/);
    expect(secoes[10]).toMatch(/raciocínio/i);
    const ids = fields.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("usa só tipos de campo conhecidos e dá opções a escolhas e caixas", () => {
    for (const f of fields) {
      expect(Object.keys(FIELD_TYPE_LABELS)).toContain(f.type);
      if (f.type === "radio" || f.type === "checkbox") expect((f.options || []).length).toBeGreaterThan(1);
    }
  });

  it("tem as 6 tabelas do PDF com o formato certo", () => {
    const tabelas = fields.filter((f) => f.type === "table");
    expect(tabelas).toHaveLength(6);
    const parametros = tabelas.find((t) => t.label === "Parâmetros clínicos")!;
    expect(tableRowCount(parametros)).toBe(9);
    expect(tableColumns(parametros)).toHaveLength(2);
    const meds = tabelas.find((t) => t.label === "Medicamentos em uso")!;
    expect(tableRowCount(meds)).toBe(5);
    expect(tableColumns(meds)).toHaveLength(5);
  });

  it("não vale nota (modelo de registro, não de avaliação)", () => {
    expect(fields.every((f) => !f.max_score)).toBe(true);
  });
});

describe("campo de tabela no FormRenderer", () => {
  const tabela: FormField = {
    id: "t1",
    label: "Plano",
    type: "table",
    table_columns: ["A", "B"],
    table_row_labels: ["PA", "FC"],
    table_row_header: "Parâmetro",
  };

  it("mostra rótulos fixos e grava a matriz ao digitar", () => {
    const onChange = vi.fn();
    render(<FormRenderer fields={[tabela]} answers={{}} onChange={onChange} />);
    expect(screen.getByText("Parâmetro")).toBeTruthy();
    expect(screen.getByText("PA")).toBeTruthy();
    const celula = screen.getByLabelText("FC · B");
    fireEvent.change(celula, { target: { value: "78" } });
    expect(onChange).toHaveBeenCalledWith({ t1: [["", ""], ["", "78"]] });
  });

  it("preserva o que já foi digitado nas outras células", () => {
    const onChange = vi.fn();
    render(<FormRenderer fields={[tabela]} answers={{ t1: [["120", "x"], ["", ""]] }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("FC · A"), { target: { value: "70" } });
    expect(onChange).toHaveBeenCalledWith({ t1: [["120", "x"], ["70", ""]] });
  });

  it("fica somente leitura no modo de visualização", () => {
    render(<FormRenderer fields={[tabela]} answers={{}} onChange={() => {}} readOnly />);
    expect((screen.getByLabelText("PA · A") as HTMLInputElement).disabled).toBe(true);
  });
});

describe("PDF do formulário em branco", () => {
  it("gera o PDF do modelo com as tabelas sem erro", async () => {
    const { exportFormToPDF } = await import("@/lib/form-pdf-export");
    expect(() => exportFormToPDF({ title: "Anamnese farmacêutica", fields })).not.toThrow();
    expect(saved).toHaveBeenCalledTimes(1);
  });
});
