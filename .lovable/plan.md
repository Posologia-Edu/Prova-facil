

# Plano: Evolução do Módulo OSCE — Turmas, Avaliadores por Estação, OSCE Online

## Visão Geral

Reestruturar o módulo OSCE para: vincular turmas e alunos, atribuir avaliadores a estações específicas, gerenciar rodízio automático com sorteio, e suportar OSCE online com paciente virtual + materiais clínicos + monitoramento.

---

## 1. Alterações no Banco de Dados (Migration)

### Novas tabelas

**`osce_station_evaluators`** — Vínculo professor ↔ estação
| Coluna | Tipo |
|--------|------|
| id | uuid PK |
| station_id | uuid FK → osce_stations |
| evaluator_name | text |
| evaluator_email | text |

**`osce_circuit_students`** — Alunos participantes do circuito (vindos da turma)
| Coluna | Tipo |
|--------|------|
| id | uuid PK |
| circuit_id | uuid FK → osce_circuits |
| student_name | text |
| student_email | text |
| student_registration | text (nullable) |
| current_station_id | uuid FK → osce_stations (nullable) |
| current_rotation | int default 0 |
| status | text default 'waiting' (waiting/in_station/completed) |

**`osce_station_materials`** — Materiais clínicos por estação (prescrições, exames, imagens)
| Coluna | Tipo |
|--------|------|
| id | uuid PK |
| station_id | uuid FK → osce_stations |
| title | text |
| type | text (prescription/lab_result/imaging/other) |
| content | text (conteúdo textual ou URL) |
| file_url | text (nullable, para imagens/PDFs) |
| position | int |

### Alterações em tabelas existentes

**`osce_exams`** — Adicionar:
- `is_online` boolean default false
- `class_id` uuid FK nullable → classes

**`osce_circuits`** — Já tem `class_id`, usar esse campo

**`osce_evaluations`** — Já tem `student_name`/`student_email`, usar para vincular

---

## 2. RLS

- `osce_station_evaluators`: owner via join station→exam→user_id + admin
- `osce_circuit_students`: owner via join circuit→user_id + admin
- `osce_station_materials`: owner via join station→exam→user_id + admin
- Anon select para `osce_station_evaluators` e `osce_circuit_students` via access_code (para avaliadores/alunos no portal)

---

## 3. Fluxo de Criação do Circuito (OsceEditor)

Ao clicar "Iniciar Circuito":
1. Selecionar turma (dropdown das turmas do professor)
2. Sistema puxa todos os alunos da turma → insere em `osce_circuit_students`
3. Escolher modo: **Presencial** ou **Online**
4. Se online: gera link do aluno (`/osce/student/:accessCode`) além do link do avaliador
5. Atribuir avaliadores às estações (nome + email por estação)

---

## 4. Sorteio e Rodízio Automático

Ao iniciar o exame (botão "Iniciar" no painel de controle):
- Sistema sorteia alunos para estações (N alunos ativos = N estações clínicas)
- Atualiza `current_station_id` e `current_rotation` em `osce_circuit_students`
- Ao avançar rotação: recalcula posições (circular shift)
- Alunos excedentes ficam em fila (status `waiting`) para ciclos seguintes
- Sinalização visual no painel quando novo ciclo começa (banner + som opcional)

---

## 5. Interface do Avaliador — Correções

**Bug atual**: avaliador entra mas não vê estações (RLS bloqueando queries do anon). Solução:
- Avaliador faz login com nome + email
- Sistema verifica se o email está em `osce_station_evaluators` para aquele circuito
- Se encontrar: mostra APENAS a estação vinculada (não todas)
- O nome do aluno já vem preenchido automaticamente de `osce_circuit_students` (baseado na rotação atual)
- Remover a etapa manual de selecionar estação e digitar nome do aluno

---

## 6. OSCE Online — Portal do Aluno

Nova página: `/osce/student/:accessCode`

### Fluxo:
1. Aluno acessa link, informa email → sistema valida contra `osce_circuit_students`
2. Enquanto status = `waiting`: mostra tela de espera com sinalização
3. Quando sorteado para estação: redireciona para a tela da estação
4. Tela da estação mostra:
   - **Timer** no topo (sincronizado via Realtime)
   - **Chat com Paciente Virtual** (área principal)
   - **Materiais clínicos** como ícones flutuantes (miniatura → clique expande: prescrição, exames lab, imagens)
   - **Instruções da porta** visíveis no início
5. Ao fim do tempo: sala fecha, aluno volta para espera ou próxima estação

### Monitoramento:
- Admin e avaliador podem ver o chat do aluno em tempo real
- Salvar mensagens do chat em tabela ou no campo `metadata` da evaluation
- No painel de controle: indicador de "aluno ativo na estação" vs "sala vazia"

---

## 7. Materiais Clínicos (OsceStationEditor)

Adicionar seção no editor de estação para upload/criação de materiais:
- Tipo: Prescrição, Resultado de Exame, Exame de Imagem, Outro
- Campo de texto rico (conteúdo textual)
- Upload de arquivo (criar storage bucket `osce-materials`)
- Ícone representativo por tipo na tela do aluno

---

## 8. Sinalização de Ciclo

- No painel de controle: banner animado "NOVO CICLO — Rotação X" ao trocar
- Via Realtime: todos os avaliadores recebem notificação de troca
- No portal do aluno: tela de transição "Prepare-se para a próxima estação"
- Contagem regressiva do tempo de transição (`transition_seconds`)

---

## Arquivos a criar/editar

| Ação | Arquivo |
|------|---------|
| Migration | Novas tabelas + alterações em osce_exams |
| Storage | Bucket `osce-materials` |
| Criar | `src/pages/OsceStudentPortal.tsx` — Portal do aluno online |
| Criar | `src/components/osce/OsceCircuitSetupDialog.tsx` — Dialog de setup (turma, modo, avaliadores) |
| Criar | `src/components/osce/OsceStationMaterials.tsx` — Editor de materiais por estação |
| Criar | `src/components/osce/OsceMaterialViewer.tsx` — Viewer flutuante de materiais (aluno) |
| Criar | `src/components/osce/OsceStudentWaiting.tsx` — Tela de espera do aluno |
| Criar | `src/components/osce/OsceStudentStation.tsx` — Tela da estação (chat + materiais + timer) |
| Criar | `src/components/osce/OsceChatMonitor.tsx` — Monitor do chat para admin/avaliador |
| Editar | `src/pages/OsceEditor.tsx` — Setup de circuito com turma e avaliadores |
| Editar | `src/pages/OsceEvaluator.tsx` — Filtrar por estação vinculada, preencher aluno auto |
| Editar | `src/pages/OsceCircuitControl.tsx` — Sorteio, rodízio, sinalização, link do aluno |
| Editar | `src/components/osce/OsceStationEditor.tsx` — Seção de materiais |
| Editar | `src/components/osce/OsceCircuitGrid.tsx` — Mostrar alunos da turma |
| Editar | `src/App.tsx` — Rota `/osce/student/:accessCode` |

---

## Ordem de Implementação

1. **Migration** — tabelas novas + alterações + storage bucket
2. **Setup do circuito** — vincular turma, importar alunos, atribuir avaliadores, escolher modo
3. **Correção do avaliador** — filtrar estação por email, preencher aluno automaticamente
4. **Sorteio e rodízio** — lógica no painel de controle
5. **Materiais clínicos** — editor + viewer
6. **Portal do aluno online** — login, espera, estação com chat + materiais
7. **Monitoramento** — admin/avaliador vê chat do aluno em tempo real
8. **Sinalização** — banners de transição e novo ciclo

> Dado o tamanho, sugiro implementar em 2 rodadas: etapas 1-4 primeiro, depois 5-8.

