# Inventário — OSCE

**Rotas professor:** `/osce` (lista), `/osce/:id/edit` (editor), `/osce/:circuitId/control` (painel do circuito), `/osce/:id/results`
**Rotas públicas (sem login):** `/osce/evaluate/:accessCode` (avaliador), `/osce/student/:accessCode` (aluno, OSCE online), `/osce/patient/:stationId` (paciente virtual da estação)
**Arquivos:** `OsceExams` (186), `OsceEditor` (176), `OsceCircuitControl` (280), `OsceEvaluator` (670), `OsceStudentPortal` (408), `OsceResults` (318), `OsceVirtualPatient` (195), `components/osce/*` (1446 linhas em 11 arquivos)

## Lista — `/osce`

Cartões de exames OSCE com título, status (rascunho etc.), **Editar**, **Excluir**; estado vazio; dialog **Novo Exame OSCE** (título, descrição, **duração por estação em min**, **transição em segundos**).

## Editor — `/osce/:id/edit`

- Cabeçalho: voltar, **Gerar estação com IA** (`OsceAIGenerator`: área clínica, nível Graduação/Residência, contexto/tema; função `generate-osce-station`), **Iniciar Circuito** (`OsceCircuitSetupDialog`), **Resultados**.
- Abas **Estações (N)** e **Configurações** (descrição, duração padrão, tempo de transição).
- Estação (`OsceStationEditor`, expansível): título, duração, **instruções do estudante (porta)**, **resumo do caso clínico**, **roteiro do paciente simulado (ator)**, **objetivos de aprendizagem**, **Paciente Virtual (chatbot IA)** com chave e prompt próprio, **materiais clínicos** (`OsceStationMaterials`: anexos/imagens visualizados por `OsceMaterialViewer`), **checklist** (`OsceChecklistBuilder`: itens com descrição, tipo **Feito/Não, Likert, Pontuação**, categoria/competência, peso, reordenação).
- Adicionar estação em branco ou com IA.

## Circuito (aplicação)

- **Configurar circuito** (dialog): **Turma** (alunos vêm da turma), chave **OSCE Online**, **avaliadores por estação** (nome e e-mail).
- **Painel de controle** (`/osce/:circuitId/control`): badge Online, contadores (Total, Aguardando, Nas estações, Concluídos), `OsceCircuitGrid` (grade de rotação estação × aluno com cronômetros), **Iniciar / Pausar / Retomar / Encerrar**, copiar **link do avaliador** e **link do aluno**, código de acesso, `OsceChatMonitor` (acompanha o chat do paciente virtual em tempo real). Canais Supabase `ctrl-circuit-<id>`.
- **Avaliador** (público; nome + e-mail): estação atribuída, cronômetro `OsceTimer`, abas **Checklist** (`OsceEvaluatorChecklist`), **Aluno**, **Caso**, **Geral** (pontuação global/observações), materiais da estação, instruções, roteiro do paciente; avaliação em tempo real (canal `eval-circuit-<id>`); estados: circuito não encontrado, sem estação.
- **Aluno** (OSCE online; público, por e-mail): estados *Aguarde*, estação com cronômetro, materiais, **chat com paciente virtual** (função `osce-virtual-patient`, mensagens em `osce_chat_messages`), *Exame concluído*, *Tempo esgotado*, *E-mail não encontrado*. Canal `student-circuit-<id>`.

## Resultados — `/osce/:id/results`

Filtro por aplicação (todas ou uma), abas **Alunos** (lista, nota, **radar de competências** `OsceRadarChart`, desempenho por estação) e **Estações** (desempenho agregado por estação). O radar também aparece na Análise de PV.

## Dados

`osce_exams`, estações, itens de checklist, `osce_circuits`, alunos do circuito (`current_station_id`), avaliações, `osce_chat_messages`; turma opcional.

## Lacunas / observações

- Aluno do circuito vem da Turma ou digitado; **a Turma não lista OSCE** (vínculo exame ↔ turma é pendência).
- Sem exportação de resultados (PDF/CSV) detectada na tela de resultados; sem relatório individual para o aluno.
- O dashboard conta OSCE e lista os 2 mais recentes.

## Protótipo vs. real

O protótipo "OSCE ×3" precisa mostrar: editor de estação com checklist tipado (3 tipos), materiais, paciente virtual por estação, gerador por IA; configuração de circuito (turma, online, avaliadores); painel com grade de rotação, cronômetros e monitor de chat; portal do avaliador em 4 abas; portal do aluno; resultados com radar.
