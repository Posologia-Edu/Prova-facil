# Inventário — Compositor de Provas

**Rota:** `/composer` (professor)
**Arquivos:** `src/pages/Composer.tsx` (811), `ExamSaveConfigDialog.tsx` (195), `ExamTemplatesDialog.tsx` (505), `ExamPDFExporter.tsx` (824), `AIQuestionGenerator.tsx` (reuso)

## Estrutura da tela (3 colunas verticais, tela cheia)

1. **Barra lateral "Banco de Questões"**: filtros por assunto (tag) e dificuldade; botão **Gerar com IA** (reabre o gerador e recarrega o banco); seletor **"Adicionar à seção"** (seção ativa); lista das questões do banco **que ainda não estão na prova** (ordenadas pela 1ª tag e dificuldade), com badges de dificuldade e tags (+N), clique para adicionar. Caso clínico (`case_stem`) entra com 0 ponto; as demais com 1.
2. **Barra de ferramentas** (topo do canvas): título editável da prova (inline), contagem "N questões · M pontos"; **Templates**, **+ Seção**, **Embaralhar** (alterna e embaralha as questões dentro de cada seção), **Cabeçalho** (Sheet: instituição, professor(a), data, instruções), **Salvar Prova** (desabilitado sem questões).
3. **Prévia A4** (210 mm, fonte de prova, `exam-paper-bg`): cabeçalho com marca ProvaFácil, QR code (espaço reservado), instituição, título, professor, data, instruções; seções recolhíveis com nome editável, pontos da seção, excluir seção; cada questão com tipo, enunciado, alternativas/linhas, **campo de pontos editável**, remover; alça de arrastar (`GripVertical`, sem handler de drag detectado: só visual).

## Dialogs

- **Templates** (`ExamTemplatesDialog`): 10 modelos fixos no código por disciplina (Farmacologia, Anatomia, Direito Constitucional, Resistência dos Materiais, Química Geral, Didática, Cálculo I, Psicologia do Desenvolvimento, Estrutura de Dados), busca, filtro por disciplina, cada um com 2–3 partes (Múltipla escolha, V/F, Dissertativas/Problemas/Associação). Aplicar monta as seções com **questões de exemplo embutidas**, não do banco.
- **Configuração da prova** (`ExamSaveConfigDialog`): descrição interna (não exibida), título *, instituição, professor(a), **vincular a uma turma** (lista `classes`), chave "exibir instruções preparatórias" + texto, chave "exibir instruções durante a prova" + texto.
- **ExamPDFExporter** está montado no Compositor, mas **nenhum botão o abre aqui** (`exportOpen` nunca vira true); só é acionado em `ExamView`. Opções do exportador: marca d'água, gabarito com chave de correção, folha de respostas, **2–4 versões embaralhadas (A–D)**, geração por `jsPDF`/`html2canvas`.

## Dados e regras

- Lê `question_bank` do usuário; grava `exams` (status `draft`, `class_id`, `header_config_json`: instituição, professor, data, instruções, preparatórias, flags) e `exam_questions` (position, points, `section_name`).
- **Só questões com id real (UUID) são gravadas**; as de templates (exemplo) são descartadas silenciosamente ao salvar, e a posição ainda avança.
- Depois de salvar, o compositor é **zerado** (nova prova). Não há rascunho automático: sair da página perde o trabalho. Não carrega prova existente para edição (edição é em `ExamEditor`).
- Embaralhar é só ordem das questões, não das alternativas.

## Lacunas / observações

- Sem salvar rascunho local, sem desfazer, sem reordenar de verdade (drag decorativo), sem mover questão entre seções (só "seção ativa" ao adicionar).
- Exportar PDF indisponível no Compositor (apesar de montado).
- Templates com questões de exemplo que não persistem: pode confundir.

## Protótipo vs. real

O protótipo precisa preservar: banco lateral com filtros, seção ativa, IA, templates, seções recolhíveis/renomeáveis, pontos por questão, cabeçalho (Sheet), prévia A4 fiel ao papel, diálogo de configuração com turma e instruções preparatórias/durante a prova. A prévia A4 é um ativo (WYSIWYG): não substituir por lista.
