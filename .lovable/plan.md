

# Implementação de 6 Funcionalidades Completas

Este é um projeto de grande porte que será implementado em fases sequenciais. Cada funcionalidade requer novas tabelas, páginas, componentes e possivelmente edge functions.

---

## Fase 1: Gamificação para Alunos

### Banco de dados
Criar tabelas:
- `student_points` — acumula pontos por ação (completar prova, nota alta, streak)
- `student_achievements` — conquistas desbloqueadas (primeira prova, nota máxima, 10 provas seguidas, etc.)
- `achievement_definitions` — catálogo de conquistas com ícone, descrição, critério
- `student_rankings` — view materializada ou query para rankings por turma

### Lógica
- Trigger ou edge function que atribui pontos ao finalizar uma sessão de prova (`exam_sessions.status = 'finished'`)
- Pontos proporcionais à nota: `(total_score / max_score) * 100`
- Bônus por streak (dias consecutivos), por velocidade, por nota perfeita
- Verificação automática de conquistas ao ganhar pontos

### UI
- Nova página `/student/gamification` com ranking da turma, pontos acumulados, conquistas
- Badges visuais no `StudentResults` mostrando conquistas desbloqueadas
- Leaderboard com top 10 por turma
- Para professor: visão do ranking em `/analytics`

---

## Fase 2: Análise de Desempenho por Competência

### Banco de dados
- `competency_definitions` — lista de competências por área (Raciocínio Clínico, Comunicação, etc.)
- `question_competencies` — liga questões a competências (N:N)
- Adicionar coluna `competency_tags` (text[]) em `question_bank` como alternativa leve

### UI
- Nova página `/competency-analysis` acessível em Gestão
- Dashboard com gráfico radar (Recharts) por aluno cruzando resultados de provas, OSCE, simulações
- Filtros por turma, período, tipo de avaliação
- Tabela detalhada: competência x nota média x tendência (melhora/piora)
- Comparativo aluno vs média da turma

### Lógica
- Consulta cruzada entre `exam_answers`, `osce_evaluations`, `*_responses` (simulações)
- Mapear respostas a competências via tags das questões ou checklists OSCE

---

## Fase 3: IA para Feedback Personalizado

### Edge Function
- Nova edge function `ai-student-feedback` que:
  1. Recebe student_email + lista de sessões/avaliações
  2. Agrega padrão de erros (quais questões errou, quais competências são fracas)
  3. Envia para Lovable AI (gemini-3-flash-preview) com prompt personalizado
  4. Retorna feedback estruturado: pontos fortes, fracos, recomendações de estudo

### Banco de dados
- `student_ai_feedbacks` — armazena feedbacks gerados com timestamp, tipo de avaliação, conteúdo JSON

### UI
- Botão "Gerar Feedback IA" na página de resultados do professor (Analytics)
- Botão no `StudentResults` para o aluno solicitar feedback
- Card expansível mostrando: resumo, áreas de melhoria, sugestões de estudo
- Histórico de feedbacks anteriores

---

## Fase 4: Relatórios PDF Avançados

### Componente
- Novo componente `AdvancedPDFReport.tsx` usando jsPDF (já existente no projeto)
- Gera PDF A4 com:
  - Cabeçalho institucional
  - Resumo estatístico (média, mediana, desvio padrão)
  - Gráfico de distribuição de notas (renderizado via canvas → imagem)
  - Tabela de desempenho por questão
  - Comparativo aluno vs turma
  - Seção de competências (se configuradas)

### Integração
- Botão "Exportar PDF" em:
  - `/analytics` (relatório geral da turma)
  - `ExamMonitoring` (relatório por prova)
  - `/osce/results` (relatório OSCE)
  - Agregadores de simulação (`*Aggregator`)
- Usa html2canvas (já instalado) para capturar gráficos Recharts como imagens no PDF

---

## Fase 5: Portfólio Digital do Aluno

### Banco de dados
- `student_portfolios` — registro central com student_email, configurações
- `portfolio_entries` — entradas do portfólio (prova, simulação, OSCE, feedback IA) com tipo, dados JSON, data

### Lógica
- Compilação automática: ao finalizar qualquer avaliação, cria entrada no portfólio
- Trigger ou lógica no frontend que agrega resultados existentes

### UI
- Nova página `/student/portfolio` com:
  - Timeline visual de todas as avaliações realizadas
  - Gráfico de evolução de notas ao longo do tempo (LineChart)
  - Seção de competências com radar chart
  - Feedbacks IA recebidos
  - Conquistas da gamificação
  - Botão para exportar portfólio como PDF
- Para professor: visão do portfólio de cada aluno via `/portfolio/:studentEmail`

---

## Fase 6: Integração com LMS

### Edge Functions
- `lms-export` — exporta dados em formatos compatíveis:
  - **Moodle**: XML (Moodle XML para questões), CSV (notas no formato Moodle Gradebook)
  - **Canvas**: CSV (Canvas gradebook format), QTI (questões)
  - **Google Classroom**: CSV de notas, integração via Google Classroom API
- `lms-import` — importa questões de:
  - Moodle XML
  - QTI (padrão IMS)
  - CSV genérico

### UI
- Nova página `/lms-integration` em Gestão
- Tabs: Exportar | Importar
- Exportar: selecionar turma/prova → escolher formato → download
- Importar: upload de arquivo → preview das questões → confirmar importação
- Suporte inicial focado em **exportação de notas** (CSV) e **importação de questões** (XML/QTI)

---

## Rotas e Navegação

Adicionar ao `App.tsx`:
- `/student/gamification` — ranking e conquistas
- `/student/portfolio` — portfólio do aluno
- `/competency-analysis` — dashboard de competências (professor)
- `/lms-integration` — integração LMS (professor)
- `/portfolio/:studentEmail` — professor visualiza portfólio

Adicionar ao sidebar (`AppSidebar.tsx`):
- "Competências" em Gestão
- "Integração LMS" em Gestão

---

## Resumo de Migrations

1. Tabelas de gamificação: `achievement_definitions`, `student_points`, `student_achievements`
2. Tabelas de competência: `competency_definitions`, `question_competencies`
3. Tabela de feedback IA: `student_ai_feedbacks`
4. Tabelas de portfólio: `student_portfolios`, `portfolio_entries`
5. RLS em todas as tabelas com políticas adequadas
6. Realtime habilitado para `student_points` e `student_rankings`

## Ordem de Implementação

Começaremos pela **Gamificação** (mais visual e impactante) e depois seguiremos sequencialmente pelas demais fases.

