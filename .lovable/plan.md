
# Menu de Acoes nos Tres Pontinhos

## O que sera feito

Adicionar um menu dropdown (context menu) nos botoes de tres pontinhos (`MoreHorizontal`) tanto no **Banco de Questoes** quanto em **Minhas Turmas**, com opcoes de acao relevantes para cada contexto.

---

## Banco de Questoes - Opcoes do Menu

Ao clicar nos tres pontinhos de uma questao, aparecera:

- **Editar** - Abre um dialog para editar a questao
- **Duplicar** - Cria uma copia da questao
- **Mover para Prova** - Acao futura para adicionar a questao a uma prova
- **Excluir** - Remove a questao (com confirmacao)

## Minhas Turmas - Opcoes do Menu

Ao clicar nos tres pontinhos de uma turma, aparecera:

- **Editar** - Abre dialog para editar nome, semestre e descricao
- **Gerenciar Alunos** - Acao futura para lista de alunos
- **Duplicar** - Cria copia da turma
- **Excluir** - Remove a turma (com confirmacao)

---

## Detalhes Tecnicos

### Componente utilizado
Sera usado o `DropdownMenu` do Radix UI (ja instalado no projeto via `@radix-ui/react-dropdown-menu`) com o componente shadcn/ui existente em `src/components/ui/dropdown-menu.tsx`.

### Alteracoes em `src/pages/Questions.tsx`
1. Importar `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuTrigger` do componente UI
2. Importar icones adicionais: `Pencil`, `Copy`, `Trash2`, `FileOutput`
3. Envolver o botao `MoreHorizontal` (linha 277) com o `DropdownMenuTrigger` e adicionar o `DropdownMenuContent` com as opcoes
4. Implementar funcoes: `handleDeleteQuestion` (remove do estado), `handleDuplicateQuestion` (clona com novo id)
5. Adicionar um `AlertDialog` para confirmacao de exclusao

### Alteracoes em `src/pages/Classes.tsx`
1. Mesmas importacoes de `DropdownMenu` e icones (`Pencil`, `Copy`, `Trash2`, `UserCog`)
2. Envolver o botao `MoreHorizontal` (linha 91) com o menu dropdown
3. Converter `mockClasses` para estado (`useState`) para permitir exclusao e duplicacao
4. Implementar funcoes analogas de deletar e duplicar
5. Adicionar `AlertDialog` para confirmacao de exclusao

### Garantias de UX
- O menu tera fundo solido (`bg-popover`) e `z-50` para nao ficar transparente
- A opcao "Excluir" tera cor vermelha (`text-destructive`) para destaque visual
- Confirmacao obrigatoria antes de excluir qualquer item
