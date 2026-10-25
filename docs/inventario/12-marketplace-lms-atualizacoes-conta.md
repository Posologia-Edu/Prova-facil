# Inventário — Marketplace, Integração LMS, Atualizações, Configurações, Planos, Contato, Lixeira, Admin

## Marketplace — `/marketplace` (`Marketplace.tsx`, 680)

- Provas compartilhadas entre professores (`marketplace_exams`). Cabeçalho, busca, filtro por **disciplina**, ordenação (**mais recentes, melhor avaliação, mais baixadas**).
- Cartão: título, autor (perfil), disciplina, nota média (estrelas), downloads, nº de questões.
- **Dialog da prova**: título, descrição, **prévia das questões** (de `exam_questions`/`question_bank`), **avaliação por estrelas** (`marketplace_ratings`, uma por usuário, editável), **comentários** (`marketplace_comments`, lista e envio), botão **Importar** (copia a prova e as questões para a conta como rascunho; incrementa downloads; a prova importada não pode ser compartilhada de novo).
- Quem compartilha: menu da prova em Minhas Provas / ExamView (**Compartilhar** e **Revogar**).

## Integração LMS — `/lms-integration` (`LmsIntegration.tsx`, 230)

- Abas **Exportar** (notas de uma prova em **Moodle CSV, Canvas CSV, Google Classroom CSV**; escolha da prova e da turma; lê `exam_sessions`) e **Importar** (questões de **Moodle XML, QTI (IMS) ou CSV genérico** para o Banco de Questões; é aqui que a importação prometida no Banco de Questões de fato existe).
- Lacuna: Banco de Questões mostra aba "Importar CSV/JSON" sem função, enquanto a importação real mora aqui.

## Atualizações — `/updates` (`UpdatePipeline.tsx`, 311)

- Abas **Changelog** (concluídas) e **Roadmap** (planejadas). Itens de `system_updates` com tipo, título, descrição, **prioridade** (alta/média/baixa).
- **Admin** pode: criar entrada, **gerar roadmap com IA** (`generate-roadmap`), marcar como concluída, excluir; docentes só leem.
- Alimenta o diálogo proativo do Painel (só admin).

## Configurações — `/settings` (`Settings.tsx`, 189)

Cartões: **Perfil** (nome completo), **Alterar e-mail**, **Alterar senha** (nova + confirmar). Idioma e tema ficam no menu do usuário (rodapé da barra lateral). Sem preferências de notificação, sem foto, sem assinatura.

## Planos — `/pricing` (`Pricing.tsx`, 175) e página pública `/planos`

Cartões **Gratuito** (limites: provas/mês, questões IA/mês etc. via `FREE_LIMITS`) e **Premium**; botão assinar (`create-checkout`, Stripe), **cancelar assinatura** (`cancel-subscription`, com confirmação). `PremiumGate` bloqueia recursos premium.

## Contato — `/contact` e `/contato-publico`

Formulário (remetente e e-mail do perfil, assunto *, mensagem * até 2000 caracteres; `send-contact`).

## Lixeira — `/trash` (`Trash.tsx`, 550)

- Abas **Todos / Questões / Provas / Turmas**; itens de `question_bank`, `exams`, `classes` com `deleted_at`; **prévia** em dialog, **restaurar**, **excluir permanentemente**, **esvaziar lixeira** (confirmações). Aviso "excluídos permanentemente após 30 dias".
- **Lacuna importante:** SCT, KFE, SJT, Progress Test, Mini-CEX, OSCE, Pacientes Virtuais (casos próprios, hard delete), Júri e simulações dizem "movido para lixeira" no toast (`deleted_at`), mas **não aparecem na Lixeira** → ficam invisíveis sem como restaurar (salvo direto no banco). Decidir: incluir esses tipos na Lixeira ou mudar a mensagem.

## Admin — `/admin` (`Admin.tsx`, 562; só admin)

- Contadores (usuários, provas no sistema etc.), **convidar por e-mail** (`send-invite`) com lista de convites e status.
- Abas **Pendentes** (aprovar/rejeitar cadastros), **Aprovados** (listar, excluir usuário com confirmação; função `admin-users`), **Assinantes** (Stripe, recarregar), **Analytics** (`AdminAnalytics`: visitas por dia, páginas mais acessadas, origens de tráfego, funil de conversão, tipos de evento; tabela `analytics_events`).
- `AdminApiKeys`: gerenciar chave do provedor Google (Gemini) em `ai_api_keys` (a regra do projeto é só Gemini).
- `SystemPromptViewer` (botão em Questões, Provas etc.): mostra o prompt do sistema por ferramenta (só admin).

## Protótipo vs. real

Nada disto foi prototipado. Todas são telas de cartões + formulários simples, exceto Lixeira, Marketplace e Admin (abas).
