import type { FormField } from "@/components/forms/types";

export const pharmacyTemplates: {
  area: string;
  module_type: string;
  form_type: string;
  title: string;
  description: string;
  content_json: any;
}[] = [
  {
    "area": "pharmacy",
    "module_type": "anamnese",
    "form_type": "anamnesis",
    "title": "Formulário de Anamnese",
    "description": "Roteiro completo de entrevista farmacêutica com pacientes simulados",
    "content_json": [
      {
        "id": "af-1",
        "label": "Roteiro de Entrevista",
        "type": "section_header",
        "description": "Este roteiro tem como objetivo conduzir uma entrevista farmacêutica com pacientes simulados"
      },
      {
        "id": "af-2",
        "label": "Preparação inicial (antes da consulta)",
        "type": "section_header",
        "description": "- Verifique se você tem papel, caneta ou ficha para registrar informações.\n- Mantenha postura acolhedora, escuta ativa e boa comunicação não verbal.\n- Respire fundo e lembre-se: você está aqui para compreender, não julgar"
      },
      {
        "id": "af-3",
        "label": "Acolhimento do paciente",
        "type": "section_header",
        "description": "- Cumprimente o paciente pelo nome, apresente-se e explique o objetivo da entrevista.\n- Exemplo: \"Bom dia, sou estudante de Farmácia e gostaria de conversar com você sobre o uso dos seus medicamentos. Podemos conversar um pouco?\""
      },
      {
        "id": "af-4",
        "label": "Levantamento de informações",
        "type": "section_header",
        "description": ""
      },
      {
        "id": "af-5",
        "label": "Queixas e sintomas",
        "type": "textarea",
        "required": false,
        "max_score": 0,
        "description": "- O que trouxe você até aqui hoje? - Há quanto tempo está com esse problema? - Houve piora ou melhora recente?"
      },
      {
        "id": "af-6",
        "label": "Histórico de saúde",
        "type": "textarea",
        "required": false,
        "max_score": 0,
        "description": "- Você possui algum problema de saúde já diagnosticado? - Faz acompanhamento médico? - Já realizou exames recentes?"
      },
      {
        "id": "af-7",
        "label": "Medicamentos em uso",
        "type": "textarea",
        "required": false,
        "max_score": 0,
        "description": "- Quais medicamentos você está usando atualmente? - Como você costuma tomar cada um deles (horários, forma)? - Algum medicamento foi iniciado ou interrompido recentemente? - Algum desses medicamentos causa efeitos colaterais?"
      },
      {
        "id": "af-8",
        "label": "Adesão e dificuldades",
        "type": "textarea",
        "required": false,
        "max_score": 0,
        "description": "- Consegue tomar os medicamentos nos horários corretos? - Já esqueceu de tomar algum? - Tem dificuldade para engolir ou usar algum medicamento? - Alguém ajuda a lembrar ou preparar os medicamentos?"
      },
      {
        "id": "af-9",
        "label": "Aspectos sociais e culturais",
        "type": "textarea",
        "required": false,
        "max_score": 0,
        "description": "- Você consome bebidas alcoólicas, fuma ou faz uso de plantas medicinais? - Alguém da sua casa ajuda com os medicamentos? - Alguma dificuldade para conseguir os remédios?"
      },
      {
        "id": "af-10",
        "label": "Encerramento",
        "type": "section_header",
        "description": "- Faça um resumo breve do que foi conversado com o paciente.\n- Agradeça a disponibilidade para a conversa.\n- Exemplo: \"Agradeço por ter conversado comigo. Isso vai nos ajudar a cuidar melhor da sua saúde.\""
      }
    ]
  },
  {
    "area": "pharmacy",
    "module_type": "anamnese",
    "form_type": "patient_script",
    "title": "Casos clínicos - Roteiro paciente simulado | Anamnese",
    "description": "10 casos clínicos completos para simulação de entrevista farmacêutica",
    "content_json": [
      {
        "id": "ps-21",
        "type": "cases",
        "cases": [
          {
            "id": "cs-11",
            "title": "João Paulo (J.P.), 48 anos",
            "script": "João Paulo é pedreiro autônomo, vive com a esposa e dois filhos adolescentes. Relata dificuldade para locomoção devido à dor lombar crônica, irradiada para as pernas, que o acompanha há mais de 3 anos. A dor piora com o trabalho físico e só melhora quando está de repouso. Dorme mal (4–5h por noite), tem evitado sair de casa por medo da dor piorar.\nÉ hipertenso, dislipidêmico, obeso e tem diagnóstico de depressão. Refere que nenhum médico conseguiu resolver sua dor. Usa regularmente lisinopril 20 mg/dia, sinvastatina 20 mg à noite e AAS infantil. Toma por conta própria uma associação de paracetamol com codeína (dada pela irmã) e faz uso excessivo de paracetamol 500 mg (3 comprimidos, 4x/dia) e ibuprofeno 200 mg (3 comprimidos juntos), sem grande alívio. Diz que \"nada resolve\".\nNão realiza exercícios físicos. Informa que consome cerveja ocasionalmente aos finais de semana e que é ex-tabagista. Alimentação rica em carboidratos, com baixo consumo de frutas e vegetais. Guarda os medicamentos em uma caixa no armário da cozinha.\nRelata confusão quanto aos horários dos medicamentos. Às vezes esquece e outras toma tudo de uma vez. Nunca recebeu orientações sobre adesão ou risco de toxicidade. Solicita ajuda para \"entender o que está fazendo de errado\"."
          },
          {
            "id": "cs-12",
            "title": "Gabriela Rocha (G.R.), 38 anos",
            "script": "Gabriela é tradutora freelancer e trabalha meio período em casa. Mora sozinha. Tem diagnóstico de fibromialgia há cerca de 5 anos, com dor muscular generalizada do pescoço às nádegas, insônia persistente, fadiga constante e dificuldade de concentração. Refere dor diária, intensidade 8/10 na maioria dos dias, com piora acentuada em períodos de estresse e após esforço físico leve.\nTem histórico de depressão e síndrome do intestino irritável. Usa tramadol 50 mg quatro vezes ao dia, sertralina 50 mg/dia e carisoprodol à noite. Diz que o alívio da dor é de apenas 20%. Já tentou outros analgésicos, sem sucesso. Não pratica exercícios físicos e relata alimentação desregrada, com muitas refeições rápidas.\nNão fuma, não consome álcool. Guarda os medicamentos na bolsa e frequentemente esquece se tomou ou não a dose. Apresenta dificuldades cognitivas leves e tem dúvidas sobre a utilidade dos medicamentos atuais. Busca entender alternativas que \"não piorem o sono nem causem mais cansaço\"."
          },
          {
            "id": "cs-13",
            "title": "Antônio Luiz (A.L.), 72 anos",
            "script": "Antônio é aposentado, mora com a esposa e uma neta adolescente. Tem diabetes tipo 2 e insuficiência renal crônica (estágio 2), além de artrose no quadril e joelhos. Reclama de dor constante nas articulações e episódios recorrentes de tontura. Relata hipoglicemias frequentes.\nFaz uso de metformina 850 mg 2x/dia e glibenclamida 5 mg 1x/dia, mas frequentemente esquece a dose da tarde. Usa dipirona 500 mg de 6/6h e ibuprofeno 600 mg quando a dor está intensa, sem prescrição médica. Diz que os medicamentos para diabetes \"mexem com a cabeça\" e que só toma quando lembra.\nNão pratica atividades físicas. Alimentação rica em açúcar, com baixo consumo de água. Não fuma nem bebe. Guarda os medicamentos em uma caixinha na mesa da cozinha. Acompanha sua saúde apenas \"quando sente que está pior\". Não compreende os riscos de AINEs na insuficiência renal. Deseja \"tomar algo que resolva sem ter que lembrar de tudo o tempo todo\"."
          },
          {
            "id": "cs-14",
            "title": "Maria da Silva (M.S.), 65 anos",
            "script": "Maria é aposentada e mora com o marido. Hipertensa e com diagnóstico de osteoporose, relata dor crônica no ombro direito há mais de 2 anos, com piora ao levantar objetos. Usa atenolol 50 mg, losartana 50 mg/dia e amitriptilina 25 mg à noite. Diz que sente boca seca, muito sono ao acordar e que às vezes esquece de tomar os medicamentos.\nUsa frequentemente diclofenaco 50 mg sem prescrição, apesar de já ter tido gastrite. Acha difícil lembrar os horários e tem dúvidas se pode tomar os medicamentos \"juntos\". Não pratica exercícios físicos. Alimentação pobre em cálcio. Guarda os medicamentos em um pote sem identificação.\nTem dificuldades para compreender orientações escritas. Nunca recebeu um quadro de horários. Está aberta a orientações, mas diz que \"acha tudo muito confuso\". Relata que se sente envergonhada de perguntar no posto de saúde."
          },
          {
            "id": "cs-15",
            "title": "Roberto Torres (R.T.), 54 anos",
            "script": "Roberto é motorista aposentado por invalidez parcial e vive com a esposa. Relata dor torácica leve, de fundo ansioso, e episódios de confusão mental. É ex-tabagista. Faz uso de propranolol 40 mg, escitalopram 10 mg, omeprazol 20 mg e lorazepam 1 mg à noite.\nComeçou a tomar clonazepam 2 mg por conta própria há 2 semanas, alegando que \"dorme melhor com ele\". Refere que frequentemente esquece doses do propranolol e do escitalopram à tarde. Alimenta-se mal, com longos períodos de jejum, e consome café em excesso.\nArmazena os medicamentos em uma sacola de plástico na cabeceira da cama. Nunca teve um plano terapêutico formalizado. Não tem acompanhamento regular e busca ajuda \"porque sabe que está misturando coisas demais e não está se sentindo bem\". Demonstra interesse em reorganizar sua farmacoterapia."
          },
          {
            "id": "cs-16",
            "title": "Cláudia Helena (C.H.), 43 anos",
            "script": "Cláudia é auxiliar administrativa, mora com a mãe idosa e é responsável por cuidar dela e da casa. Refere dor difusa nas articulações, especialmente mãos e tornozelos, com rigidez matinal. Foi diagnosticada com lúpus eritematoso sistêmico há 2 anos. Diz que a dor piora com o estresse e tem piorado nos últimos meses.\nFaz uso de prednisona 10 mg/dia, hidroxicloroquina 400 mg/dia e dipirona esporádica. Refere que, quando se sente melhor, costuma suspender a hidroxicloroquina por conta própria. Já teve crises com aumento da dor após essas interrupções. Está acima do peso, dorme mal e sente-se frequentemente irritada e ansiosa.\nGuarda os medicamentos em um armário alto, fora do alcance da mãe. Não costuma levar as prescrições às consultas e raramente é questionada sobre como está tomando os remédios. Reconhece que precisa melhorar o cuidado com sua saúde, mas sente que não tem tempo."
          },
          {
            "id": "cs-17",
            "title": "Paulo Henrique (P.H.), 59 anos",
            "script": "Paulo é porteiro em um prédio comercial e trabalha em turnos alternados. Tem diagnóstico de DPOC moderada, hipertensão e hiperuricemia. Refere dispneia aos esforços leves e crises recorrentes de tosse produtiva. Usa salbutamol spray \"quando sente que precisa\" e alopurinol 300 mg/dia.\nJá fez uso de tiotrópio, mas suspendeu por conta própria por não notar melhora. Tem dúvidas se os inaladores funcionam. Também faz uso de diclofenaco 75 mg injetável por conta própria, sempre que tem dor nas costas. Fuma cerca de 10 cigarros por dia.\nArmazena os medicamentos em uma caixa no guarda-roupa. Diz que o médico \"nunca explica direito\". Tem dificuldade de entender como os medicamentos funcionam e gostaria de uma explicação mais clara sobre sua doença. Desconfia do uso contínuo de medicação."
          },
          {
            "id": "cs-18",
            "title": "Tereza Ramos (T.R.), 66 anos",
            "script": "Tereza é aposentada e vive com a filha e dois netos. Teve um AVC leve há 1 ano e desde então apresenta leve instabilidade ao caminhar. Usa AAS 100 mg, sinvastatina 20 mg à noite e captopril 25 mg 2x/dia. Relata zumbido constante, esquecimentos leves e sensação de \"peso na cabeça\".\nRefere que está muito preocupada com a possibilidade de ter outro AVC. Iniciou uso de ginkgo biloba por conta própria, orientada por uma vizinha. Também toma chá de alecrim \"para a circulação\".\nGuarda todos os medicamentos na geladeira, \"para conservar\". Costuma confundir os horários e a dose do captopril. Já parou de tomar por tontura. A filha diz que ela \"mistura tudo\". Está receptiva a orientações, mas se sente envergonhada de admitir suas falhas."
          },
          {
            "id": "cs-19",
            "title": "Daniela Lopes (D.L.), 34 anos",
            "script": "Daniela é técnica de enfermagem, trabalha em uma UPA e faz plantões noturnos. Foi diagnosticada com enxaqueca crônica e síndrome do intestino irritável. Refere crises frequentes (3–4x/semana) com dor latejante unilateral, náusea e fotofobia. Usa sumatriptana 50 mg e dipirona em altas doses.\nRelata insônia, uso irregular de escitalopram 10 mg e cafeína em excesso (4 a 5 xícaras/dia). Diz que nos plantões \"esquece tudo\" e que às vezes toma duas doses seguidas sem lembrar. Tem alimentação desregrada e faz uso de omeprazol sem prescrição.\nRelata que evita consultar porque acha que os colegas não levam sua dor a sério. Está emocionalmente exausta, mas ainda funcional. Busca uma forma de reduzir os medicamentos e controlar melhor as crises."
          },
          {
            "id": "cs-20",
            "title": "Geraldo Martins (G.M.), 70 anos",
            "script": "Geraldo é viúvo, aposentado, mora sozinho e é hipertenso e diabético. Recentemente teve um episódio de hipoglicemia e caiu em casa. Está em uso de metformina 850 mg 2x/dia, glibenclamida 5 mg 1x/dia, losartana 50 mg 2x/dia e omeprazol 20 mg/dia.\nDiz que confunde os horários e, às vezes, toma os medicamentos em jejum. Também toma um \"chá amargo\" que ganhou na feira, todos os dias. Tem baixa visão, não enxerga bem os nomes nas caixas. Guarda os comprimidos juntos, em um pote.\nSente-se inseguro após a queda. Está disposto a ouvir orientações, mas afirma que se esquece facilmente. Relata cansaço constante e sensação de que \"ninguém tem paciência com ele\"."
          }
        ]
      }
    ]
  },
  {
    "area": "pharmacy",
    "module_type": "anamnese",
    "form_type": "observer_eval",
    "title": "Formulário de avaliação | Observador",
    "description": "Checklist de observação com 12 critérios e pontuação Sim/Parcial/Não",
    "content_json": [
      {
        "id": "oe-22",
        "label": "Ficha de observação | Entrevista Farmacêutica",
        "type": "section_header",
        "description": "Esta ficha deve ser preenchida por um estudante enquanto observa a simulação da entrevista farmacêutica entre colegas. Aponte se o Farmacêutico simulado realizou as ações propostas e use o campo de observações para comentários construtivos."
      },
      {
        "id": "oe-23",
        "label": "Data",
        "type": "date",
        "required": true,
        "max_score": 0
      },
      {
        "id": "oe-24",
        "label": "Cumprimentou o paciente de forma acolhedora?",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 0.5,
        "option_scores": {
          "0": 0.5,
          "1": 0.25
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "oe-25",
        "label": "Explicou o objetivo da entrevista",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 0.5,
        "option_scores": {
          "0": 0.5,
          "1": 0.24
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "oe-26",
        "label": "Utilizou linguagem acessível",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 0.5,
        "option_scores": {
          "0": 0.5,
          "1": 0.25
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "oe-27",
        "label": "Demonstrou escuta ativa (olhar, acenos, silêncio ativo)",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 0.5,
        "option_scores": {
          "0": 0.5,
          "1": 0.24
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "oe-28",
        "label": "Fez perguntas abertas antes das fechadas",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 1.5,
        "option_scores": {
          "0": 1.5,
          "1": 0.75
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "oe-29",
        "label": "Explorou as queixas e sintomas do paciente",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 1.5,
        "option_scores": {
          "0": 1.5,
          "1": 0.74
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "oe-30",
        "label": "Investigou a farmacoterapia atual de forma completa",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 1.5,
        "option_scores": {
          "0": 1.5,
          "1": 0.73
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "oe-31",
        "label": "Perguntou sobre adesão e dificuldades com o tratamento",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 1.5,
        "option_scores": {
          "0": 1.5,
          "1": 0.74
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "oe-32",
        "label": "Verificou acesso e armazenamento dos medicamentos",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 1.0,
        "option_scores": {
          "0": 1.0,
          "1": 0.5
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "oe-33",
        "label": "Resumiu as informações ao final da entrevista",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 0.5,
        "option_scores": {
          "0": 0.5,
          "1": 0.24
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "oe-34",
        "label": "Encerramento empático e respeitoso",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 0.5,
        "option_scores": {
          "0": 0.5,
          "1": 0.25
        },
        "correct_answer": "0",
        "required": false
      }
    ]
  },
  {
    "area": "pharmacy",
    "module_type": "anamnese",
    "form_type": "professor_eval",
    "title": "Instrumento de Avaliação Docente",
    "description": "Avaliação por escala 1-4 com critérios de comunicação, raciocínio clínico e síntese",
    "content_json": [
      {
        "id": "pe-35",
        "label": "Instruções para o Professor",
        "type": "section_header",
        "description": "Avalie o desempenho do aluno utilizando a escala de 1 a 4, onde:\n\n1 - Insuficiente: Não realizou ou realizou de forma inadequada.\n\n2 - Em Desenvolvimento: Realizou parcialmente, mas demonstrou insegurança ou falta de aprofundamento.\n\n3 - Adequado: Cumpriu o esperado com boa técnica.\n\n4 - Excelente: Demonstrou domínio, fluidez, empatia e excelente raciocínio clínico."
      },
      {
        "id": "pe-36",
        "label": "Preparação e Acolhimento",
        "type": "section_header",
        "description": ""
      },
      {
        "id": "pe-37",
        "label": "O aluno conseguiu estabelecer um ambiente seguro e acolhedor logo no início da consulta?",
        "type": "scale",
        "scale_max": 4,
        "scale_min_label": "1",
        "scale_max_label": "4",
        "max_score": 1,
        "correct_answer": "4",
        "required": false
      },
      {
        "id": "pe-38",
        "label": "A explicação sobre o objetivo da entrevista farmacêutica foi clara e transmitiu confiança ao paciente?",
        "type": "scale",
        "scale_max": 4,
        "scale_min_label": "1",
        "scale_max_label": "4",
        "max_score": 1,
        "correct_answer": "4",
        "required": false
      },
      {
        "id": "pe-39",
        "label": "Habilidades de Comunicação",
        "type": "section_header",
        "description": ""
      },
      {
        "id": "pe-40",
        "label": "O aluno conseguiu \"traduzir\" jargões técnicos de forma que o paciente realmente compreendesse, sem infantilizá-lo?",
        "type": "scale",
        "scale_max": 4,
        "scale_min_label": "1",
        "scale_max_label": "4",
        "max_score": 1,
        "correct_answer": "4",
        "required": false
      },
      {
        "id": "pe-41",
        "label": "O aluno utilizou perguntas abertas corretamente e evitou interromper ou confrontar o paciente de forma ríspida?",
        "type": "scale",
        "scale_max": 4,
        "scale_min_label": "1",
        "scale_max_label": "4",
        "max_score": 1,
        "correct_answer": "4",
        "required": false
      },
      {
        "id": "pe-42",
        "label": "Coleta de Dados e Raciocínio Clínico",
        "type": "section_header",
        "description": ""
      },
      {
        "id": "pe-43",
        "label": "Ao investigar os sintomas, o aluno fez as conexões corretas (ex: suspeitou se a queixa poderia ser um efeito adverso de algum medicamento)?",
        "type": "scale",
        "scale_max": 4,
        "scale_min_label": "1",
        "scale_max_label": "4",
        "max_score": 1,
        "correct_answer": "4",
        "required": false
      },
      {
        "id": "pe-44",
        "label": "A investigação sobre como o paciente toma os medicamentos foi minuciosa o suficiente para identificar erros de dosagem ou interações?",
        "type": "scale",
        "scale_max": 4,
        "scale_min_label": "1",
        "scale_max_label": "4",
        "max_score": 1,
        "correct_answer": "4",
        "required": false
      },
      {
        "id": "pe-45",
        "label": "O aluno foi empático ao investigar falhas na adesão, criando um ambiente sem julgamentos para que o paciente assumisse que esquece de tomar os remédios?",
        "type": "scale",
        "scale_max": 4,
        "scale_min_label": "1",
        "scale_max_label": "4",
        "max_score": 1,
        "correct_answer": "4",
        "required": false
      },
      {
        "id": "pe-46",
        "label": "O aluno conseguiu correlacionar o uso de chás/plantas ou dificuldades financeiras/acesso com o sucesso do tratamento?",
        "type": "scale",
        "scale_max": 4,
        "scale_min_label": "1",
        "scale_max_label": "4",
        "max_score": 1,
        "correct_answer": "4",
        "required": false
      },
      {
        "id": "pe-47",
        "label": "Encerramento e Capacidade de Síntese",
        "type": "section_header",
        "description": ""
      },
      {
        "id": "pe-48",
        "label": "O resumo final feito para o paciente foi preciso, englobando os pontos críticos identificados na consulta sem causar alarme?",
        "type": "scale",
        "scale_max": 4,
        "scale_min_label": "1",
        "scale_max_label": "4",
        "max_score": 2,
        "correct_answer": "4",
        "required": false
      },
      {
        "id": "pe-49",
        "label": "Feedback do professor",
        "type": "section_header",
        "description": ""
      },
      {
        "id": "pe-50",
        "label": "Pontos Fortes do Aluno",
        "type": "textarea",
        "required": false,
        "max_score": 0
      },
      {
        "id": "pe-51",
        "label": "Oportunidades de Melhoria",
        "type": "textarea",
        "required": false,
        "max_score": 0
      }
    ]
  },
  {
    "area": "pharmacy",
    "module_type": "soap",
    "form_type": "soap",
    "title": "Formulário SOAP",
    "description": "Formulário completo de documentação SOAP com seções S-O-A-P",
    "content_json": [
      {
        "id": "sf-52",
        "label": "Formulário de documentação SOAP",
        "type": "section_header",
        "description": ""
      },
      {
        "id": "sf-53",
        "label": "Nome do paciente (colega)",
        "type": "textarea",
        "required": true,
        "max_score": 0
      },
      {
        "id": "sf-54",
        "label": "S - Subjetivo (Queixa e percepção do \"paciente\")",
        "type": "section_header",
        "description": ""
      },
      {
        "id": "sf-55",
        "label": "Queixa principal: Qual a principal queixa do \"paciente\"? Descreva com as palavras dele.",
        "type": "textarea",
        "required": false,
        "max_score": 0
      },
      {
        "id": "sf-56",
        "label": "Histórico da queixa: Desde quando a queixa existe? O que a piora ou melhora? A queixa se irradia ou afeta outras partes do corpo?",
        "type": "textarea",
        "required": false,
        "max_score": 0
      },
      {
        "id": "sf-57",
        "label": "Percepção sobre o tratamento/saúde: O que o \"paciente\" pensa sobre sua condição de saúde, seus medicamentos ou seu tratamento?",
        "type": "textarea",
        "required": false,
        "max_score": 0
      },
      {
        "id": "sf-58",
        "label": "O - Objetivo (Dados clínicos e informações verificáveis)",
        "type": "section_header",
        "description": ""
      },
      {
        "id": "sf-59",
        "label": "Histórico de saúde e hábitos: Descreva o histórico de saúde do \"paciente\" (condições pré-existentes, cirurgias, alergias). Inclua também informações sobre estilo de vida (tabagismo, etilismo, dieta, sono, etc.).",
        "type": "textarea",
        "required": false,
        "max_score": 0
      },
      {
        "id": "sf-60",
        "label": "Medicamentos em uso: Liste todos os medicamentos que o \"paciente\" utiliza (prescritos e não prescritos), incluindo doses e frequência.",
        "type": "textarea",
        "required": false,
        "max_score": 0
      },
      {
        "id": "sf-61",
        "label": "Adesão e Acesso: Descreva a adesão do \"paciente\" ao tratamento (ex: \"relata esquecer\") e como ele obtém os medicamentos (ex: \"recebe na unidade de saúde\", \"compra\").",
        "type": "textarea",
        "required": false,
        "max_score": 0
      },
      {
        "id": "sf-62",
        "label": "A - Avaliação (Análise e interpretação dos dados)",
        "type": "section_header",
        "description": ""
      },
      {
        "id": "sf-63",
        "label": "Síntese e Análise: Resuma e analise a relação entre os dados subjetivos (S) e objetivos (O). Que problemas de saúde ou relacionados ao tratamento podem ser identificados?",
        "type": "textarea",
        "required": false,
        "max_score": 0
      },
      {
        "id": "sf-64",
        "label": "Riscos e Intervenções: Quais são os principais riscos identificados (ex: interações medicamentosas, automedicação, baixa adesão)? Qual é a sua interpretação profissional sobre a situação?",
        "type": "textarea",
        "required": false,
        "max_score": 0
      },
      {
        "id": "sf-65",
        "label": "P - Plano (Conduta e ações propostas)",
        "type": "section_header",
        "description": ""
      },
      {
        "id": "sf-66",
        "label": "Plano de ação: Liste, em tópicos, as ações que você propõe para abordar os problemas identificados na avaliação (A). O que deve ser feito para melhorar a saúde e o tratamento do \"paciente\"? Seja específico.",
        "type": "textarea",
        "required": false,
        "max_score": 0
      }
    ]
  },
  {
    "area": "pharmacy",
    "module_type": "soap",
    "form_type": "peer_evaluation",
    "title": "Avaliação do SOAP",
    "description": "Checklist completo de revisão entre pares com 20 critérios S-O-A-P",
    "content_json": [
      {
        "id": "spe-67",
        "label": "Checklist de Revisão entre Pares – documentação usando o SOAP",
        "type": "section_header",
        "description": "Instruções: Para cada item, marque \"Sim\" se a informação estiver presente e for adequada, e \"Não\" se estiver ausente ou inadequada. Atribua a pontuação correspondente"
      },
      {
        "id": "spe-68",
        "label": "Nome do aluno avaliado",
        "type": "textarea",
        "required": false,
        "max_score": 0
      },
      {
        "id": "spe-69",
        "label": "S - Subjetivo",
        "type": "section_header",
        "description": ""
      },
      {
        "id": "spe-70",
        "label": "Queixa Principal: A queixa principal do \"paciente\" está claramente descrita usando as palavras dele?",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 0.5,
        "option_scores": {
          "0": 0.5,
          "1": 0.25
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "spe-71",
        "label": "Histórico da Queixa: O histórico da queixa inclui detalhes relevantes (tempo, características, fatores de melhora/piora)?",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 0.5,
        "option_scores": {
          "0": 0.5,
          "1": 0.25
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "spe-72",
        "label": "Sintomas Adicionais: Outros sintomas ou percepções relevantes do \"paciente\" (ex: hábitos, percepções sobre o tratamento) foram incluídos?",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 0.5,
        "option_scores": {
          "0": 0.5,
          "1": 0.25
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "spe-73",
        "label": "Linguagem do Paciente: O texto reflete a linguagem e a perspectiva do \"paciente\", sem interpretações do avaliador?",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 0.5,
        "option_scores": {
          "0": 0.5,
          "1": 0.25
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "spe-74",
        "label": "Clareza e Organização: As informações estão organizadas de forma lógica e são fáceis de entender?",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 0.5,
        "option_scores": {
          "0": 0.5,
          "1": 0.25
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "spe-75",
        "label": "O - Objetivo (5 pontos)",
        "type": "section_header",
        "description": ""
      },
      {
        "id": "spe-76",
        "label": "Dados Verificáveis: Foram incluídos dados mensuráveis ou observáveis (ex: medicamentos em uso, doses, frequência)?",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 0.5,
        "option_scores": {
          "0": 0.5,
          "1": 0.25
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "spe-77",
        "label": "Histórico Clínico: Informações do histórico de saúde do \"paciente\" (ex: comorbidades, alergias) foram citadas?",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 0.5,
        "option_scores": {
          "0": 0.5,
          "1": 0.25
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "spe-78",
        "label": "Dados Não Clínicos: Foram incluídas informações objetivas sobre estilo de vida, hábitos ou dados sociais relevantes?",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 0.5,
        "option_scores": {
          "0": 0.5,
          "1": 0.25
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "spe-79",
        "label": "Adesão e Acesso: A adesão ao tratamento e o acesso aos medicamentos foram descritos de forma objetiva (ex: \"refere esquecer\", \"recebe na farmácia\")?",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 0.5,
        "option_scores": {
          "0": 0.5,
          "1": 0.25
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "spe-80",
        "label": "Diferenciação S x O: As informações objetivas estão separadas das subjetivas (sem incluir percepções ou queixas)?",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 0.5,
        "option_scores": {
          "0": 0.5,
          "1": 0.25
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "spe-81",
        "label": "A - Avaliação",
        "type": "section_header",
        "description": ""
      },
      {
        "id": "spe-82",
        "label": "Síntese dos Dados: A seção A faz uma síntese da relação entre os dados de S e O?",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 0.5,
        "option_scores": {
          "0": 0.5,
          "1": 0.25
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "spe-83",
        "label": "Problemas Identificados: Foram identificados os problemas ou a situação clínica (ex: risco de interações, baixa adesão, automedicação)?",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 0.5,
        "option_scores": {
          "0": 0.5,
          "1": 0.25
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "spe-84",
        "label": "Análise Profissional: A avaliação reflete uma análise profissional do caso, indo além da simples repetição dos dados?",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 0.5,
        "option_scores": {
          "0": 0.5,
          "1": 0.25
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "spe-85",
        "label": "Priorização: Os problemas mais importantes foram priorizados ou destacados na avaliação?",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 0.5,
        "option_scores": {
          "0": 0.5,
          "1": 0.25
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "spe-86",
        "label": "Sem Julgamentos: A avaliação é descritiva e não contém julgamentos sobre o \"paciente\"?",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 0.5,
        "option_scores": {
          "0": 0.5,
          "1": 0.25
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "spe-87",
        "label": "P - Plano",
        "type": "section_header",
        "description": ""
      },
      {
        "id": "spe-88",
        "label": "Clareza do Plano: O plano de ação está claro e específico?",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 0.5,
        "option_scores": {
          "0": 0.5,
          "1": 0.25
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "spe-89",
        "label": "Direcionado aos Problemas: O plano de ação aborda diretamente os problemas identificados na seção A?",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 0.5,
        "option_scores": {
          "0": 0.5,
          "1": 0.25
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "spe-90",
        "label": "Propostas de Intervenção: Foram propostas intervenções específicas (ex: \"sugerir organizador\", \"orientar sobre riscos\")?",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 0.5,
        "option_scores": {
          "0": 0.5,
          "1": 0.25
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "spe-91",
        "label": "Relevância: O plano de ação é clinicamente relevante para o caso apresentado?",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 0.5,
        "option_scores": {
          "0": 0.5,
          "1": 0.25
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "spe-92",
        "label": "Organização: O plano está bem estruturado (ex: em tópicos) para facilitar a execução?",
        "type": "radio",
        "options": [
          "Sim",
          "Parcial",
          "Não"
        ],
        "max_score": 0.5,
        "option_scores": {
          "0": 0.5,
          "1": 0.25
        },
        "correct_answer": "0",
        "required": false
      },
      {
        "id": "spe-93",
        "label": "Feedback e Pontuação Final",
        "type": "section_header",
        "description": ""
      },
      {
        "id": "spe-94",
        "label": "Pontos Fortes do Preenchimento",
        "type": "textarea",
        "required": false,
        "max_score": 0
      },
      {
        "id": "spe-95",
        "label": "Pontos a Melhorar no Preenchimento",
        "type": "textarea",
        "required": false,
        "max_score": 0
      },
      {
        "id": "spe-96",
        "label": "Comentários Adicionais do Avaliador",
        "type": "textarea",
        "required": false,
        "max_score": 0
      }
    ]
  },
  {
    "area": "pharmacy",
    "module_type": "reconciliacao",
    "form_type": "reconciliation",
    "title": "Formulário de reconciliação",
    "description": "Ficha de reconciliação medicamentosa com análise de discrepâncias",
    "content_json": [
      {
        "id": "rf-97",
        "label": "Ficha de reconciliação medicamentosa",
        "type": "section_header",
        "description": "Esta ficha deve ser preenchida com base na comparação entre os medicamentos que o paciente utilizava antes da transição de cuidado (domicílio, outro serviço ou internação anterior) e os medicamentos prescritos após a transição (admissão hospitalar, alta ou transferência de unidade)."
      },
      {
        "id": "rf-98",
        "label": "Caso clínico analisado",
        "type": "dropdown",
        "options": [
          "Caso 1",
          "Caso 2",
          "Caso 3",
          "Caso 4",
          "Caso 5"
        ],
        "required": false,
        "max_score": 0
      },
      {
        "id": "rf-99",
        "label": "Data",
        "type": "date",
        "required": false,
        "max_score": 0
      },
      {
        "id": "rf-100",
        "label": "Medicamentos prévios",
        "type": "textarea",
        "required": false,
        "max_score": 1.25
      },
      {
        "id": "rf-101",
        "label": "Medicamentos Prescritos",
        "type": "textarea",
        "required": false,
        "max_score": 1.25
      },
      {
        "id": "rf-102",
        "label": "Tipo de discrepância (Mantido (sem alteração), Suspenso (omitido), Modificado (dose, via, frequência), Adicionado (novo medicamento) ou Substituído (por outro da mesma classe ou diferente))",
        "type": "textarea",
        "required": false,
        "max_score": 2.5
      },
      {
        "id": "rf-103",
        "label": "Justificativa Clínica",
        "type": "textarea",
        "required": false,
        "max_score": 2.5
      },
      {
        "id": "rf-104",
        "label": "Conduta Farmacêutica",
        "type": "textarea",
        "required": false,
        "max_score": 2.5
      }
    ]
  },
  {
    "area": "pharmacy",
    "module_type": "reconciliacao",
    "form_type": "clinical_cases",
    "title": "Casos Clínicos — Reconciliação Medicamentosa",
    "description": "5 casos clínicos de reconciliação com cenários de admissão, alta e transferência",
    "content_json": [
      {
        "title": "Caso 1 - Ana Lúcia (Admissão hospitalar por pneumonia)",
        "content": "Paciente: Ana Lúcia dos Santos, 72 anos, sexo feminino, aposentada. Mora com o marido e tem histórico de hipertensão arterial sistêmica, diabetes tipo 2 e doença do refluxo gastroesofágico.\nSituação atual: Internada na emergência com diagnóstico de pneumonia comunitária, iniciando antibiótico por via parenteral. Refere febre, tosse produtiva, cansaço e inapetência.\nHistórico de uso domiciliar (últimos 6 meses):\n•\tEnalapril 10 mg 1x/dia pela manhã (prescrito por médico da UBS)\n•\tHidroclorotiazida 25 mg 1x/dia junto com o café\n•\tMetformina 850 mg 2x/dia (após o almoço e jantar)\n•\tOmeprazol 20 mg em jejum\nPrescrição hospitalar no momento da admissão:\n•\tCeftriaxona 1g EV a cada 12 horas\n•\tAzitromicina 500 mg VO 1x/dia\n•\tDipirona 1g EV se dor ou febre\n•\tMetformina 850 mg 3x/dia\n•\tEnalapril 10 mg 2x/dia\nTarefa:\nVocê deve comparar a prescrição habitual com a nova prescrição hospitalar e identificar discrepâncias."
      },
      {
        "title": "Caso 2 – Carlos Henrique (Alta hospitalar pós-infarto agudo do miocárdio)",
        "content": "Paciente: Carlos Henrique de Andrade, 64 anos, sexo masculino, contador aposentado. Internado há 5 dias após quadro de dor torácica e confirmado IAM com supradesnível de ST. Evoluiu sem complicações, recebeu tratamento clínico e está em preparo para alta hospitalar.\nMedicamentos em uso durante internação:\n•\tAAS 100 mg 1x/dia\n•\tClopidogrel 75 mg 1x/dia\n•\tAtorvastatina 40 mg à noite\n•\tEnoxaparina 40 mg SC a cada 12 horas\n•\tIsossorbida dinitrato 20 mg 2x/dia\n•\tMetoprolol 25 mg 2x/dia\nPrescrição ao receber alta hospitalar:\n•\tAAS 100 mg 1x/dia\n•\tClopidogrel 75 mg 1x/dia\n•\tAtorvastatina 20 mg à noite\n•\tIsossorbida 20 mg 2x/dia\n•\tMetoprolol 50 mg 1x/dia\nTarefa:\nVocê deve identificar e justificar as alterações:"
      },
      {
        "title": "Caso 3 – Maria Eduarda (Transferência do ambulatório para internação cirúrgica)",
        "content": "Paciente: Maria Eduarda Ribeiro, 55 anos, sexo feminino, professora. Está em uso crônico de levotiroxina para hipotireoidismo e sertralina para transtorno depressivo leve. Foi admitida para histerectomia eletiva após sangramentos uterinos recorrentes.\nHistórico de medicamentos em uso ambulatorial:\n•\tLevotiroxina 75 mcg em jejum\n•\tSertralina 50 mg 1x/dia (pela manhã)\n•\tIbuprofeno 400 mg se dor (uso esporádico)\n•\tOmeprazol 20 mg 1x/dia\nPrescrição hospitalar no momento da internação:\n•\tDipirona 1g VO a cada 6 horas\n•\tCefazolina 1g EV dose única pré-operatória\n•\tHeparina não fracionada 5000 UI SC a cada 8 horas\n•\tOmeprazol 40 mg 1x/dia\nTarefa:\nVocê deve verificar o que foi mantido, omitido ou ajustado na prescrição hospitalar"
      },
      {
        "title": "Caso 4 – João Guilherme (Alta hospitalar após descompensação de insuficiência cardíaca)",
        "content": "Paciente: João Guilherme Peixoto, 79 anos, sexo masculino, viúvo, aposentado. Histórico de insuficiência cardíaca com fração de ejeção reduzida (ICFER), hipertensão e hiperplasia prostática. Foi internado há 6 dias por dispneia aos mínimos esforços, ortopneia e ganho de peso.\nMedicamentos em uso antes da internação (domicílio):\n•\tFurosemida 40 mg 1x/dia\n•\tCaptopril 25 mg 2x/dia\n•\tAtenolol 50 mg 1x/dia\n•\tHidralazina 25 mg 3x/dia\n•\tTansulosina 0,4 mg à noite\nPrescrição de admissão hospitalar:\n•\tFurosemida 40 mg 2x/dia\n•\tEnalapril 10 mg 2x/dia\n•\tCarvedilol 6,25 mg 2x/dia\n•\tEspironolactona 25 mg 1x/dia\n•\tHidralazina 25 mg 3x/dia\n•\tTansulosina 0,4 mg à noite\nTarefa:\nCompare os esquemas antes e após a internação. Analise se a transição está segura, justificada e se há risco de duplicidade ou necessidade de reorientação ao paciente"
      },
      {
        "title": "Caso 5 – Larissa (Admissão por crise convulsiva)",
        "content": "Paciente: Larissa Monteiro de Souza, 31 anos, sexo feminino, artista plástica, mora sozinha. Diagnosticada com epilepsia desde os 16 anos, em uso contínuo de anticonvulsivantes. Foi admitida na emergência após crise tônico-clônica generalizada, provavelmente por descontinuação medicamentosa involuntária (relata que ficou sem medicamento por falta na farmácia).\nHistórico de medicamentos em uso ambulatorial:\n•\tFenitoína 100 mg 3x/dia\n•\tÁcido fólico 5 mg 1x/dia\n•\tSertralina 50 mg 1x/dia\nPrescrição hospitalar na admissão:\n•\tDiazepam 10 mg EV se nova crise\n•\tLevetiracetam 500 mg 2x/dia\n•\tÁcido fólico 5 mg 1x/dia\n•\tOmeprazol 20 mg 1x/dia\n•\tMetoclopramida 10 mg se náuseas\nTarefa:\nIdentifique as discrepâncias, classifique e justifique cada uma"
      }
    ]
  },
  {
    "area": "pharmacy",
    "module_type": "reconciliacao",
    "form_type": "answer_key",
    "title": "Espelhos reconciliação",
    "description": "Espelhos de resposta completos para correção por IA dos 5 casos clínicos de reconciliação",
    "content_json": {
      "case_answers": {
        "case_1": [
          {
            "id": "rka-105",
            "label": "Medicamentos prévios",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "Enalapril 10 mg 1x/dia\n\nHidroclorotiazida 25 mg 1x/dia\n\nMetformina 850 mg 2x/dia\n\nOmeprazol 20 mg 1x/dia (em jejum)"
          },
          {
            "id": "rka-106",
            "label": "Medicamentos Prescritos",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "Ceftriaxona 1g EV a cada 12 horas\n\nAzitromicina 500 mg VO 1x/dia\n\nDipirona 1g EV se dor ou febre\n\nMetformina 850 mg 3x/dia\n\nEnalapril 10 mg 2x/dia"
          },
          {
            "id": "rka-107",
            "label": "Tipo de discrepância (Mantido (sem alteração), Suspenso (omitido), Modificado (dose, via, frequência), Adicionado (novo medicamento) ou Substituído (por outro da mesma classe ou diferente))",
            "type": "textarea",
            "max_score": 2.5,
            "required": false,
            "correct_answer": "Enalapril - Modificado - Frequência alterada de 1x/dia para 2x/dia.\nMetformina - Modificado - Frequência alterada de 2x/dia para 3x/dia\nHidroclorotiazida - Suspenso - Omitido da prescrição atual\nOmeprazol - Suspenso - Omitido da prescrição atual\nCeftriaxona - Adicionado - Novo medicamento (Tratamento Agudo)\nAzitromicina - Adicionado - Novo medicamento (Tratamento Agudo)\nDipirona - Adicionado - Novo medicamento (Tratamento Agudo)"
          },
          {
            "id": "rka-108",
            "label": "Justificativa Clínica",
            "type": "textarea",
            "max_score": 2.5,
            "required": false,
            "correct_answer": "Adições: Intencionais. Antibióticos para o tratamento da pneumonia comunitária e dipirona para controle de sintomas (febre/dor).\n\nSuspensões (Omissões): Provavelmente não intencionais. Não há justificativa clara para suspender o omeprazol (DRGE) e a hidroclorotiazida, a menos que a paciente apresente hipotensão ou lesão renal aguda associada à sepse (o que justificaria suspender anti-hipertensivos, mas não aumentar o enalapril).\n\nModificações: Provavelmente erros de transcrição/prescrição. Aumentar a dose de enalapril e metformina em um quadro de infecção aguda (que já eleva o risco de hipotensão e insuficiência renal/acidose láctica) não é clinicamente justificado"
          },
          {
            "id": "rka-109",
            "label": "Conduta Farmacêutica",
            "type": "textarea",
            "max_score": 2.5,
            "required": false,
            "correct_answer": "Entrar em contato com o médico prescritor para questionar as omissões (Hidroclorotiazida e Omeprazol) e, principalmente, alertar sobre as mudanças de dosagem do Enalapril e da Metformina, sugerindo o retorno às doses domiciliares, a menos que haja um objetivo clínico específico não documentado"
          }
        ],
        "case_2": [
          {
            "id": "rka-110",
            "label": "Medicamentos prévios",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "AAS 100 mg 1x/dia\n\nClopidogrel 75 mg 1x/dia\n\nAtorvasttatina 40 mg à noite\n\nEnoxaparina 40 mg SC a cada 12 horas\n\nIsossorbida dinitrato 20 mg 2x/dia\n\nMetoprolol 25 mg 2x/dia"
          },
          {
            "id": "rka-111",
            "label": "Medicamentos Prescritos",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "AAS 100 mg 1x/dia\n\nClopidogrel 75 mg 1x/dia\n\nAtorvasttatina 20 mg à noite\n\nIsossorbida 20 mg 2x/dia\n\nMetoprolol 50 mg 1x/dia"
          },
          {
            "id": "rka-112",
            "label": "Tipo de discrepância (Mantido (sem alteração), Suspenso (omitido), Modificado (dose, via, frequência), Adicionado (novo medicamento) ou Substituído (por outro da mesma classe ou diferente))",
            "type": "textarea",
            "max_score": 2.5,
            "required": false,
            "correct_answer": "AAS - Mantido - Sem alteração\nClopidogrel - Mantido - Sem alteração\nIsossorbida dinitrato - Mantido - Sem alteração\nAtorvasttatina - Modificado - Dose reduzida de 40 mg para 20 mg\nMetoprolol - Modificado - Posologia concentrada de 25 mg 2x/dia para 50 mg 1x/dia\nEnoxaparina - Suspenso - Omitido da prescrição de alta"
          },
          {
            "id": "rka-113",
            "label": "Justificativa Clínica",
            "type": "textarea",
            "max_score": 2.5,
            "required": false,
            "correct_answer": "Suspensão: Intencional. A enoxaparina é usada em ambiente hospitalar durante a fase aguda do IAM; a alta prevê apenas a dupla agregação plaquetária oral (AAS + Clopidogrel).\n\nModificações: A redução da Atorvastatina (de 40 mg para 20 mg) pode ser um erro, visto que pacientes pós-IAM possuem indicação de estatinas de alta intensidade. A mudança no Metoprolol (2x/dia para 1x/dia) depende do sal utilizado (tartarato costuma ser 2x ao dia; succinato é 1x ao dia), podendo gerar erro de administração se não especificado."
          },
          {
            "id": "rka-114",
            "label": "Conduta Farmacêutica",
            "type": "textarea",
            "max_score": 2.5,
            "required": false,
            "correct_answer": "Validar com o médico a redução da dose da Atorvastatina (recomendando manter terapia de alta intensidade pós-IAM, como 40 mg) e solicitar a especificação do sal do Metoprolol na receita, garantindo que a posologia (1x ou 2x ao dia) esteja adequada à formulação que o paciente irá comprar"
          }
        ],
        "case_3": [
          {
            "id": "rka-115",
            "label": "Medicamentos prévios",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "Levotiroxina 75 mcg em jejum\n\nSertralina 50 mg 1x/dia\n\nIbuprofeno 400 mg se dor\n\nOmeprazol 20 mg 1x/dia"
          },
          {
            "id": "rka-116",
            "label": "Medicamentos Prescritos",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "Dipirona 1g VO a cada 6 horas\n\nCefazolina 1g EV (dose pré-operatória)\n\nHeparina não fracionada 5000 UI SC a cada 8 horas\n\nOmeprazol 40 mg 1x/dia"
          },
          {
            "id": "rka-117",
            "label": "Tipo de discrepância (Mantido (sem alteração), Suspenso (omitido), Modificado (dose, via, frequência), Adicionado (novo medicamento) ou Substituído (por outro da mesma classe ou diferente))",
            "type": "textarea",
            "max_score": 2.5,
            "required": false,
            "correct_answer": "Omeprazol - Modificado - Dose dobrada de 20 mg para 40 mg.\nIbuprofeno - Suspenso - Omitido (substituído terapeuticamente por Dipirona)\nLevotiroxina - Suspenso - Omitido da prescrição\nSertralina - Suspenso - Omitido da prescrição\nDipirona - Adicionado - Novos medicamentos do contexto cirúrgico\nCefazolina - Adicionado - Novos medicamentos do contexto cirúrgico\nHeparina - Adicionado - Novos medicamentos do contexto cirúrgico"
          },
          {
            "id": "rka-118",
            "label": "Justificativa Clínica",
            "type": "textarea",
            "max_score": 2.5,
            "required": false,
            "correct_answer": "Adições e suspensão do Ibuprofeno: Intencionais. O protocolo cirúrgico exige profilaxia antibiótica (cefazolina), profilaxia para TVP (heparina) e analgesia (dipirona, evitando o ibuprofeno devido ao risco de sangramento em cirurgia).\n\nSuspensões (Levotiroxina e Sertralina): Não intencionais (omissões graves). Medicamentos de uso crônico contínuo que não interferem no ato cirúrgico de forma negativa (a suspensão pode, na verdade, gerar descompensação tireoidiana ou síndrome de retirada da sertralina).\n\nModificação (Omeprazol): Aumento para 40mg não justificado pelo histórico, possivelmente erro de padrão de prescrição do sistema hospitalar."
          },
          {
            "id": "rka-119",
            "label": "Conduta Farmacêutica",
            "type": "textarea",
            "max_score": 2.5,
            "required": false,
            "correct_answer": "Contatar o cirurgião/médico assistente imediatamente para incluir a Levotiroxina e a Sertralina na prescrição médica, garantindo a continuidade do tratamento crônico, e sugerir a redução do Omeprazol para a dose habitual de 20 mg"
          }
        ],
        "case_4": [
          {
            "id": "rka-120",
            "label": "Medicamentos prévios",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "Furosemida 40 mg 1x/dia\n\nCaptopril 25 mg 2x/dia\n\nAtenolol 50 mg 1x/dia\n\nHidralazina 25 mg 3x/dia\n\nTansulosina 0,4 mg à noite"
          },
          {
            "id": "rka-121",
            "label": "Medicamentos Prescritos",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "Furosemida 40 mg 2x/dia\n\nEnalapril 10 mg 2x/dia\n\nCarvedilol 6,25 mg 2x/dia\n\nEspironolactona 25 mg 1x/dia\n\nHidralazina 25 mg 3x/dia\n\nTansulosina 0,4 mg à noite"
          },
          {
            "id": "rka-122",
            "label": "Tipo de discrepância (Mantido (sem alteração), Suspenso (omitido), Modificado (dose, via, frequência), Adicionado (novo medicamento) ou Substituído (por outro da mesma classe ou diferente))",
            "type": "textarea",
            "max_score": 2.5,
            "required": false,
            "correct_answer": "Hidralazina - Mantido - Sem alteração.\nTansulosina - Mantido - Sem alteração\nFurosemida - Modificado - Frequência aumentada de 1x/dia para 2x/dia\nCaptopril - Substituído - Trocado por Enalapril 10 mg 2x/dia\nAtenolol - Substituído - Trocado por Carvedilol 6,25 mg 2x/dia\nEspironolactona - Adicionado - Novo medicamento para IC"
          },
          {
            "id": "rka-123",
            "label": "Justificativa Clínica",
            "type": "textarea",
            "max_score": 2.5,
            "required": false,
            "correct_answer": "Todas as alterações parecem intencionais e baseadas em diretrizes clínicas para Insuficiência Cardíaca com Fração de Ejeção Reduzida (ICFER).\n\nAumento da Furosemida: Justificado pela congestão (ganho de peso e dispneia).\n\nSubstituição do Captopril pelo Enalapril: Otimização de posologia/padronização hospitalar.\n\nSubstituição do Atenolol por Carvedilol: O Carvedilol tem forte evidência de redução de mortalidade em ICFER, diferentemente do Atenolol.\n\nAdição de Espironolactona: Indicada para otimizar o bloqueio neuro-hormonal e reduzir mortalidade na ICFER"
          },
          {
            "id": "rka-124",
            "label": "Conduta Farmacêutica",
            "type": "textarea",
            "max_score": 2.5,
            "required": false,
            "correct_answer": "Avaliar a função renal e o potássio do paciente devido ao risco da associação de Enalapril + Espironolactona. Realizar orientação farmacêutica de alta cuidadosa com o paciente, explicando o motivo das trocas (Captopril > Enalapril; Atenolol > Carvedilol), a nova dose do diurético e a adição da Espironolactona, para evitar que ele use os medicamentos novos junto com o estoque que sobrou em casa (evitando duplicação terapêutica grave)"
          }
        ],
        "case_5": [
          {
            "id": "rka-125",
            "label": "Medicamentos prévios",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "Fenitoína 100 mg 3x/dia\n\nÁcido fólico 5 mg 1x/dia\n\nSertralina 50 mg 1x/dia"
          },
          {
            "id": "rka-126",
            "label": "Medicamentos Prescritos",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "Diazepam 10 mg EV se nova crise\n\nLevetiracetam 500 mg 2x/dia\n\nÁcido fólico 5 mg 1x/dia\n\nOmeprazol 20 mg 1x/dia\n\nMetoclopramida 10 mg se náuseas"
          },
          {
            "id": "rka-127",
            "label": "Tipo de discrepância (Mantido (sem alteração), Suspenso (omitido), Modificado (dose, via, frequência), Adicionado (novo medicamento) ou Substituído (por outro da mesma classe ou diferente))",
            "type": "textarea",
            "max_score": 2.5,
            "required": false,
            "correct_answer": "Ácido fólico - Mantido - Sem alteração\nFenitoína - Substituído - Trocado por Levetiracetam 500 mg 2x/dia\nSertralina - Suspenso - Omitido da prescrição\nDiazepam - Adicionado - Novo medicamento (SOS / Agudo)\nOmeprazol - Adicionado - Novo medicamento (Profilaxia/Sintoma)\nMetoclopramida - Adicionado - Novo medicamento (SOS / Agudo)"
          },
          {
            "id": "rka-128",
            "label": "Justificativa Clínica",
            "type": "textarea",
            "max_score": 2.5,
            "required": false,
            "correct_answer": "Adições: Intencionais (Sintomáticos e manejo de resgate de crises convulsivas no ambiente hospitalar).\n\nSubstituição: A troca de Fenitoína por Levetiracetam parece intencional. O médico pode ter optado por modernizar a terapia com um fármaco de melhor perfil de segurança/interação ou tentado resolver o problema de \"falta na farmácia\" (apesar de Levetiracetam ser mais caro, ele tem sido incorporado em protocolos).\n\nSuspensão (Sertralina): Omissão não intencional. A interrupção da sertralina não é recomendada."
          },
          {
            "id": "rka-129",
            "label": "Conduta Farmacêutica",
            "type": "textarea",
            "max_score": 2.5,
            "required": false,
            "correct_answer": "Solicitar ao médico a reintrodução da Sertralina. Além disso, é crucial discutir a troca do anticonvulsivante (Fenitoína pelo Levetiracetam): confirmar se a paciente terá acesso ao Levetiracetam após a alta (visto que ela já teve crise por falta de medicação no serviço público/farmácia e a fenitoína costuma ser mais acessível). Se o acesso não for garantido, discutir a possibilidade de retornar à Fenitoína sob orientação médica"
          }
        ]
      }
    }
  },
  {
    "area": "pharmacy",
    "module_type": "documentacao",
    "form_type": "referral",
    "title": "Formulário de encaminhamento",
    "description": "Ficha de encaminhamento farmacêutico com identificação e campos de avaliação",
    "content_json": [
      {
        "id": "df-130",
        "label": "Encaminhamento Farmacêutico",
        "type": "section_header",
        "description": ""
      },
      {
        "id": "df-131",
        "label": "Nome dos Farmacêuticos",
        "type": "textarea",
        "required": false,
        "max_score": 0
      },
      {
        "id": "df-132",
        "label": "Identificação",
        "type": "section_header",
        "description": ""
      },
      {
        "id": "df-133",
        "label": "Nome completo",
        "type": "textarea",
        "required": false,
        "max_score": 0
      },
      {
        "id": "df-134",
        "label": "Data de nascimento",
        "type": "date",
        "required": false,
        "max_score": 0
      },
      {
        "id": "df-135",
        "label": "Sexo",
        "type": "radio",
        "options": [
          "Masculino",
          "Feminino"
        ],
        "required": false,
        "max_score": 0
      },
      {
        "id": "df-136",
        "label": "ENCAMINHAMENTO",
        "type": "section_header",
        "description": ""
      },
      {
        "id": "df-137",
        "label": "MOTIVO DO ENCAMINHAMENTO",
        "type": "textarea",
        "required": false,
        "max_score": 1.25
      },
      {
        "id": "df-138",
        "label": "HISTÓRICO CLÍNICO/FARMACOTERAPÊUTICO RESUMIDO",
        "type": "textarea",
        "required": false,
        "max_score": 1.25
      },
      {
        "id": "df-139",
        "label": "ACHADOS DA AVALIAÇÃO FARMACÊUTICA",
        "type": "textarea",
        "required": false,
        "max_score": 1.25
      },
      {
        "id": "df-140",
        "label": "CONDUTA OU PROPOSTA DE INTERVENÇÃO",
        "type": "textarea",
        "required": false,
        "max_score": 1.25
      },
      {
        "id": "df-141",
        "label": "OBSERVAÇÕES ADICIONAIS (se houver)",
        "type": "textarea",
        "required": false,
        "max_score": 0
      }
    ]
  },
  {
    "area": "pharmacy",
    "module_type": "documentacao",
    "form_type": "referral_answer_key",
    "title": "Espelho dos encaminhamentos",
    "description": "Espelhos de resposta completos para correção por IA dos 5 casos de encaminhamento",
    "content_json": {
      "case_answers": {
        "case_1": [
          {
            "id": "dra-142",
            "label": "MOTIVO DO ENCAMINHAMENTO",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "Paciente admitida por pneumonia comunitária, em início de antibioticoterapia venosa. Encaminhamento para equipe médica e de enfermagem quanto a possíveis discrepâncias na farmacoterapia crônica e monitoramento de segurança"
          },
          {
            "id": "dra-143",
            "label": "HISTÓRICO CLÍNICO/FARMACOTERAPÊUTICO RESUMIDO",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "•\tHipertensão arterial sistêmica (em uso de Enalapril 10 mg 1x/dia + Hidroclorotiazida 25 mg 1x/dia).\n•\tDiabetes mellitus tipo 2 (em uso de Metformina 850 mg 2x/dia).\n•\tDoença do refluxo gastroesofágico (em uso de Omeprazol 20 mg/dia em jejum).\n•\tMedicamentos de uso atual: Enalapril 10 mg 1x/dia, Hidroclorotiazida 25 mg 1x/dia, Metformina 850 mg 2x/dia, Omeprazol 20 mg/dia.\n•\tInternação por pneumonia: prescrição hospitalar com Ceftriaxona EV 12/12h, Azitromicina VO 1x/dia, Dipirona EV se dor/febre, além de ajustes em Metformina (3x/dia) e Enalapril (10 mg 2x/dia)."
          },
          {
            "id": "dra-144",
            "label": "ACHADOS DA AVALIAÇÃO FARMACÊUTICA",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "•\tDiscrepância identificada: Enalapril prescrito em dose duplicada (10 mg 2x/dia) em relação ao uso domiciliar (10 mg 1x/dia). Necessário confirmar intenção médica.\n•\tDiscrepância identificada: Metformina aumentada para 3x/dia sem registro de justificativa clínica.\n•\tUso de Hidroclorotiazida não incluído na prescrição hospitalar (pode ser omissão intencional, mas precisa de registro).\n•\tRisco de eventos adversos com polifarmácia (monitorar função renal e sinais de hipotensão/intoxicação digital se houvesse digoxina).\n•\tNecessidade de garantir manutenção do Omeprazol devido ao histórico de DRGE."
          },
          {
            "id": "dra-145",
            "label": "CONDUTA OU PROPOSTA DE INTERVENÇÃO",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "•\tSugerir revisão médica da dose de Enalapril (manutenção em 10 mg 1x/dia ou justificar a duplicação).\n•\tAvaliar adequação da dose de Metformina (manter posologia habitual 2x/dia ou justificar a mudança).\n•\tConfirmar suspensão intencional da Hidroclorotiazida ou reincluir na prescrição, com registro no prontuário.\n•\tRecomendar inclusão do Omeprazol em uso hospitalar para prevenção de complicações gastrointestinais.\n•\tOrientar monitoramento de glicemia capilar e função renal durante internação"
          }
        ],
        "case_2": [
          {
            "id": "dra-146",
            "label": "MOTIVO DO ENCAMINHAMENTO",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "Paciente em alta hospitalar após infarto agudo do miocárdio (IAM com supra de ST), com ajustes na farmacoterapia. Encaminhamento para equipe da Atenção Primária à Saúde (APS) visando continuidade do cuidado, monitoramento de adesão e acompanhamento dos parâmetros clínicos"
          },
          {
            "id": "dra-147",
            "label": "HISTÓRICO CLÍNICO/FARMACOTERAPÊUTICO RESUMIDO",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "•\tInternado há 5 dias após IAM com supra de ST. Evoluiu estável, sem complicações.\n•\tDurante a internação utilizou AAS, Clopidogrel, Atorvastatina (40 mg), Enoxaparina, Isossorbida e Metoprolol (25 mg 2x/dia).\n•\tNa alta, prescritos:\no\tAAS 100 mg 1x/dia\no\tClopidogrel 75 mg 1x/dia\no\tAtorvasttatina 20 mg/noite (redução em relação à dose hospitalar)\no\tIsossorbida 20 mg 2x/dia\no\tMetoprolol 50 mg 1x/dia (ajuste posológico em relação à internação)"
          },
          {
            "id": "dra-148",
            "label": "ACHADOS DA AVALIAÇÃO FARMACÊUTICA",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "•\tSuspensão da Enoxaparina justificada, pois uso hospitalar temporário para profilaxia tromboembólica.\n•\tRedução da dose de Atorvastatina de 40 mg → 20 mg/noite: necessário confirmar intenção médica, pois diretrizes pós-IAM recomendam estatinas em alta intensidade.\n•\tAjuste de Metoprolol de 25 mg 2x/dia → 50 mg 1x/dia: dose total equivalente, mas pode impactar tolerabilidade (risco de bradicardia, hipotensão). Requer monitoramento.\n•\tManutenção da dupla antiagregação plaquetária (AAS + Clopidogrel) conforme protocolo, adequada.\n•\tNecessidade de orientar paciente quanto à adesão estrita, sinais de alerta (dor torácica, dispneia, tontura) e acompanhamento ambulatorial precoce"
          },
          {
            "id": "dra-149",
            "label": "CONDUTA OU PROPOSTA DE INTERVENÇÃO",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "•\tComunicar APS e equipe médica sobre redução da dose de Atorvastatina (avaliar necessidade de manter 40 mg).\n•\tDestacar necessidade de monitorar pressão arterial e frequência cardíaca após ajuste do Metoprolol.\n•\tOrientar paciente/cuidadores sobre correta administração dos medicamentos, importância da adesão à dupla antiagregação, e riscos de abandono.\n•\tSolicitar agendamento de retorno em cardiologia em até 30 dias"
          }
        ],
        "case_3": [
          {
            "id": "dra-150",
            "label": "MOTIVO DO ENCAMINHAMENTO",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "Paciente transferida do ambulatório para internação cirúrgica. Encaminhamento para equipe médica/enfermagem com foco na reconciliação medicamentosa, continuidade do tratamento de doenças crônicas e prevenção de discrepâncias durante o período perioperatório"
          },
          {
            "id": "dra-151",
            "label": "HISTÓRICO CLÍNICO/FARMACOTERAPÊUTICO RESUMIDO",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "•\tHipotireoidismo em uso crônico de Levotiroxina 75 mcg/dia em jejum.\n•\tTranstorno depressivo leve em uso contínuo de Sertralina 50 mg/dia.\n•\tUso eventual de Ibuprofeno 400 mg se dor.\n•\tUso de Omeprazol 20 mg/dia.\n•\tPrescrição hospitalar atual: Dipirona VO 1g 6/6h, Cefazolina 1g EV dose única pré-operatória, Heparina não fracionada 5000 UI SC 8/8h, Omeprazol 40 mg/dia."
          },
          {
            "id": "dra-152",
            "label": "ACHADOS DA AVALIAÇÃO FARMACÊUTICA",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "•\tOmissão da Levotiroxina na prescrição hospitalar → risco de descompensação do hipotireoidismo se suspenso por vários dias. Deve ser mantido mesmo em contexto cirúrgico, salvo contraindicação.\n•\tOmissão da Sertralina na prescrição hospitalar → risco de síndrome de descontinuação ou piora do humor. Não há contraindicação absoluta no perioperatório, devendo ser avaliado com a equipe médica.\n•\tIbuprofeno não incluído (uso esporádico). Adequado não utilizar em contexto cirúrgico devido ao risco de sangramento.\n•\tOmeprazol foi mantido, mas em dose maior (40 mg vs. 20 mg). Alteração aceitável no contexto hospitalar, mas deve ser reavaliada na alta.\n•\tPrescrição hospitalar adequada para cirurgia (antibiótico profilático + analgesia + anticoagulação)."
          },
          {
            "id": "dra-153",
            "label": "CONDUTA OU PROPOSTA DE INTERVENÇÃO",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "•\tSolicitar inclusão da Levotiroxina 75 mcg VO em jejum para continuidade do tratamento do hipotireoidismo.\n•\tRecomendar inclusão da Sertralina 50 mg/dia, avaliando risco-benefício com a equipe médica (importante não suspender abruptamente).\n•\tReforçar necessidade de documentar a suspensão intencional do Ibuprofeno no prontuário (explicitar motivo: risco de sangramento).\n•\tSugerir revisão da dose do Omeprazol na alta para retorno à posologia habitual (20 mg/dia).\n•\tOrientar equipe sobre importância da reconciliação completa em pacientes com doenças crônicas no perioperatório"
          }
        ],
        "case_4": [
          {
            "id": "dra-154",
            "label": "MOTIVO DO ENCAMINHAMENTO",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "Paciente em alta hospitalar após descompensação de insuficiência cardíaca com fração de ejeção reduzida (ICFER). Encaminhamento à Atenção Primária à Saúde (APS) e cardiologia para monitoramento de adesão, ajuste terapêutico e acompanhamento clínico"
          },
          {
            "id": "dra-155",
            "label": "HISTÓRICO CLÍNICO/FARMACOTERAPÊUTICO RESUMIDO",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "•\tICFER, HAS e hiperplasia prostática.\n•\tAntes da internação: Furosemida 40 mg/dia, Captopril 25 mg 2x/dia, Atenolol 50 mg/dia, Hidralazina 25 mg 3x/dia, Tansulosina 0,4 mg/noite.\n•\tAlta hospitalar com as seguintes modificações:\no\tFurosemida 40 mg → ajustada para 2x/dia.\no\tCaptopril → trocado por Enalapril 10 mg 2x/dia.\no\tAtenolol → trocado por Carvedilol 6,25 mg 2x/dia.\no\tInclusão de Espironolactona 25 mg/dia.\no\tHidralazina e Tansulosina mantidas"
          },
          {
            "id": "dra-156",
            "label": "ACHADOS DA AVALIAÇÃO FARMACÊUTICA",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "•\tFurosemida intensificada (1x/dia → 2x/dia): adequado em contexto de congestão; requer monitoramento de eletrólitos e função renal.\n•\tTroca de Captopril por Enalapril: coerente, ambos IECA; avaliar tolerabilidade e PA.\n•\tTroca de Atenolol por Carvedilol: adequada, carvedilol tem benefício comprovado em ICFER. Requer ajuste gradual da dose.\n•\tIntrodução de Espironolactona: apropriada, alinhada às diretrizes de ICFER (tríade terapêutica). Necessidade de monitorar potássio e creatinina.\n•\tHidralazina e Tansulosina mantidas: manter vigilância para hipotensão ortostática.\n•\tNecessidade de reforçar adesão e compreensão do novo regime, pois houve múltiplas mudanças terapêuticas"
          },
          {
            "id": "dra-157",
            "label": "CONDUTA OU PROPOSTA DE INTERVENÇÃO",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "•\tReforçar importância da adesão ao novo esquema, explicando claramente as trocas (Captopril → Enalapril, Atenolol → Carvedilol).\n•\tOrientar monitoramento ambulatorial de PA, FC, função renal e potássio.\n•\tRecomendar consulta de retorno precoce com cardiologia para ajuste de doses (especialmente Carvedilol e Enalapril).\n•\tElaborar quadro de medicamentos simplificado para o paciente e/ou cuidador, destacando horários e finalidades.\n•\tIncluir orientação sobre sinais de descompensação (ganho de peso, edema, dispneia)"
          }
        ],
        "case_5": [
          {
            "id": "dra-158",
            "label": "MOTIVO DO ENCAMINHAMENTO",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "Paciente admitida na emergência após crise convulsiva, com histórico de epilepsia em uso crônico de fenitoína, mas que apresentou falha de adesão devido à falta do medicamento na rede pública. Encaminhamento para equipe médica visando continuidade terapêutica adequada, prevenção de novas crises e avaliação de ajuste do esquema anticonvulsivante"
          },
          {
            "id": "dra-159",
            "label": "HISTÓRICO CLÍNICO/FARMACOTERAPÊUTICO RESUMIDO",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "•\tEpilepsia desde os 16 anos.\n•\tTratamento ambulatorial: Fenitoína 100 mg 3x/dia, Ácido fólico 5 mg/dia, Sertralina 50 mg/dia.\n•\tEvento atual: crise tônico-clônica generalizada, possivelmente relacionada à descontinuação da fenitoína por indisponibilidade na farmácia.\n•\tPrescrição hospitalar: Diazepam EV se crise, Levetiracetam 500 mg 2x/dia, Ácido fólico 5 mg/dia, Omeprazol 20 mg/dia, Metoclopramida se necessário"
          },
          {
            "id": "dra-160",
            "label": "ACHADOS DA AVALIAÇÃO FARMACÊUTICA",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "•\tFenitoína foi descontinuada e substituída por Levetiracetam. É necessário verificar se a troca foi intencional (mudança de esquema terapêutico) ou provisória pela falta de acesso ao medicamento.\n•\tÁcido fólico mantido adequadamente, importante em mulheres em idade fértil e no uso de anticonvulsivantes.\n•\tSertralina não foi incluída na prescrição hospitalar → risco de síndrome de descontinuação; deve ser avaliada a reinserção.\n•\tInclusão de Omeprazol (sem registro de DRGE) e Metoclopramida se náuseas → avaliar necessidade.\n•\tImportante discutir estratégias para evitar descontinuação terapêutica futura (ex.: garantir acesso a medicamentos pelo CEAF ou judicialização, se necessário)"
          },
          {
            "id": "dra-161",
            "label": "CONDUTA OU PROPOSTA DE INTERVENÇÃO",
            "type": "textarea",
            "max_score": 1.25,
            "required": false,
            "correct_answer": "•\tConfirmar com equipe médica a substituição da Fenitoína por Levetiracetam: manter como ajuste terapêutico definitivo ou reintroduzir fenitoína após estabilização.\n•\tSugerir inclusão da Sertralina na prescrição hospitalar, caso não haja contraindicações.\n•\tOrientar paciente sobre adesão rigorosa ao esquema anticonvulsivante, destacando riscos da suspensão abrupta.\n•\tDiscutir com equipe de farmácia hospitalar e APS estratégias para garantir acesso contínuo ao anticonvulsivante (farmácia de alto custo ou solicitação especial).\n•\tReavaliar a real necessidade de Omeprazol e Metoclopramida para evitar polifarmácia desnecessária"
          }
        ]
      }
    }
  },
  {
    "area": "pharmacy",
    "module_type": "documentacao",
    "form_type": "medication_summary",
    "title": "Quadro resumo dos medicamentos",
    "description": "Tabela de resumo medicamentoso com 6 colunas: Medicamento, Dose, Via, Horário, Finalidade e Observações",
    "content_json": {
      "columns": [
        {
          "id": "mc-162",
          "label": "Medicamento"
        },
        {
          "id": "mc-163",
          "label": "Dose"
        },
        {
          "id": "mc-164",
          "label": "Via de Administração"
        },
        {
          "id": "mc-165",
          "label": "Horário de Uso"
        },
        {
          "id": "mc-166",
          "label": "Finalidade"
        },
        {
          "id": "mc-167",
          "label": "Observações"
        }
      ],
      "rows_score": 1
    }
  },
  {
    "area": "pharmacy",
    "module_type": "documentacao",
    "form_type": "medication_answer_key",
    "title": "Espelho do quadro resumo",
    "description": "Espelhos de resposta do quadro resumo de medicamentos para correção por IA dos 5 casos",
    "content_json": {
      "case_answers": {
        "case_1": {
          "columns": [
            {
              "id": "mc-162",
              "label": "Medicamento"
            },
            {
              "id": "mc-163",
              "label": "Dose"
            },
            {
              "id": "mc-164",
              "label": "Via de Administração"
            },
            {
              "id": "mc-165",
              "label": "Horário de Uso"
            },
            {
              "id": "mc-166",
              "label": "Finalidade"
            },
            {
              "id": "mc-167",
              "label": "Observações"
            }
          ],
          "rows_score": 1,
          "answer_rows": [
            {
              "mc-162": "Ceftriaxona",
              "mc-163": "1 g",
              "mc-164": "EV",
              "mc-165": "12/12h",
              "mc-166": "Infecção pulmonar",
              "mc-167": "Uso hospitalar, suspender na alta"
            },
            {
              "mc-162": "Azitromicina",
              "mc-163": "500 mg",
              "mc-164": "VO",
              "mc-165": "1x/dia",
              "mc-166": "Infecção pulmonar",
              "mc-167": "Completar ciclo prescrito"
            },
            {
              "mc-162": "Dipirona",
              "mc-163": "1 g",
              "mc-164": "EV",
              "mc-165": "Se febre/dor",
              "mc-166": "Analgesia/antitérmico",
              "mc-167": "Uso se necessário"
            },
            {
              "mc-162": "Metformina",
              "mc-163": "850 mg",
              "mc-164": "VO",
              "mc-165": "3x/dia",
              "mc-166": "Controle glicêmico",
              "mc-167": "Confirmar dose correta (habitual 2x/dia)"
            },
            {
              "mc-162": "Enalapril",
              "mc-163": "10 mg",
              "mc-164": "VO",
              "mc-165": "2x/dia",
              "mc-166": "Controle da pressão",
              "mc-167": "Confirmar ajuste (habitual 1x/dia)"
            },
            {
              "mc-162": "Hidroclorotiazida",
              "mc-163": "25 mg",
              "mc-164": "VO",
              "mc-165": "1x/dia",
              "mc-166": "Controle da pressão",
              "mc-167": "Reavaliar necessidade"
            },
            {
              "mc-162": "Omeprazol",
              "mc-163": "20 mg",
              "mc-164": "VO",
              "mc-165": "1x/dia",
              "mc-166": "Proteção gástrica",
              "mc-167": "Reintroduzir"
            }
          ]
        },
        "case_2": {
          "columns": [
            {
              "id": "mc-162",
              "label": "Medicamento"
            },
            {
              "id": "mc-163",
              "label": "Dose"
            },
            {
              "id": "mc-164",
              "label": "Via de Administração"
            },
            {
              "id": "mc-165",
              "label": "Horário de Uso"
            },
            {
              "id": "mc-166",
              "label": "Finalidade"
            },
            {
              "id": "mc-167",
              "label": "Observações"
            }
          ],
          "rows_score": 1,
          "answer_rows": [
            {
              "mc-162": "AAS",
              "mc-163": "100 mg",
              "mc-164": "VO",
              "mc-165": "1x/dia",
              "mc-166": "Antiagregante plaquetário",
              "mc-167": "Uso contínuo"
            },
            {
              "mc-162": "Clopidogrel",
              "mc-163": "75 mg",
              "mc-164": "VO",
              "mc-165": "1x/dia",
              "mc-166": "Antiagregante plaquetário",
              "mc-167": "Uso contínuo (dupla antiagregação)"
            },
            {
              "mc-162": "Atorvastatina",
              "mc-163": "20 mg",
              "mc-164": "VO",
              "mc-165": "À noite",
              "mc-166": "Redução de colesterol",
              "mc-167": "Dose menor que hospitalar (avaliar)"
            },
            {
              "mc-162": "Isossorbida",
              "mc-163": "20 mg",
              "mc-164": "VO",
              "mc-165": "2x/dia",
              "mc-166": "Controle da angina",
              "mc-167": "Tomar em intervalos regulares"
            },
            {
              "mc-162": "Metoprolol",
              "mc-163": "50 mg",
              "mc-164": "VO",
              "mc-165": "1x/dia",
              "mc-166": "Controle de FC e PA",
              "mc-167": "Ajustar conforme tolerância"
            }
          ]
        },
        "case_3": {
          "columns": [
            {
              "id": "mc-162",
              "label": "Medicamento"
            },
            {
              "id": "mc-163",
              "label": "Dose"
            },
            {
              "id": "mc-164",
              "label": "Via de Administração"
            },
            {
              "id": "mc-165",
              "label": "Horário de Uso"
            },
            {
              "id": "mc-166",
              "label": "Finalidade"
            },
            {
              "id": "mc-167",
              "label": "Observações"
            }
          ],
          "rows_score": 1,
          "answer_rows": [
            {
              "mc-162": "Levotiroxina",
              "mc-163": "75 mcg",
              "mc-164": "VO",
              "mc-165": "Jejum",
              "mc-166": "Controle do hipotireoidismo",
              "mc-167": "Deve ser incluído na internação"
            },
            {
              "mc-162": "Sertralina",
              "mc-163": "50 mg",
              "mc-164": "VO",
              "mc-165": "Manhã",
              "mc-166": "Transtorno depressivo",
              "mc-167": "Deve ser incluída"
            },
            {
              "mc-162": "Ibuprofeno",
              "mc-163": "400 mg",
              "mc-164": "VO",
              "mc-165": "Se dor",
              "mc-166": "Analgesia",
              "mc-167": "Suspenso devido a risco de sangramento"
            },
            {
              "mc-162": "Omeprazol",
              "mc-163": "40 mg",
              "mc-164": "VO",
              "mc-165": "1x/dia",
              "mc-166": "Proteção gástrica",
              "mc-167": "Reavaliar dose na alta (habitual 20 mg)"
            },
            {
              "mc-162": "Dipirona",
              "mc-163": "1 g",
              "mc-164": "VO",
              "mc-165": "6/6h",
              "mc-166": "Analgesia",
              "mc-167": "Uso hospitalar"
            },
            {
              "mc-162": "Cefazolina",
              "mc-163": "1 g",
              "mc-164": "EV",
              "mc-165": "Dose única",
              "mc-166": "Profilaxia cirúrgica",
              "mc-167": "Pré-operatório"
            },
            {
              "mc-162": "Heparina NF",
              "mc-163": "5000 UI",
              "mc-164": "SC",
              "mc-165": "8/8h",
              "mc-166": "Prevenção trombose",
              "mc-167": "Suspender após cirurgia"
            }
          ]
        },
        "case_4": {
          "columns": [
            {
              "id": "mc-162",
              "label": "Medicamento"
            },
            {
              "id": "mc-163",
              "label": "Dose"
            },
            {
              "id": "mc-164",
              "label": "Via de Administração"
            },
            {
              "id": "mc-165",
              "label": "Horário de Uso"
            },
            {
              "id": "mc-166",
              "label": "Finalidade"
            },
            {
              "id": "mc-167",
              "label": "Observações"
            }
          ],
          "rows_score": 1,
          "answer_rows": [
            {
              "mc-162": "Furosemida",
              "mc-163": "40 mg",
              "mc-164": "VO",
              "mc-165": "8h / 20h",
              "mc-166": "Controle da congestão",
              "mc-167": "Monitorar função renal e eletrólitos"
            },
            {
              "mc-162": "Enalapril",
              "mc-163": "10 mg",
              "mc-164": "VO",
              "mc-165": "8h / 20h",
              "mc-166": "Controle da pressão e IC",
              "mc-167": "Vigiar PA e função renal"
            },
            {
              "mc-162": "Carvedilol",
              "mc-163": "6,25 mg",
              "mc-164": "VO",
              "mc-165": "8h / 20h",
              "mc-166": "Reduz mortalidade na IC",
              "mc-167": "Requer titulação gradual"
            },
            {
              "mc-162": "Espironolactona",
              "mc-163": "25 mg",
              "mc-164": "VO",
              "mc-165": "8h",
              "mc-166": "Reduz mortalidade na IC",
              "mc-167": "Vigiar potássio"
            },
            {
              "mc-162": "Hidralazina",
              "mc-163": "25 mg",
              "mc-164": "VO",
              "mc-165": "8h / 14h / 20h",
              "mc-166": "Controle da pressão",
              "mc-167": "Uso contínuo"
            },
            {
              "mc-162": "Tansulosina",
              "mc-163": "0,4 mg",
              "mc-164": "VO",
              "mc-165": "À noite",
              "mc-166": "Hiperplasia prostática",
              "mc-167": "Vigiar hipotensão postural"
            }
          ]
        },
        "case_5": {
          "columns": [
            {
              "id": "mc-162",
              "label": "Medicamento"
            },
            {
              "id": "mc-163",
              "label": "Dose"
            },
            {
              "id": "mc-164",
              "label": "Via de Administração"
            },
            {
              "id": "mc-165",
              "label": "Horário de Uso"
            },
            {
              "id": "mc-166",
              "label": "Finalidade"
            },
            {
              "id": "mc-167",
              "label": "Observações"
            }
          ],
          "rows_score": 1,
          "answer_rows": [
            {
              "mc-162": "Levetiracetam",
              "mc-163": "500 mg",
              "mc-164": "VO",
              "mc-165": "8h / 20h",
              "mc-166": "Controle das crises",
              "mc-167": "Substituiu fenitoína"
            },
            {
              "mc-162": "Ácido fólico",
              "mc-163": "5 mg",
              "mc-164": "VO",
              "mc-165": "1x/dia",
              "mc-166": "Prevenção de deficiência",
              "mc-167": "Mantido"
            },
            {
              "mc-162": "Sertralina",
              "mc-163": "50 mg",
              "mc-164": "VO",
              "mc-165": "Manhã",
              "mc-166": "Transtorno depressivo",
              "mc-167": "Reincluir (não prescrito hospitalar)"
            },
            {
              "mc-162": "Omeprazol",
              "mc-163": "20 mg",
              "mc-164": "VO",
              "mc-165": "1x/dia",
              "mc-166": "Proteção gástrica",
              "mc-167": "Questionar necessidade"
            },
            {
              "mc-162": "Diazepam",
              "mc-163": "10 mg",
              "mc-164": "EV",
              "mc-165": "Se crise",
              "mc-166": "Controle agudo de convulsão",
              "mc-167": "Uso hospitalar"
            },
            {
              "mc-162": "Metoclopramida",
              "mc-163": "10 mg",
              "mc-164": "VO",
              "mc-165": "Se náuseas",
              "mc-166": "Sintomático",
              "mc-167": "Uso eventual"
            }
          ]
        }
      }
    }
  },
  {
    "area": "pharmacy",
    "module_type": "documentacao",
    "form_type": "clinical_cases",
    "title": "Casos Clínicos — Documentação",
    "description": "5 casos clínicos completos para o módulo de documentação (mesmos da reconciliação)",
    "content_json": [
      {
        "title": "Caso 1 - Ana Lúcia (Admissão hospitalar por pneumonia)",
        "content": "Paciente: Ana Lúcia dos Santos, 72 anos, sexo feminino, aposentada. Mora com o marido e tem histórico de hipertensão arterial sistêmica, diabetes tipo 2 e doença do refluxo gastroesofágico.\nSituação atual: Internada na emergência com diagnóstico de pneumonia comunitária, iniciando antibiótico por via parenteral. Refere febre, tosse produtiva, cansaço e inapetência.\nHistórico de uso domiciliar (últimos 6 meses):\n•\tEnalapril 10 mg 1x/dia pela manhã (prescrito por médico da UBS)\n•\tHidroclorotiazida 25 mg 1x/dia junto com o café\n•\tMetformina 850 mg 2x/dia (após o almoço e jantar)\n•\tOmeprazol 20 mg em jejum\nPrescrição hospitalar no momento da admissão:\n•\tCeftriaxona 1g EV a cada 12 horas\n•\tAzitromicina 500 mg VO 1x/dia\n•\tDipirona 1g EV se dor ou febre\n•\tMetformina 850 mg 3x/dia\n•\tEnalapril 10 mg 2x/dia\nTarefa:\nVocê deve comparar a prescrição habitual com a nova prescrição hospitalar e identificar discrepâncias."
      },
      {
        "title": "Caso 2 – Carlos Henrique (Alta hospitalar pós-infarto agudo do miocárdio)",
        "content": "Paciente: Carlos Henrique de Andrade, 64 anos, sexo masculino, contador aposentado. Internado há 5 dias após quadro de dor torácica e confirmado IAM com supradesnível de ST. Evoluiu sem complicações, recebeu tratamento clínico e está em preparo para alta hospitalar.\nMedicamentos em uso durante internação:\n•\tAAS 100 mg 1x/dia\n•\tClopidogrel 75 mg 1x/dia\n•\tAtorvastatina 40 mg à noite\n•\tEnoxaparina 40 mg SC a cada 12 horas\n•\tIsossorbida dinitrato 20 mg 2x/dia\n•\tMetoprolol 25 mg 2x/dia\nPrescrição ao receber alta hospitalar:\n•\tAAS 100 mg 1x/dia\n•\tClopidogrel 75 mg 1x/dia\n•\tAtorvastatina 20 mg à noite\n•\tIsossorbida 20 mg 2x/dia\n•\tMetoprolol 50 mg 1x/dia\nTarefa:\nVocê deve identificar e justificar as alterações:"
      },
      {
        "title": "Caso 3 – Maria Eduarda (Transferência do ambulatório para internação cirúrgica)",
        "content": "Paciente: Maria Eduarda Ribeiro, 55 anos, sexo feminino, professora. Está em uso crônico de levotiroxina para hipotireoidismo e sertralina para transtorno depressivo leve. Foi admitida para histerectomia eletiva após sangramentos uterinos recorrentes.\nHistórico de medicamentos em uso ambulatorial:\n•\tLevotiroxina 75 mcg em jejum\n•\tSertralina 50 mg 1x/dia (pela manhã)\n•\tIbuprofeno 400 mg se dor (uso esporádico)\n•\tOmeprazol 20 mg 1x/dia\nPrescrição hospitalar no momento da internação:\n•\tDipirona 1g VO a cada 6 horas\n•\tCefazolina 1g EV dose única pré-operatória\n•\tHeparina não fracionada 5000 UI SC a cada 8 horas\n•\tOmeprazol 40 mg 1x/dia\nTarefa:\nVocê deve verificar o que foi mantido, omitido ou ajustado na prescrição hospitalar"
      },
      {
        "title": "Caso 4 – João Guilherme (Alta hospitalar após descompensação de insuficiência cardíaca)",
        "content": "Paciente: João Guilherme Peixoto, 79 anos, sexo masculino, viúvo, aposentado. Histórico de insuficiência cardíaca com fração de ejeção reduzida (ICFER), hipertensão e hiperplasia prostática. Foi internado há 6 dias por dispneia aos mínimos esforços, ortopneia e ganho de peso.\nMedicamentos em uso antes da internação (domicílio):\n•\tFurosemida 40 mg 1x/dia\n•\tCaptopril 25 mg 2x/dia\n•\tAtenolol 50 mg 1x/dia\n•\tHidralazina 25 mg 3x/dia\n•\tTansulosina 0,4 mg à noite\nPrescrição de admissão hospitalar:\n•\tFurosemida 40 mg 2x/dia\n•\tEnalapril 10 mg 2x/dia\n•\tCarvedilol 6,25 mg 2x/dia\n•\tEspironolactona 25 mg 1x/dia\n•\tHidralazina 25 mg 3x/dia\n•\tTansulosina 0,4 mg à noite\nTarefa:\nCompare os esquemas antes e após a internação. Analise se a transição está segura, justificada e se há risco de duplicidade ou necessidade de reorientação ao paciente"
      },
      {
        "title": "Caso 5 – Larissa (Admissão por crise convulsiva)",
        "content": "Paciente: Larissa Monteiro de Souza, 31 anos, sexo feminino, artista plástica, mora sozinha. Diagnosticada com epilepsia desde os 16 anos, em uso contínuo de anticonvulsivantes. Foi admitida na emergência após crise tônico-clônica generalizada, provavelmente por descontinuação medicamentosa involuntária (relata que ficou sem medicamento por falta na farmácia).\nHistórico de medicamentos em uso ambulatorial:\n•\tFenitoína 100 mg 3x/dia\n•\tÁcido fólico 5 mg 1x/dia\n•\tSertralina 50 mg 1x/dia\nPrescrição hospitalar na admissão:\n•\tDiazepam 10 mg EV se nova crise\n•\tLevetiracetam 500 mg 2x/dia\n•\tÁcido fólico 5 mg 1x/dia\n•\tOmeprazol 20 mg 1x/dia\n•\tMetoclopramida 10 mg se náuseas\nTarefa:\nIdentifique as discrepâncias, classifique e justifique cada uma"
      }
    ]
  }
];
