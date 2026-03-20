

# Plano: Módulo de Documentação (4º módulo) + Agregador de Notas

## Visão Geral

Novo módulo "Documentação" vinculado à Reconciliação. Duplas importadas da Reconciliação preenchem uma ficha de encaminhamento (formulário) e um quadro resumo de medicamentos (tabela dinâmica) com base nos mesmos casos clínicos. Inclui espelho de respostas, correção IA/manual, e um painel agregador dos 4 módulos com notas de todos os alunos.

---

## 1. Banco de Dados — 5 novas tabelas

**`documentation_rooms`**
- `id`, `user_id`, `reconciliation_room_id` (ref), `title`, `description`, `access_code`, `status` (draft/active/finished), `created_at`, `updated_at`

**`documentation_participants`**
- `id`, `room_id` (ref documentation_rooms), `student_name`, `student_email`, `pair_index`, `pair_position` (A/B), `reconciliation_participant_id` (ref), `participant_role`, `status` (waiting/ready/done), `created_at`

**`documentation_forms`**
- `id`, `room_id`, `title`, `content_json` (campos com max_score), `form_type` ("referral" | "referral_answer_key" | "medication_summary" | "medication_answer_key"), `created_at`
- Para "medication_summary" e "medication_answer_key": `content_json` armazena `{ columns: [{id, label}], rows_score: number, answer_rows?: [{col_id: value}] }`

**`documentation_clinical_cases`**
- `id`, `room_id`, `reconciliation_case_id` (ref, para manter vínculo), `title`, `content`, `position`, `created_at`
- Importados automaticamente da sala de reconciliação vinculada

**`documentation_responses`**
- `id`, `room_id`, `pair_index`, `form_id`, `clinical_case_id`, `answers_json`, `ai_score`, `ai_feedback_json`, `admin_score`, `admin_feedback`, `submitted_at`, `created_at`
- Usado tanto para ficha de encaminhamento quanto quadro resumo

RLS: mesmo padrão (admin ALL, owner ALL via room, anon select/insert/update).

---

## 2. Páginas Frontend

### `DocumentationRooms.tsx` — Lista de salas
- Criar sala selecionando uma sala de Reconciliação como origem
- Importa automaticamente participantes e casos clínicos da Reconciliação
- Cards com título, PIN, status, contagem de duplas

### `DocumentationEditor.tsx` — Configuração
- **Aba Participantes**: Importados da Reconciliação (readonly, mesmas duplas)
- **Aba Encaminhamento**: Builder de formulário (padrão existente) + espelho de respostas, com pontuação por item
- **Aba Quadro Resumo**: Configurar colunas da tabela + pontuação por linha + espelho (tabela preenchida pelo admin)
- **Aba Casos Clínicos**: Lista dos casos importados (readonly, herdados da Reconciliação)
- Botão Ativar sala

### `DocumentationJoin.tsx` — Portal do aluno (dupla)
- Login via PIN + e-mail
- Exibe caso clínico atribuído (mesmo da Reconciliação, round-robin por pair_index)
- Formulário de encaminhamento para preenchimento
- Tabela dinâmica (quadro resumo): colunas definidas pelo admin, aluno adiciona linhas e preenche
- Envio conjunto

### `DocumentationControl.tsx` — Painel do admin
- **Aba Participantes**: Status das duplas
- **Aba Respostas**: Lado a lado (resposta da dupla vs espelho) para encaminhamento e quadro resumo
- **Botão "Corrigir com IA"**: Edge function compara respostas vs espelho
- Correção manual: editar nota/feedback da IA ou preencher do zero

### `SimulationAggregator.tsx` — Agregador dos 4 módulos (NOVO)
- Tabela com todos os alunos que participaram em qualquer módulo
- Colunas: Nome, Nota Anamnese, Nota SOAP, Nota Reconciliação, Nota Documentação, Média Geral
- Consulta dados de `simulation_responses`, `soap_responses`, `reconciliation_responses`, `documentation_responses`
- Agrupamento por aluno (via e-mail) cruzando os 4 módulos
- Filtros por sala/módulo

---

## 3. Edge Function

### `grade-documentation/index.ts`
- Mesma estrutura do `grade-reconciliation`
- Recebe respostas do aluno + espelho (encaminhamento e quadro resumo)
- Usa Lovable AI (Gemini) para comparar e gerar score + feedback por item
- Salva em `documentation_responses`

---

## 4. Rotas (App.tsx)

```text
/simulations/documentation                    → DocumentationRooms
/simulations/documentation/editor/:roomId     → DocumentationEditor
/simulations/documentation/control/:roomId    → DocumentationControl
/simulation/documentation/join                → DocumentationJoin
/simulations/aggregator                       → SimulationAggregator
```

---

## 5. Integrações

- Adicionar card "Documentação" no array `modules` em `Simulations.tsx`
- Adicionar card "Agregador de Notas" como botão especial em `Simulations.tsx`
- Atualizar `StudentAuth.tsx` para detectar PIN de `documentation_rooms`
- Atualizar `supabase/config.toml` com `[functions.grade-documentation]`

---

## Detalhes Técnicos

- Quadro resumo: `content_json` do form type "medication_summary" define as colunas; o aluno envia `answers_json` como array de objetos (linhas); o espelho ("medication_answer_key") contém as linhas esperadas
- Casos clínicos são copiados da reconciliação na criação da sala (mesma distribuição round-robin por pair_index)
- O agregador cruza alunos por `student_email` nos 4 módulos e calcula média ponderada

