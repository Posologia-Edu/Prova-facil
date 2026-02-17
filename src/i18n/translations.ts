export type Language = "pt" | "en" | "es";

export const LANGUAGE_LABELS: Record<Language, string> = {
  pt: "Português",
  en: "English",
  es: "Español",
};

export const LANGUAGE_FLAGS: Record<Language, string> = {
  pt: "🇧🇷",
  en: "🇺🇸",
  es: "🇪🇸",
};

type TranslationKeys = {
  // Nav
  nav_dashboard: string;
  nav_questions: string;
  nav_composer: string;
  nav_classes: string;
  nav_analytics: string;
  nav_calendar: string;
  nav_pricing: string;
  nav_admin: string;
  nav_logout: string;
  nav_menu: string;
  app_subtitle: string;

  // Dashboard
  dash_welcome: string;
  dash_subtitle: string;
  dash_total_questions: string;
  dash_exams_created: string;
  dash_active_classes: string;
  dash_avg_difficulty: string;
  dash_quick_actions: string;
  dash_create_exam: string;
  dash_add_questions: string;
  dash_manage_classes: string;
  dash_recent_exams: string;
  dash_view_all: string;
  dash_no_exams: string;

  // Questions
  questions_title: string;
  questions_subtitle: string;
  questions_search: string;
  questions_generate_ai: string;
  questions_new: string;
  questions_create_title: string;
  questions_manual: string;
  questions_import: string;
  questions_type: string;
  questions_text: string;
  questions_difficulty: string;
  questions_bloom: string;
  questions_tags: string;
  questions_embed_url: string;
  questions_embed_hint: string;
  questions_all_types: string;
  questions_multiple_choice: string;
  questions_true_false: string;
  questions_open_ended: string;
  questions_matching: string;
  questions_all_difficulties: string;
  questions_easy: string;
  questions_medium: string;
  questions_hard: string;
  questions_bloom_remember: string;
  questions_bloom_understand: string;
  questions_bloom_apply: string;
  questions_bloom_analyze: string;
  questions_bloom_evaluate: string;
  questions_bloom_create: string;
  questions_edit: string;
  questions_duplicate: string;
  questions_delete: string;
  questions_delete_title: string;
  questions_delete_desc: string;
  questions_none_found: string;
  questions_adjust_filters: string;
  questions_drag_file: string;
  questions_select_file: string;
  questions_format_hint: string;

  // Composer
  composer_question_bank: string;
  composer_click_to_add: string;
  composer_section: string;
  composer_shuffle: string;
  composer_templates: string;
  composer_header: string;
  composer_export: string;
  composer_publish: string;
  composer_header_config: string;
  composer_institution: string;
  composer_teacher: string;
  composer_exam_date: string;
  composer_instructions_label: string;
  composer_total_questions: string;
  composer_total_points: string;
  composer_no_sections: string;
  composer_add_section_hint: string;
  composer_click_bank_hint: string;
  composer_student_name: string;

  // Classes
  classes_title: string;
  classes_subtitle: string;
  classes_new: string;
  classes_create_title: string;
  classes_name: string;
  classes_semester: string;
  classes_description: string;
  classes_students: string;
  classes_exams: string;
  classes_edit: string;
  classes_manage_students: string;
  classes_duplicate: string;
  classes_delete: string;
  classes_delete_title: string;
  classes_delete_desc: string;

  // Analytics
  analytics_title: string;
  analytics_subtitle: string;
  analytics_by_topic: string;
  analytics_by_difficulty: string;
  analytics_exam_history: string;
  analytics_no_data: string;
  analytics_no_history: string;

  // Calendar
  calendar_title: string;
  calendar_subtitle: string;
  calendar_reminders: string;
  calendar_no_exams: string;
  calendar_start: string;
  calendar_end: string;
  calendar_active: string;
  calendar_inactive: string;
  calendar_draft: string;
  calendar_published: string;
  calendar_code: string;
  calendar_view_monitoring: string;
  calendar_select_date: string;
  calendar_loading: string;

  // Pricing
  pricing_title: string;
  pricing_subtitle: string;
  pricing_free: string;
  pricing_free_desc: string;
  pricing_premium: string;
  pricing_premium_desc: string;
  pricing_current_plan: string;
  pricing_subscribe: string;
  pricing_manage: string;
  pricing_active_until: string;
  pricing_basic_plan: string;
  pricing_not_sure: string;
  pricing_refresh: string;
  pricing_month: string;
  pricing_unlimited: string;
  pricing_questions_month: string;
  pricing_exams_month: string;
  pricing_pdf_export: string;
  pricing_online_exams: string;
  pricing_students_exam: string;
  pricing_ai_grading: string;
  pricing_realtime_monitor: string;
  pricing_priority_support: string;
  pricing_back: string;

  // Auth
  auth_back: string;
  auth_login_desc: string;
  auth_signup_desc: string;
  auth_login: string;
  auth_signup: string;
  auth_email: string;
  auth_password: string;
  auth_full_name: string;
  auth_min_chars: string;
  auth_create_account: string;
  auth_error_login: string;
  auth_error_signup: string;
  auth_signup_success_title: string;
  auth_signup_success_desc: string;
  auth_student: string;

  // Landing
  landing_enter: string;
  landing_create_free: string;
  landing_hero_title_1: string;
  landing_hero_title_2: string;
  landing_hero_title_3: string;
  landing_hero_subtitle: string;
  landing_start_free: string;
  landing_see_features: string;
  landing_ai_badge: string;
  landing_feat_ai_title: string;
  landing_feat_ai_desc: string;
  landing_feat_wysiwyg_title: string;
  landing_feat_wysiwyg_desc: string;
  landing_feat_bank_title: string;
  landing_feat_bank_desc: string;
  landing_feat_analytics_title: string;
  landing_feat_analytics_desc: string;
  landing_feat_security_title: string;
  landing_feat_security_desc: string;
  landing_feat_fast_title: string;
  landing_feat_fast_desc: string;
  landing_features_heading: string;
  landing_features_sub: string;
  landing_how_heading: string;
  landing_step1_title: string;
  landing_step1_desc: string;
  landing_step2_title: string;
  landing_step2_desc: string;
  landing_step3_title: string;
  landing_step3_desc: string;
  landing_testimonials_heading: string;
  landing_cta_heading: string;
  landing_cta_sub: string;
  landing_cta_button: string;
  landing_footer: string;
  landing_stats_questions: string;
  landing_stats_teachers: string;
  landing_stats_time: string;
  landing_stats_rating: string;

  // Docs
  docs_title: string;
  docs_subtitle: string;
  docs_badge: string;
  docs_back_home: string;
  docs_getting_started: string;
  docs_getting_started_content: string;
  docs_question_bank: string;
  docs_question_bank_content: string;
  docs_ai_generation: string;
  docs_ai_generation_content: string;
  docs_composer: string;
  docs_composer_content: string;
  docs_templates: string;
  docs_templates_content: string;
  docs_export_pdf: string;
  docs_export_pdf_content: string;
  docs_online_exams: string;
  docs_online_exams_content: string;
  docs_classes: string;
  docs_classes_content: string;
  docs_analytics: string;
  docs_analytics_content: string;
  docs_calendar: string;
  docs_calendar_content: string;
  docs_student_portal: string;
  docs_student_portal_content: string;
  docs_plans: string;
  docs_plans_content: string;
  docs_security: string;
  docs_security_content: string;
  docs_faq_title: string;
  docs_faq_q1: string;
  docs_faq_a1: string;
  docs_faq_q2: string;
  docs_faq_a2: string;
  docs_faq_q3: string;
  docs_faq_a3: string;
  docs_faq_q4: string;
  docs_faq_a4: string;
  docs_faq_q5: string;
  docs_faq_a5: string;

  // Common
  cancel: string;
  save: string;
  create: string;
  confirm: string;
  loading: string;
};

const pt: TranslationKeys = {
  nav_dashboard: "Painel",
  nav_questions: "Banco de Questões",
  nav_composer: "Compositor de Provas",
  nav_classes: "Minhas Turmas",
  nav_analytics: "Análises",
  nav_calendar: "Calendário",
  nav_pricing: "Planos",
  nav_admin: "Administração",
  nav_logout: "Sair",
  nav_menu: "Menu",
  app_subtitle: "Criador de Provas",

  dash_welcome: "Bem-vindo(a) de volta, Professor(a)",
  dash_subtitle: "Aqui está uma visão geral do seu espaço de provas.",
  dash_total_questions: "Total de Questões",
  dash_exams_created: "Provas Criadas",
  dash_active_classes: "Turmas Ativas",
  dash_avg_difficulty: "Dific. Média",
  dash_quick_actions: "Ações Rápidas",
  dash_create_exam: "Criar Nova Prova",
  dash_add_questions: "Adicionar Questões",
  dash_manage_classes: "Gerenciar Turmas",
  dash_recent_exams: "Provas Recentes",
  dash_view_all: "Ver todas",
  dash_no_exams: "Nenhuma prova criada ainda.",

  questions_title: "Banco de Questões",
  questions_subtitle: "questões no seu repositório",
  questions_search: "Buscar questões ou tags...",
  questions_generate_ai: "Gerar com IA",
  questions_new: "Nova Questão",
  questions_create_title: "Criar Nova Questão",
  questions_manual: "Criação Manual",
  questions_import: "Importar CSV/JSON",
  questions_type: "Tipo de Questão",
  questions_text: "Texto da Questão",
  questions_difficulty: "Dificuldade",
  questions_bloom: "Taxonomia de Bloom",
  questions_tags: "Tags (separadas por vírgula)",
  questions_embed_url: "URL de Embed (opcional)",
  questions_embed_hint: "Incorpore ferramentas externas na versão digital da questão via iframe.",
  questions_all_types: "Todos os Tipos",
  questions_multiple_choice: "Múltipla Escolha",
  questions_true_false: "Verdadeiro/Falso",
  questions_open_ended: "Dissertativa",
  questions_matching: "Associação",
  questions_all_difficulties: "Todas",
  questions_easy: "Fácil",
  questions_medium: "Média",
  questions_hard: "Difícil",
  questions_bloom_remember: "Lembrar",
  questions_bloom_understand: "Compreender",
  questions_bloom_apply: "Aplicar",
  questions_bloom_analyze: "Analisar",
  questions_bloom_evaluate: "Avaliar",
  questions_bloom_create: "Criar",
  questions_edit: "Editar",
  questions_duplicate: "Duplicar",
  questions_delete: "Excluir",
  questions_delete_title: "Excluir questão?",
  questions_delete_desc: "Esta ação não pode ser desfeita. A questão será removida permanentemente do seu banco.",
  questions_none_found: "Nenhuma questão encontrada",
  questions_adjust_filters: "Ajuste os filtros ou crie uma nova questão.",
  questions_drag_file: "Arraste um arquivo CSV ou JSON",
  questions_select_file: "Selecionar Arquivo",
  questions_format_hint: "Formato esperado: cada linha/objeto deve ter os campos question_text, type, difficulty, tags.",

  composer_question_bank: "Banco de Questões",
  composer_click_to_add: "Clique para adicionar à prova",
  composer_section: "Seção",
  composer_shuffle: "Embaralhar",
  composer_templates: "Templates",
  composer_header: "Cabeçalho",
  composer_export: "Exportar",
  composer_publish: "Publicar Online",
  composer_header_config: "Configuração do Cabeçalho",
  composer_institution: "Nome da Instituição",
  composer_teacher: "Nome do Professor(a)",
  composer_exam_date: "Data da Prova",
  composer_instructions_label: "Instruções",
  composer_total_questions: "questões",
  composer_total_points: "pontos no total",
  composer_no_sections: "Nenhuma seção ainda",
  composer_add_section_hint: "Adicione uma seção para começar a montar sua prova.",
  composer_click_bank_hint: "Clique nas questões do banco para adicioná-las aqui",
  composer_student_name: "Nome do Aluno",

  classes_title: "Minhas Turmas",
  classes_subtitle: "Gerencie suas turmas e listas de alunos.",
  classes_new: "Nova Turma",
  classes_create_title: "Criar Nova Turma",
  classes_name: "Nome da Turma",
  classes_semester: "Semestre",
  classes_description: "Descrição",
  classes_students: "alunos",
  classes_exams: "provas",
  classes_edit: "Editar",
  classes_manage_students: "Gerenciar Alunos",
  classes_duplicate: "Duplicar",
  classes_delete: "Excluir",
  classes_delete_title: "Excluir turma?",
  classes_delete_desc: "Esta ação não pode ser desfeita. A turma será removida permanentemente.",

  analytics_title: "Análises",
  analytics_subtitle: "Insights sobre seu banco de questões e histórico de provas.",
  analytics_by_topic: "Questões por Tópico",
  analytics_by_difficulty: "Distribuição por Dificuldade",
  analytics_exam_history: "Histórico de Provas",
  analytics_no_data: "Nenhum dado disponível ainda.",
  analytics_no_history: "Nenhuma prova no histórico ainda.",

  calendar_title: "Calendário de Provas",
  calendar_subtitle: "Visualize suas provas agendadas e receba lembretes importantes.",
  calendar_reminders: "Lembretes",
  calendar_no_exams: "Nenhuma prova agendada para esta data.",
  calendar_start: "Início",
  calendar_end: "Fim",
  calendar_active: "Ativa",
  calendar_inactive: "Inativa",
  calendar_draft: "Rascunho",
  calendar_published: "Publicada",
  calendar_code: "Código",
  calendar_view_monitoring: "Ver monitoramento",
  calendar_select_date: "Selecione uma data",
  calendar_loading: "Carregando...",

  pricing_title: "Planos e Assinatura",
  pricing_subtitle: "Escolha o plano ideal para você",
  pricing_free: "Gratuito",
  pricing_free_desc: "Para começar a criar provas",
  pricing_premium: "Premium",
  pricing_premium_desc: "Acesso completo a todas as funcionalidades",
  pricing_current_plan: "Seu plano",
  pricing_subscribe: "Assinar Premium",
  pricing_manage: "Gerenciar assinatura",
  pricing_active_until: "Ativo até",
  pricing_basic_plan: "Plano básico",
  pricing_not_sure: "Não tem certeza? Comece gratuitamente e atualize quando quiser.",
  pricing_refresh: "Atualizar status",
  pricing_month: "/mês",
  pricing_unlimited: "Ilimitado",
  pricing_questions_month: "Questões com IA por mês",
  pricing_exams_month: "Provas por mês",
  pricing_pdf_export: "Exportação PDF",
  pricing_online_exams: "Provas online",
  pricing_students_exam: "Alunos por prova",
  pricing_ai_grading: "Correção por IA",
  pricing_realtime_monitor: "Monitoramento em tempo real",
  pricing_priority_support: "Suporte prioritário",
  pricing_back: "Voltar",

  auth_back: "Voltar ao início",
  auth_login_desc: "Entre na sua conta para continuar",
  auth_signup_desc: "Crie sua conta gratuita",
  auth_login: "Entrar",
  auth_signup: "Cadastrar",
  auth_email: "E-mail",
  auth_password: "Senha",
  auth_full_name: "Nome completo",
  auth_min_chars: "Mínimo 6 caracteres",
  auth_create_account: "Criar conta",
  auth_error_login: "Erro ao entrar",
  auth_error_signup: "Erro ao cadastrar",
  auth_signup_success_title: "Cadastro realizado!",
  auth_signup_success_desc: "Verifique seu e-mail para confirmar a conta. Após confirmação, seu acesso será analisado pelo administrador.",
  auth_student: "Sou Aluno",

  landing_enter: "Entrar",
  landing_create_free: "Criar conta grátis",
  landing_hero_title_1: "Crie provas ",
  landing_hero_title_2: "profissionais",
  landing_hero_title_3: " em minutos, não em horas.",
  landing_hero_subtitle: "A plataforma inteligente que todo professor merece. Banco de questões com IA, compositor visual e análises — tudo em um só lugar.",
  landing_start_free: "Começar agora — é grátis",
  landing_see_features: "Ver funcionalidades",
  landing_ai_badge: "Agora com geração de questões por IA",
  landing_feat_ai_title: "Geração de Questões com IA",
  landing_feat_ai_desc: "Crie questões de múltipla escolha, V/F e dissertativas em segundos com inteligência artificial avançada.",
  landing_feat_wysiwyg_title: "Compositor de Provas WYSIWYG",
  landing_feat_wysiwyg_desc: "Monte provas profissionais com visualização em tempo real no formato A4, pronto para impressão.",
  landing_feat_bank_title: "Banco de Questões Inteligente",
  landing_feat_bank_desc: "Organize suas questões por tópico, dificuldade e Taxonomia de Bloom. Reutilize em qualquer prova.",
  landing_feat_analytics_title: "Análises e Relatórios",
  landing_feat_analytics_desc: "Acompanhe o desempenho das turmas e identifique pontos de melhoria com dados visuais.",
  landing_feat_security_title: "Seguro e Privado",
  landing_feat_security_desc: "Suas provas e questões ficam protegidas. Apenas você tem acesso ao seu conteúdo.",
  landing_feat_fast_title: "Rápido e Eficiente",
  landing_feat_fast_desc: "Reduza em até 80% o tempo gasto na criação de provas. Mais tempo para o que importa: ensinar.",
  landing_features_heading: "Tudo que você precisa para criar provas perfeitas",
  landing_features_sub: "Ferramentas poderosas pensadas por professores, para professores.",
  landing_how_heading: "Simples como 1, 2, 3",
  landing_step1_title: "Crie ou gere questões",
  landing_step1_desc: "Use a IA ou crie manualmente. Organize por tópico e dificuldade.",
  landing_step2_title: "Monte sua prova",
  landing_step2_desc: "Arraste questões para o compositor visual e personalize o cabeçalho.",
  landing_step3_title: "Exporte e aplique",
  landing_step3_desc: "Baixe em PDF profissional pronto para impressão ou aplique digitalmente.",
  landing_testimonials_heading: "O que dizem os professores",
  landing_cta_heading: "Pronto para transformar sua forma de criar provas?",
  landing_cta_sub: "Junte-se a milhares de professores que já economizam horas toda semana.",
  landing_cta_button: "Criar minha conta grátis",
  landing_footer: "© 2026 ProvaFácil. Todos os direitos reservados.",
  landing_stats_questions: "Questões geradas",
  landing_stats_teachers: "Professores ativos",
  landing_stats_time: "Menos tempo gasto",
  landing_stats_rating: "Avaliação média",

  docs_title: "Documentação",
  docs_subtitle: "Aprenda a usar todas as funcionalidades do ProvaFácil e tire o máximo da plataforma.",
  docs_badge: "Guia Completo",
  docs_back_home: "Voltar ao início",
  docs_getting_started: "Primeiros Passos",
  docs_getting_started_content: "1. Crie sua conta gratuita clicando em \"Criar conta grátis\" na página inicial.\n2. Confirme seu e-mail e aguarde a aprovação do administrador.\n3. Após aprovado, faça login e acesse o Painel principal.\n4. Comece criando questões no Banco de Questões ou gere automaticamente com IA.\n5. Monte sua prova no Compositor e exporte em PDF ou publique online.",
  docs_question_bank: "Banco de Questões",
  docs_question_bank_content: "O Banco de Questões é o repositório central de todas as suas questões.\n\n• Tipos suportados: Múltipla Escolha, Verdadeiro/Falso, Dissertativa e Associação.\n• Classificação: organize por dificuldade (Fácil, Média, Difícil) e Taxonomia de Bloom.\n• Tags: adicione tags personalizadas para facilitar a busca e filtragem.\n• Importação: importe questões em lote via arquivos CSV ou JSON.\n• Embed: incorpore conteúdo externo via URL de embed (iframes) na versão digital.\n• Busca: pesquise por texto, tags ou filtros combinados.",
  docs_ai_generation: "Geração de Questões com IA",
  docs_ai_generation_content: "Gere questões automaticamente usando inteligência artificial.\n\n• Informe o tema/assunto desejado e o tipo de questão.\n• Selecione a dificuldade e o nível da Taxonomia de Bloom.\n• A IA cria questões com alternativas e gabarito automaticamente.\n• Revise e edite as questões geradas antes de salvar no banco.\n• Funcionalidade disponível nos planos que incluem créditos de IA.",
  docs_composer: "Compositor de Provas",
  docs_composer_content: "O Compositor é o editor visual para montar suas provas.\n\n• Seções: organize a prova em seções temáticas (ex: Parte 1 - Objetivas).\n• Arraste questões do Banco de Questões para as seções desejadas.\n• Pontuação: defina a pontuação de cada questão individualmente.\n• Cabeçalho: configure instituição, professor, data e instruções.\n• Embaralhar: reordene questões aleatoriamente com um clique.\n• Visualização: veja a prova em formato A4 em tempo real.",
  docs_templates: "Templates de Prova",
  docs_templates_content: "Templates são modelos prontos de provas organizados por disciplina.\n\n• Áreas disponíveis: Medicina, Direito, Engenharia, Ciências, Pedagogia, Exatas, Psicologia e Computação.\n• Cada template inclui seções pré-configuradas com tipos de questão e pontuação.\n• Aplique um template e personalize conforme sua necessidade.\n• Ideal para novos usuários que querem começar rapidamente.\n• Busque e filtre templates por nome ou área.",
  docs_export_pdf: "Exportação em PDF",
  docs_export_pdf_content: "Exporte suas provas em PDF profissional pronto para impressão.\n\n• Formato A4 com cabeçalho completo (instituição, professor, data, instruções).\n• Gabarito automático: gere a chave de correção com as respostas corretas.\n• Cartão-resposta: inclua uma folha de respostas (bolhas) para facilitar a correção.\n• As opções de gabarito e cartão-resposta são configuráveis no diálogo de exportação.",
  docs_online_exams: "Provas Online",
  docs_online_exams_content: "Publique provas para aplicação digital com monitoramento em tempo real.\n\n• Defina um código de acesso para os alunos entrarem na prova.\n• Configure limite de tempo e período de disponibilidade (início e fim).\n• Os alunos acessam pelo Portal do Aluno usando o código.\n• Monitoramento: acompanhe em tempo real quem está fazendo a prova.\n• Correção automática para questões objetivas.\n• Correção por IA disponível para questões dissertativas (plano Premium).",
  docs_classes: "Gerenciamento de Turmas",
  docs_classes_content: "Organize seus alunos em turmas para facilitar a aplicação de provas.\n\n• Crie turmas com nome, semestre e descrição.\n• Gerencie a lista de alunos de cada turma.\n• Vincule provas às turmas para aplicação direcionada.\n• Duplique turmas para reutilizar a estrutura em novos semestres.",
  docs_analytics: "Análises e Relatórios",
  docs_analytics_content: "Visualize insights sobre seu banco de questões e desempenho das turmas.\n\n• Distribuição de questões por tópico e dificuldade.\n• Histórico de provas aplicadas.\n• Gráficos visuais para identificar padrões e pontos de melhoria.\n• Dados atualizados em tempo real conforme você usa a plataforma.",
  docs_calendar: "Calendário de Provas",
  docs_calendar_content: "Visualize todas as suas provas agendadas em um calendário interativo.\n\n• Veja provas publicadas organizadas por data.\n• Identifique rapidamente provas ativas e inativas.\n• Acesse o monitoramento diretamente pelo calendário.\n• Receba lembretes sobre provas próximas.",
  docs_student_portal: "Portal do Aluno",
  docs_student_portal_content: "Os alunos têm um portal dedicado para realizar provas online.\n\n• Acesso: os alunos entram com nome e código da prova.\n• Realização: respondem a prova dentro do tempo limite configurado.\n• Envio: ao finalizar, as respostas são enviadas automaticamente.\n• Resultados: após correção, os alunos podem consultar suas notas e feedback.",
  docs_plans: "Planos e Assinatura",
  docs_plans_content: "O ProvaFácil oferece planos para atender diferentes necessidades.\n\n• Gratuito: crie até 5 provas/mês, 10 questões com IA/mês, exportação PDF básica.\n• Premium (R$ 29,90/mês): provas ilimitadas, questões com IA ilimitadas, provas online com monitoramento, correção por IA, até 200 alunos por prova e suporte prioritário.\n• Gerencie sua assinatura a qualquer momento na página de Planos.",
  docs_security: "Segurança e Privacidade",
  docs_security_content: "Seus dados são protegidos com as melhores práticas de segurança.\n\n• Cada professor só tem acesso às suas próprias questões e provas.\n• Autenticação segura com verificação de e-mail.\n• Dados criptografados em trânsito e em repouso.\n• Controle de acesso baseado em papéis (professor, aluno, administrador).\n• Backups automáticos para garantir a integridade dos dados.",
  docs_faq_title: "Perguntas Frequentes",
  docs_faq_q1: "Posso usar o ProvaFácil gratuitamente?",
  docs_faq_a1: "Sim! O plano gratuito permite criar até 5 provas por mês e gerar até 10 questões com IA. Para funcionalidades avançadas como provas online e correção por IA, assine o plano Premium.",
  docs_faq_q2: "Como importo questões de outros sistemas?",
  docs_faq_a2: "Vá ao Banco de Questões, clique em 'Nova Questão' e selecione 'Importar CSV/JSON'. O arquivo deve conter os campos: question_text, type, difficulty e tags.",
  docs_faq_q3: "Os alunos precisam criar conta para fazer provas online?",
  docs_faq_a3: "Não! Os alunos acessam pelo Portal do Aluno informando apenas seu nome e o código de acesso da prova fornecido pelo professor.",
  docs_faq_q4: "Posso personalizar o cabeçalho da prova em PDF?",
  docs_faq_a4: "Sim. No Compositor de Provas, clique em 'Cabeçalho' para configurar nome da instituição, professor, data da prova e instruções personalizadas.",
  docs_faq_q5: "A correção por IA funciona para questões dissertativas?",
  docs_faq_a5: "Sim! No plano Premium, a IA analisa as respostas dissertativas e atribui nota e feedback automaticamente. O professor pode revisar e ajustar a nota se necessário.",

  cancel: "Cancelar",
  save: "Salvar",
  create: "Criar",
  confirm: "Confirmar",
  loading: "Carregando...",
};

const en: TranslationKeys = {
  nav_dashboard: "Dashboard",
  nav_questions: "Question Bank",
  nav_composer: "Exam Composer",
  nav_classes: "My Classes",
  nav_analytics: "Analytics",
  nav_calendar: "Calendar",
  nav_pricing: "Plans",
  nav_admin: "Admin",
  nav_logout: "Log out",
  nav_menu: "Menu",
  app_subtitle: "Exam Creator",

  dash_welcome: "Welcome back, Professor",
  dash_subtitle: "Here's an overview of your exam workspace.",
  dash_total_questions: "Total Questions",
  dash_exams_created: "Exams Created",
  dash_active_classes: "Active Classes",
  dash_avg_difficulty: "Avg. Difficulty",
  dash_quick_actions: "Quick Actions",
  dash_create_exam: "Create New Exam",
  dash_add_questions: "Add Questions",
  dash_manage_classes: "Manage Classes",
  dash_recent_exams: "Recent Exams",
  dash_view_all: "View all",
  dash_no_exams: "No exams created yet.",

  questions_title: "Question Bank",
  questions_subtitle: "questions in your repository",
  questions_search: "Search questions or tags...",
  questions_generate_ai: "Generate with AI",
  questions_new: "New Question",
  questions_create_title: "Create New Question",
  questions_manual: "Manual Creation",
  questions_import: "Import CSV/JSON",
  questions_type: "Question Type",
  questions_text: "Question Text",
  questions_difficulty: "Difficulty",
  questions_bloom: "Bloom's Taxonomy",
  questions_tags: "Tags (comma separated)",
  questions_embed_url: "Embed URL (optional)",
  questions_embed_hint: "Embed external tools in the digital version of the question via iframe.",
  questions_all_types: "All Types",
  questions_multiple_choice: "Multiple Choice",
  questions_true_false: "True/False",
  questions_open_ended: "Essay",
  questions_matching: "Matching",
  questions_all_difficulties: "All",
  questions_easy: "Easy",
  questions_medium: "Medium",
  questions_hard: "Hard",
  questions_bloom_remember: "Remember",
  questions_bloom_understand: "Understand",
  questions_bloom_apply: "Apply",
  questions_bloom_analyze: "Analyze",
  questions_bloom_evaluate: "Evaluate",
  questions_bloom_create: "Create",
  questions_edit: "Edit",
  questions_duplicate: "Duplicate",
  questions_delete: "Delete",
  questions_delete_title: "Delete question?",
  questions_delete_desc: "This action cannot be undone. The question will be permanently removed from your bank.",
  questions_none_found: "No questions found",
  questions_adjust_filters: "Adjust filters or create a new question.",
  questions_drag_file: "Drag a CSV or JSON file",
  questions_select_file: "Select File",
  questions_format_hint: "Expected format: each line/object should have question_text, type, difficulty, tags fields.",

  composer_question_bank: "Question Bank",
  composer_click_to_add: "Click to add to exam",
  composer_section: "Section",
  composer_shuffle: "Shuffle",
  composer_templates: "Templates",
  composer_header: "Header",
  composer_export: "Export",
  composer_publish: "Publish Online",
  composer_header_config: "Header Configuration",
  composer_institution: "Institution Name",
  composer_teacher: "Teacher Name",
  composer_exam_date: "Exam Date",
  composer_instructions_label: "Instructions",
  composer_total_questions: "questions",
  composer_total_points: "total points",
  composer_no_sections: "No sections yet",
  composer_add_section_hint: "Add a section to start building your exam.",
  composer_click_bank_hint: "Click questions from the bank to add them here",
  composer_student_name: "Student Name",

  classes_title: "My Classes",
  classes_subtitle: "Manage your classes and student lists.",
  classes_new: "New Class",
  classes_create_title: "Create New Class",
  classes_name: "Class Name",
  classes_semester: "Semester",
  classes_description: "Description",
  classes_students: "students",
  classes_exams: "exams",
  classes_edit: "Edit",
  classes_manage_students: "Manage Students",
  classes_duplicate: "Duplicate",
  classes_delete: "Delete",
  classes_delete_title: "Delete class?",
  classes_delete_desc: "This action cannot be undone. The class will be permanently removed.",

  analytics_title: "Analytics",
  analytics_subtitle: "Insights about your question bank and exam history.",
  analytics_by_topic: "Questions by Topic",
  analytics_by_difficulty: "Distribution by Difficulty",
  analytics_exam_history: "Exam History",
  analytics_no_data: "No data available yet.",
  analytics_no_history: "No exams in history yet.",

  calendar_title: "Exam Calendar",
  calendar_subtitle: "View your scheduled exams and receive important reminders.",
  calendar_reminders: "Reminders",
  calendar_no_exams: "No exams scheduled for this date.",
  calendar_start: "Start",
  calendar_end: "End",
  calendar_active: "Active",
  calendar_inactive: "Inactive",
  calendar_draft: "Draft",
  calendar_published: "Published",
  calendar_code: "Code",
  calendar_view_monitoring: "View monitoring",
  calendar_select_date: "Select a date",
  calendar_loading: "Loading...",

  pricing_title: "Plans & Subscription",
  pricing_subtitle: "Choose the ideal plan for you",
  pricing_free: "Free",
  pricing_free_desc: "To start creating exams",
  pricing_premium: "Premium",
  pricing_premium_desc: "Full access to all features",
  pricing_current_plan: "Your plan",
  pricing_subscribe: "Subscribe Premium",
  pricing_manage: "Manage subscription",
  pricing_active_until: "Active until",
  pricing_basic_plan: "Basic plan",
  pricing_not_sure: "Not sure? Start free and upgrade whenever you want.",
  pricing_refresh: "Refresh status",
  pricing_month: "/month",
  pricing_unlimited: "Unlimited",
  pricing_questions_month: "AI questions per month",
  pricing_exams_month: "Exams per month",
  pricing_pdf_export: "PDF Export",
  pricing_online_exams: "Online exams",
  pricing_students_exam: "Students per exam",
  pricing_ai_grading: "AI Grading",
  pricing_realtime_monitor: "Real-time monitoring",
  pricing_priority_support: "Priority support",
  pricing_back: "Back",

  auth_back: "Back to home",
  auth_login_desc: "Sign in to your account to continue",
  auth_signup_desc: "Create your free account",
  auth_login: "Sign In",
  auth_signup: "Sign Up",
  auth_email: "Email",
  auth_password: "Password",
  auth_full_name: "Full name",
  auth_min_chars: "Minimum 6 characters",
  auth_create_account: "Create account",
  auth_error_login: "Login error",
  auth_error_signup: "Signup error",
  auth_signup_success_title: "Registration complete!",
  auth_signup_success_desc: "Check your email to confirm your account. After confirmation, your access will be reviewed by an admin.",
  auth_student: "I'm a Student",

  landing_enter: "Sign In",
  landing_create_free: "Create free account",
  landing_hero_title_1: "Create ",
  landing_hero_title_2: "professional",
  landing_hero_title_3: " exams in minutes, not hours.",
  landing_hero_subtitle: "The intelligent platform every teacher deserves. AI question bank, visual composer and analytics — all in one place.",
  landing_start_free: "Get started — it's free",
  landing_see_features: "See features",
  landing_ai_badge: "Now with AI question generation",
  landing_feat_ai_title: "AI Question Generation",
  landing_feat_ai_desc: "Create multiple choice, T/F and essay questions in seconds with advanced artificial intelligence.",
  landing_feat_wysiwyg_title: "WYSIWYG Exam Composer",
  landing_feat_wysiwyg_desc: "Build professional exams with real-time A4 preview, ready for printing.",
  landing_feat_bank_title: "Smart Question Bank",
  landing_feat_bank_desc: "Organize questions by topic, difficulty and Bloom's Taxonomy. Reuse in any exam.",
  landing_feat_analytics_title: "Analytics & Reports",
  landing_feat_analytics_desc: "Track class performance and identify improvement areas with visual data.",
  landing_feat_security_title: "Secure & Private",
  landing_feat_security_desc: "Your exams and questions are protected. Only you have access to your content.",
  landing_feat_fast_title: "Fast & Efficient",
  landing_feat_fast_desc: "Reduce exam creation time by up to 80%. More time for what matters: teaching.",
  landing_features_heading: "Everything you need to create perfect exams",
  landing_features_sub: "Powerful tools designed by teachers, for teachers.",
  landing_how_heading: "Simple as 1, 2, 3",
  landing_step1_title: "Create or generate questions",
  landing_step1_desc: "Use AI or create manually. Organize by topic and difficulty.",
  landing_step2_title: "Build your exam",
  landing_step2_desc: "Drag questions to the visual composer and customize the header.",
  landing_step3_title: "Export and apply",
  landing_step3_desc: "Download as a professional PDF ready for printing or apply digitally.",
  landing_testimonials_heading: "What teachers say",
  landing_cta_heading: "Ready to transform how you create exams?",
  landing_cta_sub: "Join thousands of teachers who already save hours every week.",
  landing_cta_button: "Create my free account",
  landing_footer: "© 2026 ProvaFácil. All rights reserved.",
  landing_stats_questions: "Questions generated",
  landing_stats_teachers: "Active teachers",
  landing_stats_time: "Less time spent",
  landing_stats_rating: "Average rating",

  docs_title: "Documentation",
  docs_subtitle: "Learn how to use all ProvaFácil features and get the most out of the platform.",
  docs_badge: "Complete Guide",
  docs_back_home: "Back to home",
  docs_getting_started: "Getting Started",
  docs_getting_started_content: "1. Create your free account by clicking \"Create free account\" on the home page.\n2. Confirm your email and wait for admin approval.\n3. Once approved, log in and access the main Dashboard.\n4. Start by creating questions in the Question Bank or generate them automatically with AI.\n5. Build your exam in the Composer and export as PDF or publish online.",
  docs_question_bank: "Question Bank",
  docs_question_bank_content: "The Question Bank is the central repository for all your questions.\n\n• Supported types: Multiple Choice, True/False, Essay, and Matching.\n• Classification: organize by difficulty (Easy, Medium, Hard) and Bloom's Taxonomy.\n• Tags: add custom tags for easy searching and filtering.\n• Import: bulk import questions via CSV or JSON files.\n• Embed: embed external content via URL (iframes) in the digital version.\n• Search: search by text, tags, or combined filters.",
  docs_ai_generation: "AI Question Generation",
  docs_ai_generation_content: "Generate questions automatically using artificial intelligence.\n\n• Enter the desired topic/subject and question type.\n• Select difficulty and Bloom's Taxonomy level.\n• AI creates questions with alternatives and answer key automatically.\n• Review and edit generated questions before saving to the bank.\n• Available on plans that include AI credits.",
  docs_composer: "Exam Composer",
  docs_composer_content: "The Composer is the visual editor to build your exams.\n\n• Sections: organize the exam into thematic sections (e.g., Part 1 - Objectives).\n• Drag questions from the Question Bank to the desired sections.\n• Scoring: set individual scoring for each question.\n• Header: configure institution, teacher, date, and instructions.\n• Shuffle: randomly reorder questions with one click.\n• Preview: see the exam in A4 format in real time.",
  docs_templates: "Exam Templates",
  docs_templates_content: "Templates are ready-made exam models organized by discipline.\n\n• Available areas: Medicine, Law, Engineering, Sciences, Pedagogy, Exact Sciences, Psychology, and Computer Science.\n• Each template includes pre-configured sections with question types and scoring.\n• Apply a template and customize as needed.\n• Ideal for new users who want to start quickly.\n• Search and filter templates by name or area.",
  docs_export_pdf: "PDF Export",
  docs_export_pdf_content: "Export your exams as professional PDF ready for printing.\n\n• A4 format with complete header (institution, teacher, date, instructions).\n• Automatic answer key: generate the correction key with correct answers.\n• Answer sheet: include a bubble sheet to facilitate correction.\n• Answer key and answer sheet options are configurable in the export dialog.",
  docs_online_exams: "Online Exams",
  docs_online_exams_content: "Publish exams for digital application with real-time monitoring.\n\n• Set an access code for students to enter the exam.\n• Configure time limit and availability period (start and end).\n• Students access through the Student Portal using the code.\n• Monitoring: track in real time who is taking the exam.\n• Automatic grading for objective questions.\n• AI grading available for essay questions (Premium plan).",
  docs_classes: "Class Management",
  docs_classes_content: "Organize your students into classes to facilitate exam application.\n\n• Create classes with name, semester, and description.\n• Manage the student list for each class.\n• Link exams to classes for targeted application.\n• Duplicate classes to reuse the structure in new semesters.",
  docs_analytics: "Analytics & Reports",
  docs_analytics_content: "View insights about your question bank and class performance.\n\n• Question distribution by topic and difficulty.\n• History of applied exams.\n• Visual charts to identify patterns and improvement areas.\n• Data updated in real time as you use the platform.",
  docs_calendar: "Exam Calendar",
  docs_calendar_content: "View all your scheduled exams in an interactive calendar.\n\n• See published exams organized by date.\n• Quickly identify active and inactive exams.\n• Access monitoring directly from the calendar.\n• Receive reminders about upcoming exams.",
  docs_student_portal: "Student Portal",
  docs_student_portal_content: "Students have a dedicated portal to take online exams.\n\n• Access: students enter with their name and exam access code.\n• Taking: they answer the exam within the configured time limit.\n• Submission: upon completion, answers are submitted automatically.\n• Results: after grading, students can check their grades and feedback.",
  docs_plans: "Plans & Subscription",
  docs_plans_content: "ProvaFácil offers plans to meet different needs.\n\n• Free: create up to 5 exams/month, 10 AI questions/month, basic PDF export.\n• Premium ($29.90/month): unlimited exams, unlimited AI questions, online exams with monitoring, AI grading, up to 200 students per exam, and priority support.\n• Manage your subscription anytime on the Plans page.",
  docs_security: "Security & Privacy",
  docs_security_content: "Your data is protected with industry-best security practices.\n\n• Each teacher only has access to their own questions and exams.\n• Secure authentication with email verification.\n• Data encrypted in transit and at rest.\n• Role-based access control (teacher, student, administrator).\n• Automatic backups to ensure data integrity.",
  docs_faq_title: "Frequently Asked Questions",
  docs_faq_q1: "Can I use ProvaFácil for free?",
  docs_faq_a1: "Yes! The free plan allows you to create up to 5 exams per month and generate up to 10 AI questions. For advanced features like online exams and AI grading, subscribe to the Premium plan.",
  docs_faq_q2: "How do I import questions from other systems?",
  docs_faq_a2: "Go to the Question Bank, click 'New Question' and select 'Import CSV/JSON'. The file must contain the fields: question_text, type, difficulty, and tags.",
  docs_faq_q3: "Do students need to create an account to take online exams?",
  docs_faq_a3: "No! Students access through the Student Portal by entering only their name and the exam access code provided by the teacher.",
  docs_faq_q4: "Can I customize the PDF exam header?",
  docs_faq_a4: "Yes. In the Exam Composer, click 'Header' to configure institution name, teacher, exam date, and custom instructions.",
  docs_faq_q5: "Does AI grading work for essay questions?",
  docs_faq_a5: "Yes! On the Premium plan, AI analyzes essay answers and assigns grades and feedback automatically. The teacher can review and adjust the grade if needed.",

  cancel: "Cancel",
  save: "Save",
  create: "Create",
  confirm: "Confirm",
  loading: "Loading...",
};

const es: TranslationKeys = {
  nav_dashboard: "Panel",
  nav_questions: "Banco de Preguntas",
  nav_composer: "Compositor de Exámenes",
  nav_classes: "Mis Clases",
  nav_analytics: "Análisis",
  nav_calendar: "Calendario",
  nav_pricing: "Planes",
  nav_admin: "Administración",
  nav_logout: "Salir",
  nav_menu: "Menú",
  app_subtitle: "Creador de Exámenes",

  dash_welcome: "Bienvenido(a) de vuelta, Profesor(a)",
  dash_subtitle: "Aquí tiene una visión general de su espacio de exámenes.",
  dash_total_questions: "Total de Preguntas",
  dash_exams_created: "Exámenes Creados",
  dash_active_classes: "Clases Activas",
  dash_avg_difficulty: "Dificultad Media",
  dash_quick_actions: "Acciones Rápidas",
  dash_create_exam: "Crear Nuevo Examen",
  dash_add_questions: "Agregar Preguntas",
  dash_manage_classes: "Gestionar Clases",
  dash_recent_exams: "Exámenes Recientes",
  dash_view_all: "Ver todos",
  dash_no_exams: "Ningún examen creado aún.",

  questions_title: "Banco de Preguntas",
  questions_subtitle: "preguntas en su repositorio",
  questions_search: "Buscar preguntas o etiquetas...",
  questions_generate_ai: "Generar con IA",
  questions_new: "Nueva Pregunta",
  questions_create_title: "Crear Nueva Pregunta",
  questions_manual: "Creación Manual",
  questions_import: "Importar CSV/JSON",
  questions_type: "Tipo de Pregunta",
  questions_text: "Texto de la Pregunta",
  questions_difficulty: "Dificultad",
  questions_bloom: "Taxonomía de Bloom",
  questions_tags: "Etiquetas (separadas por coma)",
  questions_embed_url: "URL de Embed (opcional)",
  questions_embed_hint: "Incorpore herramientas externas en la versión digital de la pregunta vía iframe.",
  questions_all_types: "Todos los Tipos",
  questions_multiple_choice: "Opción Múltiple",
  questions_true_false: "Verdadero/Falso",
  questions_open_ended: "Ensayo",
  questions_matching: "Asociación",
  questions_all_difficulties: "Todas",
  questions_easy: "Fácil",
  questions_medium: "Media",
  questions_hard: "Difícil",
  questions_bloom_remember: "Recordar",
  questions_bloom_understand: "Comprender",
  questions_bloom_apply: "Aplicar",
  questions_bloom_analyze: "Analizar",
  questions_bloom_evaluate: "Evaluar",
  questions_bloom_create: "Crear",
  questions_edit: "Editar",
  questions_duplicate: "Duplicar",
  questions_delete: "Eliminar",
  questions_delete_title: "¿Eliminar pregunta?",
  questions_delete_desc: "Esta acción no se puede deshacer. La pregunta será eliminada permanentemente de su banco.",
  questions_none_found: "Ninguna pregunta encontrada",
  questions_adjust_filters: "Ajuste los filtros o cree una nueva pregunta.",
  questions_drag_file: "Arrastre un archivo CSV o JSON",
  questions_select_file: "Seleccionar Archivo",
  questions_format_hint: "Formato esperado: cada línea/objeto debe tener los campos question_text, type, difficulty, tags.",

  composer_question_bank: "Banco de Preguntas",
  composer_click_to_add: "Haga clic para agregar al examen",
  composer_section: "Sección",
  composer_shuffle: "Mezclar",
  composer_templates: "Plantillas",
  composer_header: "Encabezado",
  composer_export: "Exportar",
  composer_publish: "Publicar en Línea",
  composer_header_config: "Configuración del Encabezado",
  composer_institution: "Nombre de la Institución",
  composer_teacher: "Nombre del Profesor(a)",
  composer_exam_date: "Fecha del Examen",
  composer_instructions_label: "Instrucciones",
  composer_total_questions: "preguntas",
  composer_total_points: "puntos en total",
  composer_no_sections: "Sin secciones aún",
  composer_add_section_hint: "Agregue una sección para comenzar a armar su examen.",
  composer_click_bank_hint: "Haga clic en las preguntas del banco para agregarlas aquí",
  composer_student_name: "Nombre del Alumno",

  classes_title: "Mis Clases",
  classes_subtitle: "Gestione sus clases y listas de alumnos.",
  classes_new: "Nueva Clase",
  classes_create_title: "Crear Nueva Clase",
  classes_name: "Nombre de la Clase",
  classes_semester: "Semestre",
  classes_description: "Descripción",
  classes_students: "alumnos",
  classes_exams: "exámenes",
  classes_edit: "Editar",
  classes_manage_students: "Gestionar Alumnos",
  classes_duplicate: "Duplicar",
  classes_delete: "Eliminar",
  classes_delete_title: "¿Eliminar clase?",
  classes_delete_desc: "Esta acción no se puede deshacer. La clase será eliminada permanentemente.",

  analytics_title: "Análisis",
  analytics_subtitle: "Información sobre su banco de preguntas e historial de exámenes.",
  analytics_by_topic: "Preguntas por Tema",
  analytics_by_difficulty: "Distribución por Dificultad",
  analytics_exam_history: "Historial de Exámenes",
  analytics_no_data: "No hay datos disponibles aún.",
  analytics_no_history: "No hay exámenes en el historial aún.",

  calendar_title: "Calendario de Exámenes",
  calendar_subtitle: "Visualice sus exámenes programados y reciba recordatorios importantes.",
  calendar_reminders: "Recordatorios",
  calendar_no_exams: "No hay exámenes programados para esta fecha.",
  calendar_start: "Inicio",
  calendar_end: "Fin",
  calendar_active: "Activo",
  calendar_inactive: "Inactivo",
  calendar_draft: "Borrador",
  calendar_published: "Publicado",
  calendar_code: "Código",
  calendar_view_monitoring: "Ver monitoreo",
  calendar_select_date: "Seleccione una fecha",
  calendar_loading: "Cargando...",

  pricing_title: "Planes y Suscripción",
  pricing_subtitle: "Elija el plan ideal para usted",
  pricing_free: "Gratuito",
  pricing_free_desc: "Para empezar a crear exámenes",
  pricing_premium: "Premium",
  pricing_premium_desc: "Acceso completo a todas las funcionalidades",
  pricing_current_plan: "Su plan",
  pricing_subscribe: "Suscribirse Premium",
  pricing_manage: "Gestionar suscripción",
  pricing_active_until: "Activo hasta",
  pricing_basic_plan: "Plan básico",
  pricing_not_sure: "¿No está seguro? Comience gratis y actualice cuando quiera.",
  pricing_refresh: "Actualizar estado",
  pricing_month: "/mes",
  pricing_unlimited: "Ilimitado",
  pricing_questions_month: "Preguntas con IA por mes",
  pricing_exams_month: "Exámenes por mes",
  pricing_pdf_export: "Exportación PDF",
  pricing_online_exams: "Exámenes en línea",
  pricing_students_exam: "Alumnos por examen",
  pricing_ai_grading: "Corrección por IA",
  pricing_realtime_monitor: "Monitoreo en tiempo real",
  pricing_priority_support: "Soporte prioritario",
  pricing_back: "Volver",

  auth_back: "Volver al inicio",
  auth_login_desc: "Inicie sesión para continuar",
  auth_signup_desc: "Cree su cuenta gratuita",
  auth_login: "Iniciar sesión",
  auth_signup: "Registrarse",
  auth_email: "Correo electrónico",
  auth_password: "Contraseña",
  auth_full_name: "Nombre completo",
  auth_min_chars: "Mínimo 6 caracteres",
  auth_create_account: "Crear cuenta",
  auth_error_login: "Error al iniciar sesión",
  auth_error_signup: "Error al registrarse",
  auth_signup_success_title: "¡Registro completado!",
  auth_signup_success_desc: "Revise su correo para confirmar la cuenta. Después de la confirmación, su acceso será analizado por el administrador.",
  auth_student: "Soy Alumno",

  landing_enter: "Iniciar sesión",
  landing_create_free: "Crear cuenta gratis",
  landing_hero_title_1: "Cree exámenes ",
  landing_hero_title_2: "profesionales",
  landing_hero_title_3: " en minutos, no en horas.",
  landing_hero_subtitle: "La plataforma inteligente que todo profesor merece. Banco de preguntas con IA, compositor visual y análisis — todo en un solo lugar.",
  landing_start_free: "Empezar ahora — es gratis",
  landing_see_features: "Ver funcionalidades",
  landing_ai_badge: "Ahora con generación de preguntas por IA",
  landing_feat_ai_title: "Generación de Preguntas con IA",
  landing_feat_ai_desc: "Cree preguntas de opción múltiple, V/F y ensayo en segundos con inteligencia artificial avanzada.",
  landing_feat_wysiwyg_title: "Compositor de Exámenes WYSIWYG",
  landing_feat_wysiwyg_desc: "Arme exámenes profesionales con vista previa en tiempo real en formato A4, listo para imprimir.",
  landing_feat_bank_title: "Banco de Preguntas Inteligente",
  landing_feat_bank_desc: "Organice sus preguntas por tema, dificultad y Taxonomía de Bloom. Reutilice en cualquier examen.",
  landing_feat_analytics_title: "Análisis e Informes",
  landing_feat_analytics_desc: "Acompañe el desempeño de las clases e identifique puntos de mejora con datos visuales.",
  landing_feat_security_title: "Seguro y Privado",
  landing_feat_security_desc: "Sus exámenes y preguntas están protegidos. Solo usted tiene acceso a su contenido.",
  landing_feat_fast_title: "Rápido y Eficiente",
  landing_feat_fast_desc: "Reduzca hasta un 80% el tiempo en la creación de exámenes. Más tiempo para lo que importa: enseñar.",
  landing_features_heading: "Todo lo que necesita para crear exámenes perfectos",
  landing_features_sub: "Herramientas poderosas pensadas por profesores, para profesores.",
  landing_how_heading: "Sencillo como 1, 2, 3",
  landing_step1_title: "Cree o genere preguntas",
  landing_step1_desc: "Use la IA o cree manualmente. Organice por tema y dificultad.",
  landing_step2_title: "Arme su examen",
  landing_step2_desc: "Arrastre preguntas al compositor visual y personalice el encabezado.",
  landing_step3_title: "Exporte y aplique",
  landing_step3_desc: "Descargue en PDF profesional listo para imprimir o aplique digitalmente.",
  landing_testimonials_heading: "Lo que dicen los profesores",
  landing_cta_heading: "¿Listo para transformar su forma de crear exámenes?",
  landing_cta_sub: "Únase a miles de profesores que ya ahorran horas cada semana.",
  landing_cta_button: "Crear mi cuenta gratis",
  landing_footer: "© 2026 ProvaFácil. Todos los derechos reservados.",
  landing_stats_questions: "Preguntas generadas",
  landing_stats_teachers: "Profesores activos",
  landing_stats_time: "Menos tiempo invertido",
  landing_stats_rating: "Calificación promedio",

  docs_title: "Documentación",
  docs_subtitle: "Aprenda a usar todas las funcionalidades de ProvaFácil y aproveche al máximo la plataforma.",
  docs_badge: "Guía Completa",
  docs_back_home: "Volver al inicio",
  docs_getting_started: "Primeros Pasos",
  docs_getting_started_content: "1. Cree su cuenta gratuita haciendo clic en \"Crear cuenta gratis\" en la página inicial.\n2. Confirme su correo y espere la aprobación del administrador.\n3. Una vez aprobado, inicie sesión y acceda al Panel principal.\n4. Comience creando preguntas en el Banco de Preguntas o genérelas automáticamente con IA.\n5. Arme su examen en el Compositor y exporte en PDF o publique en línea.",
  docs_question_bank: "Banco de Preguntas",
  docs_question_bank_content: "El Banco de Preguntas es el repositorio central de todas sus preguntas.\n\n• Tipos soportados: Opción Múltiple, Verdadero/Falso, Ensayo y Asociación.\n• Clasificación: organice por dificultad (Fácil, Media, Difícil) y Taxonomía de Bloom.\n• Etiquetas: agregue etiquetas personalizadas para facilitar la búsqueda.\n• Importación: importe preguntas en lote vía archivos CSV o JSON.\n• Embed: incorpore contenido externo vía URL (iframes) en la versión digital.\n• Búsqueda: busque por texto, etiquetas o filtros combinados.",
  docs_ai_generation: "Generación de Preguntas con IA",
  docs_ai_generation_content: "Genere preguntas automáticamente usando inteligencia artificial.\n\n• Informe el tema deseado y el tipo de pregunta.\n• Seleccione la dificultad y el nivel de Taxonomía de Bloom.\n• La IA crea preguntas con alternativas y clave de respuestas automáticamente.\n• Revise y edite las preguntas generadas antes de guardarlas.\n• Disponible en planes que incluyen créditos de IA.",
  docs_composer: "Compositor de Exámenes",
  docs_composer_content: "El Compositor es el editor visual para armar sus exámenes.\n\n• Secciones: organice el examen en secciones temáticas.\n• Arrastre preguntas del Banco a las secciones deseadas.\n• Puntuación: defina la puntuación de cada pregunta individualmente.\n• Encabezado: configure institución, profesor, fecha e instrucciones.\n• Mezclar: reordene preguntas aleatoriamente con un clic.\n• Vista previa: vea el examen en formato A4 en tiempo real.",
  docs_templates: "Plantillas de Examen",
  docs_templates_content: "Las plantillas son modelos listos de exámenes organizados por disciplina.\n\n• Áreas disponibles: Medicina, Derecho, Ingeniería, Ciencias, Pedagogía, Exactas, Psicología y Computación.\n• Cada plantilla incluye secciones preconfiguradas con tipos de pregunta y puntuación.\n• Aplique una plantilla y personalice según su necesidad.\n• Ideal para nuevos usuarios que quieren empezar rápidamente.\n• Busque y filtre plantillas por nombre o área.",
  docs_export_pdf: "Exportación en PDF",
  docs_export_pdf_content: "Exporte sus exámenes en PDF profesional listo para imprimir.\n\n• Formato A4 con encabezado completo (institución, profesor, fecha, instrucciones).\n• Clave de respuestas automática: genere la clave de corrección con las respuestas correctas.\n• Hoja de respuestas: incluya una hoja de burbujas para facilitar la corrección.\n• Las opciones son configurables en el diálogo de exportación.",
  docs_online_exams: "Exámenes en Línea",
  docs_online_exams_content: "Publique exámenes para aplicación digital con monitoreo en tiempo real.\n\n• Defina un código de acceso para que los alumnos ingresen al examen.\n• Configure límite de tiempo y período de disponibilidad.\n• Los alumnos acceden por el Portal del Alumno usando el código.\n• Monitoreo: acompañe en tiempo real quién está haciendo el examen.\n• Corrección automática para preguntas objetivas.\n• Corrección por IA disponible para preguntas de ensayo (plan Premium).",
  docs_classes: "Gestión de Clases",
  docs_classes_content: "Organice sus alumnos en clases para facilitar la aplicación de exámenes.\n\n• Cree clases con nombre, semestre y descripción.\n• Gestione la lista de alumnos de cada clase.\n• Vincule exámenes a las clases para aplicación dirigida.\n• Duplique clases para reutilizar la estructura en nuevos semestres.",
  docs_analytics: "Análisis e Informes",
  docs_analytics_content: "Visualice información sobre su banco de preguntas y desempeño de las clases.\n\n• Distribución de preguntas por tema y dificultad.\n• Historial de exámenes aplicados.\n• Gráficos visuales para identificar patrones y áreas de mejora.\n• Datos actualizados en tiempo real conforme usa la plataforma.",
  docs_calendar: "Calendario de Exámenes",
  docs_calendar_content: "Visualice todos sus exámenes programados en un calendario interactivo.\n\n• Vea exámenes publicados organizados por fecha.\n• Identifique rápidamente exámenes activos e inactivos.\n• Acceda al monitoreo directamente desde el calendario.\n• Reciba recordatorios sobre exámenes próximos.",
  docs_student_portal: "Portal del Alumno",
  docs_student_portal_content: "Los alumnos tienen un portal dedicado para realizar exámenes en línea.\n\n• Acceso: los alumnos ingresan con su nombre y código del examen.\n• Realización: responden el examen dentro del tiempo límite configurado.\n• Envío: al finalizar, las respuestas se envían automáticamente.\n• Resultados: después de la corrección, los alumnos pueden consultar sus notas y retroalimentación.",
  docs_plans: "Planes y Suscripción",
  docs_plans_content: "ProvaFácil ofrece planes para atender diferentes necesidades.\n\n• Gratuito: cree hasta 5 exámenes/mes, 10 preguntas con IA/mes, exportación PDF básica.\n• Premium ($29.90/mes): exámenes ilimitados, preguntas con IA ilimitadas, exámenes en línea con monitoreo, corrección por IA, hasta 200 alumnos por examen y soporte prioritario.\n• Gestione su suscripción en cualquier momento en la página de Planes.",
  docs_security: "Seguridad y Privacidad",
  docs_security_content: "Sus datos están protegidos con las mejores prácticas de seguridad.\n\n• Cada profesor solo tiene acceso a sus propias preguntas y exámenes.\n• Autenticación segura con verificación de correo.\n• Datos cifrados en tránsito y en reposo.\n• Control de acceso basado en roles (profesor, alumno, administrador).\n• Copias de seguridad automáticas para garantizar la integridad de los datos.",
  docs_faq_title: "Preguntas Frecuentes",
  docs_faq_q1: "¿Puedo usar ProvaFácil gratuitamente?",
  docs_faq_a1: "¡Sí! El plan gratuito permite crear hasta 5 exámenes por mes y generar hasta 10 preguntas con IA. Para funcionalidades avanzadas como exámenes en línea y corrección por IA, suscríbase al plan Premium.",
  docs_faq_q2: "¿Cómo importo preguntas de otros sistemas?",
  docs_faq_a2: "Vaya al Banco de Preguntas, haga clic en 'Nueva Pregunta' y seleccione 'Importar CSV/JSON'. El archivo debe contener los campos: question_text, type, difficulty y tags.",
  docs_faq_q3: "¿Los alumnos necesitan crear cuenta para hacer exámenes en línea?",
  docs_faq_a3: "¡No! Los alumnos acceden por el Portal del Alumno informando solo su nombre y el código de acceso del examen proporcionado por el profesor.",
  docs_faq_q4: "¿Puedo personalizar el encabezado del examen en PDF?",
  docs_faq_a4: "Sí. En el Compositor de Exámenes, haga clic en 'Encabezado' para configurar nombre de la institución, profesor, fecha del examen e instrucciones personalizadas.",
  docs_faq_q5: "¿La corrección por IA funciona para preguntas de ensayo?",
  docs_faq_a5: "¡Sí! En el plan Premium, la IA analiza las respuestas de ensayo y asigna nota y retroalimentación automáticamente. El profesor puede revisar y ajustar la nota si es necesario.",

  cancel: "Cancelar",
  save: "Guardar",
  create: "Crear",
  confirm: "Confirmar",
  loading: "Cargando...",
};

export const translations: Record<Language, TranslationKeys> = { pt, en, es };
