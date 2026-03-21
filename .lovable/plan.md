
Objetivo: corrigir o vínculo de prova online para que o modal busque as provas da fonte correta e pare de “sumir” com provas que o usuário vê em “Minhas Provas”.

1. Identificar a causa exata no fluxo atual
- Hoje o modal em `src/pages/Classes.tsx` está usando `exam_publications` como filtro inicial.
- Isso mistura duas coisas diferentes:
  - vincular a prova à turma
  - publicar a prova para aplicação online
- Como “Minhas Provas” é alimentado pela tabela `exams`, uma prova pode aparecer lá e mesmo assim não aparecer no modal de vínculo.

2. Ajustar a regra de busca do modal
- Trocar a origem do modal “Vincular Prova Online” para buscar diretamente em `exams`, usando a mesma lógica-base de “Minhas Provas”.
- Manter apenas filtros que fazem sentido para vínculo:
  - `user_id = usuário atual`
  - `deleted_at is null`
  - não mostrar provas já vinculadas a outra turma
- Não depender mais de `exam_publications` para decidir se a prova pode ser vinculada.

3. Separar claramente “vincular” de “publicar”
- O vínculo da turma continuará salvando `class_id` na prova.
- A publicação continuará sendo feita na área de prova/aplicação.
- No modal, em vez de esconder provas sem publicação, mostrar a prova normalmente e, se necessário, exibir um indicador visual como:
  - “Com publicação”
  - “Sem publicação ainda”
- Assim o professor consegue vincular primeiro e publicar depois.

4. Melhorar a experiência do modal
- Atualizar o texto vazio para refletir a regra real:
  - se não houver provas elegíveis, dizer que não existem provas disponíveis em “Minhas Provas” ou que as provas já estão vinculadas a outras turmas
- Exibir informações mais úteis em cada item:
  - título
  - data
  - status da prova
  - status de publicação (se houver)

5. Validar o comportamento ponta a ponta
- Testar com uma prova que aparece em “Minhas Provas” mas não está publicada.
- Confirmar que ela aparece no modal e pode ser vinculada.
- Testar com prova já vinculada a outra turma para garantir que não aparece indevidamente.
- Testar uma prova publicada para garantir que o fluxo online continua funcionando normalmente no portal do aluno.

Se eu implementar, a correção principal ficará concentrada em `src/pages/Classes.tsx`, sem necessidade de mudança no banco. Opcionalmente, posso extrair a lógica de listagem de provas para um helper compartilhado com a página “Minhas Provas”, para evitar divergência futura entre as duas telas.
