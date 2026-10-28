import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { CountUp, Typewriter } from "@/components/landing/landing-shared";

// jsdom não tem IntersectionObserver: simula "entrou na tela" assim que observa.
beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", class {
    constructor(private cb: IntersectionObserverCallback) {}
    observe(el: Element) { this.cb([{ isIntersecting: true, target: el } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
    unobserve() {}
    disconnect() {}
  });
  vi.useFakeTimers();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

const advance = async (ms: number) => {
  for (let t = 0; t < ms; t += 50) await act(async () => { await vi.advanceTimersByTimeAsync(50); });
};

describe("animações da landing", () => {
  it("Typewriter termina com o texto completo e o expõe inteiro a leitores de tela", async () => {
    render(<Typewriter text="Feedback escrito pela IA" delay={0.2} />);
    expect(screen.getAllByText("Feedback escrito pela IA").length).toBeGreaterThan(0); // sr-only sempre completo
    await advance(3000);
    expect(document.body.textContent).toContain("Feedback escrito pela IA");
    const visible = document.querySelector('[aria-hidden="true"]')!;
    expect(visible.firstChild?.textContent).toBe("Feedback escrito pela IA");
  });

  it("CountUp termina exatamente no texto original (4/5, 7,9, 13)", async () => {
    const { container } = render(<><CountUp text="4/5" /><i><CountUp text="7,9" /></i><b><CountUp text="13" /></b></>);
    await advance(3000);
    expect(container.textContent).toBe("4/57,913");
  });

  it("CountUp mantém texto sem número como está", () => {
    const { container } = render(<CountUp text="três" />);
    expect(container.textContent).toBe("três");
  });
});
