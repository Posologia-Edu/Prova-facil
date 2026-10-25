# Inventário — Júri Simulado

**Rotas professor:** `/mock-trials` (lista), `/mock-trials/:id/edit` (editor, 7 abas)
**Rotas públicas:** `/mock-trial/portal/:accessCode` (aluno), `/mock-trial/judge/:accessCode` (juiz), `/mock-trial/peer-eval/:token` (avaliação entre pares por e-mail)
**Arquivos:** `MockTrials` (363), `MockTrialEditor` (1500), `MockTrialStudent` (547), `MockTrialJudge` (692), `MtPeerEvaluation`, `components/mock-trial/*` (2772 linhas em 10 arquivos)
**Funções de borda:** `mock-trial-skeleton`, `mock-trial-job` (geração assíncrona do processo, com acompanhamento em `mock_trial_generation_jobs` por canal em tempo real), `mock-trial-section`, `generate-mock-trial-image`, `mock-trial-teacher-guide`, `grade-mock-trial-jury`, `grade-mock-trial-jury-panel`, `send-mt-peer-eval-invites`.

## Lista — `/mock-trials`

Cabeçalho + botão criar; cartões com título (renomear em dialog "Renomear Júri Simulado"), excluir; estado vazio.

## Editor — `/mock-trials/:id/edit` (7 abas)

1. **Processos:** adicionar processo; **Gerar Processo com IA** (dialog: objetivos de aprendizagem, **PDF de referência** opcional; geração em etapas com acompanhamento); **Banco de processos** (`MockTrialCaseBankDialog`). Por processo: número, **Editar Processo** (conteúdo em formato jurídico), regenerar com IA (usa os objetivos salvos), **salvar no banco** para reutilizar, **reiniciar** (volta ao estado não iniciado), excluir; `MockTrialSectionsBuilder` (seções do processo geradas por IA), **imagens médicas** do processo (`CaseImagesPanel`, geração/anexo), **testemunhas técnicas** (`WitnessesEditor`: nome, profissão/especialidade, perguntas socráticas), **guia do professor** (`TeacherGuidePanel`), renderização `LegalProcessRenderer` (autos nº, assinatura eletrônica).
2. **Grupos:** criar grupos; **adicionar aluno** (individual ou em lote, com grupo); distribuir alunos sem grupo; edição inline.
3. **Distribuição:** atribuir processo a cada grupo e **papéis** (⚖️ Acusação, 🛡️ Defesa, 🏛️ Júri Técnico, ou "Não participa") por aluno; "Câmara".
4. **Formulários:** formulários de avaliação por papel (Acusação, Defesa, Júri), com `MockTrialEvaluationForm` e construtor de campos (`FormBuilder`).
5. **Painel do Juiz:** nome do juiz, descrição, **PIN de acesso** (alunos e juiz), **link direto do juiz**, copiar.
6. **Resultados** (`ResultsPanel`, 708 linhas): sub-abas **Notas consolidadas**, **Envios dos grupos**, **Avaliação dos jurados (IA)**, **Avaliar Júri Técnico** (painel), **Avaliação do professor**. Nota final do grupo = (Juiz + Professor + IA) / 3.
7. **Notas dos Alunos** (`StudentScoresPanel`, 674 linhas): nota individual, **"Relação Nominal de Apenados"**, **exportar CSV**.

## Sessão ao vivo — Juiz (`/mock-trial/judge/:accessCode`)

Nome do juiz; **fases da sessão** com cronômetro: *Anúncio do caso* (2 min), *Fala da defesa*, *Fala da acusação*, *Perguntas do júri técnico*, *Deliberação do júri*, *Veredito*; instruções por fase, iniciar/pausar fase, sincronização do cronômetro pelos timestamps da sessão (sobrevive a recarga); lista de grupos/alunos; respostas e avaliações em tempo real (canais `responses-`, `evals-`, `session-`); ao concluir um processo, dispara **convites de avaliação entre pares** (`send-mt-peer-eval-invites`).

## Aluno (`/mock-trial/portal/:accessCode`)

Login por e-mail; título do júri; abas **Processo** (documento jurídico), **Personagens** (se tiver), **Formulário** (se tiver); perguntas socráticas das testemunhas; envio de formulário; canal `student-sessions`.

## Avaliação entre pares (`/mock-trial/peer-eval/:token`)

Link por e-mail (3 critérios por colega); construída em 2026-09 e em produção (ver memória do projeto).

## Dados

`mock_trials`, casos/processos, grupos, alunos, `mock_trial_sessions`, respostas, avaliações, `mock_trial_generation_jobs`, formulários, banco de processos.

## Lacunas / observações

- Sem vínculo com Turma (aluno entra por lote ou digitação; vínculo exige banco de alunos: pendência).
- Maior arquivo de editor do sistema (1500 linhas) com 7 abas: bom candidato a divisão visual em etapas (Preparar → Distribuir → Aplicar → Resultados).
- Dashboard só conta Júris; não lista nos recentes.
- A memória registra Júri real em 30/10 (ver estado consolidado): **não alterar comportamento**, só camada visual, e apenas após a data.

## Protótipo vs. real

O protótipo "Júri ×4" precisa incluir as 7 abas do editor, geração por IA com PDF de referência e acompanhamento do job, imagens médicas, testemunhas, guia do professor, painel do juiz com 6 fases cronometradas, e resultados com 5 sub-abas.
