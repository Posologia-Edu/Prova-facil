

# Plano: Módulo de Reconciliação (3º módulo da Simulação Realística)

## Visão Geral

Novo módulo "Reconciliação" que segue o padrão do SOAP: salas virtuais com duplas, importação de alunos do SOAP, formulários configuráveis, casos clínicos distribuídos, ficha de reconciliação com espelho de respostas, e correção por IA + manual.

## Banco de Dados

Criar 4 novas tabelas seguindo o padrão existente (soap_rooms, soap_participants, soap_forms, soap_responses):

**`reconciliation_rooms`** — Salas de reconciliação
- `id`, `user_id`, `soap_room_id` (referência à sala SOAP de origem), `title`, `description`, `access_code`, `status` (draft/active/finished), `created_at`, `updated_at`

**`reconciliation_participants`** — Duplas importadas do SOAP
- `id`, `room_id`, `student_name`, `student_email`, `pair_index`, `pair_position` (A/B), `soap_participant_id` (referência), `participant_role` (student/teacher), `status` (waiting/ready/done), `created_at`

**`reconciliation_forms`** — Formulários (ficha de reconciliação) + Espelho de respostas
- `id`, `room_id`, `title`, `content_json` (campos do formulário com max_score por item), `form_type` ("reconciliation" | "answer_key"), `created_at`

**`reconciliation_clinical_cases`** — Casos clínicos para distribuição entre duplas
- `id`, `room_id`, `title`, `content` (texto do caso), `position`, `created_at`

**`reconciliation_responses`** — Respostas das duplas + avaliação
- `id`, `room_id`, `pair_index` (identifica a dupla), `form_id`, `clinical_case_id`, `answers_json`, `ai_score`, `ai_feedback_json` (feedback por item), `admin_score`, `admin_feedback`, `submitted_at`, `created_at`

RLS: mesmo padrão dos módulos anteriores (anon pode select/insert/update; owner e admin têm ALL).

## Páginas (Frontend)

### 1. `ReconciliationRooms.tsx` — Lista de salas
- Cards com título, PIN, status, nome do professor, contagem de duplas
- Criar sala com importação de alunos do SOAP
- Possibilidade de dividir sala entre dois professores

### 2. `ReconciliationEditor.tsx` — Configuração da sala
- **Aba Participantes**: Importar alunos do SOAP, exibir duplas formadas, edição inline
- **Aba Formulários**: Cadastrar ficha de reconciliação (mesmo builder dos módulos anteriores com pontuação por item) + cadastrar espelho de respostas. Importar formulários de outras salas de reconciliação
- **Aba Casos Clínicos**: Cadastrar/editar casos clínicos que serão distribuídos entre as duplas
- Ativar sala (status → active)

### 3. `ReconciliationJoin.tsx` — Portal do aluno (dupla)
- Login via PIN + e-mail (ambos da dupla entram na mesma sala)
- Aguarda até toda a dupla estar presente
- Quando ativada: exibe caso clínico atribuído + ficha de reconciliação para preenchimento colaborativo
- Envio da ficha preenchida pela dupla

### 4. `ReconciliationControl.tsx` — Painel do admin
- **Aba Participantes**: Status de cada dupla (waiting/ready/done)
- **Aba Respostas**: Para cada dupla, exibição lado a lado:
  - Esquerda: respostas da ficha de reconciliação da dupla
  - Direita: espelho de respostas cadastrado pelo admin
- **Botão "Corrigir com IA"**: Chama edge function que compara respostas vs espelho e gera score + feedback por item
- Correção manual: admin pode alterar nota e feedback gerados pela IA ou fazer correção 100% manual

## Edge Function

### `grade-reconciliation/index.ts`
- Recebe: `room_id`, `response_id`, `answers_json`, `answer_key_json`, `form_fields`
- Usa Lovable AI (Gemini) para comparar respostas do aluno com o espelho
- Retorna: score por item + feedback textual por item
- Salva em `reconciliation_responses.ai_score` e `ai_feedback_json`

## Rotas (App.tsx)

```text
/simulations/reconciliation          → ReconciliationRooms
/simulations/reconciliation/:roomId  → ReconciliationEditor
/simulations/reconciliation/:roomId/control → ReconciliationControl
/simulation/reconciliation/join      → ReconciliationJoin
```

## Integração com módulo existente

- Adicionar card "Reconciliação" no array `modules` em `Simulations.tsx`
- Atualizar `StudentAuth.tsx` para detectar PIN de `reconciliation_rooms` e redirecionar para `/simulation/reconciliation/join`

## Detalhes Técnicos

- Distribuição de casos clínicos: round-robin por `pair_index % total_cases`
- A ficha é preenchida por dupla (um registro por `pair_index`), não individual
- O espelho é um formulário do tipo `answer_key` com as respostas esperadas salvas no `content_json`
- A view lado a lado usa um grid de 2 colunas no painel do admin
- A correção por IA utiliza tool calling para extrair scores estruturados por item

