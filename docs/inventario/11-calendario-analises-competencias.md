# Inventário — Calendário, Análises (provas) e Competências

## Calendário — `/calendar` (`ExamCalendar.tsx`, 276 linhas)

- Lê `exam_publications` do usuário (provas publicadas com janela de início/fim) e monta um **calendário de provas**: visão de mês com marcas por dia e lista lateral/inferior dos eventos do dia/mês.
- Cartões com título da prova, **status** (badge: em aplicação, agendada, encerrada) e botão para **abrir a prova**/monitoramento.
- **Só mostra provas online.** Aulas do cronograma da Turma (que têm datas), OSCE, Júri e simulações **não aparecem** — lacuna importante para o plano "Turma no centro".
- Sem criar eventos, sem filtro por turma, sem integração externa (iCal).

## Análises — `/analytics` (`Analytics.tsx`, 413 linhas)

- Filtros: **turma** e **prova** (Todas/uma). Dados de `exams`, `classes`, `exam_publications`, `exam_sessions`, `student_answers`.
- Indicadores: total de alunos, **média**, **taxa de aprovação**, total de envios.
- Gráficos (Recharts): **distribuição de notas** (faixas), **acerto por assunto/tag** (barras horizontais, cor fixa verde), **questões mais erradas** (lista com erros/total e % de erro).
- Estados: vazio com dica. Textos em i18n (`analytics_*`).
- **Não cobre** PV, OSCE, Simulação, SCT, KFE etc. (cada um tem suas análises dentro do módulo); só avaliações online de questões.
- Plano: "Análises" fica no menu ou vira aba da Turma (decidir no redesenho; hoje há duas entradas: "Análises" e "Análises VP").

## Competências — `/competency-analysis` (`CompetencyAnalysis.tsx`, 344) + `CompetencyManagement` (187) + `CompetencySelector` (127)

- Filtros: **fonte** (origem do registro: Mini-CEX/DOPS, OSCE, etc.; lista dinâmica com `SOURCE_LABELS`) e **turma**.
- Abas: **Gestão** (CRUD de definições de competência: nome *, **área** *, descrição; tabela agrupada por área com badge) e, havendo dados, **Visão geral** (4 contadores: competências, alunos avaliados, registros, fontes de dados; **radar** "média geral por competência"), **Evolução** (linhas no tempo) e **Por aluno** (detalhamento aluno × competência).
- `CompetencySelector` é usado nos editores de **Mini-CEX/DOPS** e **Simulação (Anamnese)** para vincular competências; os escores vêm de `competency_scores` (fonte, rótulo, aluno por e-mail).
- Estados vazios: "Sem dados de avaliação ainda".

## Observações / lacunas

- Calendário e Análises não conhecem a Turma como unidade (filtro por turma só nas análises).
- Três telas de "análise" desconectadas (Análises, Análises VP, Competências), mais as análises internas de cada módulo.

## Protótipo vs. real

O protótipo não incluía Calendário, Análises nem Competências. Não há decisão de design tomada; ver o índice.
