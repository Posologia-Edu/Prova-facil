

# Menu de Acoes nos Tres Pontinhos

## O que sera feito

Adicionar menus dropdown nos botoes de tres pontinhos em **Banco de Questoes** e **Minhas Turmas** com opcoes de acao.

---

## Banco de Questoes - Opcoes

- **Editar** - Abre dialog para editar a questao
- **Duplicar** - Cria uma copia da questao
- **Excluir** - Remove a questao com confirmacao

## Minhas Turmas - Opcoes

- **Editar** - Abre dialog para editar dados da turma
- **Gerenciar Alunos** - Acao futura
- **Duplicar** - Cria copia da turma
- **Excluir** - Remove a turma com confirmacao

---

## Detalhes Tecnicos

### Arquivos alterados
- `src/pages/Questions.tsx` - Adicionar DropdownMenu no botao de tres pontinhos das questoes
- `src/pages/Classes.tsx` - Adicionar DropdownMenu no botao de tres pontinhos das turmas

### Implementacao
1. Importar componentes `DropdownMenu` do shadcn/ui (ja existente no projeto) e icones `Pencil`, `Copy`, `Trash2`
2. Envolver o botao `MoreHorizontal` com `DropdownMenuTrigger` e adicionar `DropdownMenuContent` com as opcoes
3. Converter dados mock para `useState` para permitir exclusao/duplicacao em tempo real
4. Adicionar `AlertDialog` para confirmacao antes de excluir
5. Opcao "Excluir" em vermelho (`text-destructive`) para destaque visual
6. Menu com fundo solido e z-index alto para evitar transparencia

