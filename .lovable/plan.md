

## Plano: Reformular o Prompt de Geração do Teste de Progresso para Replicar o Estilo Real

### O que encontrei nos testes reais

Analisei as 4 provas enviadas (3 de Medicina TPN/ABEM e 1 de Farmácia). O padrão real é muito diferente do que a IA está gerando:

**Características do TPN real (Medicina - ABEM):**
- Casos clínicos longos e detalhados com dados de exame físico, laboratoriais e de imagem
- Cada questão tem área temática explícita (Clínica Médica, Cirurgia, Pediatria, GO, Saúde Coletiva, etc.)
- Exatamente 4 alternativas (A, B, C, D) — NÃO 5
- Enunciados de 5-15 linhas com cenário clínico realista
- Pergunta objetiva ao final ("Qual o diagnóstico?", "Qual a conduta?", "Qual o achado esperado?")
- Alternativas concisas e plausíveis, sem explicações embutidas

**Características do Teste de Progresso real (Farmácia e outros cursos):**
- 5 alternativas (A, B, C, D, E)
- Mix de questões com texto-base (artigos, dados, gráficos) + asserções (I, II, III) + questão direta
- Formatos variados: "É correto o que se afirma em:", "Asserção I PORQUE Asserção II", questão direta
- Questões de conhecimento geral (interdisciplinares) + específicas

### Mudanças necessárias

**1. Reformular o system prompt do `generate-progress-test`**
- Para Medicina: gerar questões no estilo TPN/ABEM com casos clínicos detalhados e 4 alternativas (A-D)
- Para outros cursos (Farmácia, Enfermagem, etc.): gerar questões com 5 alternativas (A-E), incluindo formato de asserções (I/II/III) e textos-base
- Incluir exemplos reais no prompt (few-shot) para cada formato
- Exigir que cada questão identifique a área temática/disciplina

**2. Ajustar o schema da tool call conforme o curso**
- Medicina: `options` com `a, b, c, d` (4 alternativas), `correct_answer` enum `["a","b","c","d"]`
- Outros cursos: `options` com `a, b, c, d, e` (5 alternativas), `correct_answer` enum `["a","b","c","d","e"]`
- Adicionar campo `subject_area` (área temática da questão)

**3. Atualizar o portal do aluno para suportar 4 ou 5 alternativas dinamicamente**
- Detectar quantas alternativas existem no `content_json` e renderizar de acordo

**4. Atualizar o editor para exibir a área temática**

### Arquivos a editar

- `supabase/functions/generate-progress-test/index.ts` — prompt completo reescrito com exemplos few-shot
- `src/pages/ProgressTestStudentPortal.tsx` — suporte dinâmico a 4 ou 5 alternativas
- `src/pages/ProgressTestEditor.tsx` — exibir área temática nas questões

### Detalhes técnicos do prompt

O novo prompt incluirá 2-3 exemplos reais (few-shot) de questões no estilo TPN para Medicina e no estilo Teste de Progresso para outros cursos. O prompt será adaptado dinamicamente com base no campo `course` recebido na requisição. Para Medicina, as questões serão obrigatoriamente baseadas em casos clínicos com apresentação de paciente, dados de exame, exames complementares e pergunta objetiva.

