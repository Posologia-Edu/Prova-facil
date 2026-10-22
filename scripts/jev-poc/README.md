# PoC: correção por critério com Jev

Objetivo: decidir, com dados, se o Jev concorda com professores o bastante para corrigir questões abertas.

## Como funciona
- Cada critério da rubrica vira uma pergunta Noul ("a resposta atende ao critério?"), probabilidade 0–1.
- Código decide: `p >= 0.75` atendido, `p <= 0.25` não atendido, no meio vai para revisão do professor.
- A nota é a soma dos pontos dos critérios atendidos (código, não IA). Se algum critério está em revisão, a nota fica `null`.
- Uma pergunta extra detecta resposta que tenta instruir o avaliador (injeção) e força revisão.
- O Gemini só redige o feedback (`feedbackPrompt`) a partir do resultado já fechado.

Arquivos: `supabase/functions/_shared/jev-grader.ts` (lógica), `supabase/functions/grade-exam-jev/` (Edge Function em modo sombra, não grava no banco), `run-poc.ts` (avaliação offline).

## Rodar a avaliação offline
1. Monte um JSON no formato de `cases.example.json` com 20–30 respostas reais **anonimizadas** e a nota que professores deram sem ver o Jev. Os dois casos do exemplo são fictícios.
2. `TYPESAFE_API_KEY=... bun scripts/jev-poc/run-poc.ts caminho/cases.json 3` (ou node >= 22.18 / deno).
3. Leia o resumo: concordância com o professor, % enviado à revisão e repetibilidade (3 execuções do mesmo texto).

## Critérios de decisão sugeridos (ajuste)
- Erro médio ≤ 10% da nota máxima e ≥ 85% dentro de 10%.
- Revisão ≤ 25–30% dos casos (acima disso economiza pouco).
- Vereditos instáveis entre repetições = 0. Se a API não for estável, grave o resultado e não recalcule.
- Comparar com o `grade-exam` atual (Gemini dá a nota direto) nos mesmos casos.

## Antes de usar com alunos reais
- Ler os termos de privacidade/DPA da TypeSafe (a doc não cita subprocessadores nem localização dos dados; há retenção zero só para enterprise) e enviar apenas texto anonimizado.
- Definir `TYPESAFE_API_KEY` como secret do Supabase e fixar `TYPESAFE_MODEL` numa versão (ex.: `jev-1.13.0`).
- Rubricas hoje são texto livre (`grading_criteria`). Este fluxo exige `content_json.rubric_items` com critérios atômicos; é preciso adaptar o gerador de questões e a tela de edição.
- A doc do Jev alerta: contagem/cálculo e geração de texto não são pontos fortes (por isso soma em código e feedback no Gemini), e ele pode favorecer a primeira opção em Choice (aqui só usamos Noul).
