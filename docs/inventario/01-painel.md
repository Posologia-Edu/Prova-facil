# Inventário — Painel

**Rota:** `/dashboard` (professor, `ProtectedRoute` + `AppLayout`)
**Arquivos:** `src/pages/Dashboard.tsx` (490 linhas), `src/components/OnboardingWizard.tsx` (71), `src/components/RoadmapProactiveDialog.tsx` (102)

## Estrutura da tela (de cima para baixo)

1. **Onboarding** (só usuário novo: 0 questões, 0 provas e 0 turmas): `OnboardingWizard`, 4 passos com link — criar turma (`/classes`), banco de questões (`/questions`), compor prova (`/composer`), publicar (`/exams`). Textos via i18n (`onboarding_*`).
2. **Diálogo proativo do roadmap** (`RoadmapProactiveDialog`): **só admin**; lê `system_updates` (type = `planned`); abre 1,5 s após carregar; dispensar grava `localStorage roadmap_proactive_dismissed` e só reaparece após 24 h; botões "dispensar" e link para Atualizações.
3. **Hero** em gradiente com saudação por hora (Bom dia/tarde/noite), nome (1º nome do perfil) e 4 números: Conteúdos criados, Questões no banco, Provas ativas, Alunos cadastrados.
4. **Ações rápidas** (6 botões): Nova Prova → `/composer`; Banco de Questões → `/questions`; Gerenciar Turmas → `/classes`; Nova Simulação → `/simulations`; Novo OSCE → `/osce`; Calendário → `/calendar`.
5. **Seus módulos** (10 cartões com contagem; "Começar" quando 0): Provas, OSCE, Simulações, Pac. Virtuais, SCT, KFE, Mini-CEX, SJT, Progress Test, Júri Simulado.
6. **Atividade recente** (3/5): últimas 6 entre as 3 provas, 2 simulações (**somente `medicine_rooms`**) e 2 OSCE mais recentes; cada linha = ícone, título, tipo, data relativa, badge de status; link "Ver análises" → `/analytics`.
7. **Visão geral** (2/5): barras de Provas, Simulações, OSCE, Pac. Virtuais, Questões (total da barra = max(n, 10) ou 100 para questões — escala arbitrária) + Turmas e Provas concluídas.

## Dados lidos (todos filtrados por `user_id`, `deleted_at is null` quando existe)

`profiles.full_name`; contagens de `question_bank`, `exams`, `classes`, `class_students` (via classes do usuário), `osce_exams`, 7 tabelas de salas (`medicine/nursing/reconciliation/biomedicine/dentistry/nutrition/physiotherapy_rooms`), `virtual_patients`, `sct_exams`, `kfe_exams`, `clinical_observations`, `sjt_exams`, `progress_tests`, `mock_trials`, `exam_publications` (is_active), `exams` (status = graded). **19 consultas em paralelo + 3 de atividade recente.**

## Regras de negócio / estados

- Carregando: spinner centralizado. Usuário novo: onboarding. Sem atividade: estado vazio com texto.
- Rótulos de status: draft, applied, in_progress, grading, graded, active, published, open.
- "Simulações" na atividade recente ignora as outras 6 áreas; o contador soma as 7.
- Textos em português fixo (poucos usam `t()`): saudação, títulos, rótulos — **fora do i18n**.
- Perfil: professor. Admin vê o diálogo do roadmap.

## Lacunas / observações para o redesenho

- Não mostra Pacientes Virtuais, SCT/KFE/SJT/Júri na atividade recente; não há tarefas pendentes ("provas para corrigir", pacientes sem avaliação, calendário de hoje).
- Gradiente decorativo, cores cruas por módulo (blue/emerald/rose…) e escala arbitrária nas barras: candidatos a sair com ganho.
- O contador "Conteúdos criados" soma tudo menos Questões.
- Rótulo "Pac. Virtuais" e atalhos duplicam o menu lateral/Ctrl K.

## Protótipo aprovado vs. o que existe

O protótipo do Painel simplifica: **não mostra** onboarding, diálogo do roadmap (admin) nem as 7 áreas de simulação; qualquer redesenho deve manter onboarding, roadmap-admin, os 10 módulos e os 6 atalhos (ou movê-los com concordância).
