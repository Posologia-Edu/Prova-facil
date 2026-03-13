

# Plano: Módulo OSCE para o Prova Fácil

## Visão Geral

Criar um módulo completo de avaliação OSCE (Objective Structured Clinical Examination) com 4 pilares: Construtor de Estações, Interface do Avaliador, Gestão do Circuito e Análise Pós-Prova. Inclui geração de cenários por IA e paciente virtual com chatbot.

---

## Banco de Dados — Novas Tabelas

### `osce_exams` — Prova OSCE principal
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | — |
| user_id | uuid | Proprietário (professor) |
| title | text | Nome do exame |
| description | text | — |
| station_duration_minutes | int | Tempo padrão por estação |
| transition_seconds | int | Tempo entre estações (ex: 60s) |
| status | text | draft / in_progress / completed |
| created_at / updated_at / deleted_at | timestamps | — |

### `osce_stations` — Estações individuais
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | — |
| osce_exam_id | uuid FK | Vincula ao exame |
| position | int | Ordem no circuito |
| title | text | Nome da estação |
| duration_minutes | int | Override do tempo (nullable) |
| student_instructions | text | Cenário/instruções da porta |
| patient_script | text | Roteiro do paciente simulado |
| case_summary | text | Resumo do caso clínico |
| learning_objectives | text[] | Objetivos de aprendizagem |
| virtual_patient_enabled | boolean | Se tem chatbot de paciente virtual |
| virtual_patient_system_prompt | text | Prompt do chatbot gerado pela IA |
| is_rest_station | boolean | Estação de descanso |
| created_at / updated_at | timestamps | — |

### `osce_checklist_items` — Itens do checklist do avaliador
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | — |
| station_id | uuid FK | — |
| position | int | Ordem |
| description | text | Descrição do item |
| type | text | `binary` / `likert` / `score` |
| likert_max | int | Máximo da escala Likert (3, 5, 7) |
| max_points | numeric | Pontuação máxima |
| weight | numeric | Peso do item |
| is_critical | boolean | Reprova se não marcado |
| category | text | Agrupamento (Comunicação, Técnico, etc.) |

### `osce_circuits` — Circuito/sessão de aplicação
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | — |
| osce_exam_id | uuid FK | — |
| class_id | uuid FK (nullable) | Turma vinculada |
| status | text | pending / running / paused / completed |
| started_at | timestamp | Início real |
| current_rotation | int | Rotação atual |
| access_code | text | Código de acesso para avaliadores |

### `osce_evaluations` — Avaliações feitas
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | — |
| circuit_id | uuid FK | — |
| station_id | uuid FK | — |
| evaluator_id | uuid | Quem avaliou (pode ser auth user ou identificado por nome) |
| student_name | text | Nome do aluno |
| student_email | text (nullable) | — |
| rotation | int | Em qual rotação aconteceu |
| observations | text | Feedback qualitativo |
| total_score | numeric | Pontuação calculada |
| max_score | numeric | Máximo possível |
| passed | boolean | Aprovado na estação |
| started_at / finished_at | timestamps | — |

### `osce_evaluation_items` — Respostas individuais do checklist
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | — |
| evaluation_id | uuid FK | — |
| checklist_item_id | uuid FK | — |
| value | numeric | Nota ou 0/1 |
| notes | text (nullable) | — |

---

## RLS

- Todas as tabelas: owner (user_id) tem ALL, admin tem ALL
- `osce_evaluations` e `osce_evaluation_items`: avaliadores com acesso via `access_code` do circuito (insert/update via edge function com `verify_jwt = false`)
- `osce_circuits`: select público com `access_code` para avaliadores

---

## Arquitetura de Páginas e Componentes

### Páginas novas

| Rota | Página | Descrição |
|------|--------|-----------|
| `/osce` | `OsceExams.tsx` | Listagem de exames OSCE (similar a `/exams`) |
| `/osce/:id/edit` | `OsceEditor.tsx` | Construtor de estações com abas |
| `/osce/:circuitId/control` | `OsceCircuitControl.tsx` | Painel de controle do circuito (admin) |
| `/osce/evaluate/:accessCode` | `OsceEvaluator.tsx` | Interface do avaliador (mobile-first, sem login necessário) |
| `/osce/:id/results` | `OsceResults.tsx` | Análise e relatórios pós-prova |
| `/osce/patient/:stationId` | `OsceVirtualPatient.tsx` | Chatbot do paciente virtual (acesso do aluno) |

### Componentes principais

- `OsceStationEditor.tsx` — Editor de uma estação (instruções, roteiro, checklist)
- `OsceChecklistBuilder.tsx` — Construtor dinâmico de itens (binary/likert/score, pesos, itens críticos)
- `OsceEvaluatorChecklist.tsx` — Interface touch-friendly para marcação rápida
- `OsceTimer.tsx` — Cronômetro com transição de cores (verde→amarelo→vermelho)
- `OsceCircuitGrid.tsx` — Grid visual de estações × alunos em tempo real
- `OsceRadarChart.tsx` — Gráfico de radar com recharts por categorias
- `OsceAIGenerator.tsx` — Dialog para gerar cenário completo com IA
- `OsceVirtualPatientChat.tsx` — Chat do paciente virtual

---

## Geração de Cenário com IA

### Edge Function: `generate-osce-station`

Recebe: `context` (área clínica, nível), `learning_objectives` (texto), `checklist_categories` (opcional)

Retorna via tool calling (structured output):
```json
{
  "student_instructions": "...",
  "case_summary": "...",
  "patient_script": "...",
  "virtual_patient_system_prompt": "...",
  "checklist_items": [
    { "description": "...", "type": "binary", "category": "Comunicação", "is_critical": false, "weight": 1 },
    { "description": "...", "type": "likert", "likert_max": 5, "category": "Empatia", "weight": 2 }
  ]
}
```

Usa `callAiWithFallback` existente com tool calling para structured output. O `virtual_patient_system_prompt` gerado alimenta automaticamente o chatbot de paciente virtual da estação.

### Edge Function: `osce-virtual-patient`

Chatbot streaming que recebe o `system_prompt` da estação (gerado pela IA ou escrito manualmente) e conversa com o aluno como paciente simulado. Usa a mesma infraestrutura de streaming do `ai-tutor-chat`.

---

## Interface do Avaliador — Detalhes

- **Sem login obrigatório**: acesso via `access_code` do circuito (como portal do aluno)
- **Mobile-first**: botões grandes, checkboxes de toque, sliders para Likert
- **Cronômetro fixo no topo**: sincronizado via Realtime com o painel de controle
- **3 abas flutuantes**: Checklist | Caso Clínico | Desempenho Geral
- **Campo de observações**: com botão de Voice-to-Text usando Web Speech API nativa do browser
- **Auto-save**: salva a cada interação no checklist

---

## Gestão do Circuito — Realtime

- Habilitar Realtime nas tabelas `osce_circuits` e `osce_evaluations`
- Painel de controle mostra grid de estações × alunos
- Botão "Iniciar Exame" sincroniza timer para todos os avaliadores conectados
- Sinal de troca de estação propagado via update no `current_rotation`

---

## Análise Pós-Prova

- **Gráfico de Radar** (recharts `RadarChart`): desempenho por categoria do checklist (Comunicação, Raciocínio Clínico, Técnico, Empatia)
- **Tabela resumo**: nota por estação, itens críticos faltantes, aprovado/reprovado
- **Exportação PDF**: relatório individual por aluno com gráfico de radar + feedback dos avaliadores
- **Visão consolidada**: médias por estação, identificação de estações mais difíceis

---

## Sidebar e Navegação

- Adicionar item "OSCE" no grupo "Conteúdo" do `AppSidebar.tsx` com ícone `Stethoscope`
- Rota `/osce` protegida com `ProtectedRoute`

---

## Resumo de Arquivos

| Ação | Arquivo |
|------|---------|
| Migration | 7 tabelas + RLS + Realtime |
| Edge Function | `generate-osce-station/index.ts` |
| Edge Function | `osce-virtual-patient/index.ts` |
| Criar | `src/pages/OsceExams.tsx` |
| Criar | `src/pages/OsceEditor.tsx` |
| Criar | `src/pages/OsceCircuitControl.tsx` |
| Criar | `src/pages/OsceEvaluator.tsx` |
| Criar | `src/pages/OsceResults.tsx` |
| Criar | `src/pages/OsceVirtualPatient.tsx` |
| Criar | `src/components/osce/OsceStationEditor.tsx` |
| Criar | `src/components/osce/OsceChecklistBuilder.tsx` |
| Criar | `src/components/osce/OsceEvaluatorChecklist.tsx` |
| Criar | `src/components/osce/OsceTimer.tsx` |
| Criar | `src/components/osce/OsceCircuitGrid.tsx` |
| Criar | `src/components/osce/OsceRadarChart.tsx` |
| Criar | `src/components/osce/OsceAIGenerator.tsx` |
| Criar | `src/components/osce/OsceVirtualPatientChat.tsx` |
| Editar | `src/App.tsx` — novas rotas |
| Editar | `src/components/AppSidebar.tsx` — link OSCE |
| Editar | `supabase/config.toml` — verify_jwt para novas functions |

---

## Ordem de Implementação Sugerida

1. **Migration** — criar todas as tabelas e RLS
2. **Listagem + Construtor de Estações** — páginas OsceExams + OsceEditor com checklist builder
3. **Geração com IA** — edge function + dialog de geração
4. **Interface do Avaliador** — mobile-first com timer e checklist
5. **Gestão do Circuito** — painel de controle com Realtime
6. **Paciente Virtual** — edge function de chat + página do chatbot
7. **Análise e Relatórios** — gráficos de radar + exportação PDF

> **Nota**: Dado o tamanho deste módulo, a implementação será dividida em várias etapas. Sugiro começar pelas etapas 1-3 (banco + construtor + IA) na primeira rodada.

