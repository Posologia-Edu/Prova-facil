import { computeFieldScore, type FormField } from "@/components/forms/types";
import { PESO_RUBRICA_V2, respostaEhSoapV2 } from "@/lib/soap-v2-rubrica";

type SoapResponseLike = {
  answers_json?: unknown;
  admin_score?: number | string | null;
  ai_score?: number | string | null;
};

type CalculateSoapStudentGradeArgs = {
  peerEvaluation?: SoapResponseLike | null;
  soapResponse?: SoapResponseLike | null;
  evaluationFields: FormField[];
  isSolo?: boolean;
};

const toNumberOrNull = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export function calculateSoapPeerScore(
  peerEvaluation: SoapResponseLike | null | undefined,
  evaluationFields: FormField[],
) {
  if (!peerEvaluation || evaluationFields.length === 0) {
    return { peerScore: null, peerMaxScore: 0 };
  }

  let totalScore = 0;
  let totalMax = 0;

  for (const field of evaluationFields) {
    if (!field.max_score) continue;
    totalMax += field.max_score;
    const answers = peerEvaluation.answers_json;
    const answer = answers && typeof answers === "object" && !Array.isArray(answers)
      ? (answers as Record<string, unknown>)[field.id]
      : undefined;
    totalScore += computeFieldScore(field, answer);
  }

  return {
    peerScore: totalMax > 0 ? (totalScore / totalMax) * 10 : 0,
    peerMaxScore: totalMax,
  };
}

export function calculateSoapStudentGrade({
  peerEvaluation,
  soapResponse,
  evaluationFields,
  isSolo = false,
}: CalculateSoapStudentGradeArgs) {
  const { peerScore: rawPeerScore, peerMaxScore } = calculateSoapPeerScore(
    peerEvaluation,
    evaluationFields,
  );
  const adminScore = toNumberOrNull(soapResponse?.admin_score);
  const aiScore = toNumberOrNull(soapResponse?.ai_score);
  // SOAP v2: 80% rubrica confirmada pelo professor + 20% revisão por pares. Sem a nota do professor, a nota ainda não existe.
  if (respostaEhSoapV2(soapResponse?.answers_json)) {
    const par = rawPeerScore;
    const finalV2 = adminScore == null ? null : par == null ? adminScore : PESO_RUBRICA_V2 * adminScore + (1 - PESO_RUBRICA_V2) * par;
    return { peerScore: par, peerMaxScore, adminScore, finalScore: finalV2 };
  }
  const peerScore = isSolo && rawPeerScore == null && aiScore != null ? aiScore : rawPeerScore;
  const scores = [peerScore, adminScore].filter((score): score is number => score != null);
  const finalScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;

  return {
    peerScore,
    peerMaxScore,
    adminScore,
    finalScore,
  };
}