

## Plano: Corrigir Proctoring e Padronizar Status da Prova

### Problemas Identificados

**1. Proctoring não funciona:**
- O componente `ExamProctoring` verifica `hasAnyFeature = config.fullscreen || config.blockCopyPaste || config.requirePhoto || config.watermark`. Se NENHUM toggle estiver ativado nas configurações, o proctoring é completamente ignorado (renderiza apenas `children`).
- A configuração precisa ser salva explicitamente pelo professor (botão SALVAR na aba Configurações). Se o professor não salvou com os toggles ativados, a `proctoring_config` no banco fica `{}` e nada é aplicado.
- A edge function `exam-proctoring` pode não estar deployada ou o bucket `exam-proctoring` pode não ter sido criado corretamente (precisa verificar).
- Possível problema: o `proctoring_config` não é retornado pelo tipo TypeScript do Supabase (usa `as any` para acessar), o que pode causar falha silenciosa.

**2. Status inconsistente em 3 lugares:**
- **Classes.tsx** (Imagem 1): Mostra "Publicado" (baseado em `publication.is_active`)
- **ExamEditor.tsx** (Imagem 2): Mostra "EM ELABORAÇÃO" (usa `computeEffectiveStatus()` que depende do `publication` local — pode não estar carregado)
- **Exams.tsx** (Imagem 3): Mostra "EM APLICAÇÃO" (usa `computeEffective()` baseado nas publicações do banco)

Cada página calcula o status de forma diferente e independente, resultando em 3 status distintos para a mesma prova.

---

### Solução

#### Parte 1 — Padronizar Status da Prova

Criar uma função utilitária única `computeExamStatus()` e usá-la em todos os lugares:

```text
Status flow:
  draft → in_progress → grading → completed
         (publicação ativa)  (publicação expirada/desativada)  (manual)
```

**Regras do status unificado:**
1. Se existe publicação ativa (`is_active = true`) E dentro da janela de tempo → `in_progress` ("EM APLICAÇÃO")
2. Se publicação existe mas está desativada OU expirada → `grading` ("EM CORREÇÃO")
3. Se não tem publicação → usar o `status` do banco (`draft`)
4. Se status manual = `completed` → sempre `completed`

**Criar `src/lib/exam-status.ts`** com a função reutilizável.

**Editar:**
- `Exams.tsx` — usar a função compartilhada
- `ExamEditor.tsx` — usar a função compartilhada (e carregar publicação corretamente)
- `Classes.tsx` — substituir "Publicado"/"Sem publicação" pelos mesmos labels padronizados
- `ExamCalendar.tsx` — usar a função compartilhada

#### Parte 2 — Corrigir e Garantir Funcionamento do Proctoring

**2a. Verificar e corrigir carregamento da config:**
- No `ExamEditor.tsx`, garantir que a `proctoring_config` é carregada ao abrir a prova (já está, mas depende de `(exam as any).proctoring_config`)
- Verificar se o save realmente persiste (já está no `handleSave`)

**2b. Melhorar feedback ao professor:**
- Na aba "Configurações", adicionar indicador visual de que as configurações de segurança estão ATIVAS ou NÃO (badge ou resumo)
- Na aba "Aplicação", ao publicar, mostrar resumo das configurações de segurança que serão aplicadas

**2c. Corrigir o ExamProctoring:**
- O componente já funciona tecnicamente, mas precisa de debug: a edge function `exam-proctoring` precisa estar deployada
- Adicionar log/feedback no console para diagnóstico
- Garantir que o bucket `exam-proctoring` exista com as policies corretas

**2d. Deploy da edge function:**
- Verificar se `exam-proctoring` está deployada e funcional

---

### Arquivos a Criar
- `src/lib/exam-status.ts` — função utilitária de status

### Arquivos a Editar
- `src/pages/Exams.tsx` — usar status unificado
- `src/pages/ExamEditor.tsx` — usar status unificado, melhorar feedback de proctoring
- `src/pages/Classes.tsx` — usar labels de status padronizados
- `src/pages/ExamCalendar.tsx` — usar status unificado
- `src/components/ExamProctoring.tsx` — adicionar logs de diagnóstico

### Edge Functions
- Verificar e re-deploy `exam-proctoring`

