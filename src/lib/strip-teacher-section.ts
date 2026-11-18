// Casos antigos (gerados antes da correcao) trazem, dentro do texto, a secao
// "DISCREPANCIAS PARA IDENTIFICACAO (USO EXCLUSIVO DO PROFESSOR)". O aluno nunca deve ve-la.
const TEACHER_SECTION = /(^|\n)\s*DISCREP[ÂA]NCIAS PARA IDENTIFICA[ÇC][ÃA]O[\s\S]*$/i;

export function stripTeacherSection(content: string | null | undefined): string {
  return (content || "").replace(TEACHER_SECTION, "").trim();
}
