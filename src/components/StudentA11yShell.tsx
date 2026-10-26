import type { ReactNode } from "react";
import AccessibilityPanel, { ReadingMask, getA11yClasses, getA11yStyle, useA11ySettings } from "@/components/AccessibilityPanel";

// Envolve uma tela pública do aluno com o painel de acessibilidade (fonte, contraste, dislexia, espaçamento, máscara de leitura).
// O wrapper usa "contents" para não criar caixa nova: o layout da tela continua o mesmo e as preferências herdam pelos filhos.
// As preferências ficam em sessionStorage e valem para todas as telas do aluno na mesma aba.
export function StudentA11yShell({ children }: { children: ReactNode }) {
  const [a11y, setA11y] = useA11ySettings();
  return (
    <div className={`contents ${getA11yClasses(a11y)}`} style={getA11yStyle(a11y)}>
      {children}
      <AccessibilityPanel settings={a11y} onChange={setA11y} showExamTools={false} />
      {a11y.readingMask && <ReadingMask />}
    </div>
  );
}
