

## Plano: Geração de Imagens Médicas e Teste de Progresso com Prioridade de Provedores Externos

### Resumo
Garantir que as duas novas funcionalidades de IA (geração de imagens médicas e geração de teste de progresso) utilizem prioritariamente os provedores de API configurados pelo administrador (Google, OpenAI, etc.) e apenas como fallback o Lovable AI Gateway — seguindo o mesmo padrão já usado no `callAiWithFallback`.

### Mudanças Necessárias

**1. Estender `ai-caller.ts` para suportar geração de imagens**

O utilitário `callAiWithFallback` atual não suporta o parâmetro `modalities` necessário para geração de imagens. Será adicionado:
- Nova propriedade `modalities` na interface `AiCallOptions`
- Propagação do `modalities` nas funções `callOpenAiCompatibleApi` e `callLovableAi`
- Novo export `callAiImageWithFallback` que tenta primeiro o Google Generative AI (que suporta geração de imagens nativamente) e cai para o Lovable AI Gateway com modelo `google/gemini-2.5-flash-image`

**2. Edge Function `generate-medical-image`**

- Usa `callAiImageWithFallback` para gerar imagens médicas sintéticas
- Recebe: `questionText` (enunciado), `imageType` (radiografia, TC, RM, lâmina, ECG, ultrassom), `details` (opcional)
- O prompt instrui a IA a gerar uma imagem médica educacional realista e inédita
- Faz upload da imagem base64 resultante para o bucket `question-images`
- Retorna a URL pública da imagem
- Trata erros 402/429 com mensagens claras

**3. Edge Function `generate-progress-test`**

- Usa `callAiWithFallback` (já existente) — provedores externos primeiro, Lovable AI como fallback
- Recebe: `testId`, `course`, `subjects` (áreas temáticas), `questionsPerYear` (mapa ano→quantidade), `difficulty`
- Gera questões de múltipla escolha via tool calling (saída estruturada em JSON)
- Salva as questões no `question_bank` e vincula ao `progress_test_questions`
- Retorna contagem de questões geradas

**4. UI — Botão de Imagem Médica (`Questions.tsx`)**

- Botão "Gerar Imagem Médica" (ícone Sparkles) ao lado do `QuestionImageUploader`
- Popover/Dialog com: tipo de imagem (select), detalhes adicionais (input opcional), botão "Gerar"
- Preview da imagem gerada antes de confirmar adição ao array `newImages`
- Loading state durante geração

**5. UI — Gerador de Teste de Progresso (`ProgressTestEditor.tsx`)**

- Botão "Gerar com IA" na interface do editor
- Dialog com campos: Curso, Áreas Temáticas, Questões por Ano (1º-6º), Dificuldade
- Ao gerar, chama a edge function e atualiza a lista de questões do teste
- Loading state com feedback de progresso

**6. Configuração**

- Registrar ambas as funções no `supabase/config.toml` com `verify_jwt = false`

### Arquivos a Criar
- `supabase/functions/generate-medical-image/index.ts`
- `supabase/functions/generate-progress-test/index.ts`

### Arquivos a Editar
- `supabase/functions/_shared/ai-caller.ts` — adicionar suporte a `modalities` e função de imagem
- `src/pages/Questions.tsx` — botão e dialog de geração de imagem
- `src/pages/ProgressTestEditor.tsx` — botão e dialog de geração de teste
- `supabase/config.toml` — registrar novas funções

### Fluxo de Prioridade de Provedores (para ambas as funcionalidades)

```text
1. Busca chaves ativas em ai_api_keys
2. Ordena: Google → OpenAI → OpenRouter → Groq → Anthropic
3. Tenta cada provedor até obter resposta OK
4. Se todos falharem → Lovable AI Gateway (fallback)
5. Log de uso em ai_usage_log
```

