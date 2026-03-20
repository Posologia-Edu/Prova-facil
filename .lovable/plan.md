

# Plano: Simulação Realística de Anamnese

## Visão Geral

Nova funcionalidade na seção "Conteúdo" do sidebar, ao lado de OSCE. O admin cria salas de simulação com duplas de alunos e um professor. O sistema distribui automaticamente os papéis (Profissional Simulado, Paciente Simulado, Observador) em rodadas, com cronômetro e liberação pelo professor.

---

## Modelo de Dados (6 novas tabelas)

```text
simulation_rooms
├── id, user_id, title, description, status (draft/active/completed)
├── duration_minutes, access_code (PIN), current_round, current_cycle (1 ou 2)
├── created_at, updated_at

simulation_participants
├── id, room_id, student_name, student_email
├── pair_index (0,1,2...), pair_position (A ou B)
├── current_role (professional/patient/observer/professor)
├── status (waiting/active/completed)

simulation_forms
├── id, room_id, form_type (anamnesis/observer_eval/professor_eval/patient_script)
├── title, content_json (estrutura estilo Google Forms: seções, campos, pontuações)
├── created_at

simulation_rounds
├── id, room_id, round_number, cycle (1 ou 2)
├── status (pending/active/completed), started_at, finished_at
├── released_by (professor user ref)

simulation_round_assignments
├── id, round_id, participant_id, role (professional/patient/observer)
├── pair_index (qual dupla está ativa nesta rodada)

simulation_responses
├── id, round_id, participant_id, form_id
├── answers_json, score, submitted_at
```

### Lógica de Distribuição Automática

```text
Exemplo: 6 alunos → 3 duplas (A1+A2, B1+B2, C1+C2)

Ciclo 1 (3 rodadas):
  Rodada 1: A1=profissional, A2=paciente, B1=observador
  Rodada 2: B1=profissional, B2=paciente, C1=observador
  Rodada 3: C1=profissional, C2=paciente, A1=observador

Ciclo 2 (3 rodadas) — inverte dentro da dupla:
  Rodada 4: A2=profissional, A1=paciente, B2=observador
  Rodada 5: B2=profissional, B1=paciente, C2=observador
  Rodada 6: C2=profissional, C1=paciente, A2=observador
```

O observador é sempre um aluno de outra dupla, selecionado por rotação circular.

---

## Páginas e Componentes

### 1. Lista de Simulações (`/simulations`)
- Card list das salas criadas (similar a OsceExams)
- Botão "Nova Simulação" → dialog de criação (título, descrição, duração)

### 2. Editor da Sala (`/simulations/:roomId/edit`)
- **Aba Participantes**: cadastro de alunos em duplas (nome + email) + professor (nome + email). Importação de turma existente.
- **Aba Formulários**: 4 sub-abas para criar cada formulário no estilo Google Forms:
  - Anamnese (profissional): campos de texto, radio, checkbox, textarea
  - Roteiro do Paciente: editor de texto rico
  - Avaliação do Observador: campos com pontuação atribuível
  - Avaliação + Feedback do Professor: campos com pontuação + campo de feedback
- **Aba Configurações**: duração da rodada, gerar PIN

### 3. Painel de Controle Admin (`/simulations/:roomId/control`)
- Visão geral de todas as rodadas e ciclos
- Status de cada dupla (quem é quem)
- Cronômetro da rodada ativa (reutiliza `OsceTimer`)
- Progresso de preenchimento dos formulários em tempo real
- Notas/pontuações consolidadas por aluno

### 4. Portal do Participante (`/simulation/join`)
- Entrada via PIN + email (sem necessidade de conta, similar ao portal do aluno OSCE)
- Após entrar, exibe a interface do papel atribuído:
  - **Profissional**: formulário de anamnese (desabilitado até professor liberar)
  - **Paciente**: roteiro do caso clínico (read-only)
  - **Observador**: formulário de avaliação (desabilitado até professor liberar)
  - **Professor**: formulário de avaliação + feedback + botão "Liberar Rodada" + botão "Encerrar Rodada"
- Cronômetro visível para todos
- Formulários habilitam apenas após liberação pelo professor

---

## Etapas de Implementação

### Etapa 1 — Banco de Dados
- Criar as 6 tabelas com migração SQL
- Adicionar RLS policies (owner-based para admin, open select para participantes via access_code)
- Habilitar Realtime nas tabelas `simulation_rounds` e `simulation_responses`

### Etapa 2 — CRUD de Salas e Formulários
- Página de listagem `/simulations`
- Editor de sala com abas (participantes, formulários, configurações)
- Builder de formulários dinâmicos (Google Forms-like) com pontuação por item
- Adicionar rota no sidebar na seção "Conteúdo"

### Etapa 3 — Motor de Distribuição
- Função TypeScript que calcula os assignments de todas as rodadas com base nas duplas
- Gera `simulation_rounds` e `simulation_round_assignments` ao iniciar a sala
- Lógica de ciclo 1 (posição A = profissional) e ciclo 2 (posição B = profissional)

### Etapa 4 — Portal do Participante
- Página de login via PIN + email
- Renderização condicional por papel (profissional/paciente/observador/professor)
- Formulários desabilitados por padrão, habilitados quando `round.status = 'active'`
- Professor: botões de controle (liberar/encerrar rodada)
- Cronômetro sincronizado via `started_at` da rodada

### Etapa 5 — Painel de Controle Admin
- Dashboard com cards por rodada mostrando duplas e papéis
- Progresso de preenchimento em tempo real (polling ou Realtime)
- Consolidação de notas por aluno

### Etapa 6 — Traduções e Sidebar
- Adicionar todas as strings em PT/EN/ES no `translations.ts`
- Adicionar item "Simulação Realística" no `contentNav` do sidebar
- Atualizar rotas no `App.tsx`

---

## Seção Técnica

- **Reutilização**: `OsceTimer` para cronômetros, padrões de query/mutation do OSCE, portal de acesso via PIN
- **RLS**: Admin (owner) tem ALL; participantes (anon) têm SELECT via access_code e INSERT/UPDATE nas responses
- **Realtime**: `simulation_rounds` e `simulation_responses` adicionadas à publicação Realtime
- **Formulários dinâmicos**: `content_json` armazena array de seções com campos tipados (text, radio, checkbox, textarea, scale) com `max_score` por campo

