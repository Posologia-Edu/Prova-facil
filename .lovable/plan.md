# Cronograma — 4 melhorias

## 1) Professor responsável por cada aula
Quando a turma tem vários professores, permitir escolher qual é o responsável daquela aula específica.

- Nova coluna `teacher_user_id` em `class_schedule_items` (nullable, FK para `auth.users` via SET NULL).
- No `LessonDialog`: select com os professores vinculados à turma (busca em `class_teachers` ou equivalente).
- Em `ScheduleViews` (Lista/Timeline/Calendário): mostrar nome/iniciais do professor responsável ao lado do título.

## 2) Horários semanais da disciplina (notação 2T23, 4T23, etc.)
Cadastrar a grade semanal da disciplina e preencher automaticamente o horário ao criar uma aula.

- Nova coluna `weekly_schedule` (JSONB) em `classes` — lista de slots: `{ dayOfWeek: 1-7, shift: "M"|"T"|"N", periods: [2,3] }`.
- Nova aba/seção em `ClassDetail` (ou dentro de "Visão Geral") para cadastrar os slots usando inputs amigáveis + visualização da notação (ex.: `2T23, 4T23, 5T23, 6T56`).
- Helper `src/lib/class-schedule-notation.ts` para converter entre objeto ↔ string.
- Nova coluna `time_slot` (TEXT) em `class_schedule_items` para armazenar a notação da aula (ex.: `4T23`).
- No `LessonDialog`: ao escolher uma data, sugerir automaticamente o(s) slot(s) que caem naquele dia da semana; se houver mais de um, listar para o professor escolher.

## 3) Visitas técnicas paralelas (mesma data/hora, professores diferentes)
Permitir que uma mesma aula tenha múltiplas "trilhas" simultâneas, cada uma com seu professor e grupo.

- Nova tabela `class_lesson_visits`:
  - `id`, `lesson_id` (FK → `class_schedule_items` ON DELETE CASCADE)
  - `teacher_user_id` (FK → auth.users SET NULL)
  - `title` (ex.: "Visita Hospital X")
  - `student_ids` (UUID[]) ou tabela ponte `class_lesson_visit_students`
  - `notes`
- No `LessonDialog`, para `lesson_type = 'technical_visit'` (novo tipo) ou via checkbox "Aula com visitas paralelas": gerenciar lista de visitas (adicionar/remover, atribuir professor e alunos).
- Em `ScheduleViews`: indicador "N visitas" no card/linha, expandindo para mostrar cada visita.

## 4) Feriados
Cadastrar feriados; quando uma data do cronograma coincidir, exibir o nome do feriado em vez de uma aula.

- Nova tabela `class_holidays` (por usuário e/ou por turma):
  - `id`, `user_id`, `class_id` (nullable — null = aplica a todas), `holiday_date`, `name`, `recurring_yearly` (bool).
- Nova aba "Feriados" em `ClassDetail` (ou seção em Settings) com CRUD simples + presets de feriados nacionais BR.
- Em `ScheduleViews`:
  - Lista/Timeline: linhas especiais de "Feriado — Nome" (sem ações, estilo cinza).
  - Calendário: célula marcada com badge do feriado.
- No `LessonDialog`: ao escolher uma data que é feriado, alertar e oferecer "Marcar como feriado" em vez de criar aula.

## Detalhes técnicos

- **Migrations** (uma única migração agrupada):
  - `ALTER TABLE class_schedule_items ADD COLUMN teacher_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, ADD COLUMN time_slot TEXT;`
  - `ALTER TABLE classes ADD COLUMN weekly_schedule JSONB DEFAULT '[]'::jsonb;`
  - `CREATE TABLE class_lesson_visits (...)` + GRANTs + RLS (dono da turma gerencia).
  - `CREATE TABLE class_holidays (...)` + GRANTs + RLS.
- **Frontend**:
  - `src/lib/class-schedule-notation.ts` — parse/format `2T23`.
  - `src/components/classes/WeeklyScheduleEditor.tsx` — editor da grade semanal.
  - `src/components/classes/HolidaysTab.tsx` — CRUD de feriados.
  - `src/components/classes/LessonVisitsEditor.tsx` — visitas paralelas dentro do `LessonDialog`.
  - Atualizar `LessonDialog.tsx`, `ScheduleViews.tsx`, `ClassDetail.tsx`.
- **Auto-preenchimento de horário**: no `LessonDialog`, hook que escuta `lesson_date` → calcula `dayOfWeek` → busca slots de `class.weekly_schedule` → preenche `time_slot`.

## Ordem de implementação
1. Migração do banco (tudo junto).
2. Helpers de notação + editor da grade semanal (feature 2).
3. Coluna professor responsável no `LessonDialog` + exibição (feature 1).
4. Tab de feriados + integração com cronograma (feature 4).
5. Visitas paralelas (feature 3).

Confirma este plano para eu iniciar pela migração?
