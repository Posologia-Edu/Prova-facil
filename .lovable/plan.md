

## Problema Identificado

Analisei o código do `SimulationAggregator.tsx` e identifiquei a raiz dos dois problemas:

### Problema 1: Dados idênticos em todos os módulos
Na aba "Por Sala", linhas 577-583, cada sala (independente do módulo) busca as notas do `globalScoreMap`, que consolida TODOS os módulos. Ou seja, uma sala de Anamnese mostra as mesmas colunas (Anamnese, SOAP, Reconciliação, Documentação) com os mesmos dados globais. A informação não é filtrada pelo módulo da sala.

### Problema 2: Sem organização por turma/semestre
Todas as salas de todos os períodos aparecem numa lista única, sem agrupamento.

---

## Plano de Solução

### 1. Reestruturar a aba "Por Sala" — mostrar apenas a nota do módulo

Cada card de sala dentro de um módulo mostrará apenas uma coluna de nota (a do próprio módulo), em vez de repetir as 4 colunas. Por exemplo, uma sala de Anamnese mostrará apenas: **Aluno | Nota | Status**.

Isso elimina a redundância e dá sentido à separação por módulo.

### 2. Reestruturar a aba "Consolidado" — agrupar por turma

Extrair o nome da turma do título da sala (padrão detectado: "T8 - Prof. Sergio"). O sistema irá:
- Identificar turmas automaticamente pelo prefixo do título (ex: "T8", "T3")
- Adicionar um **dropdown seletor de turma** no topo da aba Consolidado
- Ao selecionar uma turma, mostrar apenas os alunos daquela turma com as 4 colunas de módulo + média
- Incluir opção "Todas as turmas" para visão geral

### 3. Adicionar filtro por semestre/período

Adicionar um **seletor de semestre** (ex: "2025.1", "2025.2") baseado na data de criação das salas, permitindo ao professor isolar rapidamente os dados do período atual.

---

## Estrutura Visual Proposta

```text
┌─────────────────────────────────────────────────┐
│ Agregador de Notas                              │
│ [Semestre: 2025.1 ▼]  [Turma: T8 ▼]            │
│                                                 │
│ [Por Sala]  [Consolidado]                       │
├─────────────────────────────────────────────────┤
│ ABA "POR SALA":                                 │
│                                                 │
│ 📋 Anamnese                                     │
│ ┌─ T8 - Prof. Sergio ──── [Concluída] ─┐       │
│ │ Aluno              │ Nota             │       │
│ │ Ayala Rhuany        │ 6.0             │       │
│ │ Mackson Emiliano    │ 8.0             │       │
│ └───────────────────────────────────────┘       │
│                                                 │
│ 📝 SOAP                                         │
│ ┌─ T8 - Prof. Sérgio ─── [Concluída] ──┐       │
│ │ Aluno              │ Nota             │       │
│ │ Ayala Rhuany        │ 9.0             │       │
│ └───────────────────────────────────────┘       │
├─────────────────────────────────────────────────┤
│ ABA "CONSOLIDADO":                              │
│ Turma: T8 - Prof. Sergio                        │
│ ┌──────────────────────────────────────────────┐│
│ │Aluno    │Anam│SOAP│Recon│Doc │Média         ││
│ │Ayala    │ 6  │ 9  │ —   │ —  │ 7.5          ││
│ │Mackson  │ 8  │ 8  │ —   │ —  │ 8.0          ││
│ └──────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

---

## Detalhes Técnicos

**Arquivo**: `src/pages/SimulationAggregator.tsx`

1. **Aba "Por Sala"** (linhas 538-614): Remover as colunas globais (Anamnese/SOAP/Reconciliação/Documentação) de cada card de sala. Cada card mostrará apenas `Aluno | Nota do módulo`. Usar `s.score` diretamente em vez do `globalScoreMap`.

2. **Extração de turma**: Criar função `extractTurma(title: string)` que identifica o prefixo da turma (regex: `/^(T\d+|Turma\s*\d+)/i`). Salas com mesmo prefixo pertencem à mesma turma.

3. **Filtro de semestre**: Derivar o semestre da data de criação da sala (buscar `created_at` nas queries). Agrupar por `YYYY.S` (1 para jan-jun, 2 para jul-dez).

4. **State**: Adicionar `selectedTurma` e `selectedSemester` como estados controlados por `Select` dropdowns.

5. **Consolidado**: Filtrar o mapa de scores pela turma/semestre selecionado antes de renderizar a tabela.

6. **Queries**: Adicionar `created_at` ao `.select()` das 4 queries de rooms para permitir a filtragem por semestre.

