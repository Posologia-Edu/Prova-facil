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
  nav_settings: string;
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
  analytics_no_data_hint: string;
  analytics_no_history: string;
  analytics_all_classes: string;
  analytics_all_exams: string;
  analytics_total_students: string;
  analytics_avg_score: string;
  analytics_pass_rate: string;
  analytics_total_submissions: string;
  analytics_score_distribution: string;
  analytics_students: string;
  analytics_correct_rate: string;
  analytics_most_missed: string;
  analytics_errors: string;
  analytics_error_rate: string;
  analytics_untagged: string;

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
  landing_feat_osce_title: string;
  landing_feat_osce_desc: string;
  landing_feat_marketplace_title: string;
  landing_feat_marketplace_desc: string;
  landing_feat_online_title: string;
  landing_feat_online_desc: string;
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
  docs_osce: string;
  docs_osce_content: string;
  docs_marketplace: string;
  docs_marketplace_content: string;
  docs_ai_tutor: string;
  docs_ai_tutor_content: string;
  docs_plans: string;
  docs_plans_content: string;
  docs_security: string;
  docs_security_content: string;
  docs_virtual_patients: string;
  docs_virtual_patients_content: string;
  docs_simulation: string;
  docs_simulation_content: string;
  docs_soap: string;
  docs_soap_content: string;
  docs_reconciliation: string;
  docs_reconciliation_content: string;
  docs_documentation_rooms: string;
  docs_documentation_rooms_content: string;
  // Technical docs
  docs_tech_header: string;
  docs_tech_header_subtitle: string;
  docs_tech_stack: string;
  docs_tech_stack_content: string;
  docs_tech_architecture: string;
  docs_tech_architecture_content: string;
  docs_tech_database: string;
  docs_tech_database_content: string;
  docs_tech_api: string;
  docs_tech_api_content: string;
  docs_tech_auth: string;
  docs_tech_auth_content: string;
  docs_tech_edge_functions: string;
  docs_tech_edge_functions_content: string;
  docs_tech_storage: string;
  docs_tech_storage_content: string;
  docs_tech_realtime: string;
  docs_tech_realtime_content: string;
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
  docs_faq_q6: string;
  docs_faq_a6: string;

  // Settings
  settings_title: string;
  settings_subtitle: string;
  settings_change_name: string;
  settings_change_name_desc: string;
  settings_full_name: string;
  settings_update_name: string;
  settings_name_success_title: string;
  settings_name_success_desc: string;
  settings_change_email: string;
  settings_change_email_desc: string;
  settings_new_email: string;
  settings_update_email: string;
  settings_email_success_title: string;
  settings_email_success_desc: string;
  settings_change_password: string;
  settings_change_password_desc: string;
  settings_new_password: string;
  settings_confirm_password: string;
  settings_update_password: string;
  settings_password_success_title: string;
  settings_password_success_desc: string;
  settings_password_mismatch: string;
  settings_error: string;

  // Pricing cancel
  pricing_cancel: string;
  pricing_cancel_title: string;
  pricing_cancel_desc: string;
  pricing_cancel_confirm: string;
  pricing_cancel_success: string;

  // Sidebar groups
  sidebar_principal: string;
  sidebar_content: string;
  sidebar_management: string;
  sidebar_my_exams: string;
  sidebar_trash: string;

  // Onboarding
  onboarding_title: string;
  onboarding_subtitle: string;
  onboarding_step1: string;
  onboarding_step1_desc: string;
  onboarding_step2: string;
  onboarding_step2_desc: string;
  onboarding_step3: string;
  onboarding_step3_desc: string;
  onboarding_step4: string;
  onboarding_step4_desc: string;

  // Protected route
  protected_student_title: string;
  protected_student_desc: string;
  protected_student_portal: string;
  protected_pending_title: string;
  protected_pending_desc: string;
  protected_pending_time: string;
  protected_contact_admin: string;
  protected_admin_title: string;
  protected_admin_desc: string;
  protected_back_dashboard: string;

  // Student portal
  student_portal_title: string;
  student_portal_desc: string;
  student_email_label: string;
  student_email_placeholder: string;
  student_pin_label: string;
  student_pin_placeholder: string;
  student_access_btn: string;
  student_help_text: string;
  student_back_home: string;
  student_access_denied: string;
  student_unknown_error: string;
  student_error: string;
  student_connection_error: string;

  // Simulation
  sim_nav: string;
  sim_title: string;
  sim_subtitle: string;
  sim_new: string;
  sim_create_title: string;
  sim_name: string;
  sim_name_placeholder: string;
  sim_description: string;
  sim_duration: string;
  sim_minutes: string;
  sim_empty: string;
  sim_empty_hint: string;
  sim_edit: string;
  sim_control: string;
  sim_status_draft: string;
  sim_status_active: string;
  sim_status_completed: string;
  sim_status_pending: string;
  sim_tab_participants: string;
  sim_tab_forms: string;
  sim_professor: string;
  sim_pairs: string;
  sim_pair: string;
  sim_add_student: string;
  sim_form_anamnesis: string;
  sim_form_patient_script: string;
  sim_form_observer_eval: string;
  sim_form_professor_eval: string;
  sim_form_title: string;
  sim_form_saved: string;
  sim_patient_script_label: string;
  sim_patient_script_placeholder: string;
  sim_field_label: string;
  sim_field_options: string;
  sim_add_field: string;
  sim_max_score: string;
  sim_settings: string;
  sim_start: string;
  sim_start_hint: string;
  sim_started: string;
  sim_need_professor: string;
  sim_need_students: string;
  sim_round: string;
  sim_cycle: string;
  sim_release: string;
  sim_end_round: string;
  sim_round_released: string;
  sim_round_ended: string;
  sim_role_professional: string;
  sim_role_patient: string;
  sim_role_observer: string;
  sim_join_title: string;
  sim_join_desc: string;
  sim_room_not_found: string;
  sim_not_registered: string;
  sim_waiting_professor: string;
  sim_waiting_desc: string;
  sim_submitted: string;
  sim_waiting_next_round: string;
  sim_submit: string;
  sim_no_script: string;
  sim_view_anamnesis: string;
  sim_all_rounds_completed: string;
  sim_release_materials: string;
  sim_materials_released: string;
  sim_materials_waiting: string;
  sim_materials_ready: string;
  sim_start_simulation: string;
  sim_feedback_label: string;
  sim_feedback_placeholder: string;
  sim_must_submit_first: string;
  sim_waiting_your_round: string;
  sim_participants_in_round: string;
  sim_import: string;
  sim_import_from: string;
  sim_import_select_room: string;
  sim_import_participants: string;
  sim_import_forms: string;
  sim_import_success: string;
  sim_import_nothing: string;
  sim_no_other_rooms: string;
  sim_score_total: string;
  sim_score_warning_low: string;
  sim_score_warning_high: string;
  sim_score_valid: string;
  sim_tab_analytics: string;
  sim_analytics_no_data: string;
  sim_analytics_student: string;
  sim_analytics_role: string;
  sim_analytics_score: string;
  sim_analytics_avg: string;
  sim_analytics_responses: string;
  sim_invalid_email: string;
  sim_students_list: string;
  sim_form_pairs: string;
  sim_unpaired_students: string;
  sim_select_pair: string;
  sim_pair_formed: string;
  sim_clear_pairs: string;
  sim_need_pairs: string;
  sim_add_case: string;
  sim_case_number: string;
  sim_remove_case: string;
  sim_distribute: string;
  sim_distribution_title: string;
  sim_material_rule_hint: string;
  sim_assigned_case: string;
  sim_no_cases: string;
  sim_control_admin_hint: string;

  empty_questions_hint: string;

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
  nav_settings: "Configurações",
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
  analytics_no_data_hint: "Publique e aplique provas para ver os relatórios de desempenho aqui.",
  analytics_no_history: "Nenhuma prova no histórico ainda.",
  analytics_all_classes: "Todas as turmas",
  analytics_all_exams: "Todas as provas",
  analytics_total_students: "Alunos avaliados",
  analytics_avg_score: "Nota média",
  analytics_pass_rate: "Taxa de aprovação (≥60%)",
  analytics_total_submissions: "Provas realizadas",
  analytics_score_distribution: "Distribuição de Notas",
  analytics_students: "Alunos",
  analytics_correct_rate: "Taxa de acerto",
  analytics_most_missed: "Questões Mais Erradas",
  analytics_errors: "erros",
  analytics_error_rate: "erro",
  analytics_untagged: "Sem tag",

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
  auth_student: "Acessar Avaliação",

  landing_enter: "Entrar",
  landing_create_free: "Criar conta grátis",
  landing_hero_title_1: "Crie provas ",
  landing_hero_title_2: "profissionais",
  landing_hero_title_3: " em minutos, não em horas.",
  landing_hero_subtitle: "A plataforma inteligente que todo professor merece. Provas tradicionais e OSCE com IA, compositor visual, marketplace e análises — tudo em um só lugar.",
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
  landing_feat_osce_title: "Exames OSCE Completos",
  landing_feat_osce_desc: "Crie e aplique exames clínicos estruturados com estações, checklists, rodízio automático, paciente virtual com IA e áudio bidirecional em tempo real.",
  landing_feat_marketplace_title: "Marketplace de Provas",
  landing_feat_marketplace_desc: "Compartilhe e descubra provas criadas por outros professores. Avalie, comente e importe com um clique.",
  landing_feat_online_title: "Provas Online com Monitoramento",
  landing_feat_online_desc: "Publique provas digitais com código de acesso, limite de tempo, correção automática e acompanhamento em tempo real dos alunos.",
  landing_features_heading: "Tudo que você precisa para criar provas perfeitas",
  landing_features_sub: "Ferramentas poderosas pensadas por professores, para professores.",
  landing_how_heading: "Simples como 1, 2, 3",
  landing_step1_title: "Crie ou gere questões",
  landing_step1_desc: "Use a IA ou crie manualmente. Organize por tópico e dificuldade.",
  landing_step2_title: "Monte sua prova",
  landing_step2_desc: "Arraste questões para o compositor visual e personalize o cabeçalho.",
  landing_step3_title: "Exporte e aplique",
  landing_step3_desc: "Baixe em PDF profissional pronto para impressão ou aplique digitalmente.",
  landing_testimonials_heading: "Por que escolher o ProvaFácil?",
  landing_cta_heading: "Pronto para transformar sua forma de criar provas?",
  landing_cta_sub: "Comece gratuitamente e descubra como a plataforma pode otimizar seu trabalho.",
  landing_cta_button: "Criar minha conta grátis",
  landing_footer: "© 2026 ProvaFácil. Todos os direitos reservados.",
  landing_stats_questions: "Módulos integrados",
  landing_stats_teachers: "Tipos de avaliação",
  landing_stats_time: "Idiomas disponíveis",
  landing_stats_rating: "Online e gratuito",

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
  docs_online_exams_content: "Publique provas para aplicação digital com monitoramento em tempo real.\n\n• Defina um código de acesso para os alunos entrarem na prova.\n• Configure limite de tempo e período de disponibilidade (início e fim).\n• Os alunos acessam pelo Portal de Avaliação usando o código.\n• Monitoramento: acompanhe em tempo real quem está fazendo a prova.\n• Correção automática para questões objetivas.\n• Correção por IA disponível para questões dissertativas (plano Premium).",
  docs_classes: "Gerenciamento de Turmas",
  docs_classes_content: "Organize seus alunos em turmas para facilitar a aplicação de avaliações.\n\n• Crie turmas com nome, semestre e descrição.\n• Gerencie a lista de alunos de cada turma (nome, e-mail, matrícula).\n• Modo de Avaliação Exclusivo: cada turma pode ser vinculada a uma Prova Online OU a um Paciente Virtual, nunca ambos ao mesmo tempo.\n• Vincule provas online às turmas para aplicação direcionada.\n• Vincule pacientes virtuais às turmas com código de acesso (PIN) automático.\n• Duplique turmas para reutilizar a estrutura em novos semestres.",
  docs_analytics: "Análises e Relatórios",
  docs_analytics_content: "Visualize insights sobre seu banco de questões e desempenho das turmas.\n\n• Distribuição de questões por tópico e dificuldade.\n• Histórico de provas aplicadas.\n• Gráficos visuais para identificar padrões e pontos de melhoria.\n• Dados atualizados em tempo real conforme você usa a plataforma.",
  docs_calendar: "Calendário de Provas",
  docs_calendar_content: "Visualize todas as suas provas agendadas em um calendário interativo.\n\n• Veja provas publicadas organizadas por data.\n• Identifique rapidamente provas ativas e inativas.\n• Acesse o monitoramento diretamente pelo calendário.\n• Receba lembretes sobre provas próximas.",
  docs_student_portal: "Portal de Avaliação",
  docs_student_portal_content: "Os alunos e professores têm um portal dedicado para realizar e acompanhar avaliações online.\n\n• Acesso: entram com e-mail cadastrado e código da avaliação.\n• Realização: respondem dentro do tempo limite configurado.\n• Envio: ao finalizar, as respostas são enviadas automaticamente.\n• Resultados: após correção, podem consultar notas e feedback.",
  docs_osce: "Exames OSCE",
  docs_osce_content: "O módulo OSCE (Exame Clínico Objetivo Estruturado) permite criar e aplicar avaliações clínicas completas.\n\n• Estações: crie estações clínicas com instruções, caso clínico e materiais de apoio (prescrições, exames laboratoriais, imagens).\n• Checklists: monte checklists com itens binários, Likert ou por pontuação, com pesos e itens críticos.\n• Rodízio Automático: o sistema sorteia alunos para as estações e realiza o rodízio circular automaticamente.\n• Cronômetro Individual: cada aluno recebe o tempo integral da estação, com reinício automático a cada entrada.\n• Paciente Virtual com IA: alunos podem conversar com um paciente virtual alimentado por IA durante a estação.\n• Áudio Bidirecional: comunicação por voz em tempo real entre professor e aluno via WebRTC.\n• Painel de Controle: acompanhe cronômetros individuais e progresso dos checklists de cada estação em tempo real.\n• Resultados: gráficos de radar por competência, histórico de aplicações e análise detalhada por aluno e estação.",
  docs_marketplace: "Marketplace de Provas",
  docs_marketplace_content: "Compartilhe e descubra provas criadas pela comunidade de professores.\n\n• Publique suas provas para que outros professores possam utilizá-las.\n• Busque provas por disciplina, tags ou avaliação.\n• Avalie e comente provas de outros professores.\n• Importe provas do marketplace para seu acervo com um clique.\n• Acompanhe o número de downloads e a avaliação média das suas provas publicadas.",
  docs_ai_tutor: "Tutor de IA",
  docs_ai_tutor_content: "O Tutor de IA é um assistente inteligente integrado ao sistema.\n\n• Tire dúvidas sobre pedagogia, elaboração de questões e boas práticas de avaliação.\n• Peça sugestões de questões sobre qualquer tema.\n• Obtenha ajuda para melhorar o nível taxonômico das suas questões.\n• Disponível diretamente no painel do professor.",
  docs_plans: "Planos e Assinatura",
  docs_plans_content: "O ProvaFácil oferece planos para atender diferentes necessidades.\n\n• Gratuito: crie até 5 provas/mês, 10 questões com IA/mês, exportação PDF básica.\n• Premium (R$ 29,90/mês): provas ilimitadas, questões com IA ilimitadas, provas online com monitoramento, correção por IA, OSCE completo, até 200 alunos por prova e suporte prioritário.\n• Gerencie sua assinatura a qualquer momento na página de Planos.",
  docs_security: "Segurança e Privacidade",
  docs_security_content: "Seus dados são protegidos com as melhores práticas de segurança.\n\n• Cada professor só tem acesso às suas próprias questões e provas.\n• Autenticação segura com verificação de e-mail.\n• Dados criptografados em trânsito e em repouso.\n• Controle de acesso baseado em papéis (professor, aluno, administrador).\n• Backups automáticos para garantir a integridade dos dados.",
  docs_tech_header: "Documentação Técnica",
  docs_tech_header_subtitle: "Detalhes da arquitetura, infraestrutura e tecnologias utilizadas na construção do sistema.",
  docs_tech_stack: "Stack Tecnológica",
  docs_tech_stack_content: "O ProvaFácil é construído com tecnologias modernas e de alta performance:\n\n• Frontend: React 18 + TypeScript + Vite (build ultrarrápido)\n• Estilização: Tailwind CSS + shadcn/ui (componentes acessíveis e consistentes)\n• Estado e Cache: TanStack React Query (cache inteligente e sincronização)\n• Roteamento: React Router v6 (SPA com rotas protegidas)\n• Internacionalização: Sistema próprio com Context API (PT/EN/ES)\n• Geração de PDF: jsPDF + html2canvas (exportação profissional A4)\n• Gráficos: Recharts (visualizações interativas de dados)\n• Animações: Framer Motion (transições fluidas)\n• Hospedagem: Lovable Cloud (deploy automático com CDN global)",
  docs_tech_architecture: "Arquitetura do Sistema",
  docs_tech_architecture_content: "O sistema segue uma arquitetura serverless moderna:\n\n• Frontend SPA (Single Page Application) servido via CDN\n• Backend-as-a-Service via Lovable Cloud\n• Edge Functions (Deno runtime) para lógica de servidor\n• Banco de dados PostgreSQL gerenciado com Row-Level Security (RLS)\n• Autenticação JWT integrada com controle de sessão\n• Storage de objetos para materiais OSCE (bucket público: osce-materials)\n• Realtime via WebSockets para atualizações em tempo real nos circuitos OSCE\n\nFluxo de dados:\nUsuário → CDN (Frontend React) → API REST (PostgREST) → PostgreSQL\nUsuário → CDN (Frontend React) → Edge Functions → APIs externas (IA, Stripe, Resend)",
  docs_tech_database: "Estrutura do Banco de Dados",
  docs_tech_database_content: "PostgreSQL com 22+ tabelas organizadas por domínio:\n\n🔐 Autenticação e Perfis:\n• profiles — dados do usuário (nome, instituição, avatar)\n• user_roles — papéis do sistema (admin, teacher, student) via enum app_role\n\n📝 Banco de Questões:\n• question_bank — questões com content_json (JSONB), tipo, dificuldade, nível Bloom, tags e mídia\n\n📋 Provas e Aplicação:\n• exams — provas com header/layout config (JSONB), soft delete via deleted_at\n• exam_questions — vínculo questão-prova com posição e pontuação\n• exam_publications — publicações com código de acesso, limite de tempo e janela de disponibilidade\n• exam_sessions — sessões de aluno com score e status\n• student_answers — respostas com correção IA + professor (grading_status: pending/ai_graded/teacher_graded)\n\n🏥 OSCE:\n• osce_exams — exames clínicos com duração e transição configuráveis\n• osce_stations — estações com caso clínico, script do paciente e paciente virtual IA\n• osce_checklist_items — itens de avaliação (binary/likert/score) com peso e flag crítico\n• osce_circuits — circuitos com código de acesso e rotação automática\n• osce_circuit_students — alunos no circuito com estação atual e estações visitadas\n• osce_evaluations + osce_evaluation_items — avaliações dos avaliadores\n• osce_station_evaluators — vínculo avaliador-estação por email\n• osce_station_materials — materiais (imagens, documentos) vinculados a estações\n• osce_chat_messages — histórico do paciente virtual IA\n\n🏪 Marketplace:\n• marketplace_exams — provas compartilhadas com rating e downloads\n• marketplace_ratings + marketplace_comments — avaliações da comunidade\n\n👥 Turmas:\n• classes — turmas com soft delete\n• class_students — alunos vinculados a turmas\n\n📊 Analytics e Admin:\n• analytics_events — eventos de uso (pageview, clicks, UTM)\n• ai_usage_log — log de uso de IA com tokens e custo estimado\n• ai_api_keys — chaves de API gerenciadas pelo admin\n• admin_invitations — convites administrativos",
  docs_tech_api: "Serviços e APIs Externas",
  docs_tech_api_content: "O sistema integra diversos serviços externos via Edge Functions:\n\n🤖 Inteligência Artificial:\n• Lovable AI Gateway — modelos Google Gemini e OpenAI GPT para geração de questões, correção automática, tutor de IA e paciente virtual OSCE\n• Modelos suportados: Gemini 2.5 Flash/Pro, GPT-5, GPT-5-mini\n• Endpoints: /generate-questions, /grade-exam, /ai-tutor-chat, /osce-virtual-patient, /generate-osce-station\n\n💳 Pagamentos:\n• Stripe — gerenciamento de assinaturas Premium\n• Endpoints: /create-checkout, /check-subscription, /customer-portal, /cancel-subscription\n• Webhooks para atualização automática de status\n\n📧 E-mail:\n• Resend — envio de convites para avaliadores e formulário de contato\n• Endpoints: /send-invite, /send-contact\n\n📈 Métricas:\n• Hub de métricas — envio de dados de uso agregados\n• Endpoint: /send-metrics-to-hub\n\n🔑 Autenticação:\n• Auth integrado — registro, login, reset de senha com verificação de email\n• JWT tokens com refresh automático\n• Portal do aluno via Edge Function: /student-exam-access (acesso por email + PIN sem conta)",
  docs_tech_auth: "Sistema de Autenticação e Autorização",
  docs_tech_auth_content: "Controle de acesso robusto com múltiplas camadas:\n\n• Autenticação: baseada em JWT (registro, login, verificação de email, reset de senha)\n• Papéis: Enum app_role (admin, teacher, student) armazenado em tabela separada user_roles\n• Função has_role(): SECURITY DEFINER que verifica papéis sem recursão RLS\n• Função assign_role_on_signup(): atribuição automática de papel no registro\n• Trigger handle_new_user(): criação automática de perfil na tabela profiles\n\nRow-Level Security (RLS) em todas as tabelas:\n• Professores: CRUD apenas nos próprios recursos (WHERE user_id = auth.uid())\n• Alunos: acesso apenas às provas/sessões vinculadas ao seu ID\n• Admins: acesso total via has_role(auth.uid(), 'admin')\n• Anônimos: acesso limitado (inserção de analytics, leitura de estações OSCE via código de acesso)\n\nPortal do Aluno:\n• Acesso sem conta via Edge Function student-exam-access\n• Validação por email + código de acesso da publicação\n• Service role key para bypass de RLS controlado",
  docs_tech_edge_functions: "Edge Functions (Backend Serverless)",
  docs_tech_edge_functions_content: "12 Edge Functions em Deno runtime (deploy automático):\n\n• generate-questions — Gera questões via IA (múltipla escolha, V/F, dissertativa, associação)\n• grade-exam — Correção automática de respostas dissertativas via IA\n• ai-tutor-chat — Chat com tutor de IA para estudo assistido\n• osce-virtual-patient — Paciente virtual IA para estações OSCE\n• generate-osce-station — Geração de estações OSCE completas via IA\n• student-exam-access — Autenticação de alunos no portal (email + PIN)\n• create-checkout — Criação de sessão Stripe para assinatura Premium\n• check-subscription — Verificação de status da assinatura\n• customer-portal — Redireciona para portal Stripe do cliente\n• cancel-subscription — Cancelamento de assinatura\n• send-invite — Envio de convites por email via Resend\n• send-contact — Processamento do formulário de contato\n• send-metrics-to-hub — Envio de métricas agregadas\n• admin-users — Gerenciamento de usuários pelo admin\n\nTodas as funções usam verify_jwt = false para permitir acesso flexível, com validação manual de auth quando necessário.",
  docs_tech_storage: "Armazenamento de Arquivos",
  docs_tech_storage_content: "O sistema utiliza Object Storage integrado para gerenciar arquivos:\n\n• Bucket: osce-materials (público)\n• Uso: materiais de estações OSCE (imagens clínicas, radiografias, documentos de referência)\n• Upload via interface do editor de estações OSCE\n• URLs públicas para acesso direto pelos alunos e avaliadores durante o circuito\n• Tipos suportados: imagens (JPEG, PNG, WebP), documentos PDF\n• Organização: arquivos referenciados na tabela osce_station_materials com metadados (título, tipo, posição)",
  docs_tech_realtime: "Comunicação em Tempo Real",
  docs_tech_realtime_content: "O sistema utiliza WebSockets para funcionalidades que exigem atualização instantânea:\n\n• Circuitos OSCE: sincronização de rotação entre estações, atualização de status dos alunos e controle do timer centralizado\n• Monitoramento de provas: acompanhamento em tempo real do progresso dos alunos durante provas online\n• Chat do paciente virtual: troca de mensagens em tempo real entre aluno e IA\n\nImplementação:\n• Realtime (PostgreSQL Change Data Capture)\n• Canais por tabela com filtros por circuit_id/publication_id\n• Eventos: INSERT, UPDATE, DELETE propagados automaticamente\n• Tabelas habilitadas: osce_circuit_students, osce_circuits, osce_chat_messages, exam_sessions",
  docs_faq_title: "Perguntas Frequentes",
  docs_faq_q1: "Posso usar o ProvaFácil gratuitamente?",
  docs_faq_a1: "Sim! O plano gratuito permite criar até 5 provas por mês e gerar até 10 questões com IA. Para funcionalidades avançadas como provas online, OSCE e correção por IA, assine o plano Premium.",
  docs_faq_q2: "Como importo questões de outros sistemas?",
  docs_faq_a2: "Vá ao Banco de Questões, clique em 'Nova Questão' e selecione 'Importar CSV/JSON'. O arquivo deve conter os campos: question_text, type, difficulty e tags.",
  docs_faq_q3: "Os alunos precisam criar conta para fazer provas online?",
  docs_faq_a3: "Não! Os alunos acessam pelo Portal do Aluno informando apenas seu nome e o código de acesso da prova fornecido pelo professor.",
  docs_faq_q4: "Posso personalizar o cabeçalho da prova em PDF?",
  docs_faq_a4: "Sim. No Compositor de Provas, clique em 'Cabeçalho' para configurar nome da instituição, professor, data da prova e instruções personalizadas.",
  docs_faq_q5: "A correção por IA funciona para questões dissertativas?",
  docs_faq_a5: "Sim! No plano Premium, a IA analisa as respostas dissertativas e atribui nota e feedback automaticamente. O professor pode revisar e ajustar a nota se necessário.",
  docs_faq_q6: "Como funciona o rodízio de alunos no OSCE?",
  docs_faq_a6: "O sistema sorteia alunos para as estações clínicas e realiza o rodízio circular automaticamente. Cada aluno recebe o tempo integral da estação e, ao finalizar, é encaminhado para a próxima estação disponível até completar o circuito.",

  settings_title: "Configurações",
  settings_subtitle: "Gerencie suas credenciais de acesso.",
  settings_change_name: "Alterar Nome",
  settings_change_name_desc: "Atualize seu nome de exibição.",
  settings_full_name: "Nome completo",
  settings_update_name: "Atualizar nome",
  settings_name_success_title: "Nome atualizado!",
  settings_name_success_desc: "Seu nome foi atualizado com sucesso.",
  settings_change_email: "Alterar E-mail",
  settings_change_email_desc: "Um e-mail de confirmação será enviado para o novo endereço.",
  settings_new_email: "Novo e-mail",
  settings_update_email: "Atualizar e-mail",
  settings_email_success_title: "Solicitação enviada!",
  settings_email_success_desc: "Verifique seu novo e-mail para confirmar a alteração.",
  settings_change_password: "Alterar Senha",
  settings_change_password_desc: "Defina uma nova senha para sua conta.",
  settings_new_password: "Nova senha",
  settings_confirm_password: "Confirmar nova senha",
  settings_update_password: "Atualizar senha",
  settings_password_success_title: "Senha alterada!",
  settings_password_success_desc: "Sua senha foi atualizada com sucesso.",
  settings_password_mismatch: "As senhas não coincidem.",
  settings_error: "Erro",

  pricing_cancel: "Cancelar assinatura",
  pricing_cancel_title: "Cancelar assinatura Premium?",
  pricing_cancel_desc: "Você continuará com acesso Premium até o final do período já pago. Após isso, voltará ao plano gratuito.",
  pricing_cancel_confirm: "Sim, cancelar",
  pricing_cancel_success: "Assinatura cancelada. Você terá acesso até o final do período pago.",

  sidebar_principal: "Principal",
  sidebar_content: "Conteúdo",
  sidebar_management: "Gestão",
  sidebar_my_exams: "Minhas Provas",
  sidebar_trash: "Lixeira",

  onboarding_title: "Bem-vindo ao ProvaFácil!",
  onboarding_subtitle: "Siga estes passos para começar a criar suas provas:",
  onboarding_step1: "Crie sua primeira turma",
  onboarding_step1_desc: "Organize seus alunos em turmas",
  onboarding_step2: "Adicione questões ao banco",
  onboarding_step2_desc: "Crie manualmente ou gere com IA",
  onboarding_step3: "Monte sua primeira prova",
  onboarding_step3_desc: "Use o compositor visual",
  onboarding_step4: "Publique a prova online",
  onboarding_step4_desc: "Compartilhe com seus alunos",

  protected_student_title: "Acesso Restrito",
  protected_student_desc: "Esta área é exclusiva para professores. Use o Portal do Aluno para acessar suas provas.",
  protected_student_portal: "Ir para Portal do Aluno",
  protected_pending_title: "Aguardando Aprovação",
  protected_pending_desc: "Seu cadastro está sendo analisado pelo administrador. Você receberá acesso assim que for aprovado.",
  protected_pending_time: "Geralmente a aprovação ocorre em até 24 horas úteis.",
  protected_contact_admin: "Contatar Administrador",
  protected_admin_title: "Acesso Restrito",
  protected_admin_desc: "Esta área é exclusiva para administradores.",
  protected_back_dashboard: "Voltar ao Painel",

  student_portal_title: "Portal de Avaliação",
  student_portal_desc: "Digite seu e-mail cadastrado pelo administrador e o PIN da avaliação",
  student_email_label: "E-mail cadastrado",
  student_email_placeholder: "seu.email@universidade.br",
  student_pin_label: "PIN da avaliação",
  student_pin_placeholder: "Ex: abc123",
  student_access_btn: "Acessar Avaliação",
  student_help_text: "O administrador deve ter cadastrado seu e-mail na turma. Caso não consiga acessar, entre em contato com ele.",
  student_back_home: "Voltar ao início",
  student_access_denied: "Acesso negado",
  student_unknown_error: "Erro desconhecido.",
  student_error: "Erro",
  student_connection_error: "Não foi possível conectar ao servidor.",

  empty_questions_hint: "Comece criando questões com IA ou manualmente para montar suas provas.",

  sim_nav: "Simulação Realística",
  sim_title: "Simulações Realísticas",
  sim_subtitle: "Crie e gerencie simulações de anamnese com distribuição automática de papéis.",
  sim_new: "Nova Simulação",
  sim_create_title: "Criar Nova Simulação",
  sim_name: "Nome da Simulação",
  sim_name_placeholder: "Ex: Simulação de Anamnese - Turma A",
  sim_description: "Descrição",
  sim_duration: "Duração da rodada",
  sim_minutes: "minutos",
  sim_empty: "Nenhuma simulação criada",
  sim_empty_hint: "Crie sua primeira simulação de anamnese para começar.",
  sim_edit: "Editar",
  sim_control: "Painel de Controle",
  sim_status_draft: "Rascunho",
  sim_status_active: "Ativa",
  sim_status_completed: "Concluída",
  sim_status_pending: "Pendente",
  sim_tab_participants: "Participantes",
  sim_tab_forms: "Formulários",
  sim_professor: "Professor",
  sim_pairs: "Duplas de Alunos",
  sim_pair: "Dupla",
  sim_add_student: "Adicionar aluno",
  sim_form_anamnesis: "Anamnese (Profissional)",
  sim_form_patient_script: "Roteiro (Paciente)",
  sim_form_observer_eval: "Avaliação (Observador)",
  sim_form_professor_eval: "Avaliação (Professor)",
  sim_form_title: "Título do formulário",
  sim_form_saved: "Formulário salvo com sucesso.",
  sim_patient_script_label: "Roteiro do caso clínico",
  sim_patient_script_placeholder: "Descreva o caso clínico que o paciente simulado deve interpretar...",
  sim_field_label: "Pergunta / Item",
  sim_field_options: "Opções (separadas por vírgula)",
  sim_add_field: "Adicionar campo",
  sim_max_score: "Pts",
  sim_settings: "Configurações da Sala",
  sim_start: "Iniciar Simulação",
  sim_start_hint: "Ao iniciar, as rodadas serão geradas automaticamente e os participantes poderão acessar a sala.",
  sim_started: "Simulação iniciada!",
  sim_need_professor: "É necessário cadastrar um professor.",
  sim_need_students: "É necessário pelo menos 2 alunos (1 dupla).",
  sim_round: "Rodada",
  sim_cycle: "Ciclo",
  sim_release: "Liberar",
  sim_end_round: "Encerrar",
  sim_round_released: "Rodada liberada!",
  sim_round_ended: "Rodada encerrada.",
  sim_role_professional: "Profissional Simulado",
  sim_role_patient: "Paciente Simulado",
  sim_role_observer: "Observador",
  sim_join_title: "Simulação Realística",
  sim_join_desc: "Digite seu e-mail e o PIN da sala para entrar na simulação.",
  sim_room_not_found: "Sala não encontrada. Verifique o PIN.",
  sim_not_registered: "Seu e-mail não está registrado nesta sala.",
  sim_waiting_professor: "Aguardando o professor liberar a rodada",
  sim_waiting_desc: "Quando o professor liberar, o formulário será habilitado automaticamente.",
  sim_submitted: "Formulário enviado!",
  sim_waiting_next_round: "Aguarde a próxima rodada.",
  sim_submit: "Enviar",
  sim_no_script: "Roteiro não configurado.",
  sim_view_anamnesis: "Anamneses das rodadas concluídas",
  sim_all_rounds_completed: "Todas as rodadas foram concluídas.",
  sim_release_materials: "Liberar Materiais",
  sim_materials_released: "Materiais liberados!",
  sim_materials_waiting: "Aguardando liberação dos materiais de estudo...",
  sim_materials_ready: "Já estudei o material",
  sim_start_simulation: "Iniciar Simulação",
  sim_feedback_label: "Feedback para o aluno",
  sim_feedback_placeholder: "Escreva aqui o feedback para o aluno avaliado...",
  sim_must_submit_first: "Você precisa enviar a avaliação antes de encerrar a rodada.",
  sim_waiting_your_round: "Você não participa desta rodada. Aguarde a próxima.",
  sim_participants_in_round: "Participantes desta rodada",
  sim_import: "Importar",
  sim_import_from: "Importar de outra sala",
  sim_import_select_room: "Selecione a sala de origem",
  sim_import_participants: "Participantes",
  sim_import_forms: "Formulários",
  sim_import_success: "Importação realizada com sucesso!",
  sim_import_nothing: "Selecione ao menos um item para importar.",
  sim_no_other_rooms: "Não há outras salas de simulação disponíveis.",
  sim_score_total: "Nota total (Professor + Observador)",
  sim_score_warning_low: "A soma das notas é inferior a 10. Ajuste as pontuações.",
  sim_score_warning_high: "A soma das notas é superior a 10. Ajuste as pontuações.",
  sim_score_valid: "Nota total: 10 ✓",
  sim_tab_analytics: "Resultados",
  sim_analytics_no_data: "Nenhuma resposta encontrada ainda.",
  sim_analytics_student: "Aluno",
  sim_analytics_role: "Papel",
  sim_analytics_score: "Nota",
  sim_analytics_avg: "Média",
  sim_analytics_responses: "Respostas enviadas",
  sim_invalid_email: "Por favor, insira um e-mail válido.",
  sim_students_list: "Alunos",
  sim_form_pairs: "Formar Duplas",
  sim_unpaired_students: "Alunos sem dupla",
  sim_select_pair: "Selecione 2 alunos para formar uma dupla",
  sim_pair_formed: "Dupla formada!",
  sim_clear_pairs: "Desfazer Duplas",
  sim_need_pairs: "É necessário formar pelo menos uma dupla antes de gerar as rodadas.",
  sim_add_case: "Adicionar Caso Clínico",
  sim_case_number: "Caso Clínico",
  sim_remove_case: "Remover caso",
  sim_distribute: "Distribuir Rodadas",
  sim_distribution_title: "Distribuição das Rodadas",
  sim_material_rule_hint: "Ao liberar materiais: profissionais recebem o formulário de anamnese, pacientes recebem o roteiro do caso clínico. Observadores recebem o formulário somente ao iniciar a simulação.",
  sim_assigned_case: "Caso atribuído",
  sim_no_cases: "Nenhum caso clínico cadastrado. Cadastre os casos no editor da simulação.",
  sim_control_admin_hint: "A liberação das rodadas é realizada pelo professor na sala virtual.",

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
  nav_settings: "Settings",
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
  analytics_no_data_hint: "Publish and apply exams to see performance reports here.",
  analytics_no_history: "No exams in history yet.",
  analytics_all_classes: "All classes",
  analytics_all_exams: "All exams",
  analytics_total_students: "Students assessed",
  analytics_avg_score: "Average score",
  analytics_pass_rate: "Pass rate (≥60%)",
  analytics_total_submissions: "Exams taken",
  analytics_score_distribution: "Score Distribution",
  analytics_students: "Students",
  analytics_correct_rate: "Correct rate",
  analytics_most_missed: "Most Missed Questions",
  analytics_errors: "errors",
  analytics_error_rate: "error",
  analytics_untagged: "Untagged",

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
  auth_student: "Access Assessment",

  landing_enter: "Sign In",
  landing_create_free: "Create free account",
  landing_hero_title_1: "Create ",
  landing_hero_title_2: "professional",
  landing_hero_title_3: " exams in minutes, not hours.",
  landing_hero_subtitle: "The intelligent platform every teacher deserves. Traditional exams and OSCE with AI, visual composer, marketplace, and analytics — all in one place.",
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
  landing_feat_osce_title: "Complete OSCE Exams",
  landing_feat_osce_desc: "Create and apply structured clinical exams with stations, checklists, automatic rotation, AI virtual patient, and real-time bidirectional audio.",
  landing_feat_marketplace_title: "Exam Marketplace",
  landing_feat_marketplace_desc: "Share and discover exams created by other teachers. Rate, comment, and import with one click.",
  landing_feat_online_title: "Online Exams with Monitoring",
  landing_feat_online_desc: "Publish digital exams with access codes, time limits, automatic grading, and real-time student tracking.",
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
  docs_osce: "OSCE Exams",
  docs_osce_content: "The OSCE (Objective Structured Clinical Examination) module allows you to create and apply complete clinical assessments.\n\n• Stations: create clinical stations with instructions, case summaries, and supporting materials (prescriptions, lab results, images).\n• Checklists: build checklists with binary, Likert, or score-based items, with weights and critical items.\n• Automatic Rotation: the system randomly assigns students to stations and performs circular rotation automatically.\n• Individual Timer: each student gets the full station time, with automatic reset on entry.\n• AI Virtual Patient: students can chat with an AI-powered virtual patient during the station.\n• Bidirectional Audio: real-time voice communication between teacher and student via WebRTC.\n• Control Panel: monitor individual timers and checklist progress for each station in real time.\n• Results: radar charts by competency, application history, and detailed analysis by student and station.",
  docs_marketplace: "Exam Marketplace",
  docs_marketplace_content: "Share and discover exams created by the teacher community.\n\n• Publish your exams for other teachers to use.\n• Search exams by subject, tags, or rating.\n• Rate and comment on other teachers' exams.\n• Import marketplace exams to your collection with one click.\n• Track download counts and average ratings for your published exams.",
  docs_ai_tutor: "AI Tutor",
  docs_ai_tutor_content: "The AI Tutor is an intelligent assistant integrated into the system.\n\n• Ask questions about pedagogy, question design, and assessment best practices.\n• Request question suggestions on any topic.\n• Get help improving the taxonomic level of your questions.\n• Available directly in the teacher dashboard.",
  docs_plans: "Plans & Subscription",
  docs_plans_content: "ProvaFácil offers plans to meet different needs.\n\n• Free: create up to 5 exams/month, 10 AI questions/month, basic PDF export.\n• Premium ($29.90/month): unlimited exams, unlimited AI questions, online exams with monitoring, AI grading, full OSCE, up to 200 students per exam, and priority support.\n• Manage your subscription anytime on the Plans page.",
  docs_security: "Security & Privacy",
  docs_security_content: "Your data is protected with industry-best security practices.\n\n• Each teacher only has access to their own questions and exams.\n• Secure authentication with email verification.\n• Data encrypted in transit and at rest.\n• Role-based access control (teacher, student, administrator).\n• Automatic backups to ensure data integrity.",
  docs_tech_header: "Technical Documentation",
  docs_tech_header_subtitle: "Architecture details, infrastructure, and technologies used to build the system.",
  docs_tech_stack: "Technology Stack",
  docs_tech_stack_content: "ProvaFácil is built with modern, high-performance technologies:\n\n• Frontend: React 18 + TypeScript + Vite (ultra-fast builds)\n• Styling: Tailwind CSS + shadcn/ui (accessible, consistent components)\n• State & Cache: TanStack React Query (smart caching and sync)\n• Routing: React Router v6 (SPA with protected routes)\n• i18n: Custom system with Context API (PT/EN/ES)\n• PDF Generation: jsPDF + html2canvas (professional A4 export)\n• Charts: Recharts (interactive data visualizations)\n• Animations: Framer Motion (smooth transitions)\n• Hosting: Lovable Cloud (automatic deploy with global CDN)",
  docs_tech_architecture: "System Architecture",
  docs_tech_architecture_content: "The system follows a modern serverless architecture:\n\n• Frontend SPA (Single Page Application) served via CDN\n• Backend-as-a-Service via Lovable Cloud\n• Edge Functions (Deno runtime) for server-side logic\n• Managed PostgreSQL database with Row-Level Security (RLS)\n• Integrated JWT authentication with session management\n• Object storage for OSCE materials (public bucket: osce-materials)\n• Realtime via WebSockets for live updates in OSCE circuits\n\nData flow:\nUser → CDN (React Frontend) → REST API (PostgREST) → PostgreSQL\nUser → CDN (React Frontend) → Edge Functions → External APIs (AI, Stripe, Resend)",
  docs_tech_database: "Database Structure",
  docs_tech_database_content: "PostgreSQL with 22+ tables organized by domain:\n\n🔐 Authentication & Profiles:\n• profiles — user data (name, institution, avatar)\n• user_roles — system roles (admin, teacher, student) via app_role enum\n\n📝 Question Bank:\n• question_bank — questions with content_json (JSONB), type, difficulty, Bloom level, tags, and media\n\n📋 Exams & Application:\n• exams — exams with header/layout config (JSONB), soft delete via deleted_at\n• exam_questions — question-exam link with position and scoring\n• exam_publications — publications with access code, time limit, and availability window\n• exam_sessions — student sessions with score and status\n• student_answers — answers with AI + teacher grading (grading_status: pending/ai_graded/teacher_graded)\n\n🏥 OSCE:\n• osce_exams — clinical exams with configurable duration and transition\n• osce_stations — stations with clinical case, patient script, and AI virtual patient\n• osce_checklist_items — evaluation items (binary/likert/score) with weight and critical flag\n• osce_circuits — circuits with access code and automatic rotation\n• osce_circuit_students — students in circuit with current station and visited stations\n• osce_evaluations + osce_evaluation_items — evaluator assessments\n• osce_station_evaluators — evaluator-station link by email\n• osce_station_materials — materials (images, documents) linked to stations\n• osce_chat_messages — AI virtual patient chat history\n\n🏪 Marketplace:\n• marketplace_exams — shared exams with rating and downloads\n• marketplace_ratings + marketplace_comments — community reviews\n\n👥 Classes:\n• classes — classes with soft delete\n• class_students — students linked to classes\n\n📊 Analytics & Admin:\n• analytics_events — usage events (pageview, clicks, UTM)\n• ai_usage_log — AI usage log with tokens and estimated cost\n• ai_api_keys — API keys managed by admin\n• admin_invitations — administrative invitations",
  docs_tech_api: "Services & External APIs",
  docs_tech_api_content: "The system integrates several external services via Edge Functions:\n\n🤖 Artificial Intelligence:\n• Lovable AI Gateway — Google Gemini and OpenAI GPT models for question generation, automatic grading, AI tutor, and OSCE virtual patient\n• Supported models: Gemini 2.5 Flash/Pro, GPT-5, GPT-5-mini\n• Endpoints: /generate-questions, /grade-exam, /ai-tutor-chat, /osce-virtual-patient, /generate-osce-station\n\n💳 Payments:\n• Stripe — Premium subscription management\n• Endpoints: /create-checkout, /check-subscription, /customer-portal, /cancel-subscription\n• Webhooks for automatic status updates\n\n📧 Email:\n• Resend — evaluator invitations and contact form\n• Endpoints: /send-invite, /send-contact\n\n📈 Metrics:\n• Metrics hub — aggregated usage data\n• Endpoint: /send-metrics-to-hub\n\n🔑 Authentication:\n• Auth system — registration, login, password reset with email verification\n• JWT tokens with automatic refresh\n• Student portal via Edge Function: /student-exam-access (access by email + PIN without account)",
  docs_tech_auth: "Authentication & Authorization",
  docs_tech_auth_content: "Robust access control with multiple layers:\n\n• Authentication: JWT-based (registration, login, email verification, password reset)\n• Roles: app_role enum (admin, teacher, student) stored in separate user_roles table\n• has_role() function: SECURITY DEFINER that checks roles without RLS recursion\n• assign_role_on_signup(): automatic role assignment on registration\n• handle_new_user() trigger: automatic profile creation in profiles table\n\nRow-Level Security (RLS) on all tables:\n• Teachers: CRUD only on own resources (WHERE user_id = auth.uid())\n• Students: access only to exams/sessions linked to their ID\n• Admins: full access via has_role(auth.uid(), 'admin')\n• Anonymous: limited access (analytics insert, OSCE station read via access code)\n\nStudent Portal:\n• Account-free access via student-exam-access Edge Function\n• Validation by email + publication access code\n• Service role key for controlled RLS bypass",
  docs_tech_edge_functions: "Edge Functions (Serverless Backend)",
  docs_tech_edge_functions_content: "12 Edge Functions on Deno runtime (automatic deploy):\n\n• generate-questions — Generate questions via AI (multiple choice, T/F, essay, matching)\n• grade-exam — Automatic essay grading via AI\n• ai-tutor-chat — AI tutor chat for assisted study\n• osce-virtual-patient — AI virtual patient for OSCE stations\n• generate-osce-station — Complete OSCE station generation via AI\n• student-exam-access — Student portal authentication (email + PIN)\n• create-checkout — Stripe checkout session for Premium subscription\n• check-subscription — Subscription status check\n• customer-portal — Redirect to Stripe customer portal\n• cancel-subscription — Subscription cancellation\n• send-invite — Email invitations via Resend\n• send-contact — Contact form processing\n• send-metrics-to-hub — Aggregated metrics submission\n• admin-users — Admin user management\n\nAll functions use verify_jwt = false for flexible access, with manual auth validation when needed.",
  docs_tech_storage: "File Storage",
  docs_tech_storage_content: "The system uses integrated Object Storage for file management:\n\n• Bucket: osce-materials (public)\n• Usage: OSCE station materials (clinical images, X-rays, reference documents)\n• Upload via OSCE station editor interface\n• Public URLs for direct access by students and evaluators during the circuit\n• Supported types: images (JPEG, PNG, WebP), PDF documents\n• Organization: files referenced in osce_station_materials table with metadata (title, type, position)",
  docs_tech_realtime: "Real-Time Communication",
  docs_tech_realtime_content: "The system uses WebSockets for features requiring instant updates:\n\n• OSCE Circuits: rotation synchronization between stations, student status updates, and centralized timer control\n• Exam Monitoring: real-time tracking of student progress during online exams\n• Virtual Patient Chat: real-time messaging between student and AI\n\nImplementation:\n• Realtime (PostgreSQL Change Data Capture)\n• Channels per table with circuit_id/publication_id filters\n• Events: INSERT, UPDATE, DELETE propagated automatically\n• Enabled tables: osce_circuit_students, osce_circuits, osce_chat_messages, exam_sessions",
  docs_faq_title: "Frequently Asked Questions",
  docs_faq_q1: "Can I use ProvaFácil for free?",
  docs_faq_a1: "Yes! The free plan allows you to create up to 5 exams per month and generate up to 10 AI questions. For advanced features like online exams, OSCE, and AI grading, subscribe to the Premium plan.",
  docs_faq_q2: "How do I import questions from other systems?",
  docs_faq_a2: "Go to the Question Bank, click 'New Question' and select 'Import CSV/JSON'. The file must contain the fields: question_text, type, difficulty, and tags.",
  docs_faq_q3: "Do students need to create an account to take online exams?",
  docs_faq_a3: "No! Students access through the Student Portal by entering only their name and the exam access code provided by the teacher.",
  docs_faq_q4: "Can I customize the PDF exam header?",
  docs_faq_a4: "Yes. In the Exam Composer, click 'Header' to configure institution name, teacher, exam date, and custom instructions.",
  docs_faq_q5: "Does AI grading work for essay questions?",
  docs_faq_a5: "Yes! On the Premium plan, AI analyzes essay answers and assigns grades and feedback automatically. The teacher can review and adjust the grade if needed.",
  docs_faq_q6: "How does student rotation work in OSCE?",
  docs_faq_a6: "The system randomly assigns students to clinical stations and performs circular rotation automatically. Each student gets the full station time and, upon completion, is directed to the next available station until the circuit is complete.",

  settings_title: "Settings",
  settings_subtitle: "Manage your access credentials.",
  settings_change_name: "Change Name",
  settings_change_name_desc: "Update your display name.",
  settings_full_name: "Full name",
  settings_update_name: "Update name",
  settings_name_success_title: "Name updated!",
  settings_name_success_desc: "Your name has been updated successfully.",
  settings_change_email: "Change Email",
  settings_change_email_desc: "A confirmation email will be sent to the new address.",
  settings_new_email: "New email",
  settings_update_email: "Update email",
  settings_email_success_title: "Request sent!",
  settings_email_success_desc: "Check your new email to confirm the change.",
  settings_change_password: "Change Password",
  settings_change_password_desc: "Set a new password for your account.",
  settings_new_password: "New password",
  settings_confirm_password: "Confirm new password",
  settings_update_password: "Update password",
  settings_password_success_title: "Password changed!",
  settings_password_success_desc: "Your password has been updated successfully.",
  settings_password_mismatch: "Passwords do not match.",
  settings_error: "Error",

  pricing_cancel: "Cancel subscription",
  pricing_cancel_title: "Cancel Premium subscription?",
  pricing_cancel_desc: "You will keep Premium access until the end of the current billing period. After that, you'll revert to the free plan.",
  pricing_cancel_confirm: "Yes, cancel",
  pricing_cancel_success: "Subscription canceled. You'll have access until the end of your billing period.",

  sidebar_principal: "Main",
  sidebar_content: "Content",
  sidebar_management: "Management",
  sidebar_my_exams: "My Exams",
  sidebar_trash: "Trash",

  onboarding_title: "Welcome to ProvaFácil!",
  onboarding_subtitle: "Follow these steps to start creating your exams:",
  onboarding_step1: "Create your first class",
  onboarding_step1_desc: "Organize your students into classes",
  onboarding_step2: "Add questions to the bank",
  onboarding_step2_desc: "Create manually or generate with AI",
  onboarding_step3: "Build your first exam",
  onboarding_step3_desc: "Use the visual composer",
  onboarding_step4: "Publish the exam online",
  onboarding_step4_desc: "Share with your students",

  protected_student_title: "Restricted Access",
  protected_student_desc: "This area is for teachers only. Use the Student Portal to access your exams.",
  protected_student_portal: "Go to Student Portal",
  protected_pending_title: "Awaiting Approval",
  protected_pending_desc: "Your registration is being reviewed by the administrator. You will get access once approved.",
  protected_pending_time: "Approval usually takes up to 24 business hours.",
  protected_contact_admin: "Contact Administrator",
  protected_admin_title: "Restricted Access",
  protected_admin_desc: "This area is for administrators only.",
  protected_back_dashboard: "Back to Dashboard",

  student_portal_title: "Assessment Portal",
  student_portal_desc: "Enter your email registered by the administrator and the assessment PIN",
  student_email_label: "Registered email",
  student_email_placeholder: "your.email@university.edu",
  student_pin_label: "Assessment PIN",
  student_pin_placeholder: "e.g.: abc123",
  student_access_btn: "Access Assessment",
  student_help_text: "The administrator must have registered your email in the class. If you can't access, contact them.",
  student_back_home: "Back to home",
  student_access_denied: "Access denied",
  student_unknown_error: "Unknown error.",
  student_error: "Error",
  student_connection_error: "Could not connect to server.",

  empty_questions_hint: "Start creating questions with AI or manually to build your exams.",

  sim_nav: "Realistic Simulation",
  sim_title: "Realistic Simulations",
  sim_subtitle: "Create and manage anamnesis simulations with automatic role distribution.",
  sim_new: "New Simulation",
  sim_create_title: "Create New Simulation",
  sim_name: "Simulation Name",
  sim_name_placeholder: "E.g.: Anamnesis Simulation - Class A",
  sim_description: "Description",
  sim_duration: "Round duration",
  sim_minutes: "minutes",
  sim_empty: "No simulations created",
  sim_empty_hint: "Create your first anamnesis simulation to get started.",
  sim_edit: "Edit",
  sim_control: "Control Panel",
  sim_status_draft: "Draft",
  sim_status_active: "Active",
  sim_status_completed: "Completed",
  sim_status_pending: "Pending",
  sim_tab_participants: "Participants",
  sim_tab_forms: "Forms",
  sim_professor: "Professor",
  sim_pairs: "Student Pairs",
  sim_pair: "Pair",
  sim_add_student: "Add student",
  sim_form_anamnesis: "Anamnesis (Professional)",
  sim_form_patient_script: "Script (Patient)",
  sim_form_observer_eval: "Evaluation (Observer)",
  sim_form_professor_eval: "Evaluation (Professor)",
  sim_form_title: "Form title",
  sim_form_saved: "Form saved successfully.",
  sim_patient_script_label: "Clinical case script",
  sim_patient_script_placeholder: "Describe the clinical case the simulated patient should interpret...",
  sim_field_label: "Question / Item",
  sim_field_options: "Options (comma separated)",
  sim_add_field: "Add field",
  sim_max_score: "Pts",
  sim_settings: "Room Settings",
  sim_start: "Start Simulation",
  sim_start_hint: "Once started, rounds will be generated automatically and participants can access the room.",
  sim_started: "Simulation started!",
  sim_need_professor: "A professor must be registered.",
  sim_need_students: "At least 2 students (1 pair) are required.",
  sim_round: "Round",
  sim_cycle: "Cycle",
  sim_release: "Release",
  sim_end_round: "End",
  sim_round_released: "Round released!",
  sim_round_ended: "Round ended.",
  sim_role_professional: "Simulated Professional",
  sim_role_patient: "Simulated Patient",
  sim_role_observer: "Observer",
  sim_join_title: "Realistic Simulation",
  sim_join_desc: "Enter your email and the room PIN to join the simulation.",
  sim_room_not_found: "Room not found. Check the PIN.",
  sim_not_registered: "Your email is not registered in this room.",
  sim_waiting_professor: "Waiting for the professor to release the round",
  sim_waiting_desc: "When the professor releases it, the form will be enabled automatically.",
  sim_submitted: "Form submitted!",
  sim_waiting_next_round: "Wait for the next round.",
  sim_submit: "Submit",
  sim_no_script: "Script not configured.",
  sim_view_anamnesis: "Anamnesis from completed rounds",
  sim_all_rounds_completed: "All rounds have been completed.",
  sim_release_materials: "Release Materials",
  sim_materials_released: "Materials released!",
  sim_materials_waiting: "Waiting for study materials to be released...",
  sim_materials_ready: "I've studied the material",
  sim_start_simulation: "Start Simulation",
  sim_feedback_label: "Feedback for the student",
  sim_feedback_placeholder: "Write feedback for the evaluated student here...",
  sim_must_submit_first: "You need to submit the evaluation before ending the round.",
  sim_waiting_your_round: "You are not participating in this round. Wait for the next one.",
  sim_participants_in_round: "Participants in this round",
  sim_import: "Import",
  sim_import_from: "Import from another room",
  sim_import_select_room: "Select source room",
  sim_import_participants: "Participants",
  sim_import_forms: "Forms",
  sim_import_success: "Import completed successfully!",
  sim_import_nothing: "Select at least one item to import.",
  sim_no_other_rooms: "No other simulation rooms available.",
  sim_score_total: "Total score (Professor + Observer)",
  sim_score_warning_low: "The total score is less than 10. Adjust the scores.",
  sim_score_warning_high: "The total score is greater than 10. Adjust the scores.",
  sim_score_valid: "Total score: 10 ✓",
  sim_tab_analytics: "Results",
  sim_analytics_no_data: "No responses found yet.",
  sim_analytics_student: "Student",
  sim_analytics_role: "Role",
  sim_analytics_score: "Score",
  sim_analytics_avg: "Average",
  sim_analytics_responses: "Submitted responses",
  sim_invalid_email: "Please enter a valid email address.",
  sim_students_list: "Students",
  sim_form_pairs: "Form Pairs",
  sim_unpaired_students: "Unpaired students",
  sim_select_pair: "Select 2 students to form a pair",
  sim_pair_formed: "Pair formed!",
  sim_clear_pairs: "Clear Pairs",
  sim_need_pairs: "You must form at least one pair before generating rounds.",
  sim_add_case: "Add Clinical Case",
  sim_case_number: "Clinical Case",
  sim_remove_case: "Remove case",
  sim_distribute: "Distribute Rounds",
  sim_distribution_title: "Round Distribution",
  sim_material_rule_hint: "When materials are released: professionals receive the anamnesis form, patients receive the clinical case script. Observers receive the form only when the simulation starts.",
  sim_assigned_case: "Assigned case",
  sim_no_cases: "No clinical cases registered. Register cases in the simulation editor.",
  sim_control_admin_hint: "Round management is handled by the professor in the virtual room.",

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
  nav_settings: "Configuración",
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
  analytics_no_data_hint: "Publique y aplique exámenes para ver los informes de desempeño aquí.",
  analytics_no_history: "No hay exámenes en el historial aún.",
  analytics_all_classes: "Todas las clases",
  analytics_all_exams: "Todos los exámenes",
  analytics_total_students: "Alumnos evaluados",
  analytics_avg_score: "Nota promedio",
  analytics_pass_rate: "Tasa de aprobación (≥60%)",
  analytics_total_submissions: "Exámenes realizados",
  analytics_score_distribution: "Distribución de Notas",
  analytics_students: "Alumnos",
  analytics_correct_rate: "Tasa de acierto",
  analytics_most_missed: "Preguntas Más Falladas",
  analytics_errors: "errores",
  analytics_error_rate: "error",
  analytics_untagged: "Sin etiqueta",

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
  auth_student: "Acceder a Evaluación",

  landing_enter: "Iniciar sesión",
  landing_create_free: "Crear cuenta gratis",
  landing_hero_title_1: "Cree exámenes ",
  landing_hero_title_2: "profesionales",
  landing_hero_title_3: " en minutos, no en horas.",
  landing_hero_subtitle: "La plataforma inteligente que todo profesor merece. Exámenes tradicionales y OSCE con IA, compositor visual, marketplace y análisis — todo en un solo lugar.",
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
  landing_feat_osce_title: "Exámenes OSCE Completos",
  landing_feat_osce_desc: "Cree y aplique exámenes clínicos estructurados con estaciones, checklists, rotación automática, paciente virtual con IA y audio bidireccional en tiempo real.",
  landing_feat_marketplace_title: "Marketplace de Exámenes",
  landing_feat_marketplace_desc: "Comparta y descubra exámenes creados por otros profesores. Califique, comente e importe con un clic.",
  landing_feat_online_title: "Exámenes en Línea con Monitoreo",
  landing_feat_online_desc: "Publique exámenes digitales con código de acceso, límite de tiempo, corrección automática y seguimiento en tiempo real de los alumnos.",
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
  docs_osce: "Exámenes OSCE",
  docs_osce_content: "El módulo OSCE (Examen Clínico Objetivo Estructurado) permite crear y aplicar evaluaciones clínicas completas.\n\n• Estaciones: cree estaciones clínicas con instrucciones, resumen de caso y materiales de apoyo (recetas, resultados de laboratorio, imágenes).\n• Checklists: construya checklists con ítems binarios, Likert o por puntuación, con pesos e ítems críticos.\n• Rotación Automática: el sistema asigna aleatoriamente alumnos a estaciones y realiza la rotación circular automáticamente.\n• Cronómetro Individual: cada alumno recibe el tiempo integral de la estación, con reinicio automático al entrar.\n• Paciente Virtual con IA: los alumnos pueden conversar con un paciente virtual alimentado por IA durante la estación.\n• Audio Bidireccional: comunicación por voz en tiempo real entre profesor y alumno vía WebRTC.\n• Panel de Control: monitoree cronómetros individuales y progreso de checklists de cada estación en tiempo real.\n• Resultados: gráficos de radar por competencia, historial de aplicaciones y análisis detallado por alumno y estación.",
  docs_marketplace: "Marketplace de Exámenes",
  docs_marketplace_content: "Comparta y descubra exámenes creados por la comunidad de profesores.\n\n• Publique sus exámenes para que otros profesores los utilicen.\n• Busque exámenes por disciplina, etiquetas o calificación.\n• Califique y comente exámenes de otros profesores.\n• Importe exámenes del marketplace a su colección con un clic.\n• Acompañe el número de descargas y la calificación promedio de sus exámenes publicados.",
  docs_ai_tutor: "Tutor de IA",
  docs_ai_tutor_content: "El Tutor de IA es un asistente inteligente integrado al sistema.\n\n• Haga preguntas sobre pedagogía, diseño de preguntas y buenas prácticas de evaluación.\n• Solicite sugerencias de preguntas sobre cualquier tema.\n• Obtenga ayuda para mejorar el nivel taxonómico de sus preguntas.\n• Disponible directamente en el panel del profesor.",
  docs_plans: "Planes y Suscripción",
  docs_plans_content: "ProvaFácil ofrece planes para atender diferentes necesidades.\n\n• Gratuito: cree hasta 5 exámenes/mes, 10 preguntas con IA/mes, exportación PDF básica.\n• Premium ($29.90/mes): exámenes ilimitados, preguntas con IA ilimitadas, exámenes en línea con monitoreo, corrección por IA, OSCE completo, hasta 200 alumnos por examen y soporte prioritario.\n• Gestione su suscripción en cualquier momento en la página de Planes.",
  docs_security: "Seguridad y Privacidad",
  docs_security_content: "Sus datos están protegidos con las mejores prácticas de seguridad.\n\n• Cada profesor solo tiene acceso a sus propias preguntas y exámenes.\n• Autenticación segura con verificación de correo.\n• Datos cifrados en tránsito y en reposo.\n• Control de acceso basado en roles (profesor, alumno, administrador).\n• Copias de seguridad automáticas para garantizar la integridad de los datos.",
  docs_tech_header: "Documentación Técnica",
  docs_tech_header_subtitle: "Detalles de la arquitectura, infraestructura y tecnologías utilizadas en la construcción del sistema.",
  docs_tech_stack: "Stack Tecnológico",
  docs_tech_stack_content: "ProvaFácil está construido con tecnologías modernas y de alto rendimiento:\n\n• Frontend: React 18 + TypeScript + Vite (compilación ultrarrápida)\n• Estilos: Tailwind CSS + shadcn/ui (componentes accesibles y consistentes)\n• Estado y Caché: TanStack React Query (caché inteligente y sincronización)\n• Enrutamiento: React Router v6 (SPA con rutas protegidas)\n• i18n: Sistema propio con Context API (PT/EN/ES)\n• Generación PDF: jsPDF + html2canvas (exportación profesional A4)\n• Gráficos: Recharts (visualizaciones interactivas)\n• Animaciones: Framer Motion (transiciones fluidas)\n• Alojamiento: Lovable Cloud (deploy automático con CDN global)",
  docs_tech_architecture: "Arquitectura del Sistema",
  docs_tech_architecture_content: "El sistema sigue una arquitectura serverless moderna:\n\n• Frontend SPA (Single Page Application) servido vía CDN\n• Backend-as-a-Service vía Lovable Cloud\n• Edge Functions (Deno runtime) para lógica de servidor\n• Base de datos PostgreSQL gestionada con Row-Level Security (RLS)\n• Autenticación JWT integrada con gestión de sesiones\n• Almacenamiento de objetos para materiales OSCE (bucket público: osce-materials)\n• Realtime vía WebSockets para actualizaciones en tiempo real en circuitos OSCE\n\nFlujo de datos:\nUsuario → CDN (Frontend React) → API REST (PostgREST) → PostgreSQL\nUsuario → CDN (Frontend React) → Edge Functions → APIs externas (IA, Stripe, Resend)",
  docs_tech_database: "Estructura de la Base de Datos",
  docs_tech_database_content: "PostgreSQL con 22+ tablas organizadas por dominio:\n\n🔐 Autenticación y Perfiles:\n• profiles — datos del usuario (nombre, institución, avatar)\n• user_roles — roles del sistema (admin, teacher, student) vía enum app_role\n\n📝 Banco de Preguntas:\n• question_bank — preguntas con content_json (JSONB), tipo, dificultad, nivel Bloom, tags y multimedia\n\n📋 Exámenes y Aplicación:\n• exams — exámenes con config de encabezado/layout (JSONB), soft delete vía deleted_at\n• exam_questions — vínculo pregunta-examen con posición y puntuación\n• exam_publications — publicaciones con código de acceso, límite de tiempo y ventana de disponibilidad\n• exam_sessions — sesiones de alumno con puntuación y estado\n• student_answers — respuestas con corrección IA + profesor (grading_status: pending/ai_graded/teacher_graded)\n\n🏥 OSCE:\n• osce_exams — exámenes clínicos con duración y transición configurables\n• osce_stations — estaciones con caso clínico, guion del paciente y paciente virtual IA\n• osce_checklist_items — ítems de evaluación (binary/likert/score) con peso y flag crítico\n• osce_circuits — circuitos con código de acceso y rotación automática\n• osce_circuit_students — alumnos en circuito con estación actual y estaciones visitadas\n• osce_evaluations + osce_evaluation_items — evaluaciones de los evaluadores\n• osce_station_evaluators — vínculo evaluador-estación por email\n• osce_station_materials — materiales (imágenes, documentos) vinculados a estaciones\n• osce_chat_messages — historial del paciente virtual IA\n\n🏪 Marketplace:\n• marketplace_exams — exámenes compartidos con rating y descargas\n• marketplace_ratings + marketplace_comments — evaluaciones de la comunidad\n\n👥 Clases:\n• classes — clases con soft delete\n• class_students — alumnos vinculados a clases\n\n📊 Analytics y Admin:\n• analytics_events — eventos de uso (pageview, clicks, UTM)\n• ai_usage_log — log de uso de IA con tokens y costo estimado\n• ai_api_keys — claves API gestionadas por admin\n• admin_invitations — invitaciones administrativas",
  docs_tech_api: "Servicios y APIs Externas",
  docs_tech_api_content: "El sistema integra diversos servicios externos vía Edge Functions:\n\n🤖 Inteligencia Artificial:\n• Lovable AI Gateway — modelos Google Gemini y OpenAI GPT para generación de preguntas, corrección automática, tutor IA y paciente virtual OSCE\n• Modelos soportados: Gemini 2.5 Flash/Pro, GPT-5, GPT-5-mini\n• Endpoints: /generate-questions, /grade-exam, /ai-tutor-chat, /osce-virtual-patient, /generate-osce-station\n\n💳 Pagos:\n• Stripe — gestión de suscripciones Premium\n• Endpoints: /create-checkout, /check-subscription, /customer-portal, /cancel-subscription\n• Webhooks para actualización automática de estado\n\n📧 Email:\n• Resend — invitaciones a evaluadores y formulario de contacto\n• Endpoints: /send-invite, /send-contact\n\n📈 Métricas:\n• Hub de métricas — envío de datos de uso agregados\n• Endpoint: /send-metrics-to-hub\n\n🔑 Autenticación:\n• Sistema Auth — registro, login, reset de contraseña con verificación de email\n• Tokens JWT con actualización automática\n• Portal del alumno vía Edge Function: /student-exam-access (acceso por email + PIN sin cuenta)",
  docs_tech_auth: "Autenticación y Autorización",
  docs_tech_auth_content: "Control de acceso robusto con múltiples capas:\n\n• Autenticación: basada en JWT (registro, login, verificación de email, reset de contraseña)\n• Roles: enum app_role (admin, teacher, student) almacenado en tabla separada user_roles\n• Función has_role(): SECURITY DEFINER que verifica roles sin recursión RLS\n• assign_role_on_signup(): asignación automática de rol en el registro\n• Trigger handle_new_user(): creación automática de perfil en tabla profiles\n\nRow-Level Security (RLS) en todas las tablas:\n• Profesores: CRUD solo en recursos propios (WHERE user_id = auth.uid())\n• Alumnos: acceso solo a exámenes/sesiones vinculados a su ID\n• Admins: acceso total vía has_role(auth.uid(), 'admin')\n• Anónimos: acceso limitado (inserción analytics, lectura estaciones OSCE vía código de acceso)\n\nPortal del Alumno:\n• Acceso sin cuenta vía Edge Function student-exam-access\n• Validación por email + código de acceso de la publicación\n• Service role key para bypass controlado de RLS",
  docs_tech_edge_functions: "Edge Functions (Backend Serverless)",
  docs_tech_edge_functions_content: "12 Edge Functions en Deno runtime (deploy automático):\n\n• generate-questions — Genera preguntas vía IA (opción múltiple, V/F, ensayo, asociación)\n• grade-exam — Corrección automática de respuestas ensayo vía IA\n• ai-tutor-chat — Chat con tutor IA para estudio asistido\n• osce-virtual-patient — Paciente virtual IA para estaciones OSCE\n• generate-osce-station — Generación de estaciones OSCE completas vía IA\n• student-exam-access — Autenticación de alumnos en el portal (email + PIN)\n• create-checkout — Creación de sesión Stripe para suscripción Premium\n• check-subscription — Verificación de estado de suscripción\n• customer-portal — Redirección al portal Stripe del cliente\n• cancel-subscription — Cancelación de suscripción\n• send-invite — Envío de invitaciones por email vía Resend\n• send-contact — Procesamiento del formulario de contacto\n• send-metrics-to-hub — Envío de métricas agregadas\n• admin-users — Gestión de usuarios por admin\n\nTodas las funciones usan verify_jwt = false para acceso flexible, con validación manual de auth cuando es necesario.",
  docs_tech_storage: "Almacenamiento de Archivos",
  docs_tech_storage_content: "El sistema utiliza Object Storage integrado para gestionar archivos:\n\n• Bucket: osce-materials (público)\n• Uso: materiales de estaciones OSCE (imágenes clínicas, radiografías, documentos de referencia)\n• Carga vía interfaz del editor de estaciones OSCE\n• URLs públicas para acceso directo por alumnos y evaluadores durante el circuito\n• Tipos soportados: imágenes (JPEG, PNG, WebP), documentos PDF\n• Organización: archivos referenciados en tabla osce_station_materials con metadatos (título, tipo, posición)",
  docs_tech_realtime: "Comunicación en Tiempo Real",
  docs_tech_realtime_content: "El sistema utiliza WebSockets para funcionalidades que requieren actualización instantánea:\n\n• Circuitos OSCE: sincronización de rotación entre estaciones, actualización de estado de alumnos y control centralizado del temporizador\n• Monitoreo de exámenes: seguimiento en tiempo real del progreso de los alumnos durante exámenes en línea\n• Chat del paciente virtual: intercambio de mensajes en tiempo real entre alumno e IA\n\nImplementación:\n• Realtime (PostgreSQL Change Data Capture)\n• Canales por tabla con filtros por circuit_id/publication_id\n• Eventos: INSERT, UPDATE, DELETE propagados automáticamente\n• Tablas habilitadas: osce_circuit_students, osce_circuits, osce_chat_messages, exam_sessions",
  docs_faq_title: "Preguntas Frecuentes",
  docs_faq_q1: "¿Puedo usar ProvaFácil gratuitamente?",
  docs_faq_a1: "¡Sí! El plan gratuito permite crear hasta 5 exámenes por mes y generar hasta 10 preguntas con IA. Para funcionalidades avanzadas como exámenes en línea, OSCE y corrección por IA, suscríbase al plan Premium.",
  docs_faq_q2: "¿Cómo importo preguntas de otros sistemas?",
  docs_faq_a2: "Vaya al Banco de Preguntas, haga clic en 'Nueva Pregunta' y seleccione 'Importar CSV/JSON'. El archivo debe contener los campos: question_text, type, difficulty y tags.",
  docs_faq_q3: "¿Los alumnos necesitan crear cuenta para hacer exámenes en línea?",
  docs_faq_a3: "¡No! Los alumnos acceden por el Portal del Alumno informando solo su nombre y el código de acceso del examen proporcionado por el profesor.",
  docs_faq_q4: "¿Puedo personalizar el encabezado del examen en PDF?",
  docs_faq_a4: "Sí. En el Compositor de Exámenes, haga clic en 'Encabezado' para configurar nombre de la institución, profesor, fecha del examen e instrucciones personalizadas.",
  docs_faq_q5: "¿La corrección por IA funciona para preguntas de ensayo?",
  docs_faq_a5: "¡Sí! En el plan Premium, la IA analiza las respuestas de ensayo y asigna nota y retroalimentación automáticamente. El profesor puede revisar y ajustar la nota si es necesario.",
  docs_faq_q6: "¿Cómo funciona la rotación de alumnos en OSCE?",
  docs_faq_a6: "El sistema asigna aleatoriamente alumnos a las estaciones clínicas y realiza la rotación circular automáticamente. Cada alumno recibe el tiempo integral de la estación y, al finalizar, es dirigido a la siguiente estación disponible hasta completar el circuito.",

  settings_title: "Configuración",
  settings_subtitle: "Gestione sus credenciales de acceso.",
  settings_change_name: "Cambiar Nombre",
  settings_change_name_desc: "Actualice su nombre de visualización.",
  settings_full_name: "Nombre completo",
  settings_update_name: "Actualizar nombre",
  settings_name_success_title: "¡Nombre actualizado!",
  settings_name_success_desc: "Su nombre ha sido actualizado con éxito.",
  settings_change_email: "Cambiar Correo",
  settings_change_email_desc: "Se enviará un correo de confirmación a la nueva dirección.",
  settings_new_email: "Nuevo correo",
  settings_update_email: "Actualizar correo",
  settings_email_success_title: "¡Solicitud enviada!",
  settings_email_success_desc: "Revise su nuevo correo para confirmar el cambio.",
  settings_change_password: "Cambiar Contraseña",
  settings_change_password_desc: "Defina una nueva contraseña para su cuenta.",
  settings_new_password: "Nueva contraseña",
  settings_confirm_password: "Confirmar nueva contraseña",
  settings_update_password: "Actualizar contraseña",
  settings_password_success_title: "¡Contraseña cambiada!",
  settings_password_success_desc: "Su contraseña ha sido actualizada con éxito.",
  settings_password_mismatch: "Las contraseñas no coinciden.",
  settings_error: "Error",

  pricing_cancel: "Cancelar suscripción",
  pricing_cancel_title: "¿Cancelar suscripción Premium?",
  pricing_cancel_desc: "Mantendrá el acceso Premium hasta el final del período de facturación actual. Después, volverá al plan gratuito.",
  pricing_cancel_confirm: "Sí, cancelar",
  pricing_cancel_success: "Suscripción cancelada. Tendrá acceso hasta el final de su período de facturación.",

  sidebar_principal: "Principal",
  sidebar_content: "Contenido",
  sidebar_management: "Gestión",
  sidebar_my_exams: "Mis Exámenes",
  sidebar_trash: "Papelera",

  onboarding_title: "¡Bienvenido a ProvaFácil!",
  onboarding_subtitle: "Siga estos pasos para comenzar a crear sus exámenes:",
  onboarding_step1: "Cree su primera clase",
  onboarding_step1_desc: "Organice sus alumnos en clases",
  onboarding_step2: "Agregue preguntas al banco",
  onboarding_step2_desc: "Cree manualmente o genere con IA",
  onboarding_step3: "Arme su primer examen",
  onboarding_step3_desc: "Use el compositor visual",
  onboarding_step4: "Publique el examen en línea",
  onboarding_step4_desc: "Comparta con sus alumnos",

  protected_student_title: "Acceso Restringido",
  protected_student_desc: "Esta área es exclusiva para profesores. Use el Portal del Alumno para acceder a sus exámenes.",
  protected_student_portal: "Ir al Portal del Alumno",
  protected_pending_title: "Esperando Aprobación",
  protected_pending_desc: "Su registro está siendo analizado por el administrador. Recibirá acceso una vez aprobado.",
  protected_pending_time: "La aprobación generalmente ocurre en hasta 24 horas hábiles.",
  protected_contact_admin: "Contactar Administrador",
  protected_admin_title: "Acceso Restringido",
  protected_admin_desc: "Esta área es exclusiva para administradores.",
  protected_back_dashboard: "Volver al Panel",

  student_portal_title: "Portal de Evaluación",
  student_portal_desc: "Ingrese su correo registrado por el administrador y el PIN de la evaluación",
  student_email_label: "Correo registrado",
  student_email_placeholder: "su.correo@universidad.edu",
  student_pin_label: "PIN de la evaluación",
  student_pin_placeholder: "Ej: abc123",
  student_access_btn: "Acceder a la Evaluación",
  student_help_text: "El administrador debe haber registrado su correo en la clase. Si no puede acceder, contáctelo.",
  student_back_home: "Volver al inicio",
  student_access_denied: "Acceso denegado",
  student_unknown_error: "Error desconocido.",
  student_error: "Error",
  student_connection_error: "No fue posible conectar al servidor.",

  empty_questions_hint: "Comience creando preguntas con IA o manualmente para armar sus exámenes.",

  sim_nav: "Simulación Realista",
  sim_title: "Simulaciones Realistas",
  sim_subtitle: "Cree y gestione simulaciones de anamnesis con distribución automática de roles.",
  sim_new: "Nueva Simulación",
  sim_create_title: "Crear Nueva Simulación",
  sim_name: "Nombre de la Simulación",
  sim_name_placeholder: "Ej: Simulación de Anamnesis - Clase A",
  sim_description: "Descripción",
  sim_duration: "Duración de la ronda",
  sim_minutes: "minutos",
  sim_empty: "No hay simulaciones creadas",
  sim_empty_hint: "Cree su primera simulación de anamnesis para comenzar.",
  sim_edit: "Editar",
  sim_control: "Panel de Control",
  sim_status_draft: "Borrador",
  sim_status_active: "Activa",
  sim_status_completed: "Completada",
  sim_status_pending: "Pendiente",
  sim_tab_participants: "Participantes",
  sim_tab_forms: "Formularios",
  sim_professor: "Profesor",
  sim_pairs: "Duplas de Alumnos",
  sim_pair: "Dupla",
  sim_add_student: "Agregar alumno",
  sim_form_anamnesis: "Anamnesis (Profesional)",
  sim_form_patient_script: "Guion (Paciente)",
  sim_form_observer_eval: "Evaluación (Observador)",
  sim_form_professor_eval: "Evaluación (Profesor)",
  sim_form_title: "Título del formulario",
  sim_form_saved: "Formulario guardado con éxito.",
  sim_patient_script_label: "Guion del caso clínico",
  sim_patient_script_placeholder: "Describa el caso clínico que el paciente simulado debe interpretar...",
  sim_field_label: "Pregunta / Ítem",
  sim_field_options: "Opciones (separadas por coma)",
  sim_add_field: "Agregar campo",
  sim_max_score: "Pts",
  sim_settings: "Configuración de la Sala",
  sim_start: "Iniciar Simulación",
  sim_start_hint: "Al iniciar, las rondas se generarán automáticamente y los participantes podrán acceder a la sala.",
  sim_started: "¡Simulación iniciada!",
  sim_need_professor: "Es necesario registrar un profesor.",
  sim_need_students: "Se necesitan al menos 2 alumnos (1 dupla).",
  sim_round: "Ronda",
  sim_cycle: "Ciclo",
  sim_release: "Liberar",
  sim_end_round: "Finalizar",
  sim_round_released: "¡Ronda liberada!",
  sim_round_ended: "Ronda finalizada.",
  sim_role_professional: "Profesional Simulado",
  sim_role_patient: "Paciente Simulado",
  sim_role_observer: "Observador",
  sim_join_title: "Simulación Realista",
  sim_join_desc: "Ingrese su correo y el PIN de la sala para unirse a la simulación.",
  sim_room_not_found: "Sala no encontrada. Verifique el PIN.",
  sim_not_registered: "Su correo no está registrado en esta sala.",
  sim_waiting_professor: "Esperando que el profesor libere la ronda",
  sim_waiting_desc: "Cuando el profesor la libere, el formulario se habilitará automáticamente.",
  sim_submitted: "¡Formulario enviado!",
  sim_waiting_next_round: "Espere la próxima ronda.",
  sim_submit: "Enviar",
  sim_no_script: "Guion no configurado.",
  sim_view_anamnesis: "Anamnesis de rondas completadas",
  sim_all_rounds_completed: "Todas las rondas han sido completadas.",
  sim_release_materials: "Liberar Materiales",
  sim_materials_released: "¡Materiales liberados!",
  sim_materials_waiting: "Esperando la liberación de los materiales de estudio...",
  sim_materials_ready: "Ya estudié el material",
  sim_start_simulation: "Iniciar Simulación",
  sim_feedback_label: "Feedback para el alumno",
  sim_feedback_placeholder: "Escriba aquí el feedback para el alumno evaluado...",
  sim_must_submit_first: "Debe enviar la evaluación antes de finalizar la ronda.",
  sim_waiting_your_round: "No participa en esta ronda. Espere la próxima.",
  sim_participants_in_round: "Participantes de esta ronda",
  sim_import: "Importar",
  sim_import_from: "Importar de otra sala",
  sim_import_select_room: "Seleccione la sala de origen",
  sim_import_participants: "Participantes",
  sim_import_forms: "Formularios",
  sim_import_success: "¡Importación realizada con éxito!",
  sim_import_nothing: "Seleccione al menos un elemento para importar.",
  sim_no_other_rooms: "No hay otras salas de simulación disponibles.",
  sim_score_total: "Nota total (Profesor + Observador)",
  sim_score_warning_low: "La suma de las notas es inferior a 10. Ajuste las puntuaciones.",
  sim_score_warning_high: "La suma de las notas es superior a 10. Ajuste las puntuaciones.",
  sim_score_valid: "Nota total: 10 ✓",
  sim_tab_analytics: "Resultados",
  sim_analytics_no_data: "No se encontraron respuestas aún.",
  sim_analytics_student: "Alumno",
  sim_analytics_role: "Rol",
  sim_analytics_score: "Nota",
  sim_analytics_avg: "Promedio",
  sim_analytics_responses: "Respuestas enviadas",
  sim_invalid_email: "Por favor, ingrese un correo electrónico válido.",
  sim_students_list: "Alumnos",
  sim_form_pairs: "Formar Duplas",
  sim_unpaired_students: "Alumnos sin dupla",
  sim_select_pair: "Seleccione 2 alumnos para formar una dupla",
  sim_pair_formed: "¡Dupla formada!",
  sim_clear_pairs: "Deshacer Duplas",
  sim_need_pairs: "Es necesario formar al menos una dupla antes de generar las rondas.",
  sim_add_case: "Agregar Caso Clínico",
  sim_case_number: "Caso Clínico",
  sim_remove_case: "Eliminar caso",
  sim_distribute: "Distribuir Rondas",
  sim_distribution_title: "Distribución de Rondas",
  sim_material_rule_hint: "Al liberar materiales: profesionales reciben el formulario de anamnesis, pacientes reciben el guion del caso clínico. Observadores reciben el formulario solo al iniciar la simulación.",
  sim_assigned_case: "Caso asignado",
  sim_no_cases: "No hay casos clínicos registrados. Registre los casos en el editor de la simulación.",
  sim_control_admin_hint: "La gestión de las rondas es realizada por el profesor en la sala virtual.",

  cancel: "Cancelar",
  save: "Guardar",
  create: "Crear",
  confirm: "Confirmar",
  loading: "Cargando...",
};

export const translations: Record<Language, TranslationKeys> = { pt, en, es };
