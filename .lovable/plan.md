## Plano: Evolução do módulo "Turmas"

Objetivo: elevar a experiência de gestão de turmas/avaliação ao nível das melhores plataformas (Google Classroom, Canvas LMS, Moodle, Schoology, Notion for Education), mantendo a identidade visual navy/gold + glassmorphism do sistema.

Escopo: apenas o módulo Turmas (`/classes`, `/classes/:id`) e seus componentes auxiliares. Não toca em Simulação, SOAP, Juri, VPs (apenas vínculos já existentes).

---

### 1. Hub de Turmas (`Classes.tsx`) — estética

Hoje: lista plana de cards com botões soltos. Misto de modos (exam vs vp) confunde.

Mudanças:
- **Header com KPIs**: total de disciplinas, semestres ativos, alunos matriculados, avaliações em andamento, próximas aulas (próximos 7 dias).
- **Agrupamento por Disciplina → Semestre** já existe em backend; trazer essa hierarquia para a listagem (cards de disciplina expansíveis mostrando semestres como sub-itens com mini-badge "ativo").
- **Cards redesenhados** estilo Canvas/Notion: thumbnail/ícone colorido por disciplina (gerado a partir do nome), barra de progresso do semestre (datas), contagem de alunos/aulas/avaliações, último acesso.
- **Filtros e busca**: pill bar (Todas / Ativas / Arquivadas / Este semestre) + busca por nome ou aluno.
- **View toggle**: Cards / Tabela / Calendário acadêmico (visão global de cronogramas).
- **Quick actions** em hover: abrir, adicionar aluno, criar aula, gerar PIN.

### 2. Página de Detalhe da Turma (`ClassDetail.tsx`)

Hoje: 4 abas planas (Semestres, Cronograma, Professores, Documentos). Sem visão geral.

Mudanças:
- **Hero da disciplina**: gradiente navy/gold, nome, semestre ativo em destaque, breadcrumbs Disciplina ▸ Semestre, switch rápido de semestre no topo (sempre visível).
- **Nova aba Overview (default)**: dashboard do semestre — próximas aulas (timeline), entregas/avaliações pendentes, presença média, distribuição de notas, atividade recente.
- **Reorganização de abas**: Overview · Cronograma · Alunos · Avaliações · Professores · Materiais · Notas.
- **Aba Alunos**: tabela rica (foto inicial, nome, matrícula, e-mail, presença %, média geral, último envio, status), import CSV com preview, mover entre semestres, ações em lote.
- **Aba Avaliações**: consolidação de provas, VPs, simulações vinculadas, com filtros por tipo e status.
- **Aba Notas (novo)**: gradebook estilo Canvas — linhas = alunos, colunas = atividades do semestre (provas, VPs, simulações, seminários), célula colorida por nota, média ponderada configurável, export CSV/PDF.
- **Aba Materiais**: documentos com preview inline (PDF), categorias com ícones, drag-and-drop de upload.

### 3. Cronograma da disciplina

Hoje: tabela simples com badges coloridos por tipo. Aulas tem rubrica só p/ seminário.

Mudanças:
- **3 visualizações**: Lista (atual, melhorada), **Timeline vertical** estilo Linear/Notion (mês ▸ semana ▸ dia, dot colorido por tipo) e **Calendário mensal** com pílulas coloridas.
- **Filtros**: por tipo, por status, intervalo de datas.
- **Lesson Card aprimorado**: contadores ("3 anexos · 12 anotações · 1 avaliação"), botão "Marcar como realizada", "Duplicar para próxima semana".
- **Drag-and-drop** para reordenar e mover entre datas.
- **Notas por aula** (anotações pós-aula com timestamp, fotos, áudio curto).
- **Templates reutilizáveis**: salvar uma aula como template pessoal/compartilhado.
- **Sincronização opcional**: export ICS para Google Calendar.

### 4. Avaliações & rubricas

- Rubricas reutilizáveis ao nível da disciplina (não só dentro de uma aula).
- Biblioteca de rubricas com clone/import.
- Para cada avaliação: configurar peso na média do semestre.
- Feedback do aluno (visualização do aluno futura — apenas estrutura por enquanto).

### 5. Comunicação & engajamento

- **Mural da turma** (Stream estilo Classroom): avisos do professor, anexos, alunos veem read-only (já protegido por PIN/email).
- **Anotações compartilhadas entre professores** da mesma disciplina.

### 6. Gestão de presença

- Tabela rápida por aula: marcar presença em massa, justificativas, geração automática de % por aluno alimentando o gradebook.

### 7. Documentos

- Categorias com ícones distintos, preview inline para PDF/imagem, busca, versão/data, marcar como "obrigatório".

### 8. Identidade visual & micro-interações

- Tokens: usar `--primary` navy e `--accent` gold já existentes; novo gradient `--gradient-class-hero`.
- Glassmorphism nos cards do hub (já é o padrão do projeto).
- Skeletons reais por seção (substituir spinner único).
- Empty states ilustrados (SVG inline) com CTA claro.
- Toasts e confirmações padronizadas.
- Atalhos de teclado (g+t = turmas, n = nova aula).
- 100% responsivo mobile (cronograma vira lista, gradebook vira cards por aluno).

---

### Implementação por fases

**Fase 1 — Estética e navegação (sem backend novo)**
- Redesign do hub `Classes.tsx` com KPIs, agrupamento, filtros, view toggle.
- Redesign do `ClassDetail.tsx`: hero, switch de semestre, reorganização de abas, aba Overview com widgets a partir de dados existentes.
- Lesson timeline e calendário no cronograma.
- Skeletons, empty states, micro-interações.

**Fase 2 — Gradebook e presença**
- Migration: `class_grade_columns` (peso, tipo, vínculo opcional a exam/vp/simulation/seminar) e `class_attendance` (lesson_id, student_id, status, justification).
- Aba Notas (gradebook) com cálculo de média ponderada e export.
- UI de presença por aula.

**Fase 3 — Comunicação e biblioteca de rubricas**
- Migration: `class_announcements` e `class_rubrics` (rubricas reutilizáveis).
- Mural na aba Overview.
- Picker de rubrica ao criar/editar aulas e avaliações.

**Fase 4 — Polimento**
- Export ICS, drag-and-drop avançado, atalhos, otimizações mobile.

---

### Detalhes técnicos (para referência)

- Reaproveitar `Tabs`, `Card`, `Badge`, `Table` do design system; nenhum import externo novo.
- Calendário: usar `react-day-picker` já presente (`components/ui/calendar`).
- Timeline: implementada com flex + connector lines (sem libs).
- Gradebook: tabela virtualizada com `@tanstack/react-virtual` apenas se >200 linhas (avaliar na fase 2).
- Cores por tipo de aula: reusar `src/lib/lesson-type-style.ts`; estender para presença/avaliação.
- Manter RLS atual; novas tabelas seguem padrão `user_id` do dono da turma + GRANTs explícitos.

---

Posso começar pela **Fase 1** (puramente visual/estrutural, sem migrations) ou prefere que eu inclua a **Fase 2 (gradebook + presença)** já no primeiro ciclo?