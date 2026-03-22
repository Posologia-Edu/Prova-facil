

# Plano de Implementação: Novos Módulos de Avaliação

## Resumo

Implementar 5 novos tipos de avaliação: **SCT** (Script Concordance Test), **KFE** (Key Feature Exam), **Mini-CEX/DOPS**, **SJT** (Situational Judgment Test) e **Progress Test**. Cada módulo segue os padrões arquiteturais já existentes no sistema (OSCE, Simulação Realística, Provas).

---

## Fase 1 — SCT (Script Concordance Test)
**Prioridade: Alta** — Diferencial competitivo forte, raro no mercado brasileiro.

### Banco de dados
- `sct_exams` — id, user_id, title, description, status, expert_panel_size, deleted_at, created_at
- `sct_scenarios` — id, sct_exam_id, position, clinical_vignette (texto do cenário), hypothesis, new_information, created_at
- `sct_expert_responses` — id, scenario_id, expert_email, expert_name, likert_value (-2 a +2), created_at
- `sct_student_sessions` — id, sct_exam_id, student_email, student_name, status, started_at, finished_at
- `sct_student_answers` — id, session_id, scenario_id, likert_value, score, created_at

### Páginas
- `SctExams.tsx` — Listagem de exames SCT (padrão OsceExams)
- `SctEditor.tsx` — Editor de cenários com campos: vinheta clínica, hipótese, informação nova. Abas: Cenários, Painel de Especialistas, Configurações, Resultados
- `SctExpertPortal.tsx` — Portal para especialistas responderem via link (sem login)
- `SctStudentPortal.tsx` — Portal do aluno com escala Likert visual (-2 a +2)
- `SctResults.tsx` — Resultados com pontuação agregada (método de crédito parcial)

### Lógica de pontuação
- Crédito parcial: resposta do aluno recebe pontuação proporcional à frequência com que os especialistas escolheram a mesma opção
- Edge function `grade-sct` para calcular scores com base no painel

---

## Fase 2 — KFE (Key Feature Exam)
**Prioridade: Alta** — Complementa o SCT focando em decisões críticas.

### Banco de dados
- `kfe_exams` — id, user_id, title, description, status, deleted_at, created_at
- `kfe_cases` — id, kfe_exam_id, position, clinical_scenario (texto longo), created_at
- `kfe_key_features` — id, case_id, position, question_text, question_type (multiple_choice/short_answer/ordering), options_json, correct_answer_json, max_score, created_at
- `kfe_sessions` — id, kfe_exam_id, student_email, student_name, status, total_score, created_at
- `kfe_answers` — id, session_id, key_feature_id, answer_json, score, created_at

### Páginas
- `KfeExams.tsx` — Listagem
- `KfeEditor.tsx` — Editor com caso clínico + pontos-chave de decisão
- `KfeStudentPortal.tsx` — Caso apresentado progressivamente, aluno responde nos pontos de decisão
- `KfeResults.tsx` — Resultados por caso e por ponto-chave

### Lógica
- Pontuação binária ou parcial por key feature
- Suporte a questões de ordenação (arrastar e soltar a sequência correta de ações)

---

## Fase 3 — Mini-CEX e DOPS
**Prioridade: Média** — Usa infraestrutura similar ao OSCE (checklists).

### Banco de dados
- `clinical_observations` — id, user_id, class_id, type (mini_cex/dops), title, competency_domains_json, created_at
- `clinical_observation_sessions` — id, observation_id, evaluator_email, student_name, student_email, scores_json, feedback, complexity (low/medium/high), duration_minutes, created_at

### Páginas
- `ClinicalObservations.tsx` — Listagem e criação de templates Mini-CEX/DOPS
- `ClinicalObservationEditor.tsx` — Configuração dos domínios de competência com escala 1-9
- `ClinicalObservationEval.tsx` — Formulário de avaliação mobile-friendly para preenchimento à beira-leito
- `ClinicalObservationResults.tsx` — Evolução longitudinal do aluno (gráfico de radar + linha do tempo)

### Domínios padrão Mini-CEX
- Anamnese, Exame Físico, Raciocínio Clínico, Comunicação, Profissionalismo, Organização, Competência Global

### Domínios padrão DOPS
- Indicação, Consentimento, Preparação, Técnica, Assepsia, Cuidados pós-procedimento, Competência Global

---

## Fase 4 — SJT (Situational Judgment Test)
**Prioridade: Média** — Avalia ética e profissionalismo.

### Banco de dados
- `sjt_exams` — id, user_id, title, description, status, scoring_method (ranking/rating), deleted_at, created_at
- `sjt_scenarios` — id, sjt_exam_id, position, scenario_text, actions_json (array de ações possíveis), correct_ranking_json, created_at
- `sjt_sessions` — id, sjt_exam_id, student_email, student_name, status, total_score, created_at
- `sjt_answers` — id, session_id, scenario_id, student_ranking_json, score, created_at

### Páginas
- `SjtExams.tsx` — Listagem
- `SjtEditor.tsx` — Editor de cenários com 4-5 ações para ranquear. Geração por IA de dilemas éticos
- `SjtStudentPortal.tsx` — Aluno arrasta ações na ordem (mais → menos apropriada)
- `SjtResults.tsx` — Pontuação por cenário e distribuição

### Lógica de pontuação
- Método de concordância parcial: cada ação comparada com a posição ideal, penalidade proporcional à distância

---

## Fase 5 — Progress Test
**Prioridade: Baixa** — Requer planejamento longitudinal.

### Banco de dados
- `progress_tests` — id, user_id, title, description, application_date, target_years_json (ex: [1,2,3,4,5,6]), status, created_at
- `progress_test_questions` — id, test_id, question_id (FK → question_bank), position, expected_year, created_at
- `progress_test_sessions` — id, test_id, student_email, student_name, student_year, status, created_at
- `progress_test_answers` — id, session_id, question_id, answer_json, is_correct, response_type (know/dont_know/guess), created_at

### Páginas
- `ProgressTests.tsx` — Listagem com timeline visual
- `ProgressTestEditor.tsx` — Importação de questões do banco existente, categorização por ano esperado
- `ProgressTestStudentPortal.tsx` — Prova com opção "Não sei" (evita chute)
- `ProgressTestResults.tsx` — Curva de progresso por aluno ao longo dos anos, comparação com coorte

### Diferencial
- Reutiliza o `question_bank` existente
- Gráficos longitudinais mostrando evolução do aluno entre aplicações

---

## Integração com o sistema existente

### Sidebar (`AppSidebar.tsx`)
- Novo item "Avaliações" com submenu agrupando: SCT, KFE, Mini-CEX/DOPS, SJT, Progress Test

### Sistema de Turmas (`Classes.tsx`)
- Adicionar os novos tipos de avaliação como opções de vínculo à turma

### Portal do Aluno (`StudentDashboard.tsx`)
- Exibir avaliações SCT, KFE e SJT pendentes junto com as provas tradicionais

### Edge Functions
- `grade-sct` — Cálculo de crédito parcial baseado no painel de especialistas
- `generate-sjt-scenarios` — Geração de dilemas éticos por IA
- `generate-kfe-cases` — Geração de casos com key features por IA

### RLS
- Todas as tabelas seguem o padrão existente: owner (user_id), admin (has_role), anon select/insert para portais de alunos

---

## Ordem de implementação sugerida

| Etapa | Módulo | Estimativa |
|-------|--------|-----------|
| 1 | SCT | Tabelas + Editor + Portal Especialista + Portal Aluno + Pontuação |
| 2 | KFE | Tabelas + Editor + Portal Aluno + Pontuação |
| 3 | SJT | Tabelas + Editor + Portal Aluno + Drag-and-drop ranking |
| 4 | Mini-CEX/DOPS | Tabelas + Templates + Formulário mobile + Gráficos |
| 5 | Progress Test | Tabelas + Importação do banco + Gráficos longitudinais |

