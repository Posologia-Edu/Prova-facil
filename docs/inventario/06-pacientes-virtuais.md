# Inventário — Pacientes Virtuais (PV)

**Rotas professor:** `/virtual-patients` (lista), `/virtual-patients/case/:id` (editor de caso), `/virtual-patients/chat/:patientId` (teste do docente, `?ephemeral=1`), `/virtual-patients/analytics`, `/virtual-patients/research`
**Rotas aluno/público:** `/virtual-patients/room/:cvpId` (sala), `/virtual-patients/feedback/:cvpId`, `/virtual-patients/peer-eval/:token`; entrada pelo PIN/e-mail em `/student/auth`
**Arquivos principais:** `VirtualPatients` (233), `VirtualPatientCaseEditor` (387), `components/vp-case/*` (1331), `VirtualPatientChat` (291), `VirtualPatientRoom` (1138), `components/vp-room/*` (645), `VirtualPatientMAI` (287), `VirtualPatientFeedback` (529), `VPAnalytics` (1986), `vp-analytics/CalibrationPanel` (96), `VPResearch` (735), `VpPeerEvaluation` (209)
**Edge functions:** `virtual-patient-chat` (ações `encounter_brief`, chat), `generate-vp-case` (gerar, `auditar`, gerar versão), `measure-virtual-patient-vitals`, `grade-virtual-patient`, `vp-debrief`, `send-vp-peer-eval-invites`, `vp-peer-eval-summary`, `vp-peer-eval-context`, `submit-vp-peer-evaluation`, `vp-compute-coherence`, `vp-ai-idcg`.

## 1. Lista — `/virtual-patients` (já redesenhada na branch)

Cabeçalho; botões **Biblioteca de casos** (`CaseLibraryDialog`: casos-semente, copiar para a conta como rascunho via RPC `copy_vp_seed_case`) e **Gerar com IA** (`GenerateCaseDialog`: categoria, contexto clínico com sugestões, "quem conta a história", profissões [checkbox], execução em etapas com estados ok/aviso, depois abre o editor). Filtros em chips por módulo (profissão/categoria) com contagem. Cartão: avatar com iniciais, nome, idade, profissão, descrição, badges (Rascunho / Publicado / Legado / Meu paciente), **Iniciar atendimento** (teste efêmero do docente), **Editar caso**, **Excluir** (só casos próprios), **Adicionar à biblioteca** (`PublishToLibraryDialog`: título, tema, dificuldade, resumo; **só admin**, RPC `publish_vp_seed_case`).

## 2. Editor de caso — `/virtual-patients/case/:id`

- Cabeçalho: voltar, **nome, idade**, badges (categoria, Legado, Publicado/Rascunho, Somente leitura, **Alterações não salvas**), **Salvar rascunho**, **Publicar** (bloqueado com erros de validação).
- Alerta de validação (lista de problemas antes de publicar, ou "consistente").
- **Revisão de consistência** (`RevisaoPanel`): problemas por gravidade, sugestão, marcar como resolvido, **refazer revisão** (função `auditar`); se não há revisão, botão "Fazer revisão agora". Exige salvar antes.
- **Adicionar versão** (Farmacêutico / Enfermeiro / Médico): **com IA** (lê o núcleo salvo) ou **Manual** (clona uma existente).
- Abas: **Núcleo clínico**, uma aba por versão presente, **Prévia**, **Histórico** (só quem edita).
  - *Núcleo*: identidade (nome, idade, sexo, ocupação, estado civil, moradia, escolaridade, alergias, peso, altura, hábitos, histórico familiar), personalidade (temperamento, modo de falar, letramento em saúde, como se sente), **o que o paciente sabe**, **medicamentos**, **achados (cartões)**, **exames com resultado fixo**, **vitais de base** (PA, FC, FR, Temp, SatO₂, glicemia) + contexto para ajustar vitais.
  - *Versão* (por profissão): **cenário** (local, tratamento, motivo da vinda, fala de abertura), **quando cada fato é revelado**, **quando cada achado é apresentado**, perguntas do paciente, fora do roteiro, dicas de atuação, **gabarito** (problemas esperados, red flags, informações-alvo, penalidades críticas, conduta, orientações, encaminhamentos, objetivos de aprendizagem, referências), **encontros** (tipo, interlocutor/persona com perfil, temperamento, resistências, critérios para ceder, **cartão de passagem** cenário/tarefa, tempo sugerido, evolução conforme o implementado, "se nada foi implementado").
  - *Prévia* (`PreviewChat`): conversa de teste com o caso.
  - *Histórico*: snapshots em `custom_virtual_patient_versions`; restaurar carrega no editor (confirmar salvando).
- Casos **legados** abrem em `LegacyView` somente leitura.
- Dados: `custom_virtual_patients` (`case_data`, `status`), versões; permissões: só o dono edita.

## 3. Sala do aluno — `/virtual-patients/room/:cvpId`

- Entrada: sessão no `sessionStorage` (`vp_email`, nomes, e-mails do grupo) gravada em `/student/auth` após validar PIN, e-mail na turma e atribuição do docente (grupo ou individual); bloqueia quem está em outro PV da turma.
- **Modos:** individual ou **grupo** (sessão compartilhada com tempo real via canal `vp-room-<sessão>`, indicador "outro integrante está conversando…"); **Avaliativo** ou **Treino** (treino não pede consentimento de pesquisa e leva direto ao feedback); dificuldade; **PIN** da sala (copiável).
- **Divisão de funções** (se o docente ligou): `RolesDialog` escolhe quem registra a ficha em cada encontro e quem conduz a conversa; o chat é bloqueado para quem está na ficha.
- **Cartão do encontro** (`EncounterCard`): cenário, seu papel, com quem conversa, tarefa, tempo sugerido, regras de interação; abre sozinho na 1ª vez de cada encontro, **cronômetro** do encontro, botão "Ver cartão".
- **Chat** com o paciente (histórico, markdown simples), botão **Medir Sinais Vitais** (aparece quando o aluno diz que vai aferir; `measure-virtual-patient-vitals`).
- **Ficha eletrônica** (`RecordPanel`, só casos v2): painel com 3 abas (1º, 2º, 3º encontro), seções por profissão (Farmácia: identificação, queixa/HDA, antecedentes, medicamentos, alergias, hábitos, social, objetivos, impressão; Enfermagem/Medicina com rótulos próprios; SBAR no 2º; SOAP no 3º); autosalvamento com aviso de falha.
- **Avançar encontro** (3 encontros; rótulos: Anamnese inicial, Eficácia/Segurança, Ajustes finais + MAI) e **Concluir atendimento**: aviso se o SOAP do 3º encontro está em branco; **MAI** (10 critérios: indicação, efetividade, dosagem, técnica, comodidade, interações, duplicidade, duração, custo) **só na Farmácia e nos casos sem ficha**; Enfermagem/Medicina concluem sem MAI.
- **Consentimento de pesquisa** (LLM e RAG em simulações clínicas, versão 1.0, aceitar ou recusar) no 1º acesso avaliativo.
- Ao concluir: dispara correção (`grade-virtual-patient`), em grupo gera notas por integrante e **envia e-mails de avaliação entre pares** (modal avisa o grupo); treino vai direto ao feedback.

## 4. Feedback do aluno — `/virtual-patients/feedback/:cvpId` (piloto já redesenhado)

Estados: gerando, não disponível, aguardando liberação do docente. Conteúdo: nota/ScoreRing, detalhamento por critério, feedback do professor (IA Tutor), orientações, MAI por medicamento (escala apropriado/marginal/inadequado), resumo de avaliação entre pares, `DebriefCard` (cobertura ponderada, informações que deveria levantar, problemas embutidos, sinais de alerta e conduta esperada).

## 5. Análises — `/virtual-patients/analytics` (1986 linhas)

- Seleção de turma (lista de turmas → "Todas"), filtros **Avaliativos / Treino / Todos**, filtro por paciente; botões **Pesquisa** (abre `/virtual-patients/research?class=`) e **Corrigir Turma** (correção em lote; treino se corrige sozinho).
- Cartões: sessões elegíveis, correções concluídas, pendentes, **flags de segurança** (contagem por flag).
- Tabela **Resultados**: aluno/grupo, e-mail, status (Corrigido / Ajustada / Pendente), **nota 0–10** (com bônus), **Eficiência clínica**, flags, **Liberar/ocultar feedback**, Detalhes.
- **Painel de calibração** (`CalibrationPanel`) agregado.
- **Dialog de detalhes** (longo, sem abas): paciente, notas por dimensão (subscores e `FICHA_LABELS`), MAI 0–4, nota final, eficiência 0–5, bônus/penalidades, **avaliação entre pares** (bônus calculado por `computePeerBonus`, aviso se todos deram a mesma nota), feedback resumido, orientações, **ajuste manual** (modo edição: notas, flags uma por linha, motivo e observação; propaga a integrantes do grupo), conversa completa com mensagens por integrante e encontro.

## 6. Pesquisa — `/virtual-patients/research` (735 linhas)

Filtro por turma; ações **Coerência semântica**, **IDCG por IA**, exportar **CSV, XLSX, PDF**; tabela por sessão (grupo/aluno, paciente, LGPD sim/não/pendente, interações, latência, coerência, IDCG, ISC); dialog **Avaliação científica da sessão** (IDCG Likert 1–5, severidade, realismo e qualidade conversacional Likert 1–5, precisão factual 0–1, estabilidade comportamental %, análise qualitativa). Tabela `vp_research_metrics`.

## 7. Avaliação entre pares — `/virtual-patients/peer-eval/:token`

Link por e-mail (sem login): critérios com notas (participação, contribuição, colaboração) para cada colega e comentário opcional.

## 8. Teste do docente — `/virtual-patients/chat/:patientId`

Chat efêmero para o docente testar o paciente: encontros, avançar encontro, badges de módulo e encontro, "Concluído".

## Observações / lacunas

- O vínculo PV ↔ turma (`class_virtual_patients`: modo, dificuldade, divisão de funções, rótulo/grupo, atribuições `class_vp_assignments`) é gerenciado na Turma, não aqui (ver inventário da Turma).
- "Análises VP" é seção do menu; o plano é mover para dentro da Turma (aba Análises).
- Análises e Pesquisa são telas densas; o dialog de detalhes concentra muita coisa sem abas.
- Materiais de consulta / bloqueio de colar na sala do aluno: **ainda não existem** (funcionalidade nova pendente).

## Protótipo vs. real

O protótipo tinha 5 telas de PV + editor em 3 abas. O real tem: editor com Núcleo / uma aba por versão (Farmacêutico, Enfermeiro, Médico) / Prévia / Histórico, revisão de consistência, geração por IA, biblioteca; sala com ficha de 3 encontros, cartão do encontro com cronômetro, funções do grupo, vitais, MAI, consentimento; análises com correção em lote, ajuste manual, pares, calibração; pesquisa com exportações. O redesenho precisa cobrir todas essas superfícies.
