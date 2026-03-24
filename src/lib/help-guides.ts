export type HelpStep = {
  title: string;
  description: string;
  tip?: string;
};

export type ModuleGuide = {
  moduleKey: string;
  title: string;
  steps: HelpStep[];
};

export const helpGuides: Record<string, ModuleGuide> = {
  // ==================== AVALIAÇÕES ====================
  exams: {
    moduleKey: "exams",
    title: "Como usar o módulo de Provas",
    steps: [
      {
        title: "Crie uma turma",
        description: "Vá em Turmas e cadastre seus alunos. A turma será usada para vincular provas e acompanhar desempenho.",
        tip: "Você pode importar alunos de uma planilha CSV para agilizar o cadastro."
      },
      {
        title: "Monte o Banco de Questões",
        description: "Acesse o Banco de Questões e crie questões de múltipla escolha, V/F ou dissertativas. Organize por disciplina e dificuldade.",
        tip: "Use a IA para gerar questões automaticamente — basta informar o tema e o nível de dificuldade."
      },
      {
        title: "Monte a prova no Composer",
        description: "No Composer, selecione questões do banco e organize em seções. Defina pontuação por questão e configure o cabeçalho.",
        tip: "Você pode salvar configurações de prova como template para reutilizar em avaliações futuras."
      },
      {
        title: "Publique a prova",
        description: "Clique em Publicar, defina tempo limite e período de acesso. Um código de acesso será gerado automaticamente.",
        tip: "Compartilhe o código com os alunos — eles acessam pelo Portal do Aluno sem precisar de cadastro."
      },
      {
        title: "Monitore em tempo real",
        description: "Acompanhe quem está fazendo a prova, tempo restante e status de cada aluno no painel de monitoramento.",
        tip: "Você pode encerrar a prova antecipadamente se necessário."
      }
    ]
  },

  osce: {
    moduleKey: "osce",
    title: "Como usar o OSCE",
    steps: [
      {
        title: "Crie um exame OSCE",
        description: "Defina título, descrição e vincule a uma turma. O OSCE é ideal para avaliar habilidades clínicas em estações práticas.",
        tip: "O OSCE (Objective Structured Clinical Examination) avalia competências clínicas de forma padronizada."
      },
      {
        title: "Configure as estações",
        description: "Crie estações com cenário clínico, materiais de apoio e tempo por estação. Cada estação avalia uma competência específica.",
        tip: "Use a IA para gerar estações completas — ela cria cenário, checklist e materiais automaticamente."
      },
      {
        title: "Monte o checklist de avaliação",
        description: "Para cada estação, defina os itens do checklist que o avaliador irá pontuar durante a observação do aluno.",
        tip: "Checklists com 8-12 itens são ideais — específicos o suficiente para padronizar, mas práticos para avaliar."
      },
      {
        title: "Configure o circuito",
        description: "Organize as estações em um circuito, defina a ordem de rotação e o tempo total do exame.",
        tip: "O timer automático ajuda a controlar o tempo de cada estação durante o circuito."
      },
      {
        title: "Ative e avalie",
        description: "Ative o circuito, distribua avaliadores por estação e inicie o exame. Os avaliadores preenchem o checklist em tempo real.",
        tip: "Avaliadores podem acessar pelo celular — o checklist é responsivo e fácil de preencher."
      },
      {
        title: "Analise os resultados",
        description: "Veja o desempenho por aluno e por estação, com gráfico radar mostrando competências fortes e fracas.",
        tip: "O gráfico radar é excelente para dar feedback visual aos alunos sobre suas competências."
      }
    ]
  },

  sct: {
    moduleKey: "sct",
    title: "Como usar o SCT",
    steps: [
      {
        title: "Crie um exame SCT",
        description: "O SCT (Script Concordance Test) avalia raciocínio clínico comparando respostas dos alunos com um painel de especialistas.",
        tip: "O SCT é ideal para avaliar incerteza clínica — não há resposta 'certa', mas sim concordância com especialistas."
      },
      {
        title: "Monte os cenários",
        description: "Crie cenários clínicos com hipóteses diagnósticas e novas informações. Para cada cenário, defina as opções da escala Likert.",
        tip: "Use cenários com dilemas clínicos reais — situações onde a informação adicional muda o raciocínio."
      },
      {
        title: "Configure o painel de especialistas",
        description: "Convide especialistas para responderem os cenários. As respostas deles formam o gabarito ponderado.",
        tip: "Recomenda-se no mínimo 10 especialistas para um painel robusto. Quanto mais, melhor a calibração."
      },
      {
        title: "Aplique aos alunos",
        description: "Publique o exame e compartilhe o código de acesso. Os alunos respondem no Portal do Aluno.",
        tip: "Explique aos alunos que a pontuação é baseada em concordância, não em acerto/erro absoluto."
      }
    ]
  },

  kfe: {
    moduleKey: "kfe",
    title: "Como usar o KFE",
    steps: [
      {
        title: "Crie um exame KFE",
        description: "O KFE (Key Feature Exam) avalia decisões críticas em casos clínicos — os pontos-chave que definem o desfecho do caso.",
        tip: "Foque nas decisões que realmente impactam o prognóstico — essas são as 'key features'."
      },
      {
        title: "Monte os casos clínicos",
        description: "Crie casos com cenário inicial e etapas progressivas. Cada etapa apresenta uma decisão-chave com opções.",
        tip: "Casos com 3-5 etapas são ideais — suficientes para avaliar o raciocínio sem cansar o aluno."
      },
      {
        title: "Configure pontuação",
        description: "Defina respostas corretas, parciais e incorretas para cada etapa. A pontuação parcial valoriza raciocínios intermediários.",
        tip: "Use pontuação parcial para diferenciar erros graves de escolhas subótimas mas aceitáveis."
      },
      {
        title: "Aplique e analise",
        description: "Publique o exame, os alunos respondem sequencialmente. Analise quais etapas geraram mais dificuldade.",
        tip: "Etapas com baixo acerto indicam gaps de conhecimento que merecem revisão em aula."
      }
    ]
  },

  sjt: {
    moduleKey: "sjt",
    title: "Como usar o SJT",
    steps: [
      {
        title: "Crie um exame SJT",
        description: "O SJT (Situational Judgement Test) avalia julgamento profissional em cenários éticos e de conduta.",
        tip: "O SJT é muito usado em residências médicas e concursos — avalia soft skills e profissionalismo."
      },
      {
        title: "Crie cenários situacionais",
        description: "Descreva situações do dia-a-dia profissional com dilemas éticos, comunicação ou trabalho em equipe.",
        tip: "Use situações reais (anonimizadas) — elas geram mais engajamento e reflexão nos alunos."
      },
      {
        title: "Defina ranking de ações",
        description: "Para cada cenário, liste ações possíveis e defina a ordem de adequação (da mais apropriada à menos).",
        tip: "O aluno precisa ranquear as ações — isso avalia nuance de julgamento, não apenas certo/errado."
      },
      {
        title: "Aplique aos alunos",
        description: "Compartilhe o código de acesso. A pontuação considera a proximidade do ranking do aluno com o gabarito.",
        tip: "Discuta os cenários em classe após a aplicação — o SJT é excelente para promover debate ético."
      }
    ]
  },

  progress_test: {
    moduleKey: "progress_test",
    title: "Como usar o Progress Test",
    steps: [
      {
        title: "Crie um teste de progresso",
        description: "O Progress Test avalia o crescimento longitudinal do conhecimento do aluno ao longo do curso.",
        tip: "Aplique o mesmo teste periodicamente (semestral/anual) para medir evolução — esse é o grande diferencial."
      },
      {
        title: "Organize questões por área",
        description: "Distribua questões proporcionalmente entre as grandes áreas do curso para cobertura abrangente.",
        tip: "Inclua questões de todos os períodos — alunos iniciantes acertarão menos e isso é esperado."
      },
      {
        title: "Aplique e compare",
        description: "Compartilhe o código de acesso. Compare o desempenho entre aplicações para visualizar a curva de aprendizagem.",
        tip: "O valor do Progress Test está na comparação longitudinal, não na nota isolada."
      }
    ]
  },

  mock_trial: {
    moduleKey: "mock_trial",
    title: "Como usar o Júri Simulado",
    steps: [
      {
        title: "Crie o caso",
        description: "Monte um caso clínico-jurídico com contexto, personagens (réu, defesa, acusação, testemunhas) e evidências.",
        tip: "Use a IA para gerar casos completos com personagens e roteiro — economiza horas de preparação."
      },
      {
        title: "Distribua os papéis",
        description: "Crie grupos e atribua papéis (defesa, acusação, juiz, testemunhas). Cada grupo recebe material específico do seu papel.",
        tip: "Misture alunos com diferentes perfis nos grupos — isso enriquece a argumentação."
      },
      {
        title: "Conduza a sessão",
        description: "Inicie a sessão como juiz. Controle as fases (abertura, depoimentos, debates, veredito) com o painel de controle.",
        tip: "Use o timer por fase para manter o ritmo — sessões muito longas perdem engajamento."
      },
      {
        title: "Avalie com formulários",
        description: "Os alunos preenchem formulários de avaliação por pares. O juiz adiciona notas e avaliação qualitativa.",
        tip: "Avaliação por pares aumenta o engajamento — os alunos prestam mais atenção quando avaliam colegas."
      }
    ]
  },

  clinical_observation: {
    moduleKey: "clinical_observation",
    title: "Como usar Mini-CEX / DOPS",
    steps: [
      {
        title: "Crie uma observação",
        description: "Defina o tipo (Mini-CEX para consultas, DOPS para procedimentos) e configure os domínios de competência.",
        tip: "Mini-CEX: ideal para avaliar consultas clínicas. DOPS: ideal para procedimentos técnicos."
      },
      {
        title: "Configure os domínios",
        description: "Personalize os domínios de avaliação (ex: anamnese, exame físico, raciocínio clínico, comunicação).",
        tip: "Use 5-8 domínios — detalhado o suficiente para feedback útil, mas prático para avaliar em tempo real."
      },
      {
        title: "Avalie em tempo real",
        description: "Durante o atendimento, pontue cada domínio na escala. Ao final, registre feedback qualitativo e tempo.",
        tip: "Faça a avaliação imediatamente após observar — detalhes se perdem rapidamente."
      },
      {
        title: "Dê feedback ao aluno",
        description: "Compartilhe a avaliação com o aluno, destacando pontos fortes e áreas de melhoria.",
        tip: "O feedback é a parte mais valiosa — reserve pelo menos 5 minutos para discussão com o aluno."
      }
    ]
  },

  virtual_patients: {
    moduleKey: "virtual_patients",
    title: "Como usar Pacientes Virtuais",
    steps: [
      {
        title: "Crie um paciente virtual",
        description: "Configure o perfil clínico: dados pessoais, queixa principal, história clínica, personalidade e comportamento.",
        tip: "Quanto mais detalhado o perfil, mais realista será a interação do aluno com o paciente virtual."
      },
      {
        title: "Configure o comportamento",
        description: "Defina como o paciente reage a diferentes abordagens — cooperativo, ansioso, resistente, etc.",
        tip: "Pacientes difíceis são os mais educativos — eles forçam o aluno a adaptar sua comunicação."
      },
      {
        title: "Compartilhe com a turma",
        description: "Vincule o paciente a uma turma e compartilhe o código de acesso. Os alunos conversam via chat com IA.",
        tip: "Use como atividade pré-aula — o aluno pratica antes do atendimento real."
      }
    ]
  },

  // ==================== FARMÁCIA CLÍNICA ====================
  anamnese: {
    moduleKey: "anamnese",
    title: "Como usar o módulo de Anamnese",
    steps: [
      {
        title: "Crie a sala",
        description: "Defina título e descrição da simulação. Um código de acesso será gerado automaticamente para os alunos.",
        tip: "Use nomes descritivos como 'Anamnese — Paciente Diabético' para facilitar a organização."
      },
      {
        title: "Monte o formulário",
        description: "Crie os campos do formulário de anamnese ou use um template pronto. Defina pontuação por item.",
        tip: "Use templates nativos como ponto de partida — eles já incluem os campos validados por boas práticas."
      },
      {
        title: "Configure o espelho de respostas",
        description: "Crie o espelho (gabarito) com respostas esperadas e pontuação por alternativa (total, parcial, zero).",
        tip: "A pontuação parcial permite diferenciar respostas incompletas de respostas erradas."
      },
      {
        title: "Adicione os alunos",
        description: "Cadastre os alunos ou divida a sala em duplas. Cada aluno/dupla receberá o formulário ao entrar.",
        tip: "Duplas promovem discussão clínica — um aluno entrevista, o outro registra."
      },
      {
        title: "Ative a sala",
        description: "Mude o status para 'ativa'. Os alunos acessam pelo código PIN e preenchem o formulário.",
        tip: "Mantenha a sala ativa apenas durante o período da simulação para evitar acessos indevidos."
      },
      {
        title: "Avalie as respostas",
        description: "No painel de controle, veja as respostas de cada aluno/dupla comparadas ao espelho. Atribua notas.",
        tip: "A correção automática por IA economiza tempo — revise apenas os casos que precisam de ajuste."
      }
    ]
  },

  soap: {
    moduleKey: "soap",
    title: "Como usar o módulo SOAP",
    steps: [
      {
        title: "Crie a sala SOAP",
        description: "Configure a simulação com título e caso clínico. O SOAP (Subjetivo, Objetivo, Avaliação, Plano) é o registro padrão.",
        tip: "O método SOAP é universal em saúde — ensine seus alunos a documentar de forma padronizada."
      },
      {
        title: "Configure formulário e espelho",
        description: "Monte o formulário com as 4 seções SOAP ou use um template. Configure o espelho com respostas esperadas.",
        tip: "Templates nativos de SOAP já incluem os campos validados por protocolos internacionais."
      },
      {
        title: "Organize as duplas",
        description: "Divida os alunos em duplas. Cada dupla trabalhará colaborativamente no preenchimento do SOAP.",
        tip: "Troque os papéis entre as simulações — quem documentou na primeira, entrevista na segunda."
      },
      {
        title: "Ative e acompanhe",
        description: "Ative a sala e monitore o progresso das duplas em tempo real. Após envio, avalie com o espelho.",
        tip: "As duplas têm 15 segundos para revisar após o envio antes de serem redirecionadas."
      }
    ]
  },

  reconciliacao: {
    moduleKey: "reconciliacao",
    title: "Como usar o módulo de Reconciliação",
    steps: [
      {
        title: "Crie a sala de Reconciliação",
        description: "Configure a simulação de reconciliação medicamentosa. Crie casos clínicos com listas de medicamentos.",
        tip: "A reconciliação medicamentosa previne erros de medicação — use casos reais (anonimizados) para maior impacto."
      },
      {
        title: "Monte os casos clínicos",
        description: "Cada caso deve ter a lista de medicamentos prescritos vs. em uso. Inclua discrepâncias intencionais.",
        tip: "Inclua pelo menos 2-3 discrepâncias por caso (duplicidade, dose errada, interação)."
      },
      {
        title: "Configure formulários e espelhos",
        description: "Monte o formulário de reconciliação e o espelho para cada caso clínico.",
        tip: "O espelho por caso permite avaliação granular — cada caso pode ter pontuação independente."
      },
      {
        title: "Ative e conclua",
        description: "Ative a sala, monitore as duplas e use o botão 'Concluir' para finalizar quando todos terminarem.",
        tip: "O botão Concluir encerra a atividade definitivamente — certifique-se de que todos enviaram."
      }
    ]
  },

  documentacao: {
    moduleKey: "documentacao",
    title: "Como usar o módulo de Documentação",
    steps: [
      {
        title: "Crie a sala de Documentação",
        description: "Configure a simulação de documentação clínica. Este módulo pode ser vinculado a uma sala de reconciliação.",
        tip: "Vincular à reconciliação cria um fluxo contínuo: reconcilia → documenta. Mais realista!"
      },
      {
        title: "Configure os formulários",
        description: "Crie formulários de encaminhamento e quadro resumo de medicamentos, ou use templates.",
        tip: "O quadro resumo de medicamentos é obrigatório em hospitais — ensine seus alunos a preenchê-lo corretamente."
      },
      {
        title: "Monte os espelhos",
        description: "Configure espelhos de resposta para cada formulário e caso clínico.",
        tip: "Espelhos detalhados permitem correção automática e feedback mais preciso."
      },
      {
        title: "Ative, acompanhe e conclua",
        description: "Ative a sala, monitore o progresso e use 'Concluir' para finalizar a atividade.",
        tip: "Após o envio, os alunos são redirecionados automaticamente em 15 segundos."
      }
    ]
  },

  // ==================== ENFERMAGEM CLÍNICA ====================
  acolhimento: {
    moduleKey: "acolhimento",
    title: "Como usar o módulo de Acolhimento",
    steps: [
      {
        title: "Crie a sala",
        description: "Configure a simulação de acolhimento com classificação de risco. Defina o cenário clínico.",
        tip: "Use o protocolo de Manchester como base — é o padrão mais utilizado no Brasil."
      },
      {
        title: "Monte o formulário",
        description: "Crie campos para sinais vitais, queixa principal, escala de dor e classificação de risco. Use templates!",
        tip: "Templates nativos já incluem os fluxogramas de classificação Manchester."
      },
      {
        title: "Configure espelho e alunos",
        description: "Defina as respostas esperadas no espelho e cadastre os alunos ou duplas.",
        tip: "Na prática, o acolhimento é individual — mas em simulação, duplas permitem discussão."
      },
      {
        title: "Ative e avalie",
        description: "Ative a sala, monitore e avalie as respostas comparando com o espelho.",
        tip: "Foque na classificação de risco — é o ponto mais crítico da avaliação de acolhimento."
      }
    ]
  },

  sae: {
    moduleKey: "sae",
    title: "Como usar o módulo SAE",
    steps: [
      {
        title: "Crie a sala de SAE",
        description: "Configure a simulação da Sistematização da Assistência de Enfermagem com as 5 etapas do processo.",
        tip: "A SAE é obrigatória por lei (COFEN 358/2009) — garanta que seus alunos dominem todas as etapas."
      },
      {
        title: "Configure o formulário",
        description: "Monte campos para: Histórico, Diagnóstico (NANDA), Planejamento (NOC), Implementação (NIC) e Avaliação.",
        tip: "Use templates nativos que já seguem a taxonomia NANDA-NOC-NIC."
      },
      {
        title: "Defina espelho e organize alunos",
        description: "Configure respostas esperadas com diagnósticos e intervenções prioritárias. Organize em duplas.",
        tip: "Priorize diagnósticos de enfermagem — é onde os alunos mais erram."
      },
      {
        title: "Ative e avalie",
        description: "Monitore o preenchimento e avalie usando correção automática ou manual.",
        tip: "A IA consegue avaliar correlação diagnóstico-intervenção — use como primeira triagem."
      }
    ]
  },

  evolucao_enfermagem: {
    moduleKey: "evolucao_enfermagem",
    title: "Como usar o módulo de Evolução",
    steps: [
      {
        title: "Crie a sala de Evolução",
        description: "Configure a simulação de evolução de enfermagem com registro cronológico do paciente.",
        tip: "A evolução registra mudanças no quadro clínico — use casos com progressão temporal."
      },
      {
        title: "Monte formulário e espelho",
        description: "Crie campos para registro SOAP adaptado para enfermagem. Use templates como ponto de partida.",
        tip: "O formato SOAP adaptado (com diagnósticos de enfermagem) é o mais aceito pelo COFEN."
      },
      {
        title: "Ative e avalie",
        description: "Os alunos registram a evolução e você avalia a qualidade do registro clínico.",
        tip: "Avalie clareza, objetividade e uso correto da terminologia de enfermagem."
      }
    ]
  },

  passagem_plantao: {
    moduleKey: "passagem_plantao",
    title: "Como usar o módulo de Passagem de Plantão",
    steps: [
      {
        title: "Crie a sala",
        description: "Configure a simulação de passagem de plantão usando a metodologia SBAR.",
        tip: "SBAR (Situation, Background, Assessment, Recommendation) é padrão internacional de segurança."
      },
      {
        title: "Configure o formulário SBAR",
        description: "Monte campos para Situação, Background, Avaliação e Recomendação. Use o template nativo!",
        tip: "O SBAR reduz erros de comunicação em até 30% — enfatize isso para os alunos."
      },
      {
        title: "Organize e ative",
        description: "Cadastre alunos, ative a sala e monitore o preenchimento.",
        tip: "Simule uma troca de turno real — com pressão de tempo e múltiplos pacientes."
      }
    ]
  },

  // ==================== NUTRIÇÃO CLÍNICA ====================
  anamnese_nutricional: {
    moduleKey: "anamnese_nutricional",
    title: "Como usar o módulo de Anamnese Nutricional",
    steps: [
      {
        title: "Crie a sala",
        description: "Configure a simulação de anamnese nutricional com foco em história alimentar e hábitos.",
        tip: "Inclua recordatório 24h e questionário de frequência alimentar — são as ferramentas padrão."
      },
      {
        title: "Monte formulário e espelho",
        description: "Crie campos para dados pessoais, história alimentar, sintomas GI, alergias e intolerâncias.",
        tip: "Use templates nativos que seguem as diretrizes do CFN."
      },
      {
        title: "Ative e avalie",
        description: "Organize alunos, ative a sala e avalie a qualidade da anamnese nutricional.",
        tip: "Avalie se o aluno investiga hábitos culturais e socioeconômicos — isso impacta o plano alimentar."
      }
    ]
  },

  avaliacao_antropometrica: {
    moduleKey: "avaliacao_antropometrica",
    title: "Como usar o módulo de Avaliação Antropométrica",
    steps: [
      {
        title: "Crie a sala",
        description: "Configure a simulação de avaliação antropométrica com medidas corporais e classificação nutricional.",
        tip: "Inclua IMC, circunferências e dobras cutâneas — cada medida tem seu protocolo específico."
      },
      {
        title: "Configure formulário com cálculos",
        description: "Monte campos para peso, altura, IMC, circunferências e classificação. Use templates com fórmulas.",
        tip: "Templates nativos já incluem valores de referência da OMS para classificação."
      },
      {
        title: "Ative e avalie",
        description: "Os alunos registram medidas e classificações. Avalie precisão e interpretação.",
        tip: "Erros de classificação são comuns — foque na interpretação dos resultados, não só nas medidas."
      }
    ]
  },

  plano_alimentar: {
    moduleKey: "plano_alimentar",
    title: "Como usar o módulo de Plano Alimentar",
    steps: [
      {
        title: "Crie a sala",
        description: "Configure a simulação de elaboração de plano alimentar com cálculo de necessidades energéticas.",
        tip: "Vincule a um caso clínico com dados antropométricos para um fluxo completo."
      },
      {
        title: "Monte o formulário",
        description: "Crie campos para VET, distribuição de macronutrientes, refeições e orientações específicas.",
        tip: "Templates nativos incluem cálculo de Harris-Benedict e distribuição por refeição."
      },
      {
        title: "Ative e avalie",
        description: "Avalie a adequação do plano às necessidades do paciente e condições clínicas.",
        tip: "Verifique se o aluno adaptou o plano às preferências e condições socioeconômicas do paciente."
      }
    ]
  },

  orientacao_nutricional: {
    moduleKey: "orientacao_nutricional",
    title: "Como usar o módulo de Orientação Nutricional",
    steps: [
      {
        title: "Crie a sala",
        description: "Configure a simulação de orientação nutricional com foco em educação alimentar.",
        tip: "A orientação é tão importante quanto o plano — sem adesão, nenhum plano funciona."
      },
      {
        title: "Configure formulário e espelho",
        description: "Monte campos para metas, orientações por patologia e materiais educativos.",
        tip: "Use linguagem acessível no espelho — avalie se o aluno simplifica termos técnicos."
      },
      {
        title: "Ative e avalie",
        description: "Avalie a qualidade das orientações: clareza, adequação e empatia na comunicação.",
        tip: "O melhor plano é o que o paciente entende e consegue seguir."
      }
    ]
  },

  // ==================== ODONTOLOGIA CLÍNICA ====================
  anamnese_odontologica: {
    moduleKey: "anamnese_odontologica",
    title: "Como usar o módulo de Anamnese Odontológica",
    steps: [
      {
        title: "Crie a sala",
        description: "Configure a simulação de anamnese odontológica com foco em história dental e médica.",
        tip: "Inclua medicamentos em uso — muitos afetam o tratamento odontológico (anticoagulantes, bisfosfonatos)."
      },
      {
        title: "Monte formulário e espelho",
        description: "Crie campos para QP, HDA, antecedentes, medicamentos, alergias e hábitos parafuncionais.",
        tip: "Use templates nativos baseados nas fichas do CFO."
      },
      {
        title: "Ative e avalie",
        description: "Avalie a completude da anamnese e a identificação de fatores de risco.",
        tip: "Foque em comorbidades que contraindicam procedimentos — é onde erros são mais perigosos."
      }
    ]
  },

  exame_clinico_odonto: {
    moduleKey: "exame_clinico_odonto",
    title: "Como usar o módulo de Exame Clínico",
    steps: [
      {
        title: "Crie a sala",
        description: "Configure a simulação de exame clínico odontológico com exame intra e extraoral.",
        tip: "O exame clínico sistematizado é a base para todo tratamento odontológico."
      },
      {
        title: "Configure formulário com odontograma",
        description: "Monte campos para exame extraoral, intraoral, PSR, índice de placa e odontograma.",
        tip: "Templates nativos incluem odontograma padrão FDI e classificação PSR."
      },
      {
        title: "Ative e avalie",
        description: "Avalie a sistematização do exame e a precisão dos achados registrados.",
        tip: "Registros incompletos são a principal causa de falhas no diagnóstico — enfatize isso."
      }
    ]
  },

  plano_tratamento_odonto: {
    moduleKey: "plano_tratamento_odonto",
    title: "Como usar o módulo de Plano de Tratamento",
    steps: [
      {
        title: "Crie a sala",
        description: "Configure a simulação de elaboração de plano de tratamento odontológico.",
        tip: "Vincule ao caso do exame clínico para continuidade — os alunos planejam com base no que examinaram."
      },
      {
        title: "Monte formulário de plano",
        description: "Crie campos para diagnósticos, priorização, procedimentos por sessão e prognóstico.",
        tip: "Templates nativos incluem priorização por urgência, necessidade e complexidade."
      },
      {
        title: "Ative e avalie",
        description: "Avalie a lógica de priorização e a adequação dos procedimentos propostos.",
        tip: "A priorização é a competência mais importante — atender urgência antes de estética."
      }
    ]
  },

  orientacao_higiene: {
    moduleKey: "orientacao_higiene",
    title: "Como usar o módulo de Orientação de Higiene",
    steps: [
      {
        title: "Crie a sala",
        description: "Configure a simulação de orientação de higiene oral personalizada.",
        tip: "A orientação deve ser adaptada ao perfil do paciente — criança, idoso, ortodôntico, etc."
      },
      {
        title: "Configure formulário e espelho",
        description: "Monte campos para técnica de escovação, fio dental, enxaguatório e orientações específicas.",
        tip: "Use templates que abordam orientação por condição (gengivite, ortodontia, prótese)."
      },
      {
        title: "Ative e avalie",
        description: "Avalie a personalização e a clareza das orientações fornecidas.",
        tip: "A melhor orientação é aquela que o paciente consegue aplicar no dia-a-dia."
      }
    ]
  },

  // ==================== MEDICINA ====================
  anamnese_medica: {
    moduleKey: "anamnese_medica",
    title: "Como usar o módulo de Anamnese Médica",
    steps: [
      {
        title: "Crie a sala",
        description: "Configure a simulação de anamnese médica completa com história clínica estruturada.",
        tip: "A anamnese corresponde a 80% do diagnóstico — garanta que seus alunos dominem cada seção."
      },
      {
        title: "Monte o formulário",
        description: "Crie campos para QP, HDA, ISDA, antecedentes pessoais/familiares, medicamentos e hábitos.",
        tip: "Use templates nativos com estrutura do Porto (Semiologia Médica) — referência no Brasil."
      },
      {
        title: "Configure espelho e organize",
        description: "Defina respostas esperadas com pontuação parcial. Organize alunos em duplas.",
        tip: "Avalie a qualidade da HDA — é a seção que mais diferencia um bom clínico."
      },
      {
        title: "Ative e avalie",
        description: "Monitore e avalie a completude e o raciocínio clínico demonstrado na anamnese.",
        tip: "Use a correção por IA para triagem inicial — revise manualmente os casos limítrofes."
      }
    ]
  },

  exame_fisico: {
    moduleKey: "exame_fisico",
    title: "Como usar o módulo de Exame Físico",
    steps: [
      {
        title: "Crie a sala",
        description: "Configure a simulação de exame físico com avaliação sistematizada por aparelhos.",
        tip: "Use casos com achados positivos claros — o aluno precisa identificar e registrar corretamente."
      },
      {
        title: "Configure formulário",
        description: "Monte campos para ectoscopia, sinais vitais e exame por aparelhos (cardiovascular, pulmonar, etc.).",
        tip: "Templates nativos seguem a sequência cefalocaudal — padrão mais aceito na semiologia."
      },
      {
        title: "Ative e avalie",
        description: "Avalie a sistematização do exame e a precisão na descrição dos achados.",
        tip: "Foque na descrição semiológica correta — 'sopro holossistólico em foco mitral' vs. 'sopro no coração'."
      }
    ]
  },

  raciocinio_clinico: {
    moduleKey: "raciocinio_clinico",
    title: "Como usar o módulo de Raciocínio Clínico",
    steps: [
      {
        title: "Crie a sala",
        description: "Configure a simulação de raciocínio clínico com formulação de hipóteses diagnósticas.",
        tip: "Este módulo avalia a capacidade de integrar dados e formular diagnósticos — competência central."
      },
      {
        title: "Monte formulário e espelho",
        description: "Crie campos para hipóteses, diagnóstico diferencial, exames complementares e justificativas.",
        tip: "Use templates com espaço para justificativa — o processo importa mais que a resposta final."
      },
      {
        title: "Ative e avalie",
        description: "Avalie a lógica do raciocínio, não apenas o diagnóstico final.",
        tip: "Valorize diagnósticos diferenciais bem fundamentados — mesmo que o principal esteja errado."
      }
    ]
  },

  plano_terapeutico: {
    moduleKey: "plano_terapeutico",
    title: "Como usar o módulo de Plano Terapêutico",
    steps: [
      {
        title: "Crie a sala",
        description: "Configure a simulação de elaboração de plano terapêutico integrado.",
        tip: "Vincule ao caso de raciocínio clínico para um fluxo completo: diagnóstico → tratamento."
      },
      {
        title: "Configure formulário",
        description: "Monte campos para conduta farmacológica, não farmacológica, encaminhamentos e seguimento.",
        tip: "Templates nativos incluem checklist de prescrição segura (dose, via, intervalo, duração)."
      },
      {
        title: "Ative e avalie",
        description: "Avalie a adequação do plano ao diagnóstico e às condições do paciente.",
        tip: "Verifique se o aluno considerou contraindicações, interações e adesão do paciente."
      }
    ]
  },

  // ==================== FISIOTERAPIA ====================
  avaliacao_funcional: {
    moduleKey: "avaliacao_funcional",
    title: "Como usar o módulo de Avaliação Funcional",
    steps: [
      {
        title: "Crie a sala",
        description: "Configure a simulação de avaliação funcional fisioterapêutica completa.",
        tip: "A avaliação funcional é a base do raciocínio em fisioterapia — inclua testes especiais relevantes."
      },
      {
        title: "Monte o formulário",
        description: "Crie campos para anamnese funcional, inspeção, palpação, testes especiais, ADM e força muscular.",
        tip: "Use templates nativos que incluem escalas validadas (EVA, Barthel, DASH)."
      },
      {
        title: "Ative e avalie",
        description: "Avalie a sistematização da avaliação e a escolha adequada de testes especiais.",
        tip: "Avalie se o aluno selecionou testes relevantes para a queixa — não é preciso fazer todos."
      }
    ]
  },

  cinetico_funcional: {
    moduleKey: "cinetico_funcional",
    title: "Como usar o módulo de Diagnóstico Cinético-Funcional",
    steps: [
      {
        title: "Crie a sala",
        description: "Configure a simulação de diagnóstico cinético-funcional baseado na CIF.",
        tip: "A CIF é o padrão internacional — os alunos precisam dominar seus componentes."
      },
      {
        title: "Configure formulário CIF",
        description: "Monte campos para função/estrutura do corpo, atividade/participação e fatores contextuais.",
        tip: "Templates nativos seguem a estrutura da CIF com qualificadores padronizados."
      },
      {
        title: "Ative e avalie",
        description: "Avalie a correlação entre achados da avaliação e o diagnóstico funcional formulado.",
        tip: "O diagnóstico funcional deve guiar o tratamento — avalie essa conexão lógica."
      }
    ]
  },

  plano_fisioterapeutico: {
    moduleKey: "plano_fisioterapeutico",
    title: "Como usar o módulo de Plano Fisioterapêutico",
    steps: [
      {
        title: "Crie a sala",
        description: "Configure a simulação de elaboração de plano de tratamento fisioterapêutico.",
        tip: "Vincule ao diagnóstico cinético-funcional para continuidade do raciocínio clínico."
      },
      {
        title: "Monte formulário com objetivos",
        description: "Crie campos para objetivos SMART, recursos terapêuticos, frequência e critérios de alta.",
        tip: "Use templates com objetivos SMART — Específicos, Mensuráveis, Alcançáveis, Relevantes, Temporais."
      },
      {
        title: "Ative e avalie",
        description: "Avalie a coerência entre diagnóstico e plano, e a adequação dos recursos escolhidos.",
        tip: "Verifique se os objetivos são mensuráveis — 'melhorar ADM' vs. 'aumentar flexão de joelho para 120°'."
      }
    ]
  },

  evolucao_fisio: {
    moduleKey: "evolucao_fisio",
    title: "Como usar o módulo de Evolução Fisioterapêutica",
    steps: [
      {
        title: "Crie a sala",
        description: "Configure a simulação de registro de evolução fisioterapêutica por sessão.",
        tip: "A evolução documenta a resposta ao tratamento — essencial para ajustes no plano."
      },
      {
        title: "Configure formulário",
        description: "Monte campos para estado do paciente, condutas realizadas, resposta ao tratamento e plano.",
        tip: "Use templates com formato estruturado — facilita a comparação entre sessões."
      },
      {
        title: "Ative e avalie",
        description: "Avalie a qualidade do registro e a tomada de decisão baseada na evolução.",
        tip: "Bons registros de evolução permitem continuidade do cuidado por outros profissionais."
      }
    ]
  },

  // ==================== BIOMEDICINA ====================
  analise_laboratorial: {
    moduleKey: "analise_laboratorial",
    title: "Como usar o módulo de Análise Laboratorial",
    steps: [
      {
        title: "Crie a sala",
        description: "Configure a simulação de análise laboratorial com tipo de amostra e método analítico.",
        tip: "Inclua fase pré-analítica no caso — erros nessa fase correspondem a 70% dos erros laboratoriais."
      },
      {
        title: "Monte o formulário",
        description: "Crie campos para tipo de amostra, método, reagentes, equipamentos e procedimento.",
        tip: "Use templates nativos que incluem checklist de boas práticas laboratoriais (BPL)."
      },
      {
        title: "Ative e avalie",
        description: "Avalie o conhecimento técnico e a sistematização do procedimento analítico.",
        tip: "Erros de procedimento podem ser tão graves quanto erros de interpretação — avalie ambos."
      }
    ]
  },

  controle_qualidade: {
    moduleKey: "controle_qualidade",
    title: "Como usar o módulo de Controle de Qualidade",
    steps: [
      {
        title: "Crie a sala",
        description: "Configure a simulação de controle de qualidade laboratorial com dados de CQ.",
        tip: "O CQ é obrigatório em todo laboratório — os alunos precisam dominar Westgard e Levey-Jennings."
      },
      {
        title: "Configure formulário com regras",
        description: "Monte campos para controle interno, regras de Westgard, calibração e ações corretivas.",
        tip: "Templates nativos incluem as 6 regras de Westgard com exemplos de violação."
      },
      {
        title: "Ative e avalie",
        description: "Avalie a capacidade de identificar violações e propor ações corretivas adequadas.",
        tip: "Apresente gráficos de Levey-Jennings com violações para o aluno identificar — é mais prático."
      }
    ]
  },

  interpretacao_resultados: {
    moduleKey: "interpretacao_resultados",
    title: "Como usar o módulo de Interpretação de Resultados",
    steps: [
      {
        title: "Crie a sala",
        description: "Configure a simulação de interpretação de resultados laboratoriais com correlação clínica.",
        tip: "Inclua valores limítrofes — são os mais difíceis de interpretar e os mais educativos."
      },
      {
        title: "Monte formulário e espelho",
        description: "Crie campos para valores obtidos, referência, correlação clínica e interferentes.",
        tip: "Templates nativos incluem valores de referência atualizados e fatores interferentes comuns."
      },
      {
        title: "Ative e avalie",
        description: "Avalie a capacidade de correlacionar resultados com o contexto clínico do paciente.",
        tip: "Um resultado 'normal' pode ser anormal no contexto do paciente — avalie essa percepção."
      }
    ]
  },

  laudo_tecnico: {
    moduleKey: "laudo_tecnico",
    title: "Como usar o módulo de Laudo Técnico",
    steps: [
      {
        title: "Crie a sala",
        description: "Configure a simulação de elaboração de laudo técnico laboratorial.",
        tip: "O laudo é o produto final do laboratório — clareza e precisão são obrigatórias."
      },
      {
        title: "Configure formulário de laudo",
        description: "Monte campos para dados do paciente, resultados, observações e responsável técnico.",
        tip: "Templates nativos seguem as normas da ANVISA e PALC para laudos laboratoriais."
      },
      {
        title: "Ative e avalie",
        description: "Avalie a conformidade do laudo com normas regulatórias e a clareza das observações.",
        tip: "Observações técnicas bem escritas podem mudar a conduta médica — enfatize sua importância."
      }
    ]
  },
};
