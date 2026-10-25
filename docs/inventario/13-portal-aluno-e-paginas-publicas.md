# Inventário — Portal do aluno, autenticação e páginas públicas

## Porta de entrada do aluno — `/student/auth` (`StudentAuth.tsx`, 684)

**Portal único por PIN + e-mail (sem login).** O aluno digita o PIN e o e-mail; o sistema identifica o tipo de atividade **na ordem**: sala de Simulação (Anamnese) → SOAP → Reconciliação → Documentação → Paciente Virtual → Júri Simulado → OSCE → prova online. Guarda dados em `sessionStorage` (`sim_pin/sim_email`, `soap_*`, `recon_*`, `doc_*`, `vp_*`) e redireciona para `/simulation/join`, `/simulation/soap/join`, `/simulation/reconciliation/join`, `/simulation/documentation/join`, `/virtual-patients/room/:cvpId` (ou feedback, se já concluído), `/mock-trial/portal/:pin`, `/osce/student/:pin` ou `/student/exam/:sessionId`.
- **Avaliação individual ou em grupo:** no modo grupo o aluno informa o e-mail de todos os membros (adicionar/remover); o sistema valida que todos estão na turma, no mesmo grupo (Júri) e atribuídos ao PV; mensagens de erro nomeiam quem falhou.
- Regras de PV: sala precisa estar ativa; aluno atribuído pelo docente; **bloqueia aluno já em outro PV da turma**; treino x avaliativo.
- `StudentDashboard` (`/student/dashboard`) hoje só redireciona para `/student/auth`.

## Páginas do aluno após a prova

- `/student/results/:sessionId`: nota, feedback do professor, **feedback de IA** (ver inventário de Provas); botões para Gamificação e Portfólio.
- `/student/gamification` (`StudentGamification`, 168): **pontos** (`student_points`), **conquistas** (`student_achievements` + `achievement_definitions`), **Top 10 ranking** (pontos de todos), pontos recentes.
- `/student/portfolio` (`StudentPortfolio`, 212): portfólio do aluno por e-mail (criado sob demanda), **evolução** (gráfico), **histórico de avaliações** (`portfolio_entries`), **feedbacks da IA** (últimos 5), conquistas.
- Esses dois só são alcançados por botões da tela de resultados (não há menu do aluno).

## Autenticação do professor

- `/auth` (`Auth.tsx`, 251): entrar (e-mail/senha), cadastrar (o cadastro fica **pendente de aprovação do admin**), esquecer senha (`resetPasswordForEmail`), **Google** (`lovable.auth.signInWithOAuth`); garante perfil e aprovação para contas OAuth/legadas.
- `/reset-password` (144): definir nova senha.
- `FloatingAuth` (159): cartão de login flutuante na landing.
- `ProtectedRoute`: exige sessão e aprovação; `requireAdmin` para `/admin`; tela de acesso negado oferece voltar ao portal do aluno.

## Landing e páginas públicas

- `/` (`Index.tsx`, 589; **usa fontes Space Grotesk/DM Sans em `.landing-root`**): hero com `FloatingAuth`, seções de recursos (`#features`), "como funciona", depoimentos, preços/CTA, rodapé (`LandingFooter`); **`SalesAgent`** (chat de vendas, função `sales-agent`).
- `/funcionalidades` (174), `/planos` (156), `/contato-publico` (164), `/documentacao` (185) e `/docs` (207; documentação do sistema), `/termos` (86), `/privacidade` (86), `/cookies` (100), `NotFound` (24).
- `CookieBanner` (global) e `CookiePreferencesDialog`.
- `public/instrucoes/`: material de apoio estático (Pacientes virtuais, Júri simulado) — a pasta `juri simulado/` está sem versionar (git `??`).

## Recursos globais no app do professor

- `AppLayout`: barra lateral por intenção, cabeçalho com caminho e **Ctrl K**; **`OracleAgent`** (assistente flutuante, função `oracle-agent`, posiciona-se para não cobrir botões).
- `ModuleHelpGuide` (guia de ajuda dispensável por módulo, `localStorage`) em editores de Prova, KFE, Mini-CEX, OSCE, Júri, Documentação e nas 6 áreas.
- `AITutorChat` na correção de provas.
- `AccessibilityPanel` (tamanho de fonte, alto contraste, fonte para dislexia, espaçamento, máscara de leitura): **só montado na prova do aluno** (`StudentExam`).

## Observações / lacunas

- Portal do aluno é só um formulário de PIN; não há "minha área" com atividades, notas e PVs por turma. Isso é uma oportunidade de redesenho (ligada ao "Turma no centro"), mas exige decisão de produto.
- Gamificação/Portfólio não têm entrada de menu.
- Acessibilidade só na prova; demais portais públicos (SCT, KFE, OSCE, PV) não têm.
- Landing mantém identidade tipográfica própria até ser redesenhada.
