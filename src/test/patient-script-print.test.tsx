import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import caso from "../../docs/exemplo-caso-marta-v2.json";
import PatientScriptView from "@/components/simulation/PatientScriptView";
import { buildPatientRoteiro } from "@/lib/vp-patient-roteiro";
import type { VpCaseData } from "@/lib/vp-case-schema";

const roteiro = buildPatientRoteiro(caso as unknown as VpCaseData, "farmaceutico")!;

describe("impressão do roteiro", () => {
  afterEach(() => {
    vi.useRealTimers();
    document.documentElement.classList.remove("dark");
  });

  it("desenha uma cópia no body, marca o body, imprime e limpa tudo ao terminar", () => {
    vi.useFakeTimers();
    const print = vi.fn();
    window.print = print;
    document.documentElement.classList.add("dark");
    render(<PatientScriptView roteiro={roteiro} />);

    fireEvent.click(screen.getByRole("button", { name: /imprimir/i }));
    expect(document.body.classList.contains("imprimindo-roteiro")).toBe(true);
    const copia = document.body.querySelector(":scope > .roteiro-print-root");
    expect(copia).not.toBeNull();
    expect(copia!.textContent).toContain("Como funciona"); // a cópia leva o guia
    expect(document.documentElement.classList.contains("dark")).toBe(false); // sai em fundo claro

    act(() => { vi.advanceTimersByTime(200); });
    expect(print).toHaveBeenCalledTimes(1);

    act(() => { window.dispatchEvent(new Event("afterprint")); });
    expect(document.body.classList.contains("imprimindo-roteiro")).toBe(false);
    expect(document.body.querySelector(":scope > .roteiro-print-root")).toBeNull();
    expect(document.documentElement.classList.contains("dark")).toBe(true); // tema restaurado
  });
});
