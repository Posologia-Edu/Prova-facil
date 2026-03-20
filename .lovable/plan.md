

## Plan: Módulo SOAP — Segundo Módulo de Simulação Realística

### Visão Geral

O módulo SOAP é uma continuação do módulo de Anamnese. Alunos que atuaram como "Profissional" na anamnese transcrevem suas respostas para um formulário SOAP. Depois, trocam formulários SOAP com seu par e avaliam o trabalho do colega via formulário de "Avaliação entre Pares".

```text
┌──────────────────────────────────────────────────────────┐
│  FLUXO SOAP                                              │
│                                                          │
│  1. Admin cria sala SOAP (importa alunos da anamnese)    │
│  2. Admin cadastra formulário SOAP + formulário Avaliação│
│  3. Professor forma duplas                               │
│  4. Cada aluno vê SUA anamnese + preenche SEU SOAP       │
│  5. Aluno envia SOAP → colega da dupla recebe            │
│  6. Colega abre formulário de Avaliação entre Pares      │
│  7. Admin pode atribuir notas finais                     │
│  8. Analytics enviados ao painel Admin                   │
└──────────────────────────────────────────────────────────┘
```

---

### 1. Banco de Dados — Novas Tabelas

**Tabela `soap_rooms`** — Salas do módulo SOAP, vinculadas opcionalmente a uma sala de anamnese.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| user_id | uuid | Dono (professor/admin) |
| anamnesis_room_id | uuid nullable | Sala de anamnese de origem |
| title | text | Nome da sala |
| description | text | |
| access_code | text | PIN 6 chars |
| status | text | draft/active/completed |
| created_at / updated_at | timestamptz | |

**Tabela `soap_participants`** — Alunos do módulo SOAP (importados ou cadastrados).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| room_id | uuid FK→soap_rooms | |
| student_name | text | |
| student_email | text | |
| pair_index | int | Dupla |
| pair_position | text | A ou B |
| anamnesis_participant_id | uuid nullable | Link ao participante original |
| status | text | waiting/ready/submitted |

**Tabela `soap_forms`** — Formulários (SOAP e Avaliação entre Pares).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| room_id | uuid FK→soap_rooms | |
| form_type | text | `soap` ou `peer_evaluation` |
| title | text | |
| content_json | jsonb | Campos do formulário |

**Tabela `soap_responses`** — Respostas dos alunos (SOAP preenchido + Avaliação).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| room_id | uuid FK→soap_rooms | |
| participant_id | uuid FK→soap_participants | Quem respondeu |
| target_participant_id | uuid nullable | Quem está sendo avaliado (para avaliação entre pares) |
| form_id | uuid FK→soap_forms | Qual formulário |
| answers_json | jsonb | Respostas |
| admin_score | numeric nullable | Nota do admin |
| admin_feedback | text nullable | Feedback do admin |
| submitted_at | timestamptz | |

**RLS**: Anon pode SELECT/INSERT/UPDATE (mesmo padrão das tabelas de simulação existentes). Owner (user_id) pode ALL.

---

### 2. Páginas e Componentes

**Novas páginas:**

| Rota | Página | Descrição |
|------|--------|-----------|
| `/simulations/soap` | `SoapRooms.tsx` | Lista de salas SOAP (similar a `Simulations.tsx`) |
| `/simulations/soap/editor/:roomId` | `SoapEditor.tsx` | Editor: participantes, formulários SOAP e Avaliação |
| `/simulations/soap/join` | `SoapJoin.tsx` | Portal do aluno SOAP |
| `/simulations/soap/control/:roomId` | `SoapControl.tsx` | Painel do professor + analytics |

**Fluxo do aluno em `SoapJoin.tsx`:**
1. Entra com PIN + email
2. Sistema busca na `simulation_responses` (da sala de anamnese vinculada) as respostas de anamnese desse aluno (match por email)
3. Exibe lado a lado: Respostas de anamnese (read-only) + Formulário SOAP (editável)
4. Aluno preenche e submete o SOAP
5. Sistema entrega o SOAP submetido ao colega da dupla
6. Colega recebe: SOAP do parceiro (read-only) + Formulário de Avaliação entre Pares (editável)
7. Aluno preenche avaliação e submete

**Modificações em páginas existentes:**
- `src/pages/Simulations.tsx` — Adicionar seção/tab para "Módulos" mostrando Anamnese e SOAP
- `src/components/AppSidebar.tsx` — Adicionar sub-item SOAP no menu de Simulação Realística
- `src/App.tsx` — Registrar as 4 novas rotas

---

### 3. Importação de Alunos da Anamnese

No `SoapEditor.tsx`, botão "Importar da Anamnese" que:
1. Lista salas de anamnese do mesmo user_id
2. Admin seleciona uma sala
3. Copia todos os `simulation_participants` (role=student) para `soap_participants`, salvando o `anamnesis_participant_id` para rastrear a origem

---

### 4. Vinculação Anamnese → SOAP

Quando o aluno entra no SOAP:
1. Busca `soap_participants` pelo email na sala SOAP
2. Usa `anamnesis_participant_id` → busca `simulation_participants.id` original
3. Busca `simulation_responses` onde `participant_id` = id original e o formulário é do tipo `anamnesis`
4. Renderiza as respostas como campos read-only

---

### 5. Fluxo de Duplas e Troca de SOAP

- Professor forma duplas (pair_index/pair_position, mesmo mecanismo da anamnese)
- Cada aluno preenche seu SOAP individualmente
- Ao submeter, o sistema marca `status = 'submitted'`
- O parceiro (mesmo pair_index, posição oposta) pode então ver o SOAP submetido
- Quando ambos submeteram SOAP, abre-se o formulário de Avaliação entre Pares para cada um avaliar o outro

---

### 6. Notas do Admin e Analytics

- No `SoapControl.tsx`, o admin pode ver todas as respostas SOAP e avaliações
- Pode atribuir `admin_score` e `admin_feedback` a cada resposta
- Aba de Analytics com métricas: média de notas, distribuição, comparação entre duplas
- Dados integrados ao painel Admin existente (`src/pages/Admin.tsx` / `AdminAnalytics.tsx`)

---

### Resumo de Arquivos

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar tabelas `soap_rooms`, `soap_participants`, `soap_forms`, `soap_responses` + RLS |
| `src/pages/SoapRooms.tsx` | Nova — lista de salas SOAP |
| `src/pages/SoapEditor.tsx` | Nova — editor com importação, formulários, duplas |
| `src/pages/SoapJoin.tsx` | Nova — portal do aluno (anamnese + SOAP + avaliação) |
| `src/pages/SoapControl.tsx` | Nova — painel professor + analytics |
| `src/App.tsx` | Registrar 4 novas rotas |
| `src/components/AppSidebar.tsx` | Adicionar link SOAP |
| `src/pages/Simulations.tsx` | Adicionar navegação para módulo SOAP |

