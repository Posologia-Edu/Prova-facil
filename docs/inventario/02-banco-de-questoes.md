# Inventário — Banco de Questões

**Rota:** `/questions` (professor)
**Arquivos:** `src/pages/Questions.tsx` (1071 linhas), `AIQuestionGenerator.tsx` (385), `QuestionImageUploader.tsx` (158), `RichTextRenderer.tsx`, `SystemPromptViewer.tsx` (só admin), `CompetencySelector.tsx` (127; não aparece nesta tela)

## Estrutura da tela

1. **Cabeçalho:** título, contagem de questões; botões **Gerar com IA**, **Nova questão**; `SystemPromptViewer` (visível só para admin).
2. **Filtros:** busca (enunciado e tags), tipo (Todos, Múltipla escolha, V/F, Dissertativa, Associação, Caso clínico), dificuldade (Todas, Fácil, Média, Difícil).
3. **Lista** de cartões: ícone do tipo, enunciado, badges (tipo, dificuldade, Bloom, tags, vínculo a caso clínico), data; menu ⋯ com **Ver detalhes, Editar, Duplicar, Excluir (vai para a lixeira)**. Clicar no cartão abre detalhes. Estado vazio com botões IA e Nova questão.
4. **Dialog Detalhes da questão** (`QuestionDetailContent`): caso clínico vinculado, enunciado (com `RichTextRenderer`: LaTeX, código, tabela), embed/imagem, imagens, alternativas com a correta marcada, pares de associação, resposta esperada, espelho de resposta, explicação.
5. **Dialog Criar/Editar questão** (2 abas):
   - **Criação manual:** tipo (5 tipos); vincular a Caso Clínico existente (opcional, não aparece em `case_stem`); texto com barra de inserção **LaTeX `$$ $$`, código, tabela**; **imagem** (upload via `QuestionImageUploader` + **gerar imagem médica por IA** com popover: tipo radiografia etc., detalhes, prévia, confirmar); dificuldade; Bloom (6 níveis); tags (vírgula); URL de embed (iframe); espelho de resposta (não em `case_stem`).
   - **Importar CSV/JSON:** **apenas placeholder** (zona de arraste e botão sem ação; não há leitura de arquivo no código).
6. **AIQuestionGenerator** (dialog em 2 passos): *config* (tópico, contexto/texto de apoio, tipo, dificuldade, quantidade 1–10 via slider, limite mensal para plano gratuito `FREE_LIMITS.questionsPerMonth`) → *revisão* (cartões com checkbox, alternativas/resposta/explicação, badges) → salva só as selecionadas.
7. **AlertDialog** de exclusão.

## Dados e funções

- Lê/grava `question_bank` (`content_json`, `type`, `difficulty`, `tags`, `bloom_level`, `embed_url`, `parent_id`, `deleted_at`). Excluir = soft delete (aparece em Lixeira).
- Edge functions: `generate-questions` (IA), `generate-medical-image`.
- Armazenamento de imagens (uploader).

## Regras de negócio

- **Criar** MC → opções vazias a–d; V/F → `a: Verdadeiro, b: Falso`. **Editar só altera o texto, as imagens e metadados**: não edita alternativas, gabarito, pares nem explicação (preserva o que existe). Alternativas/gabarito só nascem pela IA ou ficam em branco.
- Caso clínico = texto-base sem alternativas; outras questões se vinculam por `parent_id`.
- Limite mensal de IA no plano gratuito; imagem médica depende da função.

## Lacunas / observações

- Importação CSV/JSON é prometida na interface e **não existe**: decidir entre remover o aviso ou implementar.
- Não há edição de alternativas/gabarito na criação manual: o professor só consegue ter alternativas válidas via IA (conferir se é intencional).
- Sem seleção múltipla, ações em lote, ordenação, paginação nem filtro por tag/Bloom (Bloom só aparece como badge).
- Competências (`CompetencySelector`) existe mas não é usado aqui.

## Protótipo vs. real

O protótipo do Banco deve mostrar: cinco tipos (inclusive Caso Clínico), filtro por tipo e dificuldade, busca por tags, barra LaTeX/código/tabela, imagem + imagem médica por IA, embed, espelho de resposta, gerador de IA com passo de revisão e limite do plano, duplicar e lixeira. Importação só se for implementada.
