import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ClinicalGate } from "@/components/PremiumGate";

const sub = { isLoading: false, hasClinicalAccess: false, isPremium: false };
vi.mock("@/hooks/use-subscription", () => ({ useSubscription: () => sub }));

const renderGate = () =>
  render(
    <MemoryRouter>
      <ClinicalGate feature="OSCE"><p>conteudo do professor</p></ClinicalGate>
    </MemoryRouter>,
  );

describe("ClinicalGate", () => {
  beforeEach(() => Object.assign(sub, { isLoading: false, hasClinicalAccess: false, isPremium: false }));

  it("bloqueia usuário gratuito e mostra o aviso Premium", () => {
    renderGate();
    expect(screen.queryByText("conteudo do professor")).toBeNull();
    expect(screen.getByText("Recurso Premium")).toBeTruthy();
  });

  it("libera assinante, convidado do admin e admin (todos com hasClinicalAccess)", () => {
    sub.hasClinicalAccess = true;
    renderGate();
    expect(screen.getByText("conteudo do professor")).toBeTruthy();
  });

  it("renderiza o conteúdo enquanto a assinatura carrega, sem piscar bloqueio", () => {
    sub.isLoading = true;
    renderGate();
    expect(screen.getByText("conteudo do professor")).toBeTruthy();
  });
});
