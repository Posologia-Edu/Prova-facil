import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEffect, useRef, useState } from "react";
import { render, screen, waitFor, act } from "@testing-library/react";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }));

import { useFormDraft } from "@/hooks/use-form-draft";

// Regressão: o rascunho do aluno sumia ao reentrar. As telas montam o hook ANTES do login (chave nula) e marcam o rascunho como
// "restaurado" na primeira vez que `loaded` é verdadeiro. Quando a chave aparece, o rascunho do servidor não era aplicado e o
// primeiro salvamento gravava o formulário vazio por cima.
// Este componente repete o padrão de DocumentationJoin / ReconciliationJoin / SoapJoin.
function Tela({ logado }: { logado: boolean }) {
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const draftKey = logado ? "documentation:sala:aluno" : null;
  const { draft, loaded, saveDraft } = useFormDraft({
    draftKey, module: "documentation", accessCode: logado ? "abc123" : null, email: logado ? "a@b.c" : null,
  });
  const restaurado = useRef(false);
  useEffect(() => {
    if (!draftKey || !loaded || restaurado.current) return;
    if (draft && Object.keys(draft).length > 0) setRespostas(draft);
    restaurado.current = true;
  }, [draft, loaded, draftKey]);
  useEffect(() => {
    if (!draftKey || !loaded) return;
    saveDraft(respostas);
  }, [respostas, draftKey, loaded, saveDraft]);
  return <div data-testid="texto">{respostas.f1 ?? "(vazio)"}</div>;
}

describe("useFormDraft + tela", () => {
  beforeEach(() => {
    vi.useRealTimers();
    invoke.mockReset();
    localStorage.clear();
    invoke.mockImplementation(async (_fn: string, { body }: any) => {
      if (body.action === "load") return { data: { draft: { answers_json: { f1: "texto salvo" }, updated_at: "2026-11-20T15:00:00Z" } }, error: null };
      return { data: { ok: true }, error: null };
    });
  });

  it("restaura o rascunho do servidor depois do login e não grava vazio por cima", async () => {
    const { rerender } = render(<Tela logado={false} />);
    expect(screen.getByTestId("texto").textContent).toBe("(vazio)");
    rerender(<Tela logado />);
    await waitFor(() => expect(screen.getByTestId("texto").textContent).toBe("texto salvo"));
    // espera o debounce do salvamento (800 ms) e confere que nenhum salvamento levou o formulário vazio
    await act(async () => { await new Promise((r) => setTimeout(r, 1200)); });
    const salvamentos = invoke.mock.calls.filter(([, { body }]: any) => body.action === "save").map(([, { body }]: any) => body.answers);
    expect(salvamentos.every((a: any) => a.f1 === "texto salvo")).toBe(true);
  });

  it("sem rascunho no servidor, o formulário continua vazio e utilizável", async () => {
    invoke.mockImplementation(async () => ({ data: { draft: null }, error: null }));
    const { rerender } = render(<Tela logado={false} />);
    rerender(<Tela logado />);
    await act(async () => { await new Promise((r) => setTimeout(r, 100)); });
    expect(screen.getByTestId("texto").textContent).toBe("(vazio)");
  });
});
