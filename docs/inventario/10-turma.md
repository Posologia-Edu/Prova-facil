# Inventário — Turma

**Rotas:** `/classes` (lista), `/classes/:classId` (página única da turma; aba pela URL `?aba=`)
**Arquivos:** `Classes.tsx` (678), `ClassDetail.tsx` (788), `components/classes/*` (17 arquivos, 5719 linhas)
**Situação:** lista e cabeçalho/Atividades já redesenhados na branch (commit 1ca5aec); **as demais abas ainda estão no visual antigo**.

## Lista — `/classes`

Cartões de turma (nome, semestre, descrição, contagem de alunos, provas e status ativa/inativa). Ações: **criar** (nome, semestre, descrição), **editar**, **ativar/inativar**, **duplicar** (copia professores, materiais, catálogo de visitas, semestres e cronograma; alunos não), **gerenciar alunos** (dialog: individual, em lote `Nome; E-mail; Matrícula`, remover), **excluir** (lixeira). Clicar abre `/classes/:id`.

## Página da turma — cabeçalho

Voltar, nome, semestre/descrição, **Editar turma** (nome, semestre, descrição, "turma ativa"), seletor do **semestre ativo** (as abas Alunos, Notas, Presença, Cronograma dependem dele; sem semestre mostram "Crie um semestre primeiro"), atalho de teclado `n` (nova aula na aba Cronograma).

## Abas (10)

1. **Visão geral** (`OverviewTab`): próximas aulas (com tipo), **progresso do semestre**, **atalhos** (marcar presença, lançar notas, gerenciar alunos), **Mural de comunicados** (`AnnouncementsBoard`: título, mensagem, fixar, editar, excluir; por turma/semestre).
2. **Atividades** (`ClassActivitiesTab`, 958 linhas, nova): **provas online** (vincular/desvincular prova da conta; status e código), **pacientes virtuais** (vincular com **profissão do aluno** e **tipo Avaliativo/Treino** + dificuldade; ativar/desativar; **PIN** copiável; **rótulo do grupo**; **divisão de funções** ligar/desligar; **atribuir alunos** [individual ou em grupo, regras de conflito: aluno em um único PV por turma]; remover com bloqueio se há sessões), **alunos** (Gerenciar alunos), **docente**. Provas online e PV coexistem (a exclusividade antiga era só da tela).
3. **Cronograma** (`ScheduleViews`, 793 linhas): 4 visões **Lista / Turnos / Linha do tempo / Calendário**; filtros por tipo e status (Planejada, Realizada, Cancelada); aulas com tipo (Teórica, Prática, Simulação, Seminário/Caso clínico, Avaliação/Prova, Outro, **Visita técnica**, **Feriado**), professor, horário, **reagendar** (arrastar), exportação (calendário/CSV), abrir **avaliação de seminário**; **Grade semanal da disciplina** (`WeeklyScheduleEditor`: dia, turno, horários) para gerar aulas.
   - **LessonDialog** (530 linhas): data, status, título, tipo, professor, horário (notação ou personalizado), template (`LessonTemplateRenderer`, campos dinâmicos), múltiplas datas/aulas, e para **visita técnica** `LessonVisitsEditor` (turmas de visita: local [Google Maps], preceptor, telefone, horário, alunos) com **catálogo** `VisitTemplateManager`.
   - **SeminarEvaluationDialog** (663 linhas): abas *Alunos* e *Instrumento* (rubrica com critérios e pesos, nota máxima, `RubricPicker` com biblioteca de rubricas, observações).
4. **Alunos** (`StudentsTab`): tabela (nome, e-mail, matrícula, turma de visita), adicionar individual/lote, remover, **exportar CSV**, **enviar PINs de check-in** por e-mail (`checkin-send-pins`, com regenerar).
5. **Notas** (`GradebookTab`): caderno por semestre; colunas de avaliação (nome, tipo, **peso**, **nota máxima**), células por aluno, médias.
6. **Presença** (`AttendanceTab`): por aula e aluno (presente, falta, justificada, atraso), justificativa, marcar todos; **Check-in por QR** (`QrCheckinDialog`: token rotativo, **exigir geolocalização**, janela de check-in, lista **ao vivo** por canal `att-<aula>`). O aluno confirma em `/checkin/:token` (marca "Atrasado").
7. **Semestres**: lista com ativo/arquivado, criar/editar (rótulo, início, fim, ativo), **duplicar** (copia cronograma; professores e materiais são da turma), excluir.
8. **Professores**: tabela (nome, e-mail, função Titular/Auxiliar/Monitor/Convidado), criar/editar/excluir.
9. **Materiais** (`ClassMaterialsGrid`): grade de documentos (título, categoria, descrição, arquivo no storage `class-documents` **ou** link externo; URL assinada por 1 h).
10. **Feriados** (`HolidaysTab`): lista, criar/editar (data, nome, "repetir todos os anos"), importar feriados, **aplicar ao cronograma** (marca aulas como feriado).

## Dados

`classes` (com `weekly_schedule`), `class_semesters`, `class_teachers`, `class_documents`, `class_students` (por turma **e** semestre), `class_schedule_items`, `class_lesson_visits`, `class_visit_templates`, `class_lesson_templates`, `class_attendance`, `class_grade_columns/entries`, `class_holidays`, `class_announcements`, `class_rubrics`, `class_seminar_evaluations`, `class_virtual_patients`, `class_vp_assignments`, `exams.class_id`.

## Regras

- Aluno só pode estar em um PV da turma (mesmo modo); treino e avaliativo se tratam à parte.
- Duplicar turma não copia alunos; duplicar semestre não copia professores/materiais (são da turma).
- Em Simulação, Júri e OSCE **não há vínculo com a Turma** (OSCE usa turma só para listar alunos no circuito).

## Pendências já decididas para o redesenho

- Aba **Análises** dentro da turma (reaproveitar `VPAnalytics` filtrado por turma; "Análises VP" sai do menu depois).
- Ligar Simulação/Júri/OSCE à turma (exige banco).
- **Reaproveitar o novo visual para as 9 abas restantes** (hoje só cabeçalho e Atividades).
