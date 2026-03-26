

## Plano: Mídia Rica nas Questões (Imagens, Gráficos, LaTeX e Código)

### Resumo
Expandir o sistema de questões para suportar conteúdo rico no enunciado e nas alternativas: **imagens/gráficos** (upload ou URL), **expressões matemáticas** (LaTeX via KaTeX), e **blocos de código** (syntax highlighting via highlight.js). Isso se aplica ao Banco de Questões, ao Editor de Provas e ao Portal do Aluno.

---

### Funcionalidades

| Recurso | Onde aparece | Como funciona |
|---|---|---|
| **Imagens** | Enunciado e alternativas | Upload para Storage ou URL externa. Exibido inline |
| **Expressões matemáticas** | Enunciado e alternativas | Sintaxe `$...$` (inline) e `$$...$$` (bloco) renderizada via KaTeX |
| **Blocos de código** | Enunciado | Sintaxe ` ```lang ... ``` ` renderizada com highlight.js |
| **Gráficos** | Enunciado | Via upload de imagem ou embed URL (já existente) |

---

### Arquitetura

```text
Texto do enunciado/alternativa
        │
        ▼
  RichTextRenderer (novo componente)
    ├── Detecta $...$ e $$...$$ → renderiza com KaTeX
    ├── Detecta ```...``` → renderiza com highlight.js
    └── Texto normal → renderiza como texto
        │
  ImageAttachments (novo componente)
    └── Lista de imagens anexadas ao enunciado
```

---

### Etapas de implementação

#### 1. Storage bucket para imagens de questões
- Criar bucket `question-images` (público) via migração SQL
- RLS: usuários autenticados podem fazer upload; leitura pública

#### 2. Instalar dependências
- `katex` — renderização de LaTeX (leve, client-side)
- `highlight.js` — syntax highlighting para código

#### 3. Componente `RichTextRenderer`
- Recebe string de texto e renderiza:
  - `$$...$$` → `katex.renderToString()` em bloco
  - `$...$` → `katex.renderToString()` inline
  - ` ```lang\n...\n``` ` → `<pre><code>` com highlight.js
  - Texto restante → `<span>` normal
- Usado em: enunciado da questão, texto das alternativas, explicação

#### 4. Componente `ImageUploader`
- Botão de upload no formulário de criação/edição de questão
- Faz upload para `question-images/{userId}/{uuid}.ext`
- Retorna URL pública que é salva no `content_json.images[]`
- Preview das imagens anexadas com botão de remover

#### 5. Atualizar criação de questões (`Questions.tsx`)
- Adicionar toolbar acima do `Textarea` do enunciado com botões:
  - 📷 Inserir imagem (abre uploader)
  - **∑** Inserir expressão matemática (insere template `$$  $$`)
  - `</>` Inserir bloco de código (insere template ` ```\n\n``` `)
- Adicionar campo de imagens nas alternativas (botão de imagem por alternativa)
- Salvar imagens em `content_json.images` e `content_json.alternatives[].image`

#### 6. Atualizar exibição de questões
- **`Questions.tsx`** (detalhes): usar `RichTextRenderer` no enunciado, alternativas e explicação
- **`ExamEditor.tsx`** (preview): usar `RichTextRenderer`
- **`StudentExam.tsx`** (portal do aluno): usar `RichTextRenderer` no enunciado e alternativas, exibir imagens anexadas

#### 7. Atualizar exportação PDF (`ExamPDFExporter.tsx`)
- Para LaTeX: converter para imagem via canvas do KaTeX ou texto fallback
- Para código: renderizar como texto monospace
- Para imagens: incluir como imagem no jsPDF

---

### Detalhes Técnicos

**Estrutura `content_json` atualizada:**
```json
{
  "question_text": "Calcule a integral $\\int_0^1 x^2 dx$ e analise o gráfico:",
  "images": ["https://.../question-images/abc.png"],
  "alternatives": [
    { "letter": "A", "text": "$\\frac{1}{3}$", "image": null },
    { "letter": "B", "text": "$\\frac{1}{2}$", "image": "https://.../alt-b.png" }
  ],
  "correct_answer": "A",
  "explanation": "Pela regra da potência: ```\n∫x²dx = x³/3\n```"
}
```

**Arquivos a criar:** `src/components/RichTextRenderer.tsx`, `src/components/QuestionImageUploader.tsx`
**Arquivos a editar:** `Questions.tsx`, `ExamEditor.tsx`, `StudentExam.tsx`, `ExamPDFExporter.tsx`, `index.css`
**Migração SQL:** Criar bucket `question-images`

