// Avalia o Jev contra notas de professores. Uso (bun, node >= 22.18 ou deno):
//   TYPESAFE_API_KEY=... bun scripts/jev-poc/run-poc.ts scripts/jev-poc/cases.example.json [repeticoes]
// Não grava nada; só imprime métricas.
import { readFileSync } from "node:fs";
import { DEFAULT_THRESHOLDS, gradeAnswer, type GradeResult, type RubricItem } from "../../supabase/functions/_shared/jev-grader.ts";

interface Case {
  id: string;
  statement: string;
  referenceAnswer?: string;
  maxPoints: number;
  rubric: RubricItem[];
  answer: string;
  teacherScore: number; // nota dada por professor, sem ver o resultado do Jev
}

const [file, repsArg] = process.argv.slice(2);
const apiKey = process.env.TYPESAFE_API_KEY;
if (!file || !apiKey) {
  console.error("Uso: TYPESAFE_API_KEY=... run-poc.ts <cases.json> [repeticoes]");
  process.exit(1);
}
const reps = Number(repsArg ?? 3);
const cases: Case[] = JSON.parse(readFileSync(file, "utf8"));
const model = process.env.TYPESAFE_MODEL; // fixe uma versão para o teste ser reproduzível

let graded = 0, review = 0, exact = 0, absErr = 0, within = 0, unstableVerdicts = 0, maxSpread = 0, tokensIn = 0;
const models = new Set<string>();

for (const c of cases) {
  const runs: GradeResult[] = [];
  for (let i = 0; i < reps; i++) {
    runs.push(await gradeAnswer({ apiKey, model }, c, c.rubric));
  }
  runs.forEach((r) => { models.add(r.model); tokensIn += r.usage.input_tokens; });

  // Repetibilidade: variação da probabilidade de cada critério e mudança de veredito entre execuções.
  c.rubric.forEach((_, k) => {
    const ps = runs.map((r) => r.criteria[k].probability);
    maxSpread = Math.max(maxSpread, Math.max(...ps) - Math.min(...ps));
    if (new Set(runs.map((r) => r.criteria[k].verdict)).size > 1) unstableVerdicts++;
  });

  const r = runs[0];
  const line = `${c.id.padEnd(12)} professor=${c.teacherScore}  jev=${r.score ?? `revisão [${r.pointsMin}–${r.pointsMax}]`}`;
  console.log(line + (r.injectionProbability > DEFAULT_THRESHOLDS.notMet ? "  ⚠ possível injeção" : ""));

  if (r.needsReview) { review++; continue; }
  graded++;
  const err = Math.abs(r.score! - c.teacherScore);
  absErr += err;
  if (err === 0) exact++;
  if (err <= c.maxPoints * 0.1) within++;
}

console.log("\n--- Resumo ---");
console.log(`casos: ${cases.length}  | corrigidos automaticamente: ${graded}  | enviados à revisão: ${review} (${((review / cases.length) * 100).toFixed(0)}%)`);
if (graded) {
  console.log(`erro absoluto médio vs professor: ${(absErr / graded).toFixed(2)} pt`);
  console.log(`nota idêntica: ${((exact / graded) * 100).toFixed(0)}%  | dentro de 10% da nota máxima: ${((within / graded) * 100).toFixed(0)}%`);
}
console.log(`repetibilidade (${reps} execuções): maior variação de probabilidade=${maxSpread.toFixed(3)}  | vereditos que mudaram=${unstableVerdicts}`);
console.log(`modelo(s): ${[...models].join(", ")}  | tokens de entrada: ${tokensIn}`);
