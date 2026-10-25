# Inventário — Minhas Provas (lista, visualização, editor, monitoramento, prova e resultado do aluno)

**Rotas (professor):** `/exams`, `/exams/:examId` (ExamView), `/exams/:examId/edit` (ExamEditor), `/monitoring/:publicationId` (ExamMonitoring)
**Rotas (aluno):** `/student/auth`, `/student/dashboard`, `/checkin/:token`, `/student/exam/:sessionId`, `/student/results/:sessionId`
**Arquivos:** `Exams.tsx` (534), `ExamView.tsx` (491), `ExamEditor.tsx` (1668), `ExamMonitoring.tsx` (806), `StudentExam.tsx` (687), `StudentResults.tsx` (243), `StudentCheckin.tsx` (118), `ExamProctoring.tsx` (443), `AITutorChat.tsx` (308), `PublishExamDialog.tsx`, `ReopenExamDialog.tsx`, `ExamPDFExporter.tsx`, `lib/exam-status.ts`

## 1. Lista — `/exams`

- Cabeçalho "Minhas Provas", contagem, `SystemPromptViewer` (admin), botão **SELECIONAR PROVAS** (modo de seleção com checkboxes; **nenhuma ação em lote existe**: só marca).
- Busca por título; ordenação (data de criação, título, status).
- Cartão por prova: título, menu ⋯ (**Ver, Duplicar, Reabrir** [só se publicada], **Compartilhar no Marketplace** [não para importadas] / **Revogar compartilhamento**, **Excluir** → lixeira), badge de status efetivo, nº de questões, nº de participantes, botão **Monitoramento** quando há publicação (senão dois ícones apagados de e-mail e gráfico, decorativos).
- Estados: carregando, vazio (botões Compor prova / Criar prova em branco), confirmação de exclusão, `ReopenExamDialog`.
- **Status efetivo** (`computeExamStatus`): EM ELABORAÇÃO → EM APLICAÇÃO → EM CORREÇÃO → CONCLUÍDA (concluída é manual e vence tudo).
- Limite de **provas por mês no plano gratuito** (`FREE_LIMITS.examsPerMonth`) ao criar.
- Lê `exams`, `exam_questions`, `exam_publications`, `exam_sessions`, `marketplace_exams`.

## 2. Visualização — `/exams/:examId`

- Barra: voltar, título, **Editar, Duplicar, Exportar PDF** (`ExamPDFExporter`: marca d'água, gabarito, folha de respostas, 2–4 versões A–D), **Compartilhar no Marketplace**, **Publicar** (`PublishExamDialog`: tempo limite, data de início opcional, data limite opcional) ou **Despublicar** (status → correção), **Excluir**.
- Prévia A4 da prova com cabeçalho (instituição, professor, data, instruções).

## 3. Editor — `/exams/:examId/edit` (5 abas)

1. **Questões**: lista ordenada com menu por questão, pontos editáveis, remover; menus **ADICIONAR** (do banco: seleção única ou "combinação" múltipla, com picker em dialog) e **CRIAR** (por tipo; dialog com enunciado, dificuldade, Bloom, tags), IA (gerar questões); barra inferior: **RASCUNHO EM PDF, DUPLICAR PROVA, VOLTAR, SALVAR**; menu de **status manual** no cabeçalho.
2. **Configurações**: título, instituição, professor(a), chaves de instruções preparatórias e durante a prova (com textos), **vincular turma**, "ordem das questões" (fixa/aleatória; **valor não salvo**: `defaultValue`), e **Segurança & Proctoring** (badge SEGURANÇA ATIVA/DESATIVADO): tela cheia, bloquear copiar/colar, embaralhar questões, embaralhar alternativas, foto de identificação, selfies periódicas (intervalo em minutos), marca d'água, **limite de violações** (0 = sem limite).
3. **Aplicação**: janela de aplicação (início/fim), duração em minutos, **participantes** (alunos da turma, selecionar todos/alguns), **Publicar**; após publicar: cartão "Prova publicada!" com **código de acesso**, estado Ativa/Inativa, **Abrir monitoramento**, resumo das medidas de segurança ativas.
4. **Correção**: lista de avaliações submetidas por aluno; respostas; **dialog de revisão** com 2 abas: **Tutor de IA** (`AITutorChat`) e **Nota Manual** (nota até o máximo + feedback); notas gravadas em `student_answers`.
5. **Estatísticas**: distribuição de notas, desempenho por questão, índice de discriminação.

## 4. Monitoramento — `/monitoring/:publicationId`

- Duas abas: **Monitoramento** (contadores Total/Em andamento/Finalizadas; lista de alunos com status Fazendo/Enviada/Corrigida/Bloqueada; respostas do aluno selecionado; revisão como acima) e **Segurança** (violações por aluno, fotos do bucket `exam-proctoring`, **Timeline de eventos**, **desbloquear aluno**; botão recarregar).
- Tempo real: canais Supabase `monitoring-<id>` e `exam-proctoring-events-<sessão>`.

## 5. Lado do aluno

- **StudentAuth** (e-mail + código de acesso) → **StudentDashboard** → prova.
- **StudentCheckin** (`/checkin/:token`): presença; mostra "Atrasado" quando passou do horário.
- **StudentExam**: cabeçalho com título, "Questão N de M", cronômetro (alerta de tempo baixo + diálogo "Tempo quase esgotado!"), **Entregar** (confirmação), barra de progresso, **navegador de questões**, anterior/próxima; blocos de **enunciado base** (caso clínico) com imagens; tipos: múltipla escolha, V/F, associação, dissertativa; `RichTextRenderer`; **autosave periódico**; envio automático ao esgotar o tempo; tudo via função de borda (`action: load/save/submit`).
- **ExamProctoring** (envolve a prova quando há segurança): termo de consentimento, tela cheia obrigatória, câmera (`getUserMedia`) com foto de ID e selfies, bloqueio de copiar/colar/menu de contexto, detecção de saída da aba/tela cheia → contagem de violações, **bloqueio da prova** e desbloqueio em tempo real pelo professor.
- **StudentResults**: nota, status (corrigida ou não), por questão a resposta do aluno, gabarito/feedback do professor, **Feedback Personalizado da IA** (Pontos fortes, Áreas de melhoria, Recomendações; trata limites 429/402).

## Regras e observações

- Há **dois caminhos de publicação**: `PublishExamDialog` (ExamView) e aba Aplicação (ExamEditor, com participantes). Conferir se gravam o mesmo.
- "Ordem das questões" na aba Configurações não persiste.
- Seleção de provas sem ação; ícones de e-mail/gráfico decorativos.
- Textos em português fixo em quase toda a tela.

## Protótipo vs. real

O protótipo aprovado de Provas e do resultado do aluno é uma simplificação: deve ser refeito com as 5 abas do editor, o monitoramento em tempo real com aba de segurança, a prova do aluno com proctoring (consentimento, câmera, bloqueio), o código de acesso, o tutor de IA na correção, o PDF com versões e o check-in.
