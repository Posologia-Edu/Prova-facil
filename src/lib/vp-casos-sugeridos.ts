// Casos sugeridos para o gerador (P26): 5 de dor e 5 de inflamação, escolhidos para NÃO repetir os 10 pacientes
// atuais (legado). Cada um embute problemas clínicos reais que um bom profissional descobre perguntando.
// Um clique no diálogo de geração preenche categoria, contexto e "quem conta a história".

export interface CasoSugerido {
  id: string;
  categoria: "Dor" | "Inflamação";
  titulo: string;
  quem_conta: "paciente" | "cuidador";
  contexto: string;
}

export const CASOS_SUGERIDOS: CasoSugerido[] = [
  // ───────── Dor ─────────
  {
    id: "dor-neuropatia-diabetica",
    categoria: "Dor",
    titulo: "Neuropatia diabética dolorosa",
    quem_conta: "paciente",
    contexto:
      "Homem de 62 anos, diabético tipo 2 há 14 anos, com doença renal crônica leve a moderada (TFG em torno de 50 mL/min), hipertenso. Dor em queimação e choque nos pés, pior à noite, que atrapalha o sono. Em uso de metformina, glibenclamida, losartana e AAS. Tentou gabapentina em dose alta por conta própria depois de ouvir de um vizinho, com sonolência e tontura, e toma dipirona e um anti-inflamatório por conta própria. Embuta problemas como dose inadequada para a função renal, risco de hipoglicemia, uso de anti-inflamatório com doença renal e IECA/BRA, e dúvida entre duloxetina e gabapentina. Objetivo educacional: ajustar o tratamento da dor neuropática considerando rim e comorbidades.",
  },
  {
    id: "dor-lombalgia-varfarina",
    categoria: "Dor",
    titulo: "Lombalgia aguda em idosa que usa varfarina",
    quem_conta: "paciente",
    contexto:
      "Mulher de 74 anos, fibrilação atrial, em uso de varfarina há 3 anos, hipertensa e com refluxo. Lombalgia aguda há 10 dias após carregar peso. Está tomando diclofenaco que sobrou de um familiar e, para o estômago, omeprazol. Usa também chá de gengibre e ginkgo biloba comprados na feira. Faz o INR com irregularidade e não sabe o último resultado. Embuta a interação grave AINE e varfarina com risco de sangramento, interações com fitoterápicos, adesão ao controle do INR e sinais de alerta de sangramento. Objetivo educacional: reconhecer e resolver interação grave com anticoagulante e orientar alternativas seguras para a dor.",
  },
  {
    id: "dor-pos-artroplastia-cuidador",
    categoria: "Dor",
    titulo: "Dor pós-operatória em idoso (artroplastia), contada pelo cuidador",
    quem_conta: "cuidador",
    contexto:
      "Idoso de 81 anos, 12 dias após artroplastia de quadril, com início de declínio cognitivo leve, hipertenso e com hipertrofia prostática. Quem conta a história é a filha, que o cuida em casa. Alta com tramadol e paracetamol, mais um benzodiazepínico que ele já usava para dormir. A filha dá o opioide 'de resgate' com frequência, e o pai está sonolento, confuso à noite, constipado há 5 dias, e caiu uma vez no banheiro. Também dá dipirona por conta própria. Embuta sedação e risco de queda, delirium, constipação, associação de depressores do sistema nervoso central, retenção urinária e dificuldade da cuidadora com horários. Objetivo educacional: revisar analgesia no idoso e orientar o cuidador.",
  },
  {
    id: "dor-fibromialgia-sem-acesso",
    categoria: "Dor",
    titulo: "Fibromialgia sem condições de comprar os medicamentos",
    quem_conta: "paciente",
    contexto:
      "Mulher de 46 anos, diarista, renda irregular, três filhos, com fibromialgia diagnosticada há 4 anos, ansiedade e sono ruim. O médico prescreveu duloxetina e pregabalina, que ela comprou duas vezes e abandonou por não ter dinheiro. Hoje usa dipirona, um relaxante muscular e anti-inflamatório por conta própria, às vezes dobrando a dose, e toma chás. Tem vergonha de dizer que parou o tratamento por causa do custo e só conta com vínculo e sem julgamento. O aluno precisa identificar a barreira de acesso e ORIENTAR as formas de acesso gratuito ou de baixo custo aos medicamentos e ao cuidado: o que é fornecido na farmácia da UBS pelo SUS, o programa Farmácia Popular, protocolos do SUS para dor crônica, e como pedir ao prescritor alternativas disponíveis na rede, além de medidas não farmacológicas gratuitas (atividade física na UBS, grupos de apoio). A disponibilidade varia por município: o gabarito deve citar apenas políticas e protocolos que realmente existem e indicar ao aluno conferir a lista local. Embuta também automedicação, risco de sobredose e baixa adesão por custo. Objetivo educacional: garantir acesso e adesão ao tratamento da dor da fibromialgia (medicamentos e medidas não farmacológicas) e reduzir a automedicação.",
  },
  {
    id: "dor-tramadol-isrs",
    categoria: "Dor",
    titulo: "Dor crônica em idoso com tramadol e antidepressivo",
    quem_conta: "paciente",
    contexto:
      "Homem de 69 anos, osteoartrite de coluna e joelhos e depressão, em uso de sertralina há 2 anos e tramadol de uso diário há 6 meses, que aumentou a dose por conta própria porque 'não segura mais a dor'. Toma também um relaxante muscular e um anti-inflamatório. Queixa de agitação, tremor, suor e diarreia nas últimas semanas. Tem insuficiência renal leve. Embuta o risco de síndrome serotoninérgica e de convulsão pela associação de tramadol com ISRS, dose elevada para a função renal, dependência de opioide, e a depressão mal controlada pela dor. Objetivo educacional: reconhecer interação entre opioide e antidepressivo e propor ajuste ao prescritor.",
  },
  // ───────── Inflamação ─────────
  {
    id: "inflamacao-gota-renal",
    categoria: "Inflamação",
    titulo: "Gota aguda em hipertenso com doença renal",
    quem_conta: "paciente",
    contexto:
      "Homem de 58 anos, hipertenso, obeso, com doença renal crônica (TFG em torno de 40 mL/min) e gota há 5 anos, com crise aguda muito dolorosa no dedão do pé há 2 dias (dor 9/10, não consegue calçar o sapato nem dormir). Usa losartana, hidroclorotiazida e alopurinol de forma irregular. Para a dor, tomou um anti-inflamatório que tinha em casa e dipirona, sem alívio, e começou claritromicina por uma infecção respiratória, enquanto ainda tem colchicina da última crise e pensa em tomá-la em dose alta 'para cortar a crise'. Bebe cerveja nos fins de semana. O foco é o TRATAMENTO DA DOR E DA INFLAMAÇÃO da crise: embuta o AINE contraindicado com doença renal, losartana e diurético (risco de lesão renal), a interação entre colchicina e claritromicina com risco de toxicidade e a dose de colchicina ajustada à função renal, a alternativa do corticoide (oral ou intra-articular) e de analgésicos mais seguros, o efeito do diurético e do álcool sobre a crise e como orientar o paciente a tratar a dor sem agravar o rim. O alopurinol entra só como contexto (não iniciar nem ajustar durante a crise). Objetivo educacional: escolher e orientar com segurança a terapia da dor e da inflamação na crise de gota em paciente com rim, pressão e interações."
  },
  {
    id: "inflamacao-artrite-psoriasica",
    categoria: "Inflamação",
    titulo: "Artrite psoriásica em jovem com gastrite",
    quem_conta: "paciente",
    contexto:
      "Homem de 34 anos, psoríase em placas e artrite psoriásica há 2 anos, com dor e rigidez em mãos e coluna, e gastrite. Usa metotrexato semanal e ácido fólico, mas às vezes toma o metotrexato todo dia por engano, além de anti-inflamatório diário que causa queimação, e bebe álcool com frequência em festas. Esquece o ácido fólico e evita exames de sangue por medo de piorar o trabalho. Embuta risco de erro de posologia do metotrexato, toxicidade hepática e hematológica, interação com álcool e AINE, gastrite agravada pelo anti-inflamatório e falta de monitorização laboratorial. O foco é o TRATAMENTO DA DOR E DA INFLAMAÇÃO articular. Objetivo educacional: conduzir com segurança o tratamento da dor e da inflamação da artrite (AINE e metotrexato), com adesão e monitorização.",
  },
  {
    id: "inflamacao-polimialgia-corticoide",
    categoria: "Inflamação",
    titulo: "Polimialgia reumática em idosa em corticoide",
    quem_conta: "paciente",
    contexto:
      "Mulher de 71 anos, polimialgia reumática há 8 meses, osteoporose e hipertensão, diabética limítrofe. Em prednisona 15 mg por dia, sem redução gradual combinada, e queixa de insônia, ganho de peso, aumento da glicemia e da pressão e fraqueza nas pernas. Não toma cálcio nem vitamina D de forma regular, fez menopausa precoce e já teve uma fratura de punho. Usa omeprazol por conta própria e um anti-inflamatório para dor. Embuta efeitos adversos do corticoide, falta de proteção óssea, risco de fratura, glicemia e pressão descontroladas, interação AINE e corticoide no estômago e a necessidade de plano de redução. O foco é o TRATAMENTO DA DOR E DA INFLAMAÇÃO da polimialgia. Objetivo educacional: tratar a dor e a inflamação com segurança, usando o corticoide na menor dose eficaz, protegendo o paciente dos seus efeitos e evitando AINE desnecessário.",
  },
  {
    id: "inflamacao-oa-maos-aas",
    categoria: "Inflamação",
    titulo: "Osteoartrite de mãos em paciente que usa AAS",
    quem_conta: "paciente",
    contexto:
      "Mulher de 66 anos, osteoartrite de mãos com dor e nódulos, hipertensa, com infarto prévio e em uso de AAS 100 mg, losartana e atenolol. Para a dor das mãos toma ibuprofeno quase todo dia, que ela compra sem receita, e usa também um gel que passa com massagem. Tem queimação e já notou fezes escuras duas vezes. Esquece o omeprazol. Embuta interação entre ibuprofeno e AAS que reduz a proteção cardiovascular, risco de sangramento digestivo, AINE com hipertensão e IECA/BRA, e a alternativa do AINE tópico. Objetivo educacional: escolher analgesia segura em paciente cardiopata.",
  },
  {
    id: "inflamacao-espondilite",
    categoria: "Inflamação",
    titulo: "Espondilite anquilosante em jovem com uso crônico de AINE",
    quem_conta: "paciente",
    contexto:
      "Homem de 28 anos, espondilite anquilosante com dor lombar inflamatória e rigidez matinal longa, em uso contínuo de anti-inflamatório em dose alta há 3 anos, com gastrite e hipertensão recente. Toma também suplemento proteico e creatina na academia, e bebe pouca água. Já ouviu falar de medicamento biológico e tem medo de injeção e de infecção, e não sabe como conseguir pelo SUS. Faz pouca fisioterapia e exercício. Embuta toxicidade do AINE crônico no estômago, rim e pressão, suplementos e creatina com função renal, o papel do exercício e da fisioterapia, e a dúvida sobre biológico e seu acesso. Objetivo educacional: segurança do uso crônico de AINE e orientação sobre terapia avançada.",
  },
];
