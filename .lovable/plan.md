

# Fase 1: Enfermagem Clínica — Plano de Implementação

## Visão Geral

Criar uma nova área **"Enfermagem Clínica"** na Simulação Realística com 4 módulos: **Acolhimento**, **SAE (Sistematização da Assistência)**, **Evolução** e **Passagem de Plantão**, além de um **Agregador de Notas** próprio.

**Abordagem híbrida**: tabelas genéricas compartilhadas (`nursing_*`) + páginas dedicadas por módulo.

---

## Arquitetura do Banco de Dados

Criar 5 tabelas genéricas com um campo `module_type` para diferenciar os 4 módulos:

```text
nursing_rooms          (module_type: acolhimento | sae | evolucao | passagem_plantao)
nursing_participants   (room_id → nursing_rooms)
nursing_forms          (room_id → nursing_rooms, form_type flexível)
nursing_clinical_cases (room_id → nursing_rooms)
nursing_responses      (room_id → nursing_rooms, form_id, clinical_case_id)
```

Estrutura idêntica às tabelas de documentação/reconciliação, com adição de `module_type text NOT NULL` em `nursing_rooms`. RLS seguindo o mesmo padrão existente (admin, owner, anon select/insert/update).

---

## Páginas e Rotas

### Dashboard Principal
- **`NursingSimulations.tsx`** — Hub centralizado (mesma estrutura de `Simulations.tsx`) com cards dos 4 módulos + agregador, e abas para listar salas de cada módulo.

### Por Módulo (4x, cada um com suas páginas)
- **`NursingEditor.tsx`** — Editor genérico que adapta labels/formulários conforme `module_type`
- **`NursingControl.tsx`** — Painel de controle genérico (espelhos, notas, concluir sala)
- **`NursingJoin.tsx`** — Portal do aluno genérico (redirect 15s após envio)
- **`NursingRooms.tsx`** — Listagem de salas por módulo (reutilizável via prop/param)

### Agregador
- **`NursingAggregator.tsx`** — Notas consolidadas dos 4 módulos

### Rotas no App.tsx
```text
/nursing                              → NursingSimulations (hub)
/nursing/:moduleType                  → NursingRooms (listagem filtrada)
/nursing/:moduleType/editor/:roomId   → NursingEditor
/nursing/:moduleType/control/:roomId  → NursingControl
/nursing/aggregator                   → NursingAggregator
/nursing/join                         → NursingJoin (público, sem auth)
```

---

## Navegação

Adicionar no **AppSidebar.tsx** um item "Enfermagem Clínica" com ícone `Heart` (ou similar), apontando para `/nursing`.

---

## Edge Function

- **`grade-nursing`** — Correção por IA, seguindo o padrão de `grade-documentation` e `grade-reconciliation`, com adaptação de prompt por `module_type`.

---

## Módulos e seus Formulários Padrão

| Módulo | Formulários | Descrição |
|--------|------------|-----------|
| **Acolhimento** | Ficha de Acolhimento | Coleta de dados do paciente, queixa principal, sinais vitais, classificação de risco |
| **SAE** | Histórico, Diagnóstico, Planejamento, Implementação, Avaliação | 5 etapas do processo de enfermagem |
| **Evolução** | Evolução de Enfermagem | Registro cronológico da evolução do paciente (SOAP adaptado para enfermagem) |
| **Passagem de Plantão** | Ficha SBAR | Situação, Background, Avaliação, Recomendação |

---

## Etapas de Implementação

1. **Migração SQL** — Criar as 5 tabelas `nursing_*` com RLS
2. **Hub + Listagem** — `NursingSimulations.tsx` (dashboard com cards e abas)
3. **Editor genérico** — `NursingEditor.tsx` (participantes, formulários, casos clínicos, espelhos)
4. **Controle genérico** — `NursingControl.tsx` (respostas, espelhos collapsible, notas, concluir)
5. **Portal do aluno** — `NursingJoin.tsx` (acesso por PIN, formulário, redirect 15s)
6. **Edge Function** — `grade-nursing` para correção automatizada
7. **Agregador** — `NursingAggregator.tsx` com notas dos 4 módulos
8. **Rotas + Sidebar** — Integrar tudo no `App.tsx` e `AppSidebar.tsx`
9. **Duplicação** — Lógica de duplicação completa nas listagens

---

## Detalhes Técnicos

- O campo `module_type` permite queries filtradas (ex: `.eq("module_type", "sae")`) sem criar tabelas separadas
- Cada página genérica recebe o `moduleType` via `useParams()` e adapta labels, ícones e prompts de IA
- O padrão de `case_answers` (espelhos por caso) será replicado do módulo de Documentação
- Formulários pré-configurados por módulo serão criados automaticamente ao criar uma sala (template por `module_type`)

