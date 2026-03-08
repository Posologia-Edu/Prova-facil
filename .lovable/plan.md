
# Auditoria Completa: Planos, Travas e Stripe

## 1. Configuracao no Stripe -- OK

| Item | Status | Detalhe |
|------|--------|---------|
| Produto | OK | `prod_U1kTkTPojtC3x4` - "ExamCraft Premium" |
| Preco | OK | `price_1T3gyOCtn5J7o2AoDHYVPrDq` - R$ 29,90/mes (BRL, recorrente mensal) |
| Edge Function `create-checkout` | OK | Usa o price_id correto, modo subscription |
| Edge Function `check-subscription` | OK | Verifica product_id correto, suporta convites admin |
| Edge Function `cancel-subscription` | OK | Existe e e chamada na UI |
| Frontend `use-subscription` | OK | Verifica `PREMIUM_PRODUCT_ID` correto, auto-refresh a cada 60s |

## 2. Funcionalidades listadas na pagina de Planos -- TRAVAS NAO IMPLEMENTADAS

A pagina de Pricing **exibe** corretamente as 8 funcionalidades comparativas, porem **nenhuma trava esta implementada no codigo**. O `useSubscription()` e `FREE_LIMITS` so sao usados na pagina de Pricing para exibicao. Nenhuma outra pagina ou componente importa ou verifica `isPremium` ou `FREE_LIMITS`.

### Detalhamento das travas ausentes:

| Funcionalidade | Gratuito | Premium | Trava implementada? |
|----------------|----------|---------|---------------------|
| Questoes com IA por mes | 5 | Ilimitado | **NAO** - `AIQuestionGenerator.tsx` nao verifica limite |
| Provas por mes | 1 | Ilimitado | **NAO** - `ExamEditor.tsx` e `Exams.tsx` nao verificam |
| Exportacao PDF | Bloqueado | Liberado | **NAO** - `ExamPDFExporter.tsx` nao verifica `isPremium` |
| Provas online | Bloqueado | Liberado | **NAO** - `PublishExamDialog.tsx` nao verifica |
| Alunos por prova | 10 | Ilimitado | **NAO** - nenhuma verificacao de limite |
| Correcao por IA | Bloqueado | Liberado | **NAO** - `grade-exam` nao verifica plano |
| Monitoramento em tempo real | Bloqueado | Liberado | **NAO** - `ExamMonitoring.tsx` nao verifica |
| Suporte prioritario | Nao | Sim | N/A (nao e uma trava tecnica) |

## 3. Plano de Implementacao

### Tarefa 1: Criar hook/utilitario de verificacao de limites
- Adicionar funcao `checkUsageLimit` em `use-subscription.tsx` que consulta o banco para contar uso mensal (questoes geradas, provas criadas)
- Exportar constantes `FREE_LIMITS` ja existentes para uso em todo o app

### Tarefa 2: Bloquear Questoes com IA (limite 5/mes no gratuito)
- Em `AIQuestionGenerator.tsx`: importar `useSubscription`, contar questoes geradas no mes atual via query na `question_bank`, bloquear se >= 5 e nao premium
- Mostrar mensagem com link para upgrade

### Tarefa 3: Bloquear criacao de provas (limite 1/mes no gratuito)
- Em `Exams.tsx` / `ExamEditor.tsx`: verificar contagem de provas criadas no mes, bloquear se >= 1 e nao premium

### Tarefa 4: Bloquear Exportacao PDF (so premium)
- Em `ExamPDFExporter.tsx`: verificar `isPremium`, mostrar dialog de upgrade se gratuito

### Tarefa 5: Bloquear Provas Online (so premium)
- Em `PublishExamDialog.tsx`: verificar `isPremium`, impedir publicacao se gratuito

### Tarefa 6: Limitar alunos por prova (10 no gratuito)
- Em `PublishExamDialog.tsx` ou no edge function `student-exam-access`: verificar contagem de sessoes ativas vs limite

### Tarefa 7: Bloquear Correcao por IA (so premium)
- No edge function `grade-exam` e na UI de monitoramento: verificar plano antes de permitir correcao automatica

### Tarefa 8: Bloquear Monitoramento em Tempo Real (so premium)
- Em `ExamMonitoring.tsx`: verificar `isPremium`, redirecionar ou mostrar paywall se gratuito

## Resumo

- **Stripe**: Produto, preco e funcoes de checkout/verificacao estao **corretos e funcionais**
- **Exibicao dos planos**: A pagina de Pricing exibe todas as funcionalidades corretamente
- **Travas de plano**: **NENHUMA das 7 travas tecnicas esta implementada** - qualquer usuario gratuito pode usar todas as funcionalidades sem restricao
- **Acao necessaria**: Implementar as verificacoes de `isPremium` e contagem de uso em cada componente/funcao relevante
