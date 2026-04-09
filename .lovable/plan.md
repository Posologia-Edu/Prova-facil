

## Plano: Sistema Integrado de Competências em Todos os Módulos

### Problema Atual
A análise de competências só funciona para **Provas** (via `question_competencies`). Os demais módulos (OSCE, Simulação Realística, Pacientes Virtuais, Mini-CEX/DOPS, Progress Test) não registram dados de competência, impossibilitando uma visão longitudinal do aluno.

### Arquitetura Proposta

```text
┌─────────────────────────────────────────────────────┐
│              competency_definitions                  │
│  (Raciocínio Clínico, Comunicação, Técnica, etc.)   │
└──────────────────────┬──────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │   competency_scores       │  ← NOVA TABELA CENTRAL
         │                           │
         │  student_email            │
         │  competency_id            │
         │  score (0-100)            │
         │  max_score                │
         │  source_type (enum)       │  exam | osce | simulation | 
         │  source_id                │  virtual_patient | mini_cex | 
         │  source_label             │  dops | progress_test
         │  evaluated_at             │
         │  user_id (professor)      │
         └───────────────────────────┘
```

### Etapa 1 — Tabela Central `competency_scores`

Criar uma tabela normalizada que armazena cada registro de competência de qualquer módulo:

- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users) — professor dono
- `student_email` (text) — identificador do aluno
- `competency_id` (uuid, FK → competency_definitions)
- `score` (numeric) — nota obtida
- `max_score` (numeric) — nota máxima possível
- `source_type` (text) — tipo do módulo de origem
- `source_id` (uuid) — ID do registro de origem (session, evaluation, response)
- `source_label` (text) — nome legível da origem (ex: "Prova: Farmacologia T8", "OSCE: Estação Anamnese")
- `evaluated_at` (timestamptz)
- `created_at` (timestamptz)

RLS: professor só vê seus próprios registros.

### Etapa 2 — Vincular Competências nos Editores de Cada Módulo

Adicionar um seletor de competências (multi-select com as `competency_definitions` do professor) nos seguintes locais:

| Módulo | Onde vincular | Granularidade |
|---|---|---|
| **Provas** | Já existe (`question_competencies`) | Por questão |
| **OSCE** | Editor de estação (`OsceStationEditor`) | Por estação |
| **Simulação (Anamnese/SOAP/Reconciliação/Documentação)** | Editor de sala ou formulário | Por formulário/sala |
| **Pacientes Virtuais** | Editor do paciente virtual | Por paciente |
| **Mini-CEX / DOPS** | Editor da observação clínica | Por domínio de competência |
| **Progress Test** | Herdado das questões do banco | Por questão |

Novas colunas necessárias:
- `osce_stations.competency_ids` (uuid[])
- `simulation_rooms` (anamnese/soap/reconciliação/documentação): `competency_ids` (uuid[]) nas tabelas de rooms de cada área
- `virtual_patients.competency_ids` (uuid[])
- `clinical_observations.competency_ids` (uuid[])

### Etapa 3 — Registrar Scores Automaticamente Após Correção

Inserir registros em `competency_scores` automaticamente quando uma avaliação é corrigida:

| Módulo | Gatilho | Dados |
|---|---|---|
| **Provas** | Sessão marcada como `graded` | Score proporcional por questão × competências vinculadas |
| **OSCE** | Avaliação salva (`osce_evaluations`) | Score do checklist por estação → competências da estação |
| **Simulação** | Correção por IA (`ai_score`) ou professor (`admin_score`) | Score da resposta → competências da sala |
| **Pacientes Virtuais** | Grade calculada (`virtual_patient_grades`) | `subscores` mapeados para competências |
| **Mini-CEX / DOPS** | Sessão salva (`clinical_observation_sessions`) | `scores_json` por domínio → competência correspondente |
| **Progress Test** | Sessão corrigida | Score por questão × competências herdadas |

A inserção será feita no **frontend** (após confirmação de correção) ou via **Edge Function** (nas funções `grade-*` existentes), usando upsert para evitar duplicatas (unique: `source_type + source_id + competency_id + student_email`).

### Etapa 4 — Dashboard de Competências Expandido

Refatorar `CompetencyAnalysis.tsx` para:

1. **Ler de `competency_scores`** em vez de recalcular a partir de exam_sessions
2. **Filtros**: por turma, módulo de origem, período (semestre)
3. **Gráfico Radar**: média por competência (como já existe)
4. **Gráfico de Evolução Temporal**: linha do tempo mostrando a progressão de cada competência ao longo das avaliações (usando `evaluated_at`)
5. **Tabela detalhada por aluno**: com coluna de "Fonte" mostrando badges coloridos por tipo de módulo (Prova, OSCE, Simulação, etc.)
6. **Drill-down**: clicar em uma célula para ver de quais avaliações específicas o score veio

### Etapa 5 — Interface de Gestão de Competências

Criar uma seção (aba ou página) para o professor:
- CRUD de `competency_definitions` (nome, área, descrição)
- Visualização de quais módulos/questões estão vinculados a cada competência

### Resumo de Mudanças

**Banco de dados (migrations)**:
- Criar tabela `competency_scores` com RLS
- Adicionar coluna `competency_ids uuid[]` em: `osce_stations`, rooms de simulação (6 áreas × 4 módulos), `virtual_patients`, `clinical_observations`
- Unique constraint em `competency_scores` para evitar duplicatas

**Frontend (arquivos)**:
- Componente reutilizável `CompetencySelector.tsx` (multi-select)
- Integrar seletor nos editores: OSCE, Simulação, Pacientes Virtuais, Mini-CEX/DOPS
- Função utilitária `recordCompetencyScores()` para inserir scores após correção
- Refatorar `CompetencyAnalysis.tsx` com filtros, timeline e drill-down
- Nova aba/seção para CRUD de competências

**Edge Functions**:
- Atualizar `grade-*` functions para inserir em `competency_scores` após correção

