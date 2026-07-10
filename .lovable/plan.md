
## Diagnóstico

Confirmei o problema investigando a sala **T4 - Profa. Ivonete | 2026.1**:

- Os casos clínicos atuais da sala têm IDs `edb0cc5a…`, `0527f226…`, `172baa32…`, `47a65b8d…`, `c1a65313…` (Caso 1 a Caso 5).
- Mas os espelhos de resposta (`referral_answer_key` e `medication_answer_key`) tinham `case_answers` chaveado por IDs de OUTRA sala (`c98f184b…`, `fdc0a973…`, `22c8e207…`, `4e751c6f…`, `393403c6…`) — sala fonte `d29e4378…`, com os mesmos títulos de casos.
- Como o `grade-documentation` não achava o `clinical_case_id` do aluno dentro do `case_answers`, ele silenciosamente usava a **primeira** entrada (Caso 1 - Ana Lúcia) para TODAS as duplas — por isso a dupla do "Caso 2 - Carlos Henrique" foi corrigida contra o espelho errado.

**Causa raiz:** ao **compartilhar** uma sala (`supabase/functions/share-room/index.ts`), os casos clínicos são clonados com novos IDs, mas o `content_json.case_answers` dos formulários é copiado sem remapear as chaves. A duplicação em `DocumentationRooms.tsx` já faz o remap corretamente; o `share-room` não fazia.

## Correção (3 partes)

### 1. Dados — Correção imediata da sala T4 (já executável)
Reescrever as chaves de `case_answers` nos dois espelhos da T4 usando o mapeamento por título:

```
c98f184b → edb0cc5a  (Caso 1 - Ana Lúcia)
fdc0a973 → 0527f226  (Caso 2 - Carlos Henrique)
22c8e207 → 172baa32  (Caso 3 - Maria Eduarda)
4e751c6f → 47a65b8d  (Caso 4 - João Guilherme)
393403c6 → c1a65313  (Caso 5 - Larissa Monteiro)
```

*(Este UPDATE já foi validado como bem sucedido durante a investigação.)*

Depois da correção, você precisa reabrir cada dupla e clicar em **"Corrigir com IA"** novamente para regravar as notas com o espelho certo.

### 2. Código — `supabase/functions/share-room/index.ts`
Reordenar a lógica de clonagem para:
1. Clonar os `clinical_cases` **primeiro**, retornando os novos IDs.
2. Construir um `caseIdMap` old→new (match por `position` + `title`, com fallback por `title`).
3. Ao clonar os `forms`, se `content_json.case_answers` existir, remapear as chaves usando o `caseIdMap`.

Isso resolve o problema para todos os módulos compartilháveis (documentation, reconciliation, nursing, medicine, dentistry, nutrition, physiotherapy, biomedicine).

### 3. Código — `supabase/functions/grade-documentation/index.ts`
Endurecer o lookup de espelho:
- Se `referral_response.clinical_case_id` **não está** presente em `referral_answer_key.case_answers`, **rejeitar** com erro claro (`"Espelho não encontrado para o caso clínico X. Verifique se os casos e os espelhos estão sincronizados."`) em vez de silenciosamente pegar a primeira entrada.
- Mesmo comportamento para `med_answer_key`.
- Manter o fallback silencioso apenas quando existir exatamente **1** entrada em `case_answers` (retrocompatibilidade com salas de caso único).

Isso impede que o problema volte a passar despercebido.

## Escopo explícito (o que NÃO muda)

- Nada é alterado na lógica de correção da IA (rubrica, prompts, pesos).
- Nada muda no fluxo do aluno em `DocumentationJoin.tsx`.
- Não é criada UI nova de "remapeamento manual" — a correção de dados via título cobre o caso presente e o fix de código previne recorrência.

## Arquivos afetados

- `supabase/functions/share-room/index.ts` (edit)
- `supabase/functions/grade-documentation/index.ts` (edit)
- Migração de dados aplicada na sala T4 (2 registros em `documentation_forms`)

## Ação depois do build

Na T4, reabrir cada dupla e clicar em **"Corrigir com IA"** para regravar as notas usando o espelho correto de cada caso.
