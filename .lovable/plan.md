## Plano para tornar as imagens do processo confiáveis

### Objetivo
Fazer com que os processos do Júri Simulado passem a ter imagens geradas de forma mais estável, com salvamento no backend, status de geração e opção de reprocessar quando necessário.

### O que será construído

1. Separar a geração do texto e a geração das imagens
- O processo será criado primeiro com todo o conteúdo textual e com os anchors `[[IMAGE:slug]]`.
- As imagens deixarão de ser injetadas como base64 dentro do markdown no mesmo request.
- Isso evita falhas por timeout, respostas grandes demais e formatos inconsistentes do modelo de imagem.

2. Criar um registro próprio para imagens do processo
- Cada imagem do caso terá seu próprio registro com:
  - processo vinculado
  - slug/anchor
  - título
  - legenda
  - prompt visual
  - status (`pending`, `processing`, `ready`, `failed`)
  - URL final da imagem
  - mensagem de erro
- Assim será possível acompanhar exatamente qual imagem falhou e regenerá-la sem recriar o processo inteiro.

3. Usar pipeline de geração com upload para storage
- A geração seguirá o padrão mais confiável já usado no projeto para imagens médicas: gerar, validar retorno, converter e salvar em storage.
- A URL pública salva no backend será usada no processo, em vez de base64 embutido no texto.
- Se a primeira tentativa falhar, a função fará nova tentativa com prompt mais simples e controlado.

4. Melhorar o renderizador do processo
- O renderer vai substituir `[[IMAGE:slug]]` pela imagem salva correspondente no momento da exibição.
- Enquanto a imagem estiver sendo gerada, aparecerá um bloco visual premium de “imagem em processamento”.
- Se falhar, aparecerá um aviso elegante com botão de regenerar, sem quebrar o restante do processo.

5. Dar controle ao professor no editor
- No editor do Júri Simulado, cada processo terá uma área de imagens com:
  - status de cada imagem
  - pré-visualização
  - botão “Gerar novamente”
  - opção de upload manual como contingência
- O professor poderá corrigir o fluxo sem precisar gerar um novo processo completo.

6. Manter compatibilidade com o banco de processos
- Ao salvar um processo no banco de processos, também serão salvos os metadados e URLs das imagens.
- Ao reutilizar um processo em outra atividade, as imagens continuarão disponíveis sem precisar gerar tudo de novo.
- Se alguma imagem antiga não existir mais, o sistema mostrará status de pendência e permitirá regeneração pontual.

### Fluxo final esperado

```text
Gerar processo
  -> salva texto do processo
  -> salva lista estruturada de imagens pendentes
  -> inicia geração das imagens
  -> envia arquivos para storage
  -> marca cada imagem como pronta
  -> renderer troca [[IMAGE:slug]] pela URL final
```

### Arquivos/áreas que serão ajustados
- Backend function de geração do processo
- Função compartilhada de chamada à IA/imagem
- Estrutura do banco para imagens do Júri Simulado
- Página do editor do Júri Simulado
- Renderizador visual do processo
- Banco de processos para preservar imagens reutilizáveis

### Detalhes técnicos
- Em vez de depender da resposta inline do modelo de imagem dentro de `generate-mock-trial`, a geração será persistida e desacoplada.
- Vou criar uma tabela específica para imagens do processo, em vez de confiar só em `process_content`.
- Vou reaproveitar a lógica já existente de upload/URL pública usada no gerador de imagem médica, adaptando-a para o Júri Simulado.
- As políticas de acesso serão alinhadas ao padrão já usado pelos portais do Júri Simulado para que juiz e grupos consigam visualizar as imagens.
- O renderizador manterá compatibilidade com processos antigos: se o conteúdo já tiver imagem embutida, continua funcionando; se tiver anchor estruturado, passará a resolver pela URL salva.

### Resultado esperado
- O processo não fica mais “sem imagem” por causa de timeout ou retorno inválido.
- Cada imagem passa a ter status visível e regeneração isolada.
- O texto do processo continua acessível mesmo quando a imagem ainda está processando.
- Os processos salvos no banco continuam reutilizáveis com suas imagens já vinculadas.

Se você aprovar, eu implemento esse pipeline novo de imagens.