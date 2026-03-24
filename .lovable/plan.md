

# Sistema de Help Contextual por Módulo Avaliativo

## Visão Geral

Criar um componente de **guia interativo contextual** que aparece proativamente na primeira vez que o professor acessa cada sistema avaliativo, com passo-a-passo prático e dicas de uso. O professor pode desligá-lo a qualquer momento, e reativá-lo quando quiser.

---

## Componente: `ModuleHelpGuide`

Um componente reutilizável que recebe o identificador do módulo e exibe um painel lateral/card collapsible com:

- **Steps numerados** do fluxo de uso (ex: "1. Crie uma estação → 2. Configure o checklist → 3. Ative o circuito...")
- **Dicas práticas** (ícone de lâmpada) contextuais por etapa
- **Botão "Não mostrar novamente"** que persiste a preferência no `localStorage`
- **Botão de reativação** (ícone `HelpCircle`) no header de cada página, sempre visível

### Comportamento proativo
- Na primeira visita a cada módulo, o guia aparece **aberto automaticamente**
- Após o professor clicar "Entendi" ou "Não mostrar novamente", fica fechado
- Persiste por módulo no `localStorage` (chave: `help_dismissed_{moduleKey}`)

---

## Módulos Cobertos e Conteúdo

Cada módulo terá seu próprio conjunto de steps + tips. Serão **~20 guias** cobrindo:

### Avaliações
| Módulo | Steps principais |
|--------|-----------------|
| **Provas** | Criar turma → Banco de questões → Composer → Publicar → Monitorar |
| **OSCE** | Criar exame → Estações + Checklists → Circuito → Ativar → Avaliar → Resultados |
| **SCT** | Criar exame → Cenários + Hipóteses → Painel de Especialistas → Portal do Aluno |
| **KFE** | Criar exame → Casos + Etapas → Portal do Aluno → Resultados |
| **SJT** | Criar exame → Cenários → Portal do Aluno |
| **Progress Test** | Criar teste → Questões por área → Portal do Aluno |
| **Júri Simulado** | Criar caso → Distribuir papéis → Sessão → Avaliação |
| **Mini-CEX/DOPS** | Criar observação → Avaliar aluno em tempo real |

### Simulação Realística (por área, mesmo conteúdo adaptado)
| Módulo | Steps principais |
|--------|-----------------|
| **Anamnese** | Criar sala → Formulário (ou template) → Espelho → Alunos → Ativar → Avaliar |
| **SOAP** | Criar sala → Formulário SOAP → Espelho → Duplas → Ativar → Avaliação por pares → Nota final |
| **Reconciliação** | Criar sala → Formulário → Espelho por caso → Duplas → Ativar → Concluir |
| **Documentação** | Criar sala → Formulários (encaminhamento + quadro) → Espelhos → Ativar → Concluir |
| **Módulos genéricos** (Enfermagem, Nutrição, etc.) | Criar sala → Formulário (ou template) → Espelho → Alunos → Ativar → Avaliar |

### Outros
| Módulo | Steps |
|--------|-------|
| **Pacientes Virtuais** | Criar paciente → Configurar perfil clínico → Compartilhar link |
| **Marketplace** | Navegar → Adquirir → Usar em turma |

---

## Arquivos

### Criar
- **`src/components/ModuleHelpGuide.tsx`** — Componente genérico (recebe `moduleKey` e `steps[]`)
- **`src/lib/help-guides.ts`** — Definição centralizada de todos os guias (steps + tips por módulo)

### Editar
- Todos os editores/páginas principais (~20 arquivos) — Inserir `<ModuleHelpGuide moduleKey="osce" />` no topo da página, e um botão `HelpCircle` no header

---

## Estrutura de Dados (runtime, sem banco)

```typescript
type HelpStep = {
  title: string;
  description: string;
  tip?: string; // dica prática
};

type ModuleGuide = {
  moduleKey: string;
  title: string;
  steps: HelpStep[];
};
```

Preferência de dismiss salva em `localStorage` — sem necessidade de tabela no banco.

---

## UX

- O guia aparece como um **card destacado** (borda colorida, fundo suave) no topo da página, acima do conteúdo principal
- Collapsible: pode ser minimizado sem desligar
- Botão "Não mostrar novamente" remove o card e salva no localStorage
- Ícone `HelpCircle` no header da página permite reabrir a qualquer momento
- Conteúdo em português, com suporte a i18n futuro

---

## Etapas de Implementação

1. Criar `help-guides.ts` com todos os guias
2. Criar `ModuleHelpGuide.tsx` com lógica de localStorage + UI collapsible
3. Integrar nas ~20 páginas principais

