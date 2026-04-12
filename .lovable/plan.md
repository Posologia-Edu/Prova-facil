
Objetivo

Corrigir definitivamente o Progress Test para que o portal do aluno sempre exiba enunciado e alternativas das questões geradas por IA.

O que eu encontrei

- Li o gerador (`generate-progress-test`), o editor e o portal do aluno.
- Consultei o banco: no teste mais recente há 12 questões, e elas estão salvas com `stem/question_text` e `options`.
- Portanto, o problema não parece estar na geração atual das questões; os dados existem no banco.
- O problema mais provável está no acesso do portal público ao `question_bank`: a tela do aluno carrega `progress_test_questions`, depois tenta buscar as questões na `question_bank`, mas essa tabela não tem uma política pública específica para Progress Test.
- Como o componente hoje ignora falhas dessa consulta, ele cai no fallback `"Questão sem enunciado"` e renderiza sem alternativas.

Plano de implementação

1. Corrigir o acesso público com segurança
- Criar uma migration para permitir leitura em `question_bank` somente quando a questão estiver vinculada a um Progress Test publicado.
- Ajustar também as políticas públicas de `progress_tests` e `progress_test_questions` para expor apenas testes publicados, em vez de deixar tudo público.
- Manter intacto o acesso do autor e de administradores.

2. Tornar o portal do aluno robusto
- Atualizar `src/pages/ProgressTestStudentPortal.tsx` para:
  - tratar erro de carregamento de questões em vez de falhar silenciosamente;
  - bloquear o início da prova se o conteúdo não tiver sido carregado corretamente;
  - mostrar mensagem clara quando o teste não estiver publicado ou quando houver inconsistência;
  - manter parse seguro para `content_json` em formato objeto ou string.

3. Blindar a geração para próximos testes
- Revisar `supabase/functions/generate-progress-test/index.ts` para normalizar campos antes de salvar (`stem`, `question_text`, `statement`, `options`).
- Impedir inserção de questão incompleta e retornar contagem de itens descartados/inválidos, se houver.

4. Melhorar a checagem no editor
- Ajustar `src/pages/ProgressTestEditor.tsx` para sinalizar questões incompletas antes da publicação.
- Assim o professor consegue detectar problema antes de compartilhar o link.

Validação depois da implementação

- Gerar um novo Progress Test com IA.
- Abrir o portal do aluno sem login.
- Confirmar que todas as questões exibem enunciado e alternativas A–E.
- Confirmar que rascunhos não ficam acessíveis publicamente.
- Testar também um teste já existente para validar retrocompatibilidade.

Arquivos prováveis

- `supabase/migrations/<nova_migration>.sql`
- `src/pages/ProgressTestStudentPortal.tsx`
- `src/pages/ProgressTestEditor.tsx`
- `supabase/functions/generate-progress-test/index.ts`

Detalhe técnico importante

```text
Fluxo provável do bug atual:
portal público
-> lê progress_test_questions
-> tenta ler question_bank
-> RLS bloqueia
-> UI ignora erro
-> questionData fica undefined
-> renderiza "Questão sem enunciado" e sem alternativas
```
