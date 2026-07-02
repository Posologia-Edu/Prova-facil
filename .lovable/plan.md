
## Objetivo

Permitir realizar uma **reposição de anamnese** dentro da **mesma sala** já usada no dia original, para que o SOAP possa continuar vinculado a uma única sala de anamnese. Alunos que já fizeram anamnese ficam "arquivados" (dados preservados) e uma nova rodada de reposição é gerada apenas para os faltantes, permitindo reutilizar alunos já anamnesados como paciente/observador quando não houver alunos suficientes.

## Como vai funcionar (visão do usuário)

Na tela de controle da sala de anamnese, após concluir o dia principal, o professor terá um novo botão **"Iniciar reposição"** com este fluxo:

1. **Selecionar quem fará a reposição** — lista todos os participantes da sala, com um checkbox "Fazer anamnese na reposição" (por padrão marcados os que aparecem como faltantes/sem resposta). O sistema calcula automaticamente as duplas necessárias entre eles.
2. **Completar papéis quando faltar gente** — se o número de alunos da reposição não permitir gerar observador/paciente automaticamente (ex.: 1 aluno solo, ou dupla sem observador possível), aparece um painel de "Papéis a preencher" onde o professor escolhe manualmente, entre os alunos **que já fizeram anamnese na sala principal**, quem atuará como:
   - Paciente simulado (para uma dupla incompleta / aluno solo)
   - Observador
   Esses alunos "reaproveitados" não geram nova resposta — só cumprem o papel na reposição.
3. **Gerar rodadas de reposição** — o sistema cria novas `simulation_rounds` marcadas como `is_makeup = true`, com numeração continuando após as rodadas originais, e novas `simulation_round_assignments` incluindo os papéis manuais.
4. **Executar normalmente** — o professor libera materiais e roda as rodadas de reposição pelo mesmo painel de controle atual. Os alunos da reposição entram com o mesmo PIN e caem direto nas rodadas ativas.
5. **Dados preservados** — as respostas do dia original permanecem intactas; as novas respostas ficam identificadas como reposição (novo campo `is_makeup` em `simulation_responses`) para não sobrescrever nada.

Na tela do SOAP, ao vincular "sala de anamnese", o professor continua escolhendo **uma única sala**, e o SOAP passa a enxergar respostas do dia principal + da reposição automaticamente.

## Detalhes técnicos

### Banco (nova migration)
- `simulation_participants`: adicionar coluna `makeup_status text` (`null` | `'included'` | `'reused_as_patient'` | `'reused_as_observer'`) — controla o papel na reposição sem apagar `status` original.
- `simulation_rounds`: adicionar `is_makeup boolean default false` e `makeup_batch int default 0` (para identificar levas de reposição).
- `simulation_round_assignments`: adicionar `is_reused_role boolean default false` — indica quando o participante está apenas cumprindo papel (não gera resposta obrigatória).
- `simulation_responses`: adicionar `is_makeup boolean default false`.
- Backfill: registros existentes ficam `false`/`null`.

### Frontend

- `src/lib/simulation-distribution.ts` — nova função `generateMakeupRounds(pairs, reusedProfiles, numCases, startingRoundNumber)`:
  - Recebe pares de alunos da reposição + array de perfis reaproveitáveis (id, papel escolhido: "patient" ou "observer", ligado a que par).
  - Gera rodadas continuando a numeração, marcando `is_makeup=true`. Solo com paciente reaproveitado vira dupla lógica; observador reaproveitado entra como assignment normal com `is_reused_role=true`.
- `src/components/MakeupSetupDialog.tsx` (novo) — diálogo com:
  - Passo 1: checkboxes de quem faz reposição.
  - Passo 2: preview de duplas geradas + slots vermelhos "sem paciente" / "sem observador" com combobox para escolher entre alunos já anamnesados.
  - Passo 3: confirmar e gerar rodadas.
- `src/pages/SimulationJoin.tsx` (painel de controle) — adicionar botão "Iniciar reposição" (visível quando `status === 'active'` ou após a primeira leva concluída); listar rodadas separadas por leva (Principal / Reposição 1…) no painel de progresso.
- `src/pages/SoapEditor.tsx` — ao carregar respostas da sala de anamnese vinculada, não filtrar por `is_makeup`: pega todas. Se um aluno tiver resposta principal e de reposição, prioriza a mais recente.
- `src/components/simulation/SimulationProgressPanel.tsx` — agrupar rodadas por leva com header "Reposição".

### Regras
- Reposição só pode ser iniciada quando não houver rodada `active` pendente da leva anterior.
- Alunos reaproveitados como paciente/observador não têm formulário exigido; se abrirem a sala, veem "Você já concluiu a anamnese; nesta rodada seu papel é apenas ajudar".
- Múltiplas levas de reposição são permitidas (`makeup_batch` incremental).

## Fora do escopo
- Alterar mecânica dos módulos SOAP/Reconciliação/Documentação (só o SOAP passa a ler automaticamente respostas de reposição da mesma sala).
- Notificações por e-mail aos alunos da reposição.
