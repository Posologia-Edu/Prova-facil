import type { CasoCompleto } from "@/lib/recon-v2";

// Casos-semente da Reconciliação v2, escritos para o professor REVISAR antes de usar com alunos. Pacientes fictícios.
// Convenção da prescrição: "medicamento" é só o nome (sem a dose); a concentração e a dose ficam em "dose".

export const CASOS_SEMENTE: CasoCompleto[] = [
  // ---------------------------------------------------------------------------------------------------------------
  // 1. ADMISSÃO — idosa com infecção urinária, lesão renal, anti-inflamatório por conta própria e alergia não registrada
  // ClCr (Cockcroft-Gault) = (140 − 76) × 58 / (72 × 1,9) × 0,85 ≈ 23 mL/min
  // ---------------------------------------------------------------------------------------------------------------
  {
    caso: {
      versao: 2,
      titulo: "Idosa com confusão, queda e infecção urinária",
      resumo: "Dona Marlene chega ao pronto-socorro trazida pela filha, confusa e depois de uma queda em casa. A internação foi decidida por infecção urinária. Você é o(a) farmacêutico(a) que faz a reconciliação de admissão.",
      transicao: "admissao",
      nivel: "intermediario",
      paciente: {
        nome: "Marlene Aparecida Souza", idade: 76, sexo: "F", peso_kg: 58, altura_m: 1.55, creatinina_mg_dl: 1.9,
        alergias_registradas: "nenhuma registrada",
        motivo: "Internação por infecção urinária alta, com confusão mental e queda da própria altura.",
      },
      fontes: [
        {
          id: "f1", tipo: "relato", titulo: "Relato da filha (Fernanda), que mora com a paciente",
          texto: "“Minha mãe toma o remédio da pressão de manhã e à noite, e o branquinho da manhã também. O da tireoide ela toma quando lembra. Toma um do colesterol e um comprimido para dormir, que ela guarda na gaveta do criado-mudo. Para o joelho ela compra um remédio na farmácia e toma uns três por dia, faz uns dois meses. Ela tem alergia de dipirona: da vez que tomou, encheu de mancha vermelha e coçou muito. Não sei se o postinho sabe disso.”",
          nota: "Fala leiga: a filha não cita nomes de medicamentos, só para que servem.",
        },
        {
          id: "f2", tipo: "caixa", titulo: "Sacola de medicamentos trazida pela filha",
          texto: "Losartana potássica 50 mg (cartela aberta). Hidroclorotiazida 25 mg (cartela aberta). Levotiroxina 75 mcg (caixa com 30 comprimidos, 22 restantes). Sinvastatina 20 mg (cartela aberta). Diazepam 5 mg (12 comprimidos; receita azul de 2023, vencida). Ibuprofeno 600 mg (caixa com 10 comprimidos, 4 restantes).",
          nota: "Mostra o que existe na casa, não o que ela toma.",
        },
        {
          id: "f3", tipo: "receita", titulo: "Receita da UBS (últimos 6 meses)",
          texto: "Losartana potássica 50 mg, 1 comprimido de 12 em 12 horas. Hidroclorotiazida 25 mg, 1 comprimido pela manhã. Levotiroxina 75 mcg, 1 comprimido em jejum. Sinvastatina 20 mg, 1 comprimido à noite.",
        },
        {
          id: "f4", tipo: "retiradas", titulo: "Extrato de dispensação da farmácia da UBS (6 meses)",
          texto: "Losartana: 60 comprimidos todo mês. Hidroclorotiazida: 30 comprimidos todo mês. Levotiroxina: 30 comprimidos, uma única retirada, há 4 meses. Sinvastatina: 30 comprimidos, 3 retiradas em 6 meses.",
        },
        {
          id: "f5", tipo: "sumario", titulo: "Prontuário da UBS e exames de hoje",
          texto: "Diagnósticos: hipertensão, hipotireoidismo, dislipidemia, osteoartrite de joelho. Alergias: sem registro. Creatinina de 6 meses atrás: 0,9 mg/dL. Hoje, no pronto-socorro: creatinina 1,9 mg/dL, ureia 78 mg/dL, potássio 4,9 mEq/L, PA 108/62 mmHg, FC 96 bpm, peso 58 kg. Urocultura colhida, antibiótico iniciado.",
        },
      ],
    },
    prescricao: [
      { medicamento: "Ceftriaxona", dose: "1 g", via: "EV", frequencia: "1 vez ao dia" },
      { medicamento: "Losartana", dose: "50 mg", via: "VO", frequencia: "12/12 h" },
      { medicamento: "Hidroclorotiazida", dose: "25 mg", via: "VO", frequencia: "1 vez ao dia, pela manhã" },
      { medicamento: "Enoxaparina", dose: "40 mg", via: "SC", frequencia: "1 vez ao dia", observacao: "Profilaxia de TVP" },
      { medicamento: "Dipirona", dose: "1 g", via: "EV", frequencia: "6/6 h se dor ou febre" },
    ],
    gabarito: {
      discrepancias: [
        { id: "d1", medicamento: "Losartana", tipo: "ajuste_renal", intencionalidade: "nao_intencional", risco: "grave", critica: true, fontes: ["f5", "f1"], descricao: "Losartana mantida na vigência de lesão renal aguda (creatinina de 0,9 para 1,9 mg/dL), com uso concomitante de anti-inflamatório.", acao_esperada: "Sugerir suspender a losartana até a recuperação da função renal e reavaliar com a equipe." },
        { id: "d2", medicamento: "Hidroclorotiazida", tipo: "ajuste_renal", intencionalidade: "nao_intencional", risco: "moderado", critica: false, fontes: ["f5"], descricao: "Diurético tiazídico mantido com lesão renal aguda, desidratação provável e infecção.", acao_esperada: "Sugerir suspender temporariamente, junto com a losartana." },
        { id: "d3", medicamento: "Dipirona", tipo: "alergia", intencionalidade: "nao_intencional", risco: "grave", critica: true, fontes: ["f1", "f5"], descricao: "Dipirona prescrita, com alergia relatada pela filha (urticária) e sem registro no prontuário.", acao_esperada: "Sugerir trocar por paracetamol, registrar a alergia à dipirona e confirmar com a filha a reação." },
        { id: "d4", medicamento: "Ibuprofeno", tipo: "omissao", intencionalidade: "nao_intencional", risco: "grave", critica: true, fontes: ["f1", "f2"], descricao: "Uso de ibuprofeno 600 mg cerca de 3 vezes ao dia por conta própria, não registrado, em associação com losartana e hidroclorotiazida (tripla associação nefrotóxica) e provável causa da lesão renal.", acao_esperada: "Registrar o uso na história medicamentosa, não prescrever AINE, comunicar a equipe e orientar a suspensão." },
        { id: "d5", medicamento: "Enoxaparina", tipo: "ajuste_renal", intencionalidade: "nao_intencional", risco: "moderado", critica: false, fontes: ["f5"], descricao: "Dose de profilaxia de 40 mg com clearance de creatinina de cerca de 23 mL/min (abaixo de 30).", acao_esperada: "Sugerir ajustar a profilaxia para 20 mg 1 vez ao dia conforme a bula, ou rever a indicação." },
        { id: "d6", medicamento: "Levotiroxina", tipo: "omissao", intencionalidade: "nao_intencional", risco: "moderado", critica: false, fontes: ["f1", "f4", "f2"], descricao: "Levotiroxina omitida na prescrição. O uso real é irregular (uma retirada em 6 meses, 22 de 30 comprimidos na caixa).", acao_esperada: "Registrar a adesão parcial, sugerir a retomada e avaliar TSH com a equipe." },
        { id: "d7", medicamento: "Diazepam", tipo: "omissao", intencionalidade: "nao_intencional", risco: "moderado", critica: false, fontes: ["f1", "f2", "f3"], descricao: "Uso crônico de diazepam à noite, sem receita válida e fora da receita da UBS. Idosa com queda e confusão (benzodiazepínico é inapropriado no idoso, risco de abstinência se for suspenso de uma vez).", acao_esperada: "Registrar o uso, comunicar a equipe, evitar suspensão abrupta e planejar a retirada gradual." },
        { id: "d8", medicamento: "Sinvastatina", tipo: "omissao", intencionalidade: "intencional_sem_documentacao", risco: "leve", critica: false, fontes: ["f3", "f4"], descricao: "Sinvastatina não foi prescrita, provavelmente por rotina de internação, e a decisão não está documentada. Uso real irregular (3 retiradas em 6 meses).", acao_esperada: "Confirmar com o prescritor se a omissão é proposital e documentar; retomar na alta." },
        { id: "d9", medicamento: "Ceftriaxona", tipo: "comissao", intencionalidade: "intencional_documentada", risco: "sem_dano", critica: false, fontes: ["f5"], descricao: "Antibiótico novo, iniciado por indicação documentada (infecção urinária). Não é problema: serve para treinar a diferença entre discrepância intencional e não intencional.", acao_esperada: "Registrar como discrepância intencional e documentada. Nenhuma intervenção." },
      ],
      bpmh: [
        { medicamento: "Losartana 50 mg, comprimido", uso_real: "1 comprimido de 12 em 12 horas, regular", fontes: ["f1", "f2", "f3", "f4"] },
        { medicamento: "Hidroclorotiazida 25 mg, comprimido", uso_real: "1 comprimido pela manhã, regular", fontes: ["f1", "f2", "f3", "f4"] },
        { medicamento: "Levotiroxina 75 mcg, comprimido", uso_real: "Toma quando lembra; adesão parcial", fontes: ["f1", "f2", "f3", "f4"] },
        { medicamento: "Sinvastatina 20 mg, comprimido", uso_real: "1 comprimido à noite, de forma irregular (cerca de metade dos meses)", fontes: ["f1", "f3", "f4"] },
        { medicamento: "Diazepam 5 mg, comprimido", uso_real: "1 comprimido à noite para dormir, uso crônico sem receita válida", fontes: ["f1", "f2"] },
        { medicamento: "Ibuprofeno 600 mg, comprimido", uso_real: "Cerca de 3 por dia, por conta própria, há 2 meses", fontes: ["f1", "f2"] },
      ],
      outros_problemas: [
        "Dipirona em paciente com alergia relatada: confirmar a reação (tipo e data) com a filha e registrar no prontuário.",
        "Diazepam em idosa com queda é medicamento potencialmente inapropriado (critérios de Beers).",
      ],
    },
  },

  // ---------------------------------------------------------------------------------------------------------------
  // 2. TRANSFERÊNCIA — UTI para enfermaria, diabético com insulina basal esquecida
  // ClCr (Cockcroft-Gault) = (140 − 68) × 82 / (72 × 1,4) ≈ 59 mL/min
  // ---------------------------------------------------------------------------------------------------------------
  {
    caso: {
      versao: 2,
      titulo: "Transferência da UTI para a enfermaria: diabético após pneumonia grave",
      resumo: "O Sr. José Carlos esteve 7 dias na UTI com pneumonia grave e choque séptico. Está estável, sem vasopressor, e vai para a enfermaria hoje. Você reconcilia a prescrição da UTI com a que o médico da enfermaria escreveu.",
      transicao: "transferencia",
      nivel: "intermediario",
      paciente: {
        nome: "José Carlos Almeida", idade: 68, sexo: "M", peso_kg: 82, altura_m: 1.72, creatinina_mg_dl: 1.4,
        alergias_registradas: "nenhuma registrada",
        motivo: "Transferência da UTI para a enfermaria clínica depois de pneumonia grave com choque séptico.",
      },
      fontes: [
        {
          id: "f1", tipo: "relato", titulo: "Relato do paciente, já lúcido",
          texto: "“Em casa eu tomo a insulina de manhã e à noite, a de manhã é mais. Tomo o comprimido da diabetes no almoço e no jantar, o da pressão duas vezes, a aspirina e o do colesterol. Tomo também aquele para o estômago antes do café. Não tenho alergia a nada.”",
        },
        {
          id: "f2", tipo: "sumario", titulo: "Resumo da evolução da UTI (médico intensivista)",
          texto: "Internado há 7 dias por pneumonia grave com choque séptico. Noradrenalina suspensa há 48 h. Extubado no D4. Dieta oral liberada. Antecedentes: diabetes tipo 2 insulinodependente, hipertensão, cardiopatia isquêmica com stent em 2021. Metformina suspensa na internação por sepse e função renal. Enalapril suspenso por hipotensão e lesão renal aguda. Creatinina 1,4 mg/dL (pico de 2,1). PA 118/72 mmHg hoje.",
        },
        {
          id: "f3", tipo: "receita", titulo: "Receita ambulatorial da UBS e da cardiologia",
          texto: "Metformina 850 mg, 1 comprimido 2 vezes ao dia. Enalapril 10 mg, 1 comprimido 12/12 h. Insulina NPH: 20 UI pela manhã e 10 UI à noite. AAS 100 mg, 1 comprimido ao dia. Atorvastatina 40 mg, 1 comprimido à noite. Omeprazol 20 mg, 1 cápsula em jejum.",
        },
        {
          id: "f4", tipo: "outro", titulo: "Prescrição da UTI de ontem",
          texto: "Meropenem 1 g EV 8/8 h. Pantoprazol 40 mg EV 1 vez ao dia. Insulina regular em bomba de infusão (suspensa hoje às 07 h). Enoxaparina 40 mg SC 1 vez ao dia. Dipirona 1 g EV se febre.",
        },
        {
          id: "f5", tipo: "exames", titulo: "Exames e glicemias das últimas 24 horas",
          texto: "Glicemias capilares (mg/dL): 210, 245, 198, 260. Creatinina 1,4 mg/dL. Potássio 4,8 mEq/L. Peso 82 kg. Hemoglobina glicada: 8,9%.",
          nota: "As duas últimas glicemias foram depois da suspensão da insulina em bomba.",
        },
      ],
    },
    prescricao: [
      { medicamento: "Meropenem", dose: "1 g", via: "EV", frequencia: "8/8 h" },
      { medicamento: "Pantoprazol", dose: "40 mg", via: "EV", frequencia: "1 vez ao dia" },
      { medicamento: "Omeprazol", dose: "20 mg", via: "VO", frequencia: "1 vez ao dia, em jejum" },
      { medicamento: "Enoxaparina", dose: "40 mg", via: "SC", frequencia: "1 vez ao dia" },
      { medicamento: "Insulina regular", dose: "conforme glicemia capilar", via: "SC", frequencia: "se necessário" },
      { medicamento: "Atorvastatina", dose: "40 mg", via: "VO", frequencia: "1 vez ao dia, à noite" },
      { medicamento: "Dipirona", dose: "1 g", via: "VO", frequencia: "6/6 h se dor ou febre" },
    ],
    gabarito: {
      discrepancias: [
        { id: "d1", medicamento: "Insulina NPH", tipo: "omissao", intencionalidade: "nao_intencional", risco: "grave", critica: true, fontes: ["f1", "f3", "f5"], descricao: "A insulina basal domiciliar (NPH) não foi prescrita. Com a bomba de insulina da UTI suspensa, o paciente ficou sem insulina basal e as glicemias subiram (198 a 260 mg/dL).", acao_esperada: "Sugerir retomar insulina basal (NPH ou esquema equivalente) com dose a definir pela equipe e monitorar a glicemia." },
        { id: "d2", medicamento: "Insulina regular", tipo: "dose", intencionalidade: "nao_intencional", risco: "moderado", critica: false, fontes: ["f5"], descricao: "Insulina regular prescrita “conforme glicemia capilar” e “se necessário”, sem esquema de correção, sem faixas de glicemia e sem dose. Medicamento de alta vigilância.", acao_esperada: "Pedir um esquema de correção explícito (faixas de glicemia e doses) ou a dose fixa, com horários." },
        { id: "d3", medicamento: "Omeprazol", tipo: "duplicidade", intencionalidade: "nao_intencional", risco: "leve", critica: false, fontes: ["f3", "f4"], descricao: "Duplicidade de inibidor de bomba de prótons: pantoprazol EV (UTI) mantido e omeprazol VO (domiciliar) acrescentado.", acao_esperada: "Manter um só inibidor de bomba de prótons (por via oral, já que a dieta oral foi liberada) e reavaliar a indicação." },
        { id: "d4", medicamento: "AAS", tipo: "omissao", intencionalidade: "nao_intencional", risco: "moderado", critica: false, fontes: ["f1", "f3", "f2"], descricao: "AAS 100 mg omitido em paciente com cardiopatia isquêmica e stent. Não há justificativa documentada.", acao_esperada: "Sugerir retomar o AAS, se não houver contraindicação, e confirmar com o prescritor." },
        { id: "d5", medicamento: "Enalapril", tipo: "omissao", intencionalidade: "intencional_sem_documentacao", risco: "leve", critica: false, fontes: ["f2"], descricao: "Enalapril suspenso na UTI por hipotensão e lesão renal e não retomado. A suspensão foi proposital, mas a prescrição da enfermaria não diz isso nem quando reavaliar.", acao_esperada: "Documentar a suspensão e definir com a equipe o critério de reintrodução (pressão e creatinina)." },
        { id: "d6", medicamento: "Metformina", tipo: "omissao", intencionalidade: "intencional_documentada", risco: "sem_dano", critica: false, fontes: ["f2"], descricao: "Metformina suspensa por sepse e função renal. O sumário da UTI documenta a decisão.", acao_esperada: "Registrar como discrepância intencional e documentada e reavaliar a retomada com a função renal estável." },
      ],
      bpmh: [
        { medicamento: "Metformina 850 mg, comprimido", uso_real: "1 comprimido no almoço e no jantar", fontes: ["f1", "f3"] },
        { medicamento: "Enalapril 10 mg, comprimido", uso_real: "1 comprimido de 12 em 12 horas", fontes: ["f1", "f3"] },
        { medicamento: "Insulina NPH", uso_real: "20 UI pela manhã e 10 UI à noite", fontes: ["f1", "f3"] },
        { medicamento: "AAS 100 mg, comprimido", uso_real: "1 comprimido ao dia", fontes: ["f1", "f3"] },
        { medicamento: "Atorvastatina 40 mg, comprimido", uso_real: "1 comprimido à noite", fontes: ["f1", "f3"] },
        { medicamento: "Omeprazol 20 mg, cápsula", uso_real: "1 cápsula em jejum", fontes: ["f1", "f3"] },
      ],
      outros_problemas: [
        "Meropenem 1 g 8/8 h: com clearance de cerca de 59 mL/min não precisa de ajuste; reavaliar o descalonamento conforme as culturas.",
        "Glicemias persistentemente acima de 180 mg/dL depois da suspensão da insulina em bomba.",
      ],
    },
  },

  // ---------------------------------------------------------------------------------------------------------------
  // 3. ALTA — insuficiência cardíaca, IECA em casa + sacubitril/valsartana novo, potássio e estatina duplicada
  // ClCr (Cockcroft-Gault) = (140 − 69) × 64 / (72 × 1,1) × 0,85 ≈ 49 mL/min
  // ---------------------------------------------------------------------------------------------------------------
  {
    caso: {
      versao: 2,
      titulo: "Alta de insuficiência cardíaca com remédios antigos em casa",
      resumo: "Dona Rosa fica 9 dias internada por insuficiência cardíaca descompensada e recebe alta hoje. O hospital trocou parte do tratamento. Você reconcilia a prescrição de alta com o que ela tem e usa em casa, e prepara a orientação final.",
      transicao: "alta",
      nivel: "avancado",
      paciente: {
        nome: "Rosa Maria de Lima", idade: 69, sexo: "F", peso_kg: 64, altura_m: 1.58, creatinina_mg_dl: 1.1,
        alergias_registradas: "nenhuma registrada",
        motivo: "Alta hospitalar após internação por insuficiência cardíaca com fração de ejeção reduzida descompensada.",
      },
      fontes: [
        {
          id: "f1", tipo: "relato", titulo: "Conversa com Dona Rosa e o marido, Sr. Antônio",
          texto: "Dona Rosa: “Em casa eu já tenho o enalapril do postinho, e vou continuar tomando, porque é o remédio da pressão e do coração. E agora esse novo que o doutor passou, que é mais forte. Quanto ao colesterol, tenho uma caixa nova de sinvastatina, comprei semana passada, e vi que o doutor passou outro. Vou tomar os dois para não desperdiçar.” Sr. Antônio: “Ela toma o carvedilol de manhã e à noite desde o ano passado, nunca falhou.”",
        },
        {
          id: "f2", tipo: "caixa", titulo: "Sacola de medicamentos trazida pelo marido",
          texto: "Enalapril 10 mg (cartela com 60, retirada há 12 dias). Carvedilol 12,5 mg (cartela aberta). Furosemida 40 mg. Espironolactona 25 mg. AAS 100 mg. Sinvastatina 20 mg (caixa fechada, comprada há 1 semana).",
        },
        {
          id: "f3", tipo: "sumario", titulo: "Sumário da internação (médico assistente)",
          texto: "Internada 9 dias por insuficiência cardíaca descompensada, fração de ejeção de 30%. Na admissão: enalapril e espironolactona suspensos (potássio 5,6 mEq/L e creatinina 1,6 mg/dL); carvedilol suspenso por baixo débito. Potássio caiu a 3,2 mEq/L com a furosemida endovenosa e foi iniciada reposição com cloreto de potássio. Sacubitril/valsartana iniciado no dia 7. Furosemida aumentada para 40 mg 2 vezes ao dia. Sinvastatina trocada por atorvastatina 40 mg. Compensada, peso seco de 64 kg.",
        },
        {
          id: "f4", tipo: "retiradas", titulo: "Extrato de dispensação da UBS (6 meses)",
          texto: "Enalapril: 60 comprimidos todo mês. Carvedilol: 60 comprimidos todo mês. Furosemida: 30 comprimidos todo mês. Espironolactona: 30 comprimidos todo mês. AAS: 30 comprimidos todo mês. Sinvastatina: 30 comprimidos todo mês.",
        },
        {
          id: "f5", tipo: "exames", titulo: "Exames e sinais da alta",
          texto: "Potássio 5,1 mEq/L. Creatinina 1,1 mg/dL. Sódio 138 mEq/L. PA 104/66 mmHg. FC 78 bpm. Peso 64 kg.",
          nota: "O potássio de hoje é o da prescrição de alta, depois de 5 dias de reposição.",
        },
      ],
    },
    prescricao: [
      { medicamento: "Sacubitril/valsartana", dose: "49/51 mg", via: "VO", frequencia: "12/12 h" },
      { medicamento: "Furosemida", dose: "40 mg", via: "VO", frequencia: "2 vezes ao dia (manhã e início da tarde)" },
      { medicamento: "Espironolactona", dose: "25 mg", via: "VO", frequencia: "1 vez ao dia" },
      { medicamento: "Cloreto de potássio 6% xarope", dose: "10 mL", via: "VO", frequencia: "2 vezes ao dia" },
      { medicamento: "Atorvastatina", dose: "40 mg", via: "VO", frequencia: "1 vez ao dia, à noite" },
      { medicamento: "AAS", dose: "100 mg", via: "VO", frequencia: "1 vez ao dia" },
    ],
    gabarito: {
      discrepancias: [
        { id: "d1", medicamento: "Enalapril", tipo: "duplicidade", intencionalidade: "nao_intencional", risco: "grave", critica: true, fontes: ["f1", "f2", "f4"], descricao: "A paciente pretende continuar o enalapril em casa junto com o sacubitril/valsartana novo. A associação de IECA com sacubitril/valsartana é contraindicada (risco de angioedema), e é preciso um intervalo de 36 horas entre eles.", acao_esperada: "Orientar a paciente a NÃO tomar o enalapril, comunicar o prescritor, retirar a cartela de enalapril de casa e pedir que ele seja formalmente suspenso (inclusive na UBS)." },
        { id: "d2", medicamento: "Cloreto de potássio", tipo: "interacao", intencionalidade: "nao_intencional", risco: "moderado", critica: false, fontes: ["f5", "f3"], descricao: "Reposição de potássio mantida na alta, com potássio de 5,1 mEq/L, em associação com espironolactona e sacubitril/valsartana (três fatores que elevam o potássio). A reposição foi iniciada para a hipocalemia da furosemida endovenosa e não foi reavaliada.", acao_esperada: "Sugerir suspender o cloreto de potássio e dosar potássio e creatinina em cerca de uma semana." },
        { id: "d3", medicamento: "Carvedilol", tipo: "omissao", intencionalidade: "nao_intencional", risco: "moderado", critica: false, fontes: ["f1", "f3", "f4"], descricao: "O carvedilol, suspenso por baixo débito na admissão, não voltou na prescrição de alta, e não há documentação de que a suspensão deva continuar. A paciente está compensada, com PA 104/66 mmHg e FC 78 bpm.", acao_esperada: "Confirmar com o prescritor se o betabloqueador deve ser retomado agora (em dose baixa) e documentar a decisão." },
        { id: "d4", medicamento: "Sinvastatina", tipo: "duplicidade", intencionalidade: "nao_intencional", risco: "moderado", critica: false, fontes: ["f1", "f2", "f4"], descricao: "A sinvastatina foi trocada por atorvastatina 40 mg, mas a paciente tem uma caixa nova de sinvastatina e pretende tomar as duas estatinas.", acao_esperada: "Orientar a paciente a tomar só a atorvastatina, retirar a sinvastatina de casa e avisar a UBS para suspendê-la." },
        { id: "d5", medicamento: "Furosemida", tipo: "dose", intencionalidade: "intencional_documentada", risco: "sem_dano", critica: false, fontes: ["f3"], descricao: "A dose da furosemida aumentou de 40 mg 1 vez ao dia para 40 mg 2 vezes ao dia, com decisão documentada no sumário.", acao_esperada: "Registrar como discrepância intencional e documentada e orientar a paciente sobre a nova dose, o horário e a pesagem diária." },
      ],
      bpmh: [
        { medicamento: "Enalapril 10 mg, comprimido", uso_real: "1 comprimido de 12 em 12 horas, regular (cartela retirada há 12 dias)", fontes: ["f1", "f2", "f4"] },
        { medicamento: "Carvedilol 12,5 mg, comprimido", uso_real: "1 comprimido de manhã e à noite, regular", fontes: ["f1", "f2", "f4"] },
        { medicamento: "Furosemida 40 mg, comprimido", uso_real: "1 comprimido ao dia", fontes: ["f2", "f4"] },
        { medicamento: "Espironolactona 25 mg, comprimido", uso_real: "1 comprimido ao dia", fontes: ["f2", "f4"] },
        { medicamento: "AAS 100 mg, comprimido", uso_real: "1 comprimido ao dia", fontes: ["f2", "f4"] },
        { medicamento: "Sinvastatina 20 mg, comprimido", uso_real: "1 comprimido à noite, regular", fontes: ["f1", "f2", "f4"] },
      ],
      outros_problemas: [
        "Sacubitril/valsartana exige 36 horas sem IECA: orientar e confirmar o intervalo antes da primeira dose em casa.",
        "Com clearance de cerca de 49 mL/min não há ajuste de dose, mas é preciso monitorar potássio e creatinina em 1 semana.",
        "Orientar pesagem diária, restrição de sal e sinais de piora (ganho de peso acima de 2 kg em 3 dias).",
      ],
    },
  },
];
