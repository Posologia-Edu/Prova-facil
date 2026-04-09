

## Plano: Modo Solo com Atribuição Manual na Anamnese

### Contexto
Na anamnese (`SimulationJoin.tsx`), o professor forma duplas e o sistema distribui automaticamente os papéis (profissional, paciente, observador) via `generateRounds`. No modo solo (reposição), o professor precisa escolher manualmente quem assume cada papel.

### Mudanças

#### 1. Toggle "Modo Solo" na UI de Pareamento (`SimulationJoin.tsx`)

Na seção `shouldShowPairingUI` (professor formando duplas, linhas ~974-1091):

- Adicionar um **Switch/Toggle** no topo: "Modo Normal" ↔ "Modo Solo"
- Estado local `soloMode` (boolean)

**Modo Normal** (como é hoje):
- Professor seleciona 2 alunos → forma dupla → distribui automaticamente

**Modo Solo** (novo):
- Exibir 3 selects (dropdowns) com a lista de alunos da sala:
  - **Profissional Simulado** (será avaliado)
  - **Paciente Simulado** (receberá o roteiro)
  - **Observador** (receberá formulário do observador)
- Opcional: select de **Caso Clínico** (se houver mais de 1 caso cadastrado)
- Botão "Visualizar Distribuição" → gera preview de 1 rodada (1 ciclo) com os 3 papéis manuais
- Botão "Confirmar" → salva no banco como hoje

#### 2. Geração de Rodada Manual

Em vez de chamar `generateRounds()`, no modo solo o sistema monta diretamente o array `localRounds` com **1 única rodada** contendo as 3 assignments escolhidas pelo professor:

```text
localRounds = [{
  roundNumber: 1,
  cycle: 1,
  assignments: [
    { participantId: profId, role: "professional", pairIndex: 0 },
    { participantId: patientId, role: "patient", pairIndex: 0, caseIndex },
    { participantId: observerId, role: "observer", pairIndex: 1 },
  ]
}]
```

A gravação no banco (`generateRoundsForRoom`) já funciona com qualquer formato de `localRounds`, então **não precisa mudar**.

#### 3. Materiais no Modo Solo

A distribuição de materiais no Join page já funciona por `assignment.assigned_role`:
- Profissional → vê formulário de anamnese
- Paciente → vê roteiro do caso clínico (via `case_index`)
- Observador → vê formulário do observador
- Professor → vê formulário do professor

Como os assignments serão gravados normalmente, **o fluxo de materiais não precisa de alteração**.

#### 4. Editor (`SimulationEditor.tsx`)

- Adicionar botão "Marcar como Individual" (como já existe nos outros editores) para consistência, mas o controle principal do modo solo será na sala do professor (`SimulationJoin.tsx`)

### Arquivos Alterados

| Arquivo | Mudança |
|---|---|
| `SimulationJoin.tsx` | Toggle modo solo + 3 selects de papéis + geração manual de 1 rodada |
| `SimulationEditor.tsx` | Botão "Marcar como Individual" (consistência com outros editores) |

### O que NÃO muda
- Fluxo de materiais (já baseado em `assigned_role`)
- Formulários (professor_eval, observer_eval, anamnesis, patient_script)
- Gravação de rodadas no banco (`generateRoundsForRoom`)
- Timer, submissão, correção

