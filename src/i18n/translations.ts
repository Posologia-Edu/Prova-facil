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

  cancel: "Cancelar",
  save: "Guardar",
  create: "Crear",
  confirm: "Confirmar",
  loading: "Cargando...",
};

export const translations: Record<Language, TranslationKeys> = { pt, en, es };
