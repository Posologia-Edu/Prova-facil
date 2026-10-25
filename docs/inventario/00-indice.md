# Inventário real dos módulos — índice e achados transversais

Gerado em 2026-10-24 lendo o código da branch `redesign` (sem login nem dados reais). Cada arquivo traz rota, arquivos, estrutura da tela, dados, regras, lacunas e "protótipo vs. real".

| # | Arquivo | Módulo | Visual atual |
|---|---|---|---|
| 01 | [painel](01-painel.md) | Painel | antigo |
| 02 | [banco-de-questoes](02-banco-de-questoes.md) | Banco de Questões | antigo (tokens novos) |
| 03 | [compositor](03-compositor.md) | Compositor | antigo |
| 04 | [provas](04-provas.md) | Minhas Provas, Editor, Monitoramento, prova e resultado do aluno | antigo |
| 05 | [formularios](05-formularios.md) | SCT, KFE, Mini-CEX/DOPS, SJT, Progress Test | antigo |
| 06 | [pacientes-virtuais](06-pacientes-virtuais.md) | Pacientes Virtuais (lista, editor, sala, feedback, análises, pesquisa, pares) | lista e feedback novos; resto antigo |
| 07 | [simulacao-realistica](07-simulacao-realistica.md) | Farmácia (4 módulos) + 6 áreas + agregador | antigo |
| 08 | [osce](08-osce.md) | OSCE | antigo |
| 09 | [juri-simulado](09-juri-simulado.md) | Júri Simulado | antigo |
| 10 | [turma](10-turma.md) | Turma | lista e Atividades novas; 9 abas antigas |
| 11 | [calendario-analises-competencias](11-calendario-analises-competencias.md) | Calendário, Análises, Competências | antigo |
| 12 | [marketplace-lms-atualizacoes-conta](12-marketplace-lms-atualizacoes-conta.md) | Marketplace, LMS, Atualizações, Configurações, Planos, Contato, Lixeira, Admin | antigo |
| 13 | [portal-aluno-e-paginas-publicas](13-portal-aluno-e-paginas-publicas.md) | Portal do aluno, auth, landing e páginas públicas | antigo |

## Tamanho real

~50 mil linhas em `src/pages` + ~15 mil em `src/components` (fora `ui/`). Os maiores: Análises de PV (1986), Entrada de Simulação (1932), Editor de Prova (1668), Editor do Júri (1500), Editor de Documentação (1147), Sala do PV (1138), Banco de Questões (1071), Hub de Simulações (1068).

## O que o protótipo aprovado omitiu (resumo)

- **Painel:** onboarding, diálogo de roadmap (admin), 7 áreas de simulação.
- **Provas:** editor de 5 abas, segurança/proctoring, monitoramento em tempo real, código de acesso, tutor de IA na correção, PDF com versões.
- **Formulários:** apenas um genérico foi mostrado; são 5 editores distintos + portais públicos.
- **PV:** 3 versões por profissão, revisão de consistência, geração por IA, biblioteca, histórico, ficha de 3 encontros, cartão do encontro, funções do grupo, MAI, consentimento, correção em lote, ajuste manual, pares, pesquisa.
- **Simulação:** cadeia Anamnese→SOAP→Reconciliação→Documentação, rodadas/ciclos, pausa, reposição, dividir/enviar/arquivar, relatórios por e-mail, 6 áreas.
- **OSCE:** checklist tipado, materiais, PV por estação, grade de rotação, monitor de chat, avaliador e aluno.
- **Júri:** 7 abas, geração por IA com PDF, painel do juiz com 6 fases, 5 sub-abas de resultado.
- **Turma:** 10 abas, 4 visões de cronograma, QR de presença, visitas técnicas, rubricas de seminário.

## Achados transversais (candidatos a decisão)

**Bugs ou promessas sem função (corrigir ou remover, independente do visual):**
1. **Banco de Questões:** aba "Importar CSV/JSON" é só uma zona de arraste sem ação (a importação real está em Integração LMS).
2. **Banco de Questões:** editar não permite alterar alternativas/gabarito/pares; criação manual de MC gera opções vazias.
3. **Compositor:** `ExamPDFExporter` montado, mas sem botão para abrir; "arrastar" é só ícone; questões de template não são gravadas (só UUID real).
4. **Editor de Prova:** "Ordem das questões: Fixa/Aleatória" não persiste (`defaultValue`).
5. **Minhas Provas:** modo "Selecionar provas" sem nenhuma ação em lote; ícones de e-mail e gráfico decorativos.
6. **Lixeira:** só cobre Questões, Provas e Turmas; SCT, KFE, SJT, Progress, Mini-CEX, OSCE, Júri, simulações dizem "movido para lixeira" mas somem sem restauração.
7. **Duas formas de publicar prova** (diálogo em ExamView e aba Aplicação do Editor): conferir se são equivalentes.

**Estrutura:**
8. Quatro lugares de "análise" desconectados (Análises, Análises VP, Competências, análises internas de cada módulo).
9. **Calendário só mostra provas online**; não mostra aulas da Turma, OSCE, Júri nem simulações.
10. **Só PV e Prova vinculam à Turma**; Simulação, OSCE, Júri e formulários usam PIN/e-mail ou digitação (pendência já mapeada).
11. Seis áreas de simulação são cópias do mesmo código (~52 linhas de diferença) e têm menos recursos que a Farmácia (sem arquivar, pausa, rodadas, relatórios).
12. Portal do aluno é só um campo de PIN; Gamificação e Portfólio não têm entrada de menu; acessibilidade só na prova.
13. Nomes e i18n: muita interface em português fixo; só parte usa `t()`.

## Ordem sugerida de redesenho (para decidir)

Critério: valor visível × risco × dependência.
1. **Resto da Turma** (as 9 abas): já é o centro; reaproveita o que foi feito.
2. **Painel + Minhas Provas + Banco + Compositor** (o fluxo "avaliar" do dia a dia).
3. **Pacientes Virtuais** (editor, sala do aluno, análises): módulo mais usado e mais novo.
4. **Simulação** (primeiro o hub e o componente comum de sala; depois replicar nas 6 áreas via tema compartilhado).
5. **OSCE, Formulários, Júri** (Júri só depois do evento de 30/10).
6. **Gestão** (Calendário, Análises unificadas, Competências, Marketplace, Admin, Lixeira).
7. **Portal do aluno e landing** (reabrir decisão de produto: "Minha área" do aluno).

## Decisões que preciso de você

1. Resolver já os itens 1–7 de "bugs e promessas" (pequenos, independentes) ou só registrá-los?
2. Lixeira: incluir os demais tipos ou ajustar a mensagem?
3. Confirmar a ordem acima (ou mudar prioridade).
4. Posso refazer o protótipo a partir deste inventário, módulo por módulo, ou prefere partir direto para o código na branch `redesign`?
