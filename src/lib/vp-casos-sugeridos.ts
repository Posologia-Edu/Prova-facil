// Casos sugeridos para o gerador (P26): 5 de dor e 5 de inflamação, escolhidos para NÃO repetir os 10 pacientes
// atuais (legado). Cada um embute problemas clínicos reais que um bom profissional descobre perguntando.
// Um clique no diálogo de geração preenche categoria, contexto e "quem conta a história".

export interface CasoSugerido {
  id: string;
  categoria: string;
  /** só nos casos da biblioteca (P13): sugestão de dificuldade para o modo treino */
  dificuldade?: "facil" | "medio" | "dificil";
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
  // ───────── Casos da biblioteca (P13): clínica geral de Farmácia, 3 níveis de dificuldade ─────────
  {
    id: "lib-has-adesao",
    categoria: "Hipertensão",
    dificuldade: "facil",
    titulo: "Hipertensão com baixa adesão",
    quem_conta: "paciente",
    contexto:
      "Homem de 54 anos, motorista de aplicativo, hipertenso há 6 anos, em uso de losartana 50 mg e anlodipino 5 mg, que toma só 'quando lembra' ou quando sente dor de cabeça. Acha que remédio de pressão 'vicia' e que só precisa tomar quando a pressão sobe. Come fora quase todo dia (muito sal), fuma 10 cigarros por dia e usa um descongestionante nasal com frequência. Não mede a pressão em casa. Embuta a baixa adesão por crença errada sobre o tratamento, o excesso de sal e o descongestionante que eleva a pressão. Problemas simples, bem identificáveis por quem pergunta como ele realmente toma cada remédio.",
  },
  {
    id: "lib-dm2-insulina",
    categoria: "Diabetes",
    dificuldade: "facil",
    titulo: "DM2 iniciando insulina com técnica de aplicação errada",
    quem_conta: "paciente",
    contexto:
      "Mulher de 61 anos, diabética tipo 2 há 12 anos, em uso de metformina 850 mg 2x/dia e recém-iniciada em insulina NPH à noite. Não homogeneiza a suspensão, reutiliza a mesma agulha por semanas, aplica sempre no mesmo ponto do abdome (há um nódulo endurecido), guarda a insulina aberta na porta da geladeira e já teve duas hipoglicemias de madrugada que atribuiu a 'passar mal do estômago'. Tem medo de agulha e só mede a glicemia quando se sente mal. Embuta lipo-hipertrofia, armazenamento e técnica errados e hipoglicemia não reconhecida.",
  },
  {
    id: "lib-asma-inalatoria",
    categoria: "Asma",
    dificuldade: "facil",
    titulo: "Asma com técnica inalatória inadequada",
    quem_conta: "paciente",
    contexto:
      "Jovem de 22 anos, universitária, asma desde a infância, usa salbutamol spray várias vezes por semana e uma bombinha de corticoide inalatório com formoterol que usa só nas crises. Não usa espaçador, não inspira lentamente nem prende a respiração, não enxágua a boca e tem candidíase oral recorrente. Acorda à noite com tosse duas vezes por semana. Dorme com tapete e bicho de pelúcia e mora com um gato. Embuta técnica inalatória errada, uso do resgate em excesso (asma não controlada) e fatores ambientais.",
  },
  {
    id: "lib-polifarmacia-idoso",
    categoria: "Polifarmácia",
    dificuldade: "medio",
    titulo: "Polifarmácia em idoso com medicamentos potencialmente inapropriados",
    quem_conta: "paciente",
    contexto:
      "Mulher de 79 anos, viúva, mora sozinha, hipertensa, com insônia, artrose e incontinência urinária de urgência, 11 medicamentos. Usa diazepam à noite há 15 anos, amitriptilina, oxibutinina, ibuprofeno quase diário, omeprazol há 8 anos, anlodipino, hidroclorotiazida e AAS. Queixa de tontura, quedas (duas no último ano), boca seca, constipação e esquecimentos. Mistura os comprimidos num único pote por 'não caber tudo na caixinha'. Embuta critérios de Beers, cascata de prescrição, risco de queda e carga anticolinérgica.",
  },
  {
    id: "lib-drc-ajuste",
    categoria: "Doença renal",
    dificuldade: "medio",
    titulo: "DRC com ajuste de dose e nefrotóxicos",
    quem_conta: "paciente",
    contexto:
      "Homem de 68 anos, hipertenso e diabético, com doença renal crônica estágio 3b (TFG em torno de 35 mL/min). Usa metformina 2 g/dia, enalapril, espironolactona, glibenclamida e sinvastatina, e toma diclofenaco e um suplemento de creatina por conta própria. Queixa de fraqueza, náusea e urina mais escura. Embuta ajuste de dose da metformina e risco de acidose, hipercalemia (IECA mais espironolactona mais AINE), hipoglicemia com glibenclamida e nefrotoxicidade do AINE. Exige consultar os exames e interpretar a função renal.",
  },
  {
    id: "lib-varfarina-interacoes",
    categoria: "Anticoagulação",
    dificuldade: "medio",
    titulo: "Varfarina, dieta e interações",
    quem_conta: "paciente",
    contexto:
      "Mulher de 63 anos, fibrilação atrial e prótese valvar metálica, em uso de varfarina há 2 anos. INR muito instável (entre 1,4 e 5,2). Toma amiodarona há 2 meses, usou sulfametoxazol-trimetoprima para infecção urinária e toma chá verde e 'sucos verdes' de couve em grande quantidade, que começou para emagrecer. Às vezes dobra a dose esquecida. Notou hematomas e sangramento gengival. Embuta interação com amiodarona e antibiótico, vitamina K da dieta e erros de uso. Exige orientar o monitoramento do INR e os sinais de alerta.",
  },
  {
    id: "lib-gestante-medicamentos",
    categoria: "Gestação",
    dificuldade: "dificil",
    titulo: "Gestante com hipertensão, ansiedade e automedicação",
    quem_conta: "paciente",
    contexto:
      "Mulher de 31 anos, 9 semanas de gestação não planejada, hipertensa crônica em uso de enalapril e atenolol, em uso de paroxetina por ansiedade, que toma ibuprofeno para cólicas e um fitoterápico para enjoo. Está com medo e pensa em parar tudo sozinha, inclusive a paroxetina. Ainda não começou o pré-natal nem usa ácido fólico. Embuta medicamentos contraindicados ou de risco na gestação (IECA, atenolol, paroxetina, AINE), o risco de suspensão abrupta e a necessidade de articular o encaminhamento ao pré-natal de alto risco.",
  },
  {
    id: "lib-asma-stepup",
    categoria: "Asma",
    dificuldade: "dificil",
    titulo: "Asma persistente não controlada: step up antes de tratar a adesão",
    quem_conta: "paciente",
    contexto:
      "Mulher de 45 anos, asma persistente moderada há 10 anos, em uso apenas de corticoide inalatório em dose baixa e salbutamol de resgate quase todo dia, com despertares noturnos 3x por semana e duas idas ao pronto-socorro no último ano. Rinite alérgica não tratada, refluxo e uso ocasional de AAS e ibuprofeno. Parte da dificuldade é adesão, mas o tratamento atual está abaixo do que a gravidade exige. Embuta que o profissional deve reconhecer a necessidade de intensificar o tratamento (step up) antes de atribuir tudo à adesão, tratar a rinite e investigar o AINE como gatilho.",
  },
  {
    id: "lib-automedicacao-fitoterapico",
    categoria: "Automedicação",
    dificuldade: "dificil",
    titulo: "Automedicação e fitoterápicos com interação oculta",
    quem_conta: "paciente",
    contexto:
      "Homem de 57 anos, empresário, transplantado renal há 3 anos, em uso de tacrolimo, micofenolato e prednisona. Com humor deprimido, começou por conta própria erva-de-são-joão comprada pela internet; toma também suco de toranja todas as manhãs 'para a imunidade', ibuprofeno para dor de cabeça e omeprazol sem indicação. Esconde isso do nefrologista por receio de bronca. Embuta interação grave da erva-de-são-joão (indução enzimática) e da toranja com o tacrolimo, risco de rejeição ou toxicidade, e o AINE com imunossupressor. Exige abordagem empática para o paciente contar o que realmente usa.",
  },
];
