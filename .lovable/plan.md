

## Plano: Sistema de Certificação e Proctoring para Concursos

### Resumo
Implementar um sistema rigoroso de segurança e auditoria no portal de provas online, elevando o nível de confiabilidade para aplicação em concursos públicos e avaliações de alto impacto. Todas as funcionalidades são configuráveis pelo professor na aba de Aplicação do ExamEditor.

---

### Funcionalidades

| Recurso | Descrição |
|---|---|
| **Modo Tela Cheia Obrigatório** | Fullscreen API forçado ao iniciar prova; sair dispara alerta e registra violação |
| **Detecção de Troca de Aba/Janela** | `visibilitychange` + `blur` registram cada saída com timestamp |
| **Bloqueio de Copiar/Colar** | Desativa `copy`, `paste`, `cut`, `contextmenu`, `print` e atalhos (Ctrl+C/V/P) |
| **Log de Auditoria** | Tabela `exam_audit_logs` registra TODAS as ações: foco perdido, tela cheia saída, resposta alterada, navegação |
| **Embaralhamento de Questões** | Ordem aleatória por aluno (seed = sessionId) |
| **Embaralhamento de Alternativas** | Alternativas de múltipla escolha embaralhadas por aluno |
| **Foto de Identificação** | Captura webcam obrigatória ao iniciar (salva no Storage) |
| **Selfies Periódicas** | Fotos automáticas a cada N minutos para verificação posterior |
| **Marca d'água** | Nome + e-mail do aluno sobrepostos semi-transparentes na tela da prova |
| **Fingerprint de Dispositivo** | User-agent + resolução + timezone + idioma registrados na sessão |
| **Bloqueio de Sessão Duplicada** | Impede dois acessos simultâneos ao mesmo sessionId |
| **Comprovante Digital** | Hash SHA-256 das respostas + timestamp gera recibo verificável ao finalizar |
| **Painel de Violações** | Professor visualiza alertas e fotos no ExamMonitoring |

---

### Arquitetura

```text
StudentExam.tsx
  └── ExamProctoring.tsx (novo)
        ├── FullscreenEnforcer
        ├── TabSwitchDetector
        ├── CopyPasteBlocker
        ├── WebcamCapture (foto inicial + periódica)
        ├── Watermark overlay
        ├── AuditLogger → edge function → exam_audit_logs
        └── DeviceFingerprint

ExamEditor.tsx (aba Configurações)
  └── Seção "Segurança & Proctoring"
        ├── Toggle: Modo tela cheia obrigatório
        ├── Toggle: Bloquear copiar/colar
        ├── Toggle: Embaralhar questões
        ├── Toggle: Embaralhar alternativas
        ├── Toggle: Foto de identificação
        ├── Toggle: Selfies periódicas (intervalo em min)
        ├── Toggle: Marca d'água
        └── Limite de violações antes de bloqueio

ExamMonitoring.tsx
  └── Aba "Segurança"
        ├── Lista de violações por aluno
        ├── Fotos capturadas (timeline)
        └── Fingerprint do dispositivo
```

---

### Etapas de Implementação

#### 1. Migração SQL
- Adicionar colunas `proctoring_config jsonb DEFAULT '{}'` na tabela `exams`
- Criar tabela `exam_audit_logs`:
  - `id`, `session_id` (FK), `event_type` (enum: focus_lost, fullscreen_exit, copy_attempt, paste_attempt, answer_changed, photo_captured, session_started, session_submitted), `event_data jsonb`, `created_at`
- Adicionar colunas `device_fingerprint jsonb`, `photo_url text`, `violation_count int DEFAULT 0` na tabela `exam_sessions`
- Habilitar Realtime na `exam_audit_logs`
- Criar bucket `exam-proctoring` (privado) para fotos

#### 2. Componente `ExamProctoring.tsx`
- Recebe config do professor (quais recursos ativar) e sessionId
- **FullscreenEnforcer**: `document.documentElement.requestFullscreen()` ao montar; listener em `fullscreenchange` registra saída
- **TabSwitchDetector**: `visibilitychange` + `window.blur` contam violações e enviam log
- **CopyPasteBlocker**: `onCopy`, `onPaste`, `onCut`, `onContextMenu` com `preventDefault()`; `onKeyDown` bloqueia Ctrl+C/V/P/A, PrintScreen
- **WebcamCapture**: `navigator.mediaDevices.getUserMedia({video: true})` → canvas → blob → upload Storage
- **Watermark**: div fixo com `pointer-events: none`, texto rotacionado 45° com opacidade 0.08
- **AuditLogger**: função que envia eventos via fetch para edge function
- **DeviceFingerprint**: coleta `navigator.userAgent`, `screen.width/height`, `Intl.DateTimeFormat().resolvedOptions().timeZone`, `navigator.language`

#### 3. Edge Function `exam-proctoring`
- Actions: `log-event`, `capture-photo`, `get-violations`
- `log-event`: insere em `exam_audit_logs`, incrementa `violation_count` na sessão
- `capture-photo`: recebe base64, salva em `exam-proctoring/{sessionId}/{timestamp}.jpg`, registra log
- `get-violations`: retorna logs + fotos para o professor (valida ownership)

#### 4. Embaralhamento Determinístico
- Na edge function `student-exam-access` (action `load`):
  - Se `proctoring_config.shuffleQuestions`: embaralha questões com seed = sessionId
  - Se `proctoring_config.shuffleAlternatives`: embaralha alternativas mantendo mapeamento correto
- Algoritmo: Fisher-Yates com PRNG seeded (xorshift32 usando hash do sessionId)

#### 5. Comprovante Digital
- Ao submeter: gera hash SHA-256 de `JSON.stringify({sessionId, answers, timestamp})`
- Exibe hash + timestamp na tela de resultados como "Comprovante de Envio"
- Hash salvo na `exam_sessions` (coluna `submission_hash`)

#### 6. Integração no ExamEditor.tsx
- Nova seção "Segurança & Proctoring" na aba Configurações com toggles
- Salva em `exams.proctoring_config` (jsonb)

#### 7. Integração no StudentExam.tsx
- Carrega `proctoring_config` junto com questões (via edge function)
- Monta `<ExamProctoring>` com config recebida
- Exibe aviso inicial: "Esta prova possui monitoramento ativo. Ao prosseguir você concorda com: captura de imagem, modo tela cheia, registro de atividades"

#### 8. Painel de Violações no ExamMonitoring.tsx
- Nova aba "Segurança" com:
  - Tabela: aluno, nº violações, tipos de evento, timestamp
  - Clique no aluno abre timeline com fotos e eventos
  - Badge vermelho no aluno com violações > limite

---

### Detalhes Técnicos

**Estrutura `proctoring_config`:**
```json
{
  "fullscreen": true,
  "blockCopyPaste": true,
  "shuffleQuestions": true,
  "shuffleAlternatives": true,
  "requirePhoto": true,
  "periodicPhotos": true,
  "photoIntervalMinutes": 5,
  "watermark": true,
  "maxViolations": 3
}
```

**Embaralhamento seeded (Fisher-Yates + xorshift32):**
```typescript
function seededShuffle<T>(arr: T[], seed: string): T[] {
  let s = hashToInt(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    s = xorshift32(s);
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

**Comprovante SHA-256:**
```typescript
const hash = await crypto.subtle.digest("SHA-256",
  new TextEncoder().encode(JSON.stringify({ sessionId, answers, ts }))
);
```

**Arquivos a criar:** `src/components/ExamProctoring.tsx`, `supabase/functions/exam-proctoring/index.ts`
**Arquivos a editar:** `ExamEditor.tsx` (config), `StudentExam.tsx` (integração), `ExamMonitoring.tsx` (painel violações), `student-exam-access/index.ts` (embaralhamento + config)
**Migrações:** `proctoring_config` em exams, tabela `exam_audit_logs`, colunas em `exam_sessions`, bucket `exam-proctoring`

