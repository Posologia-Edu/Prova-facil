import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import FormAnswersView, { formatAnswerText } from "@/components/forms/FormAnswersView";
import type { FormField } from "@/components/forms/types";

const campos: FormField[] = [
  { id: "s1", label: "3 Parâmetros clínicos", type: "section_header" },
  { id: "t1", label: "Parâmetros", type: "table", table_columns: ["Resultado", "Condições"], table_row_labels: ["PA", "FC", "Glicemia"], table_row_header: "Parâmetro" },
  { id: "c1", label: "Eventos", type: "checkbox", options: ["Queda", "Desmaio"] },
  { id: "e1", label: "Nota", type: "scale", scale_max: 4 },
];
const respostas = { t1: [["90/55", "em pé, após 3 min"], ["", ""], ["245", "pós-prandial"]], c1: ["Queda"], e1: 3 };

describe("respostas do formulário em modo leitura", () => {
  it("mostra a tabela com colunas e só as linhas preenchidas", () => {
    render(<FormAnswersView fields={campos} answers={respostas} />);
    expect(screen.getByText("3 Parâmetros clínicos")).toBeTruthy();
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Parâmetro", "Resultado", "Condições"]);
    expect(screen.getByText("PA")).toBeTruthy();
    expect(screen.getByText("Glicemia")).toBeTruthy();
    expect(screen.queryByText("FC")).toBeNull(); // linha vazia não aparece
    expect(screen.getByText("90/55")).toBeTruthy();
  });

  it("formata tabela, caixas e escala como texto para relatórios", () => {
    expect(formatAnswerText(campos[1], respostas.t1)).toBe("PA: Resultado 90/55; Condições em pé, após 3 min\nGlicemia: Resultado 245; Condições pós-prandial");
    expect(formatAnswerText(campos[2], respostas.c1)).toBe("Queda");
    expect(formatAnswerText(campos[3], 3)).toBe("3/4");
    expect(formatAnswerText(campos[1], undefined)).toBe("—");
  });
});
