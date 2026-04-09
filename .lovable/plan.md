

## Plano: Suporte a Alunos Individuais (Solo) na Simulação Realística

### Problema
Quando um aluno falta, seu par fica impossibilitado de participar porque o sistema exige duplas completas (pair_position A + B). Precisamos permitir que alunos façam atividades individualmente.

### Mudanças Necessárias

#### 1. Editores — Permitir "Solo" além de "Dupla"

**Arquivos**: Todos os 9 editores (`SimulationEditor`, `SoapEditor`, `ReconciliationEditor`, `DocumentationEditor`, `NursingEditor`, `MedicineEditor`, `DentistryEditor`, `NutritionEditor`, `PhysiotherapyEditor`, `BiomedicineEditor`)

- Adicionar botão **"Marcar como Individual"** na seção de alunos sem dupla, ao lado do botão "Formar Dupla"
- Ao marcar como individual: `pair_index` recebe o próximo índice disponível, `pair_position` = `"S"` (solo)
- O aluno individual aparece na lista de "duplas" com badge "Individual" em vez de "Dupla X"
- Permitir desfazer (voltar para sem dupla), assim como já funciona para duplas

#### 2. Distribuição de Rodadas — Tratar Solo

**Arquivo**: `src/lib/simulation-distribution.ts`

- `generateRounds`: pares com apenas 1 membro (solo) geram rodadas onde o aluno assume papel de "professional" e o papel de "patient" é omitido (ou virtual)
- No Ciclo 2, o aluno solo mantém papel de "professional" (sem inversão, pois não há parceiro)
- Observadores continuam atribuídos normalmente via rotação circular

#### 3. Portais do Aluno (Join) — Adaptar para Solo

**Arquivos**: Todos os 10 `*Join.tsx`

- Quando `pair_position === "S"`, não buscar parceiro
- Exibir "Individual" em vez de "Dupla X" no cabeçalho
- No SOAP: aluno solo pula a etapa de avaliação entre pares (peer evaluation) e vai direto para "done"
- Caso clínico atribuído normalmente via `pair_index % cases.length`

#### 4. Painéis de Controle — Exibir Solo

**Arquivos**: Todos os `*Control.tsx`

- Exibir alunos individuais com badge diferenciado na lista de participantes
- Na correção, respostas de alunos solo aparecem normalmente (por `pair_index`)
- Auto-pareamento rápido: ao clicar "Parear Automaticamente", alunos que sobram (número ímpar) são automaticamente marcados como solo

#### 5. Materiais e Papéis — Função getStudyRole

**Arquivo**: `src/lib/simulation-materials.ts`

- `getStudyRole`: se `pairPosition === "S"`, retornar `"professional"` em ambos os ciclos (aluno solo sempre estuda como profissional)

### Resumo Técnico

| Componente | Mudança |
|---|---|
| Editores (9 arquivos) | Botão "Individual" + badge "Solo" |
| `simulation-distribution.ts` | Tratar pares de 1 membro |
| `simulation-materials.ts` | `getStudyRole("S")` → `"professional"` |
| Join pages (10 arquivos) | Sem parceiro + skip peer eval |
| Control pages (10 arquivos) | Badge solo + auto-pair com sobra |

Nenhuma migração de banco de dados necessária — o valor `"S"` em `pair_position` (text) funciona nas colunas existentes sem alteração de schema.

