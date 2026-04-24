# Plano para gerar processos completos, com todas as exigências, sem falhas recorrentes

## Objetivo
Transformar a geração e a regeneração do Júri Simulado em um fluxo confiável, assíncrono e validado por etapas, para que os processos saiam completos, consistentes com seus pedidos e sem parar no meio.

## Problema atual
Hoje a geração depende de uma chamada única e muito pesada da IA dentro de uma função com limite de tempo. Isso está causando:
- abortos por tempo limite;
- respostas parciais com só 1 ou 2 anexos;
- retries que repetem a mesma falha;
- regenerações que ainda quebram;
- casos antigos incompletos e até duplicados por número.

## O que será implementado

### 1) Novo fluxo assíncrono de geração
A geração deixará de depender de uma única resposta longa.

Novo fluxo:
```text
Professor clica em Gerar/Regerar
-> backend cria um job de geração
-> resposta imediata com status "em processamento"
-> processamento continua em segundo plano
-> geração acontece por etapas menores
-> cada etapa é validada
-> se faltar algo, só a parte com problema é refeita
-> processo é publicado apenas quando estiver completo
```

Isso elimina o gargalo principal do timeout.

### 2) Geração em blocos, não em documento único
Em vez de pedir tudo de uma vez, o sistema vai montar o processo em etapas:
- blueprint do caso;
- metadados principais do processo;
- Relato dos Fatos;
- Fundamentação Jurídica;
- Denúncia;
- anexos gerados individualmente;
- personagens/testemunhas técnicas;
- conferência final e montagem do `process_content`.

Cada anexo será gerado separadamente. Se o Anexo 4 falhar, o sistema refaz só o Anexo 4, sem perder o restante.

### 3) Validação forte baseada nas suas exigências
A validação deixará de ser só “tem ou não tem anexo”. Ela vai checar também:
- quantidade exata de anexos planejados;
- presença obrigatória de todas as seções;
- ausência de placeholders e instruções vazadas;
- tamanho mínimo de depoimentos e perícia;
- consistência entre profissão do réu, conselho profissional e perito;
- presença dos anchors de imagem e anexos de imagem;
- fechamento correto do texto, para detectar truncamento;
- coerência entre lista de provas e anexos realmente gerados;
- existência do conteúdo obrigatório que você definiu: easter eggs, plot twist, neutralidade, testemunhas técnicas e profundidade documental.

Se algo falhar, o sistema entra em modo de reparo e tenta corrigir apenas a parte faltante.

### 4) Persistência do progresso no banco
Vou adicionar estrutura para acompanhar a geração no backend, com campos/tabela para:
- status do job;
- etapa atual;
- progresso;
- tentativas por etapa;
- erros detalhados;
- resultado parcial por seção/anexo;
- vínculo com o processo original em caso de regeneração.

Isso vai permitir:
- sair da tela e voltar depois sem perder o processo;
- continuar uma geração interrompida;
- mostrar ao professor exatamente em que etapa está;
- evitar duplicações acidentais.

### 5) UI de acompanhamento no editor
Na tela do Júri Simulado, a geração vai mostrar:
- status real: “planejando”, “gerando anexo 1”, “validando”, “corrigindo anexo 3”, “concluído”, “falhou”;
- barra/progresso por etapas;
- botão para tentar novamente só a etapa com erro;
- diferenciação clara entre “Gerar novo processo” e “Regerar este processo”;
- bloqueio para evitar cliques repetidos que criem duplicidade.

### 6) Reparo dos processos já quebrados
Vou tratar também os processos já criados e incompletos.

Plano de reparo:
- identificar casos incompletos pela validação nova;
- usar os objetivos já salvos para reconstruir o conteúdo;
- reaproveitar o número do processo e a posição original;
- substituir apenas quando a nova versão passar em toda a validação;
- marcar versões antigas problemáticas para revisão, evitando confusão com duplicados.

### 7) Regeneração robusta
O botão “Regerar com IA” vai usar exatamente o mesmo pipeline robusto do gerador principal.

Ou seja:
- não será mais uma chamada única frágil;
- vai virar um job completo com progresso, validação e reparo;
- só atualiza o caso quando a nova versão estiver realmente pronta.

## Entregáveis

### Backend
- refatoração da função `generate-mock-trial` para iniciar job assíncrono;
- criação de estrutura de job/progresso no banco;
- worker de geração por seções/anexos;
- pipeline de validação e auto-reparo;
- rotina de reparo para casos antigos incompletos.

### Frontend
- atualização do `MockTrialEditor` para iniciar jobs e acompanhar progresso;
- interface de status para geração e regeneração;
- prevenção de duplicidade e melhor tratamento de erro;
- atualização automática quando o processo terminar.

### Qualidade
- validação antes de publicar qualquer processo;
- logs mais claros por etapa;
- mensagens úteis para falha real de crédito/rate-limit vs falha de conteúdo.

## Detalhes técnicos
- Arquivos principais envolvidos:
  - `supabase/functions/generate-mock-trial/index.ts`
  - `src/pages/MockTrialEditor.tsx`
  - nova migration para job/status da geração
  - possivelmente uma função auxiliar de worker/status
- A geração de imagens continuará desacoplada, como já está, para não voltar a causar timeout.
- O processo só será salvo como concluído quando passar em todas as validações.
- Vou manter suas regras atuais de profundidade e completude, mas distribuídas em etapas menores para a IA conseguir cumprir sem cortar no meio.

## Resultado esperado
Depois dessa mudança:
- gerar e regerar terão o mesmo fluxo robusto;
- processos longos não dependerão mais de uma resposta única sujeita a timeout;
- anexos faltantes poderão ser corrigidos sem refazer tudo;
- processos novos só aparecerão como prontos quando estiverem completos;
- os processos incompletos atuais poderão ser recuperados com segurança.

Se você aprovar, eu implemento esse pipeline completo e já deixo a geração antiga substituída por essa versão robusta.