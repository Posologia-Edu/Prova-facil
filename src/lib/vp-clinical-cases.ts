// Catalog of clinical case summaries for Virtual Patients.
// Used by VPAnalytics detail dialog to help the teacher quickly verify
// whether the student's interaction was convergent or divergent with the
// learning objectives (history, medications, expected behaviors).

export interface VPClinicalCase {
  name: string;
  age: number;
  profession: string;
  module: string;
  description: string;
  expectation: string;
  history: string[];
  medications: string[];
  vitals: string;
  physicalExam: string;
  behaviors: string[];
  learningFocus: string[];
}

// Perfil clínico-comportamental específico de cada paciente.
// Diferente de instruções de estilo de resposta da IA, estes traços descrevem
// como o paciente realmente se comporta em consulta — úteis para o professor
// avaliar se o aluno foi convergente ou divergente dos objetivos de aprendizagem,
// e para mostrar posteriormente ao aluno o caminho que deveria ter percorrido.

export const VP_CLINICAL_CASES: Record<string, VPClinicalCase> = {
  pain_helena: {
    name: "Dona Helena",
    age: 67,
    profession: "Ex-professora de história, viúva",
    module: "Dor",
    description: "Dor neuropática pós-herpética",
    expectation: "Voltar a dormir bem e usar roupas sem dor.",
    history: [
      "Dor em queimadura no hemitórax direito há 6 meses, após herpes zoster.",
      "Dor contínua 7/10, pior à noite, alodinia ao toque da roupa.",
      "Insônia, dificuldade para vestir roupas, humor deprimido.",
      "Antecedente: hipertensão controlada.",
      "Mãe faleceu de AVC aos 75 anos. Não fuma, não bebe. Sedentária.",
    ],
    medications: [
      "Losartana 50 mg/dia (1x manhã) — adesão irregular à noite.",
      "Já tentou paracetamol e ibuprofeno sem melhora.",
    ],
    vitals: "PA 138/82 mmHg | FC 72 bpm | Temp 36,4 °C | 68 kg | 1,62 m",
    physicalExam:
      "Dor à palpação em região torácica direita (T4-T6), alodinia ao toque leve, cicatrizes residuais de vesículas. Sem alterações cardiopulmonares.",
    behaviors: universalBehaviors,
    learningFocus: [
      "Reconhecer dor neuropática (não usar AINE/paracetamol como 1ª linha).",
      "Indicar gabapentinoides, antidepressivos tricíclicos ou IRSNs.",
      "Avaliar interações com losartana e adesão.",
      "Considerar impacto no sono e humor (abordagem multidimensional).",
    ],
  },
  pain_luciana: {
    name: "Luciana",
    age: 42,
    profession: "Professora, solteira",
    module: "Dor",
    description: "Fibromialgia",
    expectation: "Ter energia para dar aula sem sentir-se 'atropelada'.",
    history: [
      "Dor difusa há 5 anos, cansaço, sono não reparador.",
      "Piora com esforço e estresse. Refere ansiedade.",
      "Dificuldade de concentração e afastamentos no trabalho.",
      "Mãe com depressão.",
    ],
    medications: [
      "Duloxetina 60 mg/dia — sem melhora significativa.",
      "Alergia: nimesulida (urticária).",
    ],
    vitals: "PA 118/72 mmHg | FC 78 bpm | Temp 36,3 °C | 62 kg | 1,65 m",
    physicalExam:
      "11/18 tender points positivos, sem edema articular, sem déficit neurológico. Trapézios tensos bilateralmente.",
    behaviors: universalBehaviors,
    learningFocus: [
      "Fibromialgia: AINEs/analgésicos comuns são pouco eficazes.",
      "Avaliar otimização de duloxetina, pregabalina, amitriptilina.",
      "Detectar deficiência de vitamina D (18 ng/mL).",
      "Incluir abordagem não-farmacológica (exercício, sono, manejo do estresse).",
    ],
  },
  pain_rogerio: {
    name: "Rogério",
    age: 58,
    profession: "Motorista de ônibus, casado",
    module: "Dor",
    description: "Lombalgia crônica em paciente com obesidade e HAS",
    expectation: "Trabalhar sem dor para não perder o emprego.",
    history: [
      "Dor lombar crônica há 10 anos, pior nos últimos 2.",
      "Dor 7/10 contínua, irradia para nádegas.",
      "Obesidade (IMC 36), circunferência abdominal 112 cm, esteatose hepática.",
      "Ex-tabagista (20 anos), bebe cerveja nos fins de semana, sedentário.",
    ],
    medications: [
      "Hidroclorotiazida 25 mg — adesão irregular nos fins de semana.",
      "Dipirona eventual.",
    ],
    vitals: "PA 148/92 mmHg | FC 80 bpm | Temp 36,5 °C | 108 kg | 1,73 m (IMC 36)",
    physicalExam:
      "Dor à palpação paravertebral lombar bilateral, limitação de flexão, Lasègue negativo, sem déficit motor/sensitivo.",
    behaviors: universalBehaviors,
    learningFocus: [
      "AINE oral apresenta risco gástrico e piora a PA — preferir AINE tópico.",
      "Perda de peso e fisioterapia como pilares do tratamento.",
      "Atenção para função hepática alterada (TGO/TGP) e perfil lipídico ruim.",
      "Cuidado com corticoide (piora HAS) e relaxante muscular (sonolência em motorista).",
    ],
  },
  pain_pedro: {
    name: "Pedro",
    age: 65,
    profession: "Aposentado, casado",
    module: "Dor",
    description: "Dor oncológica — câncer de pâncreas metastático",
    expectation: "Reduzir a dor e ficar mais confortável.",
    history: [
      "CA de pâncreas metastático, acamado a maior parte do dia, emagrecido.",
      "Dor abdominal intensa 9/10.",
      "Constipação grave (5 dias sem evacuar), náuseas frequentes.",
      "Insuficiência renal leve (Cr 1,6 mg/dL, TFG ~42 mL/min).",
      "Ex-tabagista (40 anos-maço). Esposa administra medicações rigorosamente.",
    ],
    medications: [
      "Morfina LP 30 mg 12/12h + morfina solução oral 10 mg até 6x/dia (resgate).",
      "Alergia: dipirona (edema facial).",
    ],
    vitals: "PA 108/68 mmHg | FC 88 bpm | Temp 36,8 °C | 58 kg | 1,75 m (IMC 18,9)",
    physicalExam:
      "Emagrecido, ictérico (+/4+), abdome distendido, massa epigástrica, hepatomegalia, edema leve em MMII.",
    behaviors: [
      ...universalBehaviors,
      "Paciente fragilizado, fala pouco.",
    ],
    learningFocus: [
      "Manejo de efeitos adversos de opioides (laxativo profilático, antiemético).",
      "Rotação de opioides (fentanil, oxicodona) em IR e efeitos GI.",
      "Adjuvantes (gabapentina, corticoide) para componente neuropático.",
      "Cuidado com AINEs (risco renal) e dipirona (alergia).",
    ],
  },
  pain_ana: {
    name: "Ana",
    age: 36,
    profession: "Advogada, casada, 1 filho",
    module: "Dor",
    description: "Cefaleia por uso excessivo de analgésicos",
    expectation: "Parar com a dor de cabeça que atrapalha o trabalho.",
    history: [
      "Cefaleia diária há 8 meses, pressão constante bilateral 6/10.",
      "Uso de analgésicos comuns (paracetamol + cafeína) ≥15 dias/mês.",
      "Sono irregular (5-6h/noite), trabalha 12h/dia, ansiedade.",
      "Mãe com enxaqueca.",
    ],
    medications: [
      "Automedicação diária com analgésicos comuns.",
      "Alergia: AAS (broncoespasmo).",
    ],
    vitals: "PA 122/78 mmHg | FC 74 bpm | Temp 36,4 °C | 58 kg | 1,68 m",
    physicalExam:
      "Sem sinais focais, tensão muscular cervical e temporal bilateral, sem papiledema. Pontos occipitais dolorosos.",
    behaviors: [
      ...universalBehaviors,
      "Ansiosa, fala rápido.",
    ],
    learningFocus: [
      "Identificar cefaleia por abuso de medicação (≥15 dias/mês).",
      "Suspender o analgésico abusivo + iniciar preventivo (amitriptilina, propranolol, topiramato).",
      "Evitar AAS (alergia) e sumatriptano contínuo.",
      "Abordar sono, estresse e higiene do sono.",
    ],
  },
  inflammation_maria: {
    name: "Dona Maria",
    age: 72,
    profession: "Aposentada, viúva",
    module: "Inflamação",
    description: "Osteoartrite de joelho com comorbidades",
    expectation: "Subir as escadas de casa sem sofrer.",
    history: [
      "Dor crônica no joelho direito há 8 anos, pior nos últimos 6 meses.",
      "Dor 7/10, rigidez matinal de 15 min, dificuldade de subir escadas.",
      "HAS, refluxo gastroesofágico, osteoporose.",
      "IMC 32,5. Sedentária.",
    ],
    medications: [
      "Enalapril 20 mg — adesão boa.",
      "Hidroclorotiazida 25 mg — esquece doses.",
      "Omeprazol 20 mg — adesão boa.",
      "Paracetamol prévio sem efeito.",
    ],
    vitals: "PA 142/86 mmHg | FC 68 bpm | Temp 36,3 °C | 78 kg | 1,55 m (IMC 32,5)",
    physicalExam:
      "Joelho D: crepitação, leve edema, dor na interlinha medial, flexão 100°, marcha antálgica.",
    behaviors: [
      ...universalBehaviors,
      "Fala pausada e simpática.",
    ],
    learningFocus: [
      "AINE oral com proteção gástrica (IBP) ou preferir AINE tópico.",
      "Vigiar função renal (Cr 1,4) e PA.",
      "Perda de peso, fisioterapia e infiltração intra-articular.",
      "Tratar deficiência de vitamina D (16 ng/mL).",
    ],
  },
  inflammation_antonio: {
    name: "Seu Antônio",
    age: 66,
    profession: "Ex-pedreiro, casado",
    module: "Inflamação",
    description: "Osteoartrite de quadril com DM2 e HAS",
    expectation: "Voltar a andar sem bengala.",
    history: [
      "Dor progressiva no quadril direito há 5 anos, 8/10.",
      "DM2, HAS, obesidade (IMC 34, abdome 118 cm).",
      "TFG ~38 mL/min. Sedentário pela dor.",
      "Ex-tabagista (parou há 10 anos). Bebe cachaça nos fins de semana.",
    ],
    medications: [
      "Metformina 850 mg 2x/dia.",
      "Glibenclamida 5 mg 2x/dia — esquece à noite.",
      "Losartana 50 mg/dia.",
      "Alergia: sulfa (rash).",
    ],
    vitals: "PA 145/90 mmHg | FC 76 bpm | Temp 36,5 °C | 102 kg | 1,73 m (IMC 34)",
    physicalExam:
      "Marcha claudicante com bengala à esquerda, dor à rotação interna do quadril D, abdução limitada, encurtamento funcional.",
    behaviors: [
      ...universalBehaviors,
      "Linguagem simples de trabalhador rural.",
    ],
    learningFocus: [
      "AINE oral piora glicemia e função renal — preferir AINE tópico.",
      "HbA1c 8,2% requer ajuste do DM (revisar glibenclamida em IR).",
      "Infiltração intra-articular como opção.",
      "Estimular fisioterapia adaptada à dor.",
    ],
  },
  inflammation_renata: {
    name: "Renata",
    age: 39,
    profession: "Cabeleireira, casada, 2 filhos",
    module: "Inflamação",
    description: "Artrite reumatoide inicial",
    expectation: "Manter as mãos funcionais para o trabalho.",
    history: [
      "Dor e rigidez matinal nas mãos há 1 ano, rigidez >1h.",
      "Edema em IFP e MCF bilaterais, força de preensão diminuída.",
      "Tia com lúpus. Sem comorbidades graves.",
    ],
    medications: [
      "Ibuprofeno 400 mg eventual (automedicação).",
    ],
    vitals: "PA 118/74 mmHg | FC 72 bpm | Temp 36,6 °C | 60 kg | 1,62 m",
    physicalExam:
      "Edema/calor em IFP (2º-4º dedos bilaterais), MCF edemaciadas, rigidez matinal >1h. Sem deformidades fixas.",
    behaviors: [
      ...universalBehaviors,
      "Preocupada e ansiosa com o trabalho.",
    ],
    learningFocus: [
      "Reconhecer AR inicial: anti-CCP+, VHS/PCR elevados, erosões iniciais.",
      "Iniciar DMARD (metotrexato) precocemente — não tratar só com AINE.",
      "Corticoide curto prazo como ponte.",
      "Hidroxicloroquina como adjuvante.",
    ],
  },
  inflammation_wilson: {
    name: "Seu Wilson",
    age: 57,
    profession: "Agricultor, casado",
    module: "Inflamação",
    description: "Artrite reumatoide refratária",
    expectation: "Voltar a trabalhar na roça.",
    history: [
      "AR com sulfassalazina 2 g/dia há 1 ano, sem resposta adequada.",
      "Dor 8/10, rigidez >2h, dependência parcial.",
      "Deformidades em mãos (desvio ulnar), nódulos reumatoides.",
      "PCR 60, VHS 70, anemia leve.",
    ],
    medications: [
      "Sulfassalazina 2 g/dia (não funciona).",
      "Alergia: penicilina (anafilaxia).",
    ],
    vitals: "PA 138/84 mmHg | FC 74 bpm | Temp 37,1 °C | 75 kg | 1,70 m",
    physicalExam:
      "Desvio ulnar bilateral, edema em punhos e joelhos, nódulos em cotovelos, força de preensão muito diminuída.",
    behaviors: [
      ...universalBehaviors,
      "Linguagem simples de agricultor.",
    ],
    learningFocus: [
      "Falha à monoterapia com sulfassalazina → escalar para metotrexato ou biológico.",
      "Combinação DMARD + corticoide como ponte.",
      "Monitorar função hepática e hemograma (metotrexato).",
      "Indicar biológico em refratariedade.",
    ],
  },
  inflammation_jose: {
    name: "José",
    age: 57,
    profession: "Contador, casado",
    module: "Inflamação",
    description: "AR com complicações do corticoide crônico",
    expectation: "Sair da prednisona sem recidiva da dor.",
    history: [
      "AR há 5 anos, em prednisona 15 mg/dia há 8 meses.",
      "Síndrome de Cushing iatrogênica: insônia, ganho de peso abdominal, estrias roxas, fácies cushingoide.",
      "HAS de difícil controle, glicemia em jejum 165 mg/dL, HbA1c 7,5%.",
      "Cortisol basal 3,2 µg/dL (suprimido). Densitometria com osteopenia (T-score -1,8).",
    ],
    medications: [
      "Prednisona 15 mg/dia — adesão alta por medo da dor.",
    ],
    vitals: "PA 152/94 mmHg | FC 78 bpm | Temp 36,4 °C | 88 kg | 1,72 m (IMC 29,8)",
    physicalExam:
      "Fácies cushingoide, obesidade central, estrias violáceas, pele fina com equimoses, edema articular discreto em mãos.",
    behaviors: [
      ...universalBehaviors,
      "Preocupado e questionador.",
    ],
    learningFocus: [
      "Reduzir corticoide com cuidado (insuficiência adrenal — cortisol suprimido).",
      "Associar DMARD (metotrexato) ou biológico para permitir desmame.",
      "Tratar complicações: HAS, DM iatrogênico, osteopenia.",
      "Educar sobre risco do corticoide crônico.",
    ],
  },
};
