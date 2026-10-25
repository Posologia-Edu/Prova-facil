# Inventário — Simulação Realística (Farmácia Clínica + 6 áreas)

**Escala:** ~15.700 linhas só nas páginas de Farmácia; mais 6 áreas com 5 páginas cada. É o maior módulo do sistema depois de Pacientes Virtuais.

## 1. Hub — `/simulations` (`Simulations.tsx`, 1068 linhas)

- **Duas camadas de abas:** *Áreas* (7 cartões) → *Farmácia Clínica* (módulos). Abas **Ativas (N) / Inativas (N)** (arquivamento por sala).
- **Áreas:** Farmácia Clínica (aba interna), Enfermagem (`/nursing`), Nutrição (`/nutrition`), Odontologia (`/dentistry`), Medicina (`/medicine`), Fisioterapia (`/physiotherapy`), Biomedicina (`/biomedicine`).
- **Módulos da Farmácia (cartões):** Anamnese (aba), SOAP (aba), Reconciliação (aba), Documentação (aba), **Agregador de Notas** (`/simulations/aggregator`).
- Para cada módulo, uma lista de salas com: título editável (`EditableRoomTitle`), status (rascunho, ativa, concluída, pausada), participantes, PIN, e botões **Editar, Ativar (rascunho→ativa), Controle** (ou "Rever" se concluída), **Dividir** (cria várias salas finais com professor e alunos próprios), **Duplicar**, **Enviar para professor** (`ShareRoomDialog`: copia a sala para o e-mail de outro docente), **Arquivar/Desarquivar**, **Excluir**.
- Criar sala de Anamnese em dialog (nome, descrição, duração em minutos). SOAP, Reconciliação e Documentação abrem páginas próprias (`SoapRooms`, `ReconciliationRooms`, `DocumentationRooms`) com dialog de criação que aceita **sala de origem** (importar alunos da etapa anterior).

## 2. Anamnese (cadeia: Anamnese → SOAP → Reconciliação → Documentação)

**Rotas:** `/simulations/:roomId/edit`, `/simulations/:roomId/control`, público `/simulation/join` (PIN + e-mail).

- **Editor** (3 abas): *Participantes* (professor + lista de alunos, importar de outra sala, editar `ParticipantEditDialog`), *Formulários* (4 tipos: **Anamnese**, **Roteiro do paciente**, **Avaliação do observador**, **Avaliação do professor**; construtor `FormBuilder`; **templates**, salvar template, exportar PDF; casos clínicos do **Banco de Casos** `ClinicalCaseBankDialog` (com gerador por temática) ; autosave a cada 800 ms; validação: as notas do professor e do observador devem somar **10** para iniciar), *Configurações* (nome, descrição, duração, **competências** vinculadas). Ações: **importar de outra sala**, **iniciar**, **retomar**, **reiniciar** (apaga rodadas e respostas), PIN visível.
- **Controle** (2 abas: *Rodada*, *Análises*): formar **duplas/trios** (professional, paciente, observador; manual ou sorteio), **gerar rodadas** por ciclo, **liberar materiais do ciclo**, **iniciar próxima rodada / rodada específica fora de ordem**, **encerrar**, **reabrir rodada encerrada por engano**, **cancelar**, **trocar participante ou papel** (RPC `swap_simulation_assignment`), **definir caso do paciente** (RPC `set_simulation_assignment_case`), **pausar para continuar em outro dia** (tela de pausa para os alunos) e **retomar**, **resetar rodadas**; presença em tempo real (canais `sim-participants-`, `sim-presence-`); relatórios por dupla (`SimulationReportGenerator`: PDF por dupla e **envio por e-mail** com `send-simulation-report`). Análises: média por aluno, por rodada, respostas.
- **Join** (1932 linhas): fluxo por papel (professor, aluno profissional, paciente, observador), fases de espera/materiais/rodada/envio, rascunho recuperado, **reposição de anamnese** (`MakeupSetupDialog`: "Leva N", 2 passos: quem faz, com quem), integração com **Paciente Virtual** (sala PV pelo mesmo PIN).

## 3. SOAP

**Rotas:** `/simulations/soap`, `/simulations/soap/editor/:roomId`, `/simulations/soap/control/:roomId`, `/simulation/soap/join`.
- **Editor** (2 abas): Participantes (importar alunos da anamnese), Formulários (SOAP e avaliação entre pares, importar de outra sala SOAP).
- **Controle** (6 abas): *Duplas*, *Respostas SOAP*, *Avaliações entre pares*, *Ausentes*, *Notas do Admin*, *Notas finais* (nota final do módulo por aluno).
- **Join** (aluno): vê as respostas de anamnese, preenche o SOAP, aguarda o par, **avalia o SOAP do colega**, tela de conclusão.

## 4. Reconciliação

**Rotas:** `/simulations/reconciliation[...]`, `/simulation/reconciliation/join`.
- **Editor** (3 abas): Participantes (importar do SOAP), Formulários, **Casos clínicos** (banco + IA).
- **Controle** (3 abas): Participantes (duplas), Respostas, **Avaliação** (nota final do admin + feedback; correção por IA).
- **Join**: PIN + e-mail, ficha de reconciliação sobre o caso, "Ficha Enviada!".

## 5. Documentação

**Rotas:** `/simulations/documentation[...]`, `/simulation/documentation/join`; `/docs` (documentação do sistema, pública).
- **Editor** (4 abas): Participantes (importar da Reconciliação), **Encaminhamento** (formulário), **Quadro Resumo** (tabela de medicamentos com colunas configuráveis, linhas esperadas "espelho", pontuação por linha), Casos clínicos.
- **Controle** (3 abas): Participantes, Respostas, Avaliação (**nota do Encaminhamento máx. 5,0** + **Quadro Resumo máx. 5,0**, feedback; função `grade-documentation`; reabrir envio da dupla).
- **Join**: caso clínico + encaminhamento + quadro resumo, "Documentação Enviada!".

## 6. Agregador de notas — `/simulations/aggregator`

Filtros por semestre e turma, seleção das salas exibidas, abas **Por Sala** e **Consolidado** (visão por aluno, média geral), **exportar PDF consolidado**.

## 7. Seis áreas (Enfermagem, Nutrição, Odontologia, Medicina, Fisioterapia, Biomedicina)

**Estrutura repetida 6×** (cópias quase idênticas: o diff entre Enfermagem e Medicina tem ~52 linhas): `XSimulations`, `XEditor`, `XControl`, `XJoin`, `XAggregator`.
- Rotas: `/x`, `/x/aggregator`, `/x/:moduleType/editor/:roomId`, `/x/:moduleType/control/:roomId`, público `/x/join`.
- **4 módulos por área:** Enfermagem (Acolhimento, SAE, Evolução, Passagem de plantão); Nutrição (Anamnese nutricional, Avaliação antropométrica, Plano alimentar, Orientação nutricional); Odontologia (Anamnese odontológica, Exame clínico, Plano de tratamento, Orientação de higiene); Medicina (Anamnese médica, Exame físico, Raciocínio clínico, Plano terapêutico); Fisioterapia (Avaliação funcional, Diagnóstico cinético-funcional, Plano fisioterapêutico, Evolução); Biomedicina (Análise laboratorial, Controle de qualidade, Interpretação, Laudo técnico).
- Lista por módulo (abas), criar sala, ativar, controle, **dividir**, duplicar, **enviar para professor**, excluir (sem arquivar, sem edição inline de título).
- **Editor** (3 abas): Participantes, Formulários, Casos clínicos. **Controle** (3 abas): Participantes, Respostas, Avaliação (correção por IA: funções `grade-nursing`, `grade-medicine`…). **Agregador**: Consolidado / Por sala.

## Tabelas (padrão)

`<area>_rooms`, `_participants`, `_forms`, `_clinical_cases`, respostas; Farmácia: `simulation_*` (rooms, participants, forms, rounds, round_assignments, responses, sessions), `soap_*`, `reconciliation_*`, `documentation_*`, `clinical_case_bank`.

## Observações / lacunas

- Em todos: PIN + e-mail para entrar, **sem vínculo com Turma** (a ligação à turma é pendência já mapeada: exige banco de alunos).
- Nas 6 áreas faltam recursos que a Farmácia tem (arquivar, título editável, rodadas, pausa, reposição, relatório por e-mail).
- Muita duplicação de código: um candidato a refatoração/tema único, mas a camada visual deve cobrir todas as variações.
- Painel só conta/mostra Medicina na atividade recente.

## Protótipo vs. real

O protótipo "Simulação ×3" não mostrou: cadeia de 4 módulos, abas Ativas/Inativas, dividir/enviar/arquivar, rodadas/ciclos, pausa/reposição, relatórios por e-mail, as 6 áreas e os agregadores.
