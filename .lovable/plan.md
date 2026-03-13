

# Plano: Avaliador visualiza tela do aluno em tempo real

## Problema

No OSCE Online, o avaliador só vê o checklist. Ele precisa ver a conversa do aluno com o paciente virtual em tempo real para poder avaliar.

## Solução

### 1. Nova tabela `osce_chat_messages`

Armazenar cada mensagem do chat aluno-paciente para que o avaliador possa monitorar em tempo real.

| Coluna | Tipo |
|--------|------|
| id | uuid PK |
| circuit_id | uuid FK → osce_circuits |
| station_id | uuid FK → osce_stations |
| student_id | uuid FK → osce_circuit_students |
| role | text (user/assistant) |
| content | text |
| created_at | timestamptz |

- RLS: anon/authenticated SELECT e INSERT com `USING (true)`
- Habilitar Realtime para a tabela

### 2. Atualizar `OsceStudentPortal.tsx`

Após cada mensagem (do aluno e da resposta do paciente), inserir na tabela `osce_chat_messages` com `circuit_id`, `station_id`, `student_id`.

### 3. Atualizar `OsceEvaluator.tsx`

Adicionar uma 4a aba **"Aluno"** (com ícone Eye) que mostra:
- Feed em tempo real das mensagens do chat do aluno na estação atual
- Subscription Realtime na tabela `osce_chat_messages` filtrado por `circuit_id + station_id + student_id`
- Materiais da estação (mesmos que o aluno vê) para contexto
- Layout similar ao chat do aluno (bolhas de mensagem) mas somente leitura

### 4. Arquivos afetados

| Ação | Arquivo |
|------|---------|
| Migration | Nova tabela `osce_chat_messages` + RLS + Realtime |
| Editar | `src/pages/OsceStudentPortal.tsx` — salvar mensagens na tabela |
| Editar | `src/pages/OsceEvaluator.tsx` — nova aba "Aluno" com chat em tempo real + materiais |

