## Plano: Avaliação do Júri Simulado (Jurados + Juiz + Professor)

### 1. Bug — formulários enviados não aparecem no painel "Resultados"

**Causa provável:** o painel `Resultados` (rota do professor em `MockTrials.tsx`/editor) consulta `mock_trial_responses` filtrando por sessão/caso, mas no `MockTrialJudge.tsx` os envios já chegam corretamente em tempo real (`responses-${session.id}`). O painel "Resultados" do professor não está subscrito nem busca por todos os casos do júri.

**Correção:**
- No painel "Resultados" do professor, buscar respostas de TODOS os casos do júri (`session_id IN (sessions do trial)`), não apenas da sessão ativa.
- Adicionar realtime subscription em `mock_trial_responses` filtrando pelos session_ids do júri.
- Mostrar agrupado por: Caso → Grupo → Papel (Acusação/Defesa/Júri) → Formulário enviado + nota.

---

### 2. Modelo de avaliação — três notas

Cada **grupo participante** (Acusação, Defesa) recebe nota composta:

```text
Nota Final (Acusação/Defesa) = (Nota do Juiz + Nota do Professor) / 2
Nota Final (Jurados) = Nota da IA (avaliação do formulário do júri)
```

**Critérios por avaliador:**

| Avaliador | Quem avalia | Critérios | Origem |
|---|---|---|---|
| **IA (jurados)** | Acusação e Defesa | Coerência entre o que os jurados marcaram, o que o grupo argumentou (formulário) e as evidências do processo + literatura científica | Edge function automática ao enviar formulário do júri |
| **Juiz** | Acusação e Defesa | Postura processual, respeito ao rito, clareza, condução, pertinência das objeções (visão jurídica simplificada) | Formulário curto preenchido pelo juiz no painel |
| **Professor** | Acusação e Defesa | Critérios técnico-clínicos, qualidade argumentativa, comunicação, uso correto de evidências/diretrizes | Formulário gerado automaticamente, preenchido no painel "Resultados" |

A nota da IA é **editável pelo professor** (revisão humana).

---

### 3. Mudanças no banco

**Nova tabela `mock_trial_evaluations`** (uma linha por grupo avaliado, por caso, por avaliador):

```text
id              uuid PK
session_id      uuid → mock_trial_sessions
case_id         uuid → mock_trial_cases
group_id        uuid → mock_trial_groups (grupo avaliado)
evaluated_role  text  ('prosecution' | 'defense')
evaluator_type  text  ('ai_jury' | 'judge' | 'teacher')
score           numeric(5,2)   -- 0 a 10
max_score       numeric(5,2)   -- default 10
criteria_json   jsonb          -- notas por critério
feedback        text           -- justificativa
ai_generated    boolean        -- true para ai_jury
edited_by_teacher boolean      -- marca se professor revisou nota da IA
created_at, updated_at
UNIQUE(case_id, group_id, evaluator_type)
```

RLS: dono do trial faz tudo; anon pode INSERT (juiz) com filtro pelo session_id válido.

**Novo campo em `mock_trial_forms`:** `target_role` já existe (`prosecution`/`defense`/`jury`). Adicionar dois novos valores semânticos:
- `judge_evaluation` — formulário do juiz avaliando os grupos
- `teacher_evaluation` — formulário do professor avaliando os grupos

(Ou criar tabela separada `mock_trial_evaluation_forms` — recomendado para não misturar com formulários respondidos pelos alunos.)

**Decisão:** criar tabela separada `mock_trial_evaluation_forms` com colunas: `id, mock_trial_id, evaluator_type ('judge'|'teacher'), title, fields_json, created_at`. Templates padrão são auto-criados ao gerar o júri.

---

### 4. Templates padrão dos formulários de avaliação

**Formulário do JUIZ (simplificado, ~5 critérios, escala 0–10):**
- Respeito ao rito processual
- Clareza e objetividade da argumentação
- Postura e conduta da equipe
- Uso pertinente de testemunhas
- Cumprimento do tempo

Avaliado **separadamente para Acusação e Defesa** (mesmo formulário, dois preenchimentos).

**Formulário do PROFESSOR (técnico, ~8 critérios, escala 0–10):**
- Domínio do caso clínico
- Uso de evidências científicas e diretrizes
- Raciocínio clínico
- Qualidade da argumentação técnica
- Refutação dos argumentos contrários
- Comunicação verbal
- Trabalho em equipe
- Coerência com o prontuário/processo

Também avaliado separadamente para Acusação e Defesa.

---

### 5. Avaliação automática pela IA (jurados)

**Trigger:** quando todos os grupos do júri técnico enviam o formulário (ou o juiz finaliza a fase de deliberação).

**Nova edge function:** `grade-mock-trial-jury`

Entrada: `session_id`.

Processo:
1. Carrega o caso (`process_content`, `characters_json`).
2. Carrega respostas dos jurados (`mock_trial_responses` onde `target_role='jury'`).
3. Carrega respostas dos grupos Acusação e Defesa (formulários técnicos respondidos por eles, se houver).
4. Envia para Lovable AI (`google/gemini-2.5-pro`) com tool calling estruturado.
5. Prompt instrui a IA a:
   - Comparar o veredito/críticas dos jurados com a argumentação de cada grupo.
   - Verificar coerência com as evidências do processo (prontuário, exames, depoimentos).
   - Validar contra conhecimento clínico/científico (diretrizes).
   - Atribuir nota 0–10 para Acusação e 0–10 para Defesa, com justificativa.
6. Insere/upsert em `mock_trial_evaluations` com `evaluator_type='ai_jury'`, `ai_generated=true`.

Output schema (tool):
```text
{
  prosecution: { score: number, criteria: {...}, feedback: string },
  defense:     { score: number, criteria: {...}, feedback: string }
}
```

---

### 6. UI — Painel do Juiz (`MockTrialJudge.tsx`)

Nova aba/seção **"Avaliação"** dentro do painel do juiz:
- Mostrada quando o status da sessão é `verdict` ou `finished`.
- Dois cards (Acusação / Defesa) com o formulário do juiz renderizado via `FormRenderer`.
- Botão "Salvar avaliação" → grava em `mock_trial_evaluations` com `evaluator_type='judge'`.
- Mostra status "✓ Avaliação enviada" quando concluído.

---

### 7. UI — Painel "Resultados" do Professor

Reescrita da aba **Resultados** em `MockTrials.tsx`/editor:

Para cada caso:
1. **Envios de formulários** (corrige bug):
   - Lista todas as respostas de `mock_trial_responses` agrupadas por papel (Acusação / Defesa / Júri).
   - Mostra grupo, aluno, data, e botão "Ver respostas".
2. **Avaliações por grupo** (Acusação e Defesa):
   - **Card Jurados (IA)** — score + feedback + botão "Editar nota" (abre dialog para professor revisar).
   - **Card Juiz** — score + critérios.
   - **Card Professor** — formulário inline para o professor preencher (se ainda não enviou).
3. **Nota Final consolidada:**
   - `Acusação: (Juiz + Professor) / 2` — exibido como número grande.
   - `Defesa:  (Juiz + Professor) / 2`.
   - `Jurados (IA): score` (separado, é a nota dos próprios jurados como grupo).
4. Botão "Recalcular avaliação da IA" — re-roda a edge function.
5. Botão "Exportar resultados" (futuro).

Realtime subscription em `mock_trial_responses` e `mock_trial_evaluations` filtrado pelos casos do trial.

---

### 8. Integração com competências

Ao consolidar a nota final de cada grupo, gravar em `competency_scores` para cada aluno do grupo (usando `recordRoomCompetencyScores` em `src/lib/competency-scores.ts`), com `source_type='mock_trial'` e `source_id=case_id`. Permite agregação no Portfolio do aluno.

---

### 9. Detalhes técnicos

**Arquivos a criar:**
- `supabase/migrations/<ts>_mock_trial_evaluations.sql` — tabelas + RLS + realtime.
- `supabase/functions/grade-mock-trial-jury/index.ts` — IA grading.
- `src/components/mock-trial/JudgeEvaluationPanel.tsx` — formulário do juiz.
- `src/components/mock-trial/TeacherEvaluationPanel.tsx` — formulário do professor.
- `src/components/mock-trial/EvaluationSummaryCard.tsx` — card consolidado.
- `src/lib/mock-trial-evaluation-templates.ts` — templates de critérios padrão (Juiz e Professor).

**Arquivos a editar:**
- `src/pages/MockTrialJudge.tsx` — adicionar seção de avaliação na fase final.
- `src/pages/MockTrials.tsx` (ou editor) — reescrever aba Resultados.
- `src/integrations/supabase/types.ts` — auto-regenerado.
- `supabase/config.toml` — registrar a nova edge function.

**Disparo da IA:** chamar `grade-mock-trial-jury` automaticamente quando:
- O juiz inicia a fase `verdict`, OU
- Todos os grupos com papel `jury` enviarem o formulário.

Em caso de erro 429/402 da IA, mostrar toast e permitir botão "Tentar novamente".

---

### 10. Resumo do fluxo final

```text
1. Jurados preenchem formulário (target_role='jury')
        ↓
2. IA compara: respostas dos jurados × argumentação dos grupos × processo × evidência
        ↓
3. IA gera nota Acusação + nota Defesa  →  mock_trial_evaluations (ai_jury)
        ↓
4. Juiz preenche formulário simplificado (Acusação + Defesa) → (judge)
        ↓
5. Professor preenche formulário técnico (Acusação + Defesa) → (teacher)
        ↓
6. Painel Resultados consolida:
   • Nota Acusação = (Juiz + Professor) / 2
   • Nota Defesa   = (Juiz + Professor) / 2
   • Nota Jurados  = IA (revisável pelo professor)
        ↓
7. Notas registradas em competency_scores (portfolio do aluno)
```

Aguardo sua aprovação para implementar.