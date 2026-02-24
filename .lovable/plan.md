

# Auditoria de UX e Plano de Melhorias -- ProvaFacil

## Resumo da Analise

Apos revisar todos os fluxos do sistema (landing page, autenticacao, dashboard, banco de questoes, compositor, provas, turmas, portal do aluno, configuracoes, analytics), identifiquei problemas significativos de experiencia do usuario, especialmente no onboarding e na navegacao entre funcionalidades.

---

## Problemas Identificados

### 1. Onboarding Inexistente
**Gravidade: Alta**

Apos o cadastro e aprovacao, o professor cai diretamente no Dashboard com todos os contadores zerados ("0 questoes", "0 provas", "0 turmas") e nenhuma orientacao sobre o que fazer primeiro. Nao ha tour guiado, wizard de boas-vindas ou dicas contextuais.

### 2. Dashboard com Dados Estaticos (Hardcoded)
**Gravidade: Alta**

O Dashboard mostra valores fixos `"0"` para todas as metricas. Nao ha consulta real ao banco de dados -- os stats sao hardcoded. O professor nunca vera dados reais ali, tornando a pagina inutil.

### 3. Aprovacao Manual Bloqueia Completamente
**Gravidade: Media**

O campo `is_approved` no perfil comeca como `false`. Novos professores ficam bloqueados na tela "Aguardando Aprovacao" sem nenhuma estimativa de tempo, sem opcao de contato com o admin e sem feedback visual de progresso. Isso causa abandono.

### 4. Link "Ver todas" no Dashboard Aponta para Compositor
**Gravidade: Baixa**

O botao "Ver todas" das provas recentes no Dashboard leva a `/composer` em vez de `/exams`, que e a lista real de provas.

### 5. Pagina de Settings sem Padding
**Gravidade: Baixa**

A pagina Settings nao tem `p-6` no container raiz, diferente de todas as outras paginas, causando o conteudo colado nas bordas.

### 6. Portal do Aluno sem Internacionalizacao
**Gravidade: Media**

A pagina `StudentAuth` tem todos os textos hardcoded em portugues, enquanto o restante do sistema suporta PT/EN/ES via i18n.

### 7. Sidebar com Muitos Itens sem Agrupamento
**Gravidade: Baixa**

A sidebar lista 10 itens de navegacao sem agrupamento logico (ex: "Lixeira" ao lado de "Marketplace"), dificultando a localizacao rapida das funcionalidades.

---

## Plano de Melhorias

### Tarefa 1: Dashboard Dinamico com Dados Reais
**Arquivos:** `src/pages/Dashboard.tsx`

- Substituir os valores hardcoded por consultas reais ao banco:
  - Total de questoes: `SELECT count(*) FROM question_bank WHERE user_id = ? AND deleted_at IS NULL`
  - Provas criadas: `SELECT count(*) FROM exams WHERE user_id = ? AND deleted_at IS NULL`
  - Turmas ativas: `SELECT count(*) FROM classes WHERE user_id = ? AND deleted_at IS NULL`
  - Dificuldade media: calcular a partir do `question_bank`
- Listar as 5 provas mais recentes do usuario com dados reais
- Corrigir o link "Ver todas" para apontar para `/exams`

### Tarefa 2: Onboarding Guiado para Novos Professores
**Arquivos:** Novo `src/components/OnboardingWizard.tsx`, editar `src/pages/Dashboard.tsx`

- Criar um componente de boas-vindas que aparece na primeira visita (verificando se o usuario tem 0 questoes e 0 provas)
- Exibir um checklist interativo com os passos iniciais:
  1. "Crie sua primeira turma"
  2. "Adicione questoes ao banco"
  3. "Monte sua primeira prova"
  4. "Publique a prova online"
- Cada item do checklist sera um link para a respectiva pagina
- O checklist se auto-esconde quando o professor completa os primeiros passos

### Tarefa 3: Melhorar a Tela de "Aguardando Aprovacao"
**Arquivos:** `src/components/ProtectedRoute.tsx`

- Adicionar uma mensagem mais acolhedora e estimativa de tempo
- Incluir botao de contato com administrador (link para `/contato`)
- Adicionar animacao sutil (pulse no icone) para indicar que o processo esta em andamento
- Exibir o email do usuario logado para confirmar que a conta correta esta sendo usada

### Tarefa 4: Internacionalizar o Portal do Aluno
**Arquivos:** `src/pages/StudentAuth.tsx`, `src/i18n/translations.ts`

- Adicionar chaves de traducao para todos os textos hardcoded do StudentAuth:
  - "Portal do Aluno", "E-mail cadastrado", "PIN da prova", "Acessar Prova", "Voltar ao inicio", etc.
- Utilizar o hook `useLanguage()` no componente

### Tarefa 5: Ajustar Layout e Navegacao
**Arquivos:** `src/components/AppSidebar.tsx`, `src/pages/Settings.tsx`

- Agrupar itens da sidebar em categorias logicas:
  - **Principal:** Dashboard
  - **Conteudo:** Banco de Questoes, Compositor, Minhas Provas
  - **Gestao:** Turmas, Calendario, Analytics
  - **Outros:** Marketplace, Planos, Lixeira
- Adicionar `p-6` ao container raiz da pagina Settings
- Mover "Lixeira" para o footer da sidebar (junto com Configuracoes e Sair)

### Tarefa 6: Empty States Informativos
**Arquivos:** `src/pages/Questions.tsx`, `src/pages/Exams.tsx`, `src/pages/Classes.tsx`

- Melhorar os empty states com ilustracoes/icones maiores e CTAs claros
- Em Questoes vazio: "Comece criando questoes com IA ou manualmente" + botoes de acao
- Em Provas vazio: "Use o Compositor para montar sua primeira prova" + botao direto
- Em Turmas vazio: "Cadastre sua primeira turma para vincular alunos" + botao de criar

---

## Detalhes Tecnicos

### Consultas do Dashboard Dinamico

```typescript
// Em Dashboard.tsx - useEffect para carregar dados reais
const loadStats = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const [questionsRes, examsRes, classesRes] = await Promise.all([
    supabase.from("question_bank").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).is("deleted_at", null),
    supabase.from("exams").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).is("deleted_at", null),
    supabase.from("classes").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).is("deleted_at", null),
  ]);
  // Atualizar stats com contagens reais
};
```

### Logica de Onboarding

```typescript
// Exibir wizard se isNewUser = true
const isNewUser = stats.questions === 0 && stats.exams === 0 && stats.classes === 0;
```

### Estrutura da Sidebar Agrupada

```text
[Principal]
  - Dashboard

[Conteudo]
  - Banco de Questoes
  - Compositor
  - Minhas Provas

[Gestao]
  - Turmas
  - Calendario
  - Analytics
  - Marketplace

[Rodape]
  - Planos
  - Lixeira
  - Configuracoes
  - Admin (se admin)
  - Sair
```

### Sequencia de Implementacao

1. Dashboard dinamico (impacto imediato, base para onboarding)
2. Onboarding wizard (depende do dashboard dinamico)
3. Tela de aprovacao melhorada (independente)
4. Sidebar agrupada + Settings padding (independente)
5. Internacionalizacao do portal do aluno (independente)
6. Empty states (independente)

