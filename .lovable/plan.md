# Anamnese em Múltiplos Dias — Pausar e Retomar

## Boa notícia: a fundação já existe

A sala de simulação atual já é, na prática, multi-sessão por desenho:

- Cada rodada (`simulation_rounds`) tem status independente: `pending`, `active`, `completed`.
- Quando uma rodada é finalizada, ela vira `completed` com `finished_at` registrado — e **nunca mais é refeita**.
- O agregador de notas (`SimulationAggregator`) já consome **somente rodadas com `status = 'completed'`**, somando as notas dos alunos por participante, independentemente de quando foram finalizadas.
- O SOAP, na próxima etapa, lê as respostas de anamnese pela `participant_id` correspondente — também é agnóstico ao dia em que a rodada aconteceu.

Ou seja: hoje você já poderia simplesmente fechar a sala no fim do dia 1 e reabrir no dia 2 que tudo se preservaria. O problema é que **não há um controle elegante e explícito disso** — o professor fica inseguro se pode encerrar, não tem visão clara do que falta, e nada comunica aos alunos "essa sala continua amanhã".

Esta proposta adiciona uma camada de **gestão de sessões** (Dia 1, Dia 2, …) por cima dessa fundação, sem mudar como anamnese alimenta SOAP nem como notas chegam ao agregador.

## O que muda para o usuário

### 1. Botão "Pausar simulação" no painel do professor

Quando há rodadas concluídas e ainda há rodadas `pending`, aparece no `SimulationControl` um novo botão **"Pausar e continuar em outro dia"**, ao lado de "Avançar/Finalizar rodada".

Ao pausar:
- A sala muda para `status = 'paused'` (novo valor).
- Nenhuma rodada `pending` é alterada — elas ficam intactas, prontas para retomar.
- Se houver uma rodada `active` no momento (ninguém apertou para encerrar ainda), o professor é avisado e tem 2 opções: **finalizar a rodada atual antes** (recomendado) ou **descartá-la** (ela volta para `pending` e quem já respondeu mantém a resposta — opcional, pode ficar para uma v2).

### 2. Painel "Progresso da turma" sempre visível

Um card resumo no topo do `SimulationControl` mostra:

```text
Progresso da anamnese
███████████░░░░░░░░  11 de 18 rodadas (61%)
Dia 1 — 22/05: rodadas 1–11 concluídas (15 alunos avaliados)
Próxima sessão: rodadas 12–18 pendentes (8 alunos restantes)
```

Lista os alunos que **já participaram como profissional** (têm resposta) e os que **ainda faltam**, separando claramente. Isso dá ao professor a confiança de pausar sabendo exatamente o que retomar.

### 3. Tela de "Sala pausada" para os alunos

Quando o aluno entra na `SimulationJoin` e a sala está `paused`:
- Vê uma tela elegante com a mensagem: "Esta simulação está pausada. O professor retomará em outra sessão. Suas respostas até aqui foram salvas."
- Mostra o que ele já fez (rodadas em que participou + nota se já houver) e o que ainda falta para ele.
- Não consegue submeter nada nem entrar em rodada.

### 4. Botão "Retomar simulação" no dia seguinte

No `SimulationControl`, quando `status = 'paused'`, o botão principal vira **"Retomar simulação"**. Ao clicar:
- Sala volta para `status = 'active'`.
- A próxima rodada `pending` fica disponível para ser iniciada normalmente.
- Alunos que entrarem caem no fluxo padrão.

Não há perda de estado: pares, papéis (A/B), rotação de observador, distribuição de casos — tudo já está materializado em `simulation_rounds` e `simulation_round_assignments` desde a criação da sala.

### 5. Marcação de "sessões" (opcional, melhora a leitura)

Cada vez que o professor pausa e retoma, registramos o intervalo como uma **sessão**. O painel passa a mostrar:

```text
Sessão 1 — 22/05, 14h–17h: rodadas 1–11
Sessão 2 — 23/05, 14h–em andamento: rodada 12 ativa
```

Isso é puramente informativo (não muda a lógica) e dá uma sensação de organização profissional ao histórico.

## Por que isso preserva SOAP e o agregador

- **SOAP**: continua lendo `simulation_responses` por `participant_id`. Cada aluno que fez anamnese no Dia 1 tem sua resposta salva e disponível imediatamente para a etapa seguinte — não precisa esperar a anamnese da turma toda terminar.
- **Agregador**: já filtra por `simulation_rounds.status = 'completed'` e soma as notas de todas as rodadas concluídas da sala, independentemente do dia. Os 11 alunos avaliados no Dia 1 já aparecem somados no agregador antes mesmo do Dia 2 começar; depois do Dia 2, os 7 restantes simplesmente se somam.

Nada na cadeia anamnese → SOAP → agregador precisa ser tocado.

## Detalhes técnicos

### Banco de dados

Migration mínima:

- Aceitar `'paused'` como valor válido em `simulation_rooms.status` (hoje é texto livre, então não há CHECK constraint a alterar — basta documentar). Caso exista um trigger de validação, atualizá-lo.
- (Opcional, recomendado) Nova tabela `simulation_sessions`:
  - `id uuid pk`
  - `room_id uuid fk simulation_rooms on delete cascade`
  - `session_number int`
  - `started_at timestamptz`
  - `ended_at timestamptz null`
  - `notes text null`
  - RLS: dono da sala faz tudo; participantes veem por `room_id`.

Quando o professor inicia/retoma a sala, criamos uma linha aberta. Quando pausa, fechamos `ended_at`. As rodadas continuam ligadas só a `room_id` — ligamos rodada↔sessão *implicitamente* pelo intervalo `started_at` da rodada vs. janela da sessão (suficiente para o painel; sem FK adicional).

### Frontend

Arquivos editados:

- `src/pages/SimulationControl.tsx`
  - Adiciona card "Progresso da turma" (lista alunos avaliados / pendentes a partir de `simulation_responses` × `simulation_participants`).
  - Adiciona botão **Pausar** (visível quando `status='active'` e há rodadas `pending`) e **Retomar** (visível quando `status='paused'`).
  - Trata o caso "tem rodada active no momento da pausa": modal de confirmação com opção de finalizar antes.
  - Renderiza linha do tempo de sessões (a partir de `simulation_sessions`).

- `src/pages/SimulationJoin.tsx`
  - Novo branch de UI: se `room.status === 'paused'`, renderiza `<SimulationPausedView />` com resumo pessoal do aluno (rodadas em que participou e papel).
  - Bloqueia ações de submit/entrada em rodada enquanto pausada.

- `src/pages/SimulationAggregator.tsx`
  - Sem mudança funcional. Apenas adicionar um badge "Pausada" no `statusLabel`/`statusVariant` para o novo valor.

- (Novo) `src/components/simulation/SimulationProgressPanel.tsx`
  - Componente reutilizável do card de progresso (alunos avaliados vs. pendentes, barra de %, lista de sessões).

- (Novo) `src/components/simulation/SimulationPausedView.tsx`
  - Tela do aluno quando a sala está pausada.

### i18n

Novas chaves em `src/i18n/translations.ts` (pt/en/es): `sim_pause`, `sim_resume`, `sim_status_paused`, `sim_paused_student_message`, `sim_progress_title`, `sim_session_label`, `sim_students_evaluated`, `sim_students_pending`.

### Fluxo de transições de status (sala)

```text
draft ──start──▶ active ──pause──▶ paused ──resume──▶ active ──finish──▶ completed
                   ▲                                          │
                   └──────────────  resume  ───────────────────┘
```

Pausar só é permitido a partir de `active`. Retomar só de `paused`. Finalizar só quando todas as rodadas estão `completed` (já é a regra de hoje).

### Edge cases tratados

- Aluno tenta entrar com PIN durante pausa → tela "Pausada", nada quebra.
- Professor pausa com rodada ativa → modal pergunta se quer finalizar antes (preserva nota) ou cancelar a pausa.
- Aluno que faltou no Dia 1 mas aparece no Dia 2 → já está em `simulation_participants` como `waiting`; quando a rodada dele virar a próxima `pending`, ele entra normalmente. Se o professor adicionou alunos novos depois, basta inserir em `simulation_participants` e regenerar rodadas faltantes (botão já existente "Regenerar rodadas pendentes" — pode ser tema de uma v2 se ainda não estiver lá).
- Sala completa todas as rodadas → vai direto para `completed`, sem passar por `paused`.

## Fora do escopo

- Não mexer em SOAP, Reconciliação, Documentação ou no agregador além do badge de status.
- Não alterar lógica de distribuição de pares/papéis (`generateRounds`).
- Não criar agendamento automático de "Dia 2" — a retomada é manual pelo professor (mais simples e flexível).
