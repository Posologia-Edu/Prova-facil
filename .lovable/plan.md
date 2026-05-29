## Visão geral

Hoje "Turma" = disciplina + 1 semestre. Vamos transformar **Turma** numa **Disciplina** que contém vários **Semestres**, cada um com seus próprios alunos, provas, pacientes virtuais, simulações etc. Além disso, adicionar **Professores**, **Documentos** e **Cronograma de Aulas** (com templates) por semestre.

## Nova estrutura de dados

```text
Turma (disciplina)
├── Professores                  (nome, email, função)
├── Documentos                   (calendário, regulamento, ementa...)
└── Semestres (2025.2, 2026.1, ...)
    ├── Alunos
    ├── Provas / VPs / SOAP / Simulações  (vinculados a este semestre)
    └── Cronograma de aulas
        └── Aula (data, tipo, template preenchido, anotações)
```

## 1. Mudanças no banco

**Novas tabelas:**
- `class_semesters` — `class_id`, `label` (ex: "2026.1"), `start_date`, `end_date`, `is_active`, `order_index`
- `class_teachers` — `class_id`, `name`, `email`, `role` (titular / auxiliar / monitor / convidado), `order_index`
- `class_documents` — `class_id`, `title`, `category` (calendário / regulamento / ementa / outro), `file_url` (storage) ou `link_url`, `description`
- `class_schedule_items` — `semester_id`, `lesson_date`, `title`, `lesson_type` (theoretical / practical / simulation / seminar / case / other), `template_id` (nullable), `template_data` (jsonb estruturado), `notes` (markdown livre), `status` (planejada / realizada / cancelada), `order_index`
- `class_lesson_templates` — `user_id` (null = sistema), `name`, `lesson_type`, `schema` (jsonb com campos do template), `is_system`

**Alterações em tabelas existentes:**
- `class_students`: adicionar `semester_id uuid` (FK → `class_semesters`)
- `exams`, `osce_exams`, `kfe_exams`, `sct_exams`, `sjt_exams`, `clinical_observations`, `osce_circuits`, `class_virtual_patients`: adicionar `semester_id uuid` (FK → `class_semesters`, ON DELETE SET NULL). `class_id` permanece para compatibilidade.

**Novo bucket de storage:** `class-documents` (privado, apenas dono da turma lê/escreve).

**RLS:** mesmas regras de `classes` (dono + admin). Acesso anônimo só onde já existe hoje (ex: `class_students` para fluxo de VP).

**GRANTs:** authenticated + service_role em todas as tabelas novas.

## 2. Migração automática de dados

Em uma transação:
1. Agrupar `classes` existentes por `(user_id, name)` (sem distinguir maiúsculas e sem o sufixo de semestre).
2. Para cada grupo, escolher uma turma "mestre" (a mais antiga); criar um `class_semesters` para cada turma do grupo usando o campo `semester` atual como `label`.
3. Reatribuir todas as referências (`class_students`, `exams`, `osce_exams`, `class_virtual_patients`, etc.) para `class_id = mestre.id` e `semester_id = <semestre correspondente>`.
4. Soft-deletar as turmas duplicadas (`deleted_at = now()`) — sem perder histórico.
5. Para turmas que não casam em nenhum grupo, criar 1 semestre default com o `semester` atual.

Pré-visualização: a migração emite `RAISE NOTICE` com a contagem de turmas agrupadas e linhas remapeadas para conferência.

## 3. Templates de aula (seed inicial)

Templates `is_system = true` criados na migração, todos editáveis pelo professor (que cria uma cópia ao customizar):

- **Aula teórica**: objetivos de aprendizagem, conteúdo programático, metodologia, recursos, bibliografia, avaliação formativa, anotações pós-aula.
- **Aula prática**: objetivos, materiais/equipamentos, roteiro de atividades, normas de segurança, produto esperado, avaliação, anotações.
- **Simulação**: cenário clínico, briefing, objetivos, papéis dos alunos, checklist de avaliação, debriefing, anotações.
- **Seminário / caso clínico**: tema, grupos/apresentadores, roteiro do caso, critérios de avaliação, perguntas norteadoras, anotações.
- **Avaliação**: tipo de prova, conteúdos, instrumento, peso, observações.
- **Outro / livre**: apenas título + anotações em markdown.

Cada template define um JSON-schema simples (campos `text`, `textarea`, `list`, `date`) usado por um `LessonTemplateRenderer` reaproveitando o padrão de `FormRenderer`.

## 4. Mudanças de UI

**`src/pages/Classes.tsx`** — listagem passa a mostrar a Turma como disciplina (sem semestre no card), com badge "N semestres" e "N alunos totais".

**`src/pages/ClassDetail.tsx` (novo)** — página da turma com tabs:
- **Semestres** — lista; criar/editar/arquivar semestres; ao abrir um semestre vai para `ClassSemesterDetail`.
- **Professores** — CRUD simples (nome, email, função).
- **Documentos** — upload/link + categoria + download.
- **Configurações** — renomear, descrição, excluir.

**`src/pages/ClassSemesterDetail.tsx` (novo)** — tabs internas:
- **Alunos** — herda UI atual de alunos de turma.
- **Provas & atividades** — lista filtrada por `semester_id` (provas, OSCE, KFE, SCT, SJT, SOAP, simulações, VPs).
- **Cronograma** — tabela de aulas (data, título, tipo, status) + botão "Nova aula" abre dialog com seletor de template; ao abrir uma aula mostra o template estruturado + área de anotações em markdown com autosave (reaproveita `use-form-draft`).
- **Pacientes virtuais** — herda UI atual filtrada por semestre.

**`src/components/classes/LessonDialog.tsx` (novo)** — escolhe template → renderiza campos → salva.
**`src/components/classes/LessonTemplateManager.tsx` (novo)** — duplicar template do sistema e editar campos.

**`AppSidebar`** — link "Turmas" inalterado; novas rotas `/classes/:classId` e `/classes/:classId/semesters/:semesterId`.

## 5. Compatibilidade com módulos existentes

Onde hoje a UI pergunta "turma" (SOAP, simulação, exames, VP, observação clínica), passa a perguntar "turma → semestre". O `class_id` continua sendo gravado (para não quebrar relatórios/queries antigas), e adicionamos `semester_id`. Filtros nas telas de controle e relatórios passam a usar `semester_id` quando presente, caindo em `class_id` quando ausente (turmas legadas pré-migração).

## 6. Memória do projeto

Atualizar `mem://features/class-management` para refletir a nova hierarquia Turma → Semestre, professores, documentos e cronograma com templates.

## Detalhes técnicos

- **Storage**: bucket privado `class-documents`, paths `<user_id>/<class_id>/<uuid>.<ext>`; download via signed URL (60 min).
- **Templates JSON**: shape `{ sections: [{ id, label, fields: [{ id, label, type, placeholder }] }] }`. `template_data` segue o mesmo padrão `{ fieldId: value }` já usado em `FormRenderer`.
- **Autosave de aula**: `draft_key = "lesson:<semester_id>:<lesson_id>"` reaproveitando o hook existente `use-form-draft`.
- **Customização de template**: ao editar um template `is_system`, é criada uma cópia com `user_id = auth.uid()` e `is_system = false` (sistema permanece imutável para outros usuários).
- **Migração 1 (estrutura)** e **migração 2 (data move)** ficam em arquivos separados para facilitar rollback. A migração 2 roda dentro de um bloco `DO $$ ... $$` com `RAISE NOTICE` de auditoria.
- **Sem mudanças destrutivas**: nenhuma coluna existente é removida; `classes.semester` continua existindo (apenas deixa de ser usada na UI nova).
