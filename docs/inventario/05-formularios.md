# Inventário — Formulários (SCT, KFE, Mini-CEX/DOPS, SJT, Progress Test)

Menu: **Avaliar → Formulários** (grupo recolhível com 5 filhos). Todos seguem o mesmo molde: **lista de cartões → editor com abas → portal público (sem login) com link**. Nenhum se liga a Turma (os alunos entram por nome e e-mail) e nenhum entra na Lixeira além do soft delete; não há modo de seleção nem PDF.

> Atenção: os componentes de `src/components/forms/` (FormBuilder, FormRenderer, FormImportDialog, FormTemplateDialog, MedTemplateDialog, HandwritingInput, ShareTemplateDialog, DraftStatusBadge) **não pertencem a este grupo**: são usados nos editores/portais de Simulação (SOAP, reconciliação, documentação, áreas) e no Júri. Ver inventário de Simulação.

## SCT — Script Concordance Test
**Rotas:** `/sct`, `/sct/:id/edit`, `/sct/expert/:examId` (público), `/sct/student/:examId` (público). **Arquivos:** `SctExams` (192), `SctEditor` (323), `SctExpertPortal` (175), `SctStudentPortal` (247).
- **Lista:** cartões com título, contagem de cenários e respostas de especialistas; criar (já navega ao editor), excluir (lixeira).
- **Editor (3 abas):** *Cenários (N)*: por cenário **vinheta clínica**, **hipótese** ("se você estava pensando em…"), **nova informação** ("e então você descobre que…"), remover/adicionar; *Painel de Especialistas*: tamanho esperado do painel, **link do painel**, **link dos alunos**, lista de especialistas que responderam; *Resultados*: sessões dos alunos. Cabeçalho: título, descrição, status, salvar.
- **Portal do especialista:** nome e e-mail, todos os cenários em escala Likert (−2 a +2), envio com validação de pendentes.
- **Portal do aluno:** nome/e-mail, cenários em Likert; **pontuação por concordância com o painel** (crédito parcial = frequência da resposta do aluno ÷ frequência da moda dos especialistas), nota e máximo gravados na sessão; tela "Respostas enviadas" com nota.
- Tabelas: `sct_exams`, `sct_scenarios`, `sct_expert_responses`, `sct_student_sessions`, `sct_student_answers`.

## KFE — Key Feature Exam
**Rotas:** `/kfe`, `/kfe/:id/edit`, `/kfe/student/:examId`. **Arquivos:** `KfeExams` (111), `KfeEditor` (314), `KfeStudentPortal` (297).
- **Lista:** cartões com título, badge de status, nº de casos.
- **Editor (3 abas):** *Casos (N)* (título, cenário clínico; cada caso com N pontos-chave **KF**: tipo *múltipla escolha* ou *resposta curta*, enunciado, alternativas/resposta esperada, **pontuação máxima**, **explicação exibida após a resposta**); *Configurações* (link dos alunos); *Resultados* (sessões, status enviada/andamento).
- **Portal do aluno:** nome/e-mail, navegação por caso e ponto-chave, contador "N/M respondidos", correção automática (MC por alternativa; resposta curta por igualdade de texto), nota final.
- Tabelas: `kfe_exams`, `kfe_cases`, `kfe_key_features`, `kfe_sessions`, `kfe_answers`.

## Mini-CEX & DOPS
**Rotas:** `/clinical-observations`, `/clinical-observations/:id/edit`, `/clinical-observations/eval/:obsId` (público, para o avaliador). **Arquivos:** `ClinicalObservations` (139), `ClinicalObservationEditor` (237), `ClinicalObservationEval` (206).
- **Lista:** abas *Todos / Mini-CEX / DOPS* com contagens; criar escolhendo o tipo; cada tipo nasce com 7 domínios padrão (Mini-CEX: Anamnese, Exame físico, Raciocínio clínico, Comunicação, Profissionalismo, Organização, Competência global; DOPS: Indicação, Consentimento, Preparação, Técnica, Assepsia, Cuidados pós, Competência global).
- **Editor (3 abas):** *Domínios (N)* (renomear/descrever, adicionar/remover) + **vínculo com Competências** (`CompetencySelector`, alimenta a análise de competências); *Avaliações (N)* (sessões com nota global colorida: ≥7, ≥4, <4); *Resultados* (médias por domínio). Link do avaliador com copiar; status Rascunho/Ativo/Finalizado.
- **Avaliação (avaliador, público):** nome/e-mail do avaliador e do aluno, complexidade (baixa/média/alta), ambiente, duração em minutos, uma **escala 1–9 por domínio** (slider com rótulos), nota global, feedback para o aluno.
- Tabelas: `clinical_observations`, `clinical_observation_sessions`.

## SJT — Situational Judgment Test
**Rotas:** `/sjt`, `/sjt/:id/edit`, `/sjt/student/:examId`. **Arquivos:** `SjtExams` (102), `SjtEditor` (258), `SjtStudentPortal` (257).
- **Editor (3 abas):** *Cenários (N)* (situação/dilema, lista de **ações possíveis**, **ranking correto** reordenável por ↑/↓), *Configurações* (link dos alunos), *Resultados* (sessões). Status Rascunho/Ativo/Finalizado.
- **Portal do aluno:** ordena as ações; pontuação por **distância entre posição do aluno e a correta**, normalizada por cenário; nota total e máxima.
- Tabelas: `sjt_exams`, `sjt_scenarios`, `sjt_sessions`, `sjt_answers`.

## Progress Test
**Rotas:** `/progress-test`, `/progress-test/:id/edit`, `/progress-test/student/:testId`. **Arquivos:** `ProgressTests` (115), `ProgressTestEditor` (708), `ProgressTestStudentPortal` (363).
- **Editor (4 abas):** *Configuração* (título, descrição, **data de aplicação**, **anos-alvo**); *Questões (N)* (questões **do banco** de questões, cada uma com **ano esperado** 1º–Nº, enunciado/alternativas/explicação expansíveis, banco para adicionar, **gerar com IA** em dialog: curso [Medicina, Enfermagem, Farmácia, Odontologia, Fisioterapia, Nutrição, Biomedicina], áreas temáticas, dificuldade predominante, **questões por ano**, função `generate-progress-test`); *Compartilhar* (link do portal, **Publicar** bloqueado se houver questões sem enunciado/alternativas); *Resultados (N)* (sessões; por aluno: desempenho por ano, **por área temática**, detalhamento por questão).
- **Portal do aluno:** nome completo, e-mail, **ano do curso**; questões com **navegação rápida**; tela final "Teste de Progresso Finalizado".
- Tabelas: `progress_tests`, `progress_test_questions`, `progress_test_sessions`, `progress_test_answers`, `question_bank`.

## Pontos transversais / lacunas

- Todos os portais públicos têm layout próprio (cartão centralizado); não usam `AppLayout`.
- Só Mini-CEX tem vínculo com Competências; só Progress Test tem IA e usa o banco.
- Sem exportação/relatório (CSV/PDF), sem vínculo com Turma ou Calendário.
- A lista de SCT/KFE/SJT/Progress/Mini-CEX é praticamente idêntica (título + status + contagem + excluir): bom candidato a um componente único de lista.

## Protótipo vs. real

O protótipo mostrou **um** formulário genérico. Falta mostrar os cinco editores com suas abas e tipos de dado próprios (Likert, KF com 2 tipos, domínios 1–9, ranking, anos-alvo), os portais públicos e os links de compartilhamento.
