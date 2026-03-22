

# Plano: Júri Simulado Clínico

## Resumo

Novo módulo de avaliação "Júri Simulado" onde o professor cria processos clínicos (com geração por IA), distribui alunos em 5 grupos, e o sistema rotaciona automaticamente os papéis (Acusação, Defesa, Júri) entre os processos. Inclui painel do juiz com controle de tempo/fala, personagens-testemunha gerados por IA, formulários isolados por grupo e portal do aluno.

---

## Banco de Dados

### Tabelas

- **`mock_trials`** — id, user_id, title, description, status (draft/active/finished), judge_name, deleted_at, created_at
- **`mock_trial_cases`** — id, mock_trial_id, position, case_number (ex: "001/2025"), title, process_content (texto completo do processo em rich text/markdown), learning_objectives, characters_json (personagens gerados: acusação e defesa com nome, profissão, instruções), created_at
- **`mock_trial_groups`** — id, mock_trial_id, group_number (1-5), name (ex: "Grupo 1"), created_at
- **`mock_trial_students`** — id, group_id, student_name, student_email, created_at
- **`mock_trial_assignments`** — id, case_id, group_id, role (prosecution/defense/jury), created_at — gerado automaticamente, define qual grupo faz qual papel em cada processo
- **`mock_trial_sessions`** — id, case_id, status (pending/announcement/prosecution/defense/jury_questions/deliberation/verdict/finished), current_phase_started_at, judge_notes, created_at
- **`mock_trial_forms`** — id, mock_trial_id, target_role (prosecution/defense/jury), title, fields_json, created_at
- **`mock_trial_responses`** — id, form_id, session_id, group_id, student_email, student_name, response_json, created_at

### RLS
- Owner (user_id) para mock_trials; anon insert/select para responses e sessions (acesso via link)

---

## Páginas

### Professor

1. **`MockTrials.tsx`** — Dashboard de listagem (padrão SctExams/OsceExams)

2. **`MockTrialEditor.tsx`** — Editor principal com abas:
   - **Processos**: Lista de casos clínicos. Cada caso tem: número, título, conteúdo do processo (editor rich text). Botão "Gerar com IA" abre modal pedindo objetivos de aprendizagem + upload de PDF opcional → Edge Function gera o processo completo (denúncia, depoimentos, prontuário, laudos, anexos) + 2 personagens-testemunha (acusação e defesa) com instruções
   - **Grupos**: Adicionar alunos (nome/email) com padrão SOAP de importação. Separar manualmente em 5 grupos via drag-and-drop ou select
   - **Distribuição**: Tabela automática mostrando qual grupo faz qual papel em cada processo (rotação automática garantindo que cada grupo assuma pelo menos 2 papéis diferentes). Botão "Gerar Distribuição" calcula automaticamente. Professor pode ajustar manualmente
   - **Formulários**: Criar formulários separados para Acusação, Defesa e Jurados (usando FormBuilder existente)
   - **Painel do Juiz**: Configurar nome do juiz
   - **Resultados**: Ver respostas dos formulários agrupadas por processo, grupo e papel

### Juiz

3. **`MockTrialJudge.tsx`** — Painel do juiz (acesso via link):
   - Seleciona o processo/caso atual
   - Exibe a sequência de fases com timer automático:
     1. Anúncio do Caso (2 min)
     2. Acusação (5 min)
     3. Defesa (5 min)
     4. Perguntas do Júri (5 min)
     5. Deliberação (3-5 min)
   - Botões "Próxima Fase" e "Pausar"
   - Timer visual grande com alerta sonoro ao faltar 1 minuto
   - Status em tempo real visível para todos os alunos

### Aluno

4. **`MockTrialStudent.tsx`** — Portal do aluno (acesso via email):
   - Exibe o processo completo do caso atual
   - Mostra o papel do seu grupo (Acusação/Defesa/Jurado)
   - Se for testemunha: exibe ficha do personagem com instruções
   - Formulário específico do seu papel (isolado — não vê formulários de outros grupos)
   - Timer sincronizado com o painel do juiz
   - Veredito e resultado ao final

---

## Edge Function

- **`generate-mock-trial`** — Recebe objetivos de aprendizagem + PDF opcional. Gera:
  - Processo completo no formato jurídico (denúncia, relato dos fatos, fundamentação, depoimentos, prontuário, laudos, anexos)
  - 2 personagens-testemunha (1 acusação, 1 defesa) com profissão relacionada ao caso e instruções de comportamento

---

## Algoritmo de Distribuição

Dado N processos e 5 grupos, cada processo precisa de 3 papéis (Acusação, Defesa, Júri). Para 4 processos:
- 3 grupos ativos por processo, 2 descansam
- Rotação garante que cada grupo assuma papéis variados
- Segue o padrão da tabela do Arquivo 5

---

## Integração

- **Sidebar**: Novo item "Júri Simulado" com ícone `Gavel`
- **Rotas**: `/mock-trials`, `/mock-trials/:id/edit`, `/mock-trial/judge/:id`, `/mock-trial/student/:trialId`
- **Realtime**: Tabela `mock_trial_sessions` com realtime para sincronizar timer do juiz com alunos

---

## Detalhes Técnicos

- Formulários usam o FormBuilder/FormRenderer existente
- Geração IA usa a shared `ai-caller.ts` existente com Lovable AI
- Distribuição automática implementada como função utilitária em `src/lib/mock-trial-distribution.ts`
- Timer do juiz usa realtime (update na coluna `current_phase_started_at` + `status`)

