import type { Language } from "@/i18n/LanguageContext";

// Textos das páginas Funcionalidades e Planos (pt, en, es). Só descreve o que existe no sistema.
// Os planos mantêm exatamente os dados anteriores (preço, limites e recursos); só o visual e o idioma mudaram.

export type FeatureItem = { title: string; desc: string; highlights: string[] };
export type FeatureGroup = { id: string; label: string; intro: string; items: FeatureItem[] };

export type FeaturesPageContent = {
  eyebrow: string; title: string; titleEm: string; sub: string; jump: string;
  groups: FeatureGroup[];
  cta: { heading: string; sub: string; primary: string; secondary: string };
};

export type PlansPageContent = {
  eyebrow: string; title: string; sub: string;
  perMonth: string; unlimited: string;
  free: { name: string; desc: string; cta: string };
  premium: { name: string; desc: string; trial: string; cta: string; loading: string };
  rows: string[]; // 8 nomes, na ordem dos dados dos planos
  featuresLink: string; featuresLinkCta: string;
  errorTitle: string; errorFallback: string;
};

const featuresPt: FeaturesPageContent = {
  eyebrow: "Funcionalidades",
  title: "Tudo o que a plataforma faz ",
  titleEm: "hoje",
  sub: "Do banco de questões ao paciente virtual, organizado por tipo de atividade.",
  jump: "Ir para",
  groups: [
    {
      id: "avaliacao", label: "Avaliação clássica", intro: "Provas e testes, do banco de questões à aplicação online.",
      items: [
        { title: "Banco de questões e geração por IA", desc: "Organize questões por tópico, dificuldade, tags e nível de Bloom, importe de CSV ou JSON e gere novas com IA para revisar.", highlights: ["Filtros por Bloom e dificuldade", "Importação CSV/JSON", "Geração por IA"] },
        { title: "Compositor de provas e PDF", desc: "Monte a prova arrastando questões do banco, com cabeçalho da instituição, seções e gabarito, e exporte em PDF pronto para imprimir.", highlights: ["Arrastar e soltar", "Cabeçalho personalizado", "PDF com gabarito"] },
        { title: "Provas online com monitoramento", desc: "Publique com código de acesso e tempo limite, acompanhe os alunos ao vivo e receba as respostas com correção automática.", highlights: ["Código de acesso", "Tempo limite", "Acompanhamento ao vivo"] },
        { title: "Teste de progresso, SCT, KFE e SJT", desc: "Formatos para medir o raciocínio clínico além da múltipla escolha: teste de progresso, concordância de script, key feature e julgamento situacional.", highlights: ["Teste de progresso", "SCT e KFE", "Julgamento situacional"] },
      ],
    },
    {
      id: "clinica", label: "Prática clínica", intro: "Atividades presenciais e em sala, com avaliação por critérios.",
      items: [
        { title: "OSCE", desc: "Monte circuitos com estações, checklists e rodízio, use o QR para o avaliador e inclua um paciente virtual com áudio em tempo real.", highlights: ["Estações e checklists", "Rodízio automático", "Paciente virtual com áudio"] },
        { title: "Simulação realística de anamnese", desc: "Dois alunos atendem e um observa. O paciente segue um roteiro padronizado, o registro vai em um formulário na tela ou em PDF, e professor e observador avaliam por critérios.", highlights: ["Roteiro do paciente em PDF", "Formulário com tabelas", "Critérios com “Não se aplica”"] },
        { title: "SOAP, reconciliação, documentação e observação clínica", desc: "Salas para treinar o registro profissional: notas SOAP, reconciliação de medicamentos, documentação clínica e observação clínica avaliada.", highlights: ["SOAP", "Reconciliação", "Documentação clínica"] },
      ],
    },
    {
      id: "virtual", label: "Paciente virtual e júri", intro: "Prática com IA e com colegas, sem precisar de ator.",
      items: [
        { title: "Paciente Virtual", desc: "O aluno conversa com um paciente simulado por IA, recebe um debriefing passo a passo com o raciocínio por trás de cada fala e pode ser avaliado por colegas.", highlights: ["Casos por área", "Debriefing passo a passo", "Avaliação entre pares"] },
        { title: "Júri simulado", desc: "Atividade de argumentação em grupo, com avaliação entre pares por critérios e correção assistida por IA.", highlights: ["Avaliação entre pares", "Correção assistida por IA", "Grupos de alunos"] },
      ],
    },
    {
      id: "ia", label: "Inteligência artificial", intro: "Apoio para o trabalho repetitivo, sempre com a decisão do professor.",
      items: [
        { title: "A IA sugere, o professor decide", desc: "Sugere a pontuação do registro escrito comparando com o roteiro do paciente, escreve o feedback a partir das suas anotações com exemplos do caso atendido e monta o debriefing. Nada vira nota sem a sua confirmação.", highlights: ["Pontuação sugerida do registro", "Feedback com exemplos do paciente", "Você confirma cada nota"] },
      ],
    },
    {
      id: "turmas", label: "Turmas e acompanhamento", intro: "Da organização da disciplina ao histórico do aluno.",
      items: [
        { title: "Turmas e disciplinas", desc: "Organize disciplinas por semestre, cadastre alunos, vincule provas e atividades à turma e acompanhe tudo em um calendário.", highlights: ["Disciplinas e semestres", "Atividades vinculadas", "Calendário"] },
        { title: "Boletim e análises", desc: "Veja o boletim da turma e a análise de desempenho, com distribuição de notas, questões mais erradas e tendência.", highlights: ["Boletim da turma", "Distribuição de notas", "Questões mais erradas"] },
        { title: "Competências e portfólio", desc: "Mapeie as competências avaliadas e deixe o aluno reunir o histórico e o desempenho no portfólio.", highlights: ["Mapa de competências", "Portfólio do aluno", "Gamificação"] },
      ],
    },
    {
      id: "plataforma", label: "Plataforma", intro: "O que sustenta o uso no dia a dia.",
      items: [
        { title: "Marketplace", desc: "Compartilhe provas e descubra as criadas por outros professores, com avaliação e importação em um clique.", highlights: ["Compartilhar", "Avaliar e comentar", "Importar"] },
        { title: "Integração com LMS e check-in por QR", desc: "Leve as notas para o ambiente virtual de aprendizagem da instituição e registre a presença da turma por QR.", highlights: ["Integração com LMS", "Check-in por QR", "Presença"] },
        { title: "Segurança, privacidade e acessibilidade", desc: "Cada professor acessa só os seus dados, com controle por função. Política de privacidade clara e ajustes de leitura e contraste para o aluno.", highlights: ["Controle por função", "Privacidade e LGPD", "Acessibilidade para o aluno"] },
      ],
    },
  ],
  cta: { heading: "Veja na prática", sub: "Crie sua conta e comece por um modelo pronto da sua área.", primary: "Criar minha conta", secondary: "Ver planos" },
};

const featuresEn: FeaturesPageContent = {
  eyebrow: "Features",
  title: "Everything the platform does ",
  titleEm: "today",
  sub: "From the question bank to the virtual patient, organized by type of activity.",
  jump: "Jump to",
  groups: [
    {
      id: "avaliacao", label: "Classic assessment", intro: "Exams and tests, from the question bank to online delivery.",
      items: [
        { title: "Question bank and AI generation", desc: "Organize questions by topic, difficulty, tags and Bloom level, import from CSV or JSON and generate new ones with AI to review.", highlights: ["Bloom and difficulty filters", "CSV/JSON import", "AI generation"] },
        { title: "Exam composer and PDF", desc: "Build the exam by dragging questions from the bank, with institution header, sections and answer key, and export a print-ready PDF.", highlights: ["Drag and drop", "Custom header", "PDF with answer key"] },
        { title: "Online exams with monitoring", desc: "Publish with an access code and time limit, follow students live and receive answers with automatic grading.", highlights: ["Access code", "Time limit", "Live tracking"] },
        { title: "Progress test, SCT, KFE and SJT", desc: "Formats that measure clinical reasoning beyond multiple choice: progress test, script concordance, key feature and situational judgment.", highlights: ["Progress test", "SCT and KFE", "Situational judgment"] },
      ],
    },
    {
      id: "clinica", label: "Clinical practice", intro: "In-person and classroom activities, assessed by criteria.",
      items: [
        { title: "OSCE", desc: "Build circuits with stations, checklists and rotation, use the QR code for the examiner and add a virtual patient with real-time audio.", highlights: ["Stations and checklists", "Automatic rotation", "Virtual patient with audio"] },
        { title: "Realistic medical history simulation", desc: "Two students run the encounter and one observes. The patient follows a standardized script, the record goes in an on-screen or PDF form, and the teacher and observer assess by criteria.", highlights: ["Patient script as PDF", "Form with tables", "Criteria with “Not applicable”"] },
        { title: "SOAP, reconciliation, documentation and clinical observation", desc: "Rooms to practice professional records: SOAP notes, medication reconciliation, clinical documentation and assessed clinical observation.", highlights: ["SOAP", "Reconciliation", "Clinical documentation"] },
      ],
    },
    {
      id: "virtual", label: "Virtual patient and mock trial", intro: "Practice with AI and with peers, no actor needed.",
      items: [
        { title: "Virtual Patient", desc: "Students talk to an AI-simulated patient, get a step-by-step debriefing with the reasoning behind each line and can be assessed by peers.", highlights: ["Cases by field", "Step-by-step debriefing", "Peer assessment"] },
        { title: "Mock trial", desc: "Group argumentation activity, with peer assessment by criteria and AI-assisted grading.", highlights: ["Peer assessment", "AI-assisted grading", "Student groups"] },
      ],
    },
    {
      id: "ia", label: "Artificial intelligence", intro: "Support for repetitive work, always with the teacher's decision.",
      items: [
        { title: "AI suggests, the teacher decides", desc: "Suggests the written record score by comparing it with the patient script, writes feedback from your notes with examples from the patient seen and builds the debriefing. Nothing becomes a grade without your confirmation.", highlights: ["Suggested record score", "Feedback with patient examples", "You confirm every grade"] },
      ],
    },
    {
      id: "turmas", label: "Classes and tracking", intro: "From organizing the course to the student's history.",
      items: [
        { title: "Classes and courses", desc: "Organize courses by term, enroll students, link exams and activities to the class and follow everything in a calendar.", highlights: ["Courses and terms", "Linked activities", "Calendar"] },
        { title: "Gradebook and analytics", desc: "See the class gradebook and performance analysis, with grade distribution, most-missed questions and trends.", highlights: ["Class gradebook", "Grade distribution", "Most-missed questions"] },
        { title: "Competencies and portfolio", desc: "Map the assessed competencies and let students gather their history and performance in the portfolio.", highlights: ["Competency map", "Student portfolio", "Gamification"] },
      ],
    },
    {
      id: "plataforma", label: "Platform", intro: "What supports everyday use.",
      items: [
        { title: "Marketplace", desc: "Share exams and discover those created by other teachers, with ratings and one-click import.", highlights: ["Share", "Rate and comment", "Import"] },
        { title: "LMS integration and QR check-in", desc: "Take grades to your institution's learning management system and record class attendance by QR code.", highlights: ["LMS integration", "QR check-in", "Attendance"] },
        { title: "Security, privacy and accessibility", desc: "Each teacher accesses only their own data, with role-based control. A clear privacy policy and reading and contrast settings for students.", highlights: ["Role-based control", "Privacy and data protection", "Student accessibility"] },
      ],
    },
  ],
  cta: { heading: "See it in practice", sub: "Create your account and start from a ready template for your field.", primary: "Create my account", secondary: "See plans" },
};

const featuresEs: FeaturesPageContent = {
  eyebrow: "Funcionalidades",
  title: "Todo lo que la plataforma hace ",
  titleEm: "hoy",
  sub: "Del banco de preguntas al paciente virtual, organizado por tipo de actividad.",
  jump: "Ir a",
  groups: [
    {
      id: "avaliacao", label: "Evaluación clásica", intro: "Exámenes y pruebas, del banco de preguntas a la aplicación en línea.",
      items: [
        { title: "Banco de preguntas y generación por IA", desc: "Organice preguntas por tema, dificultad, etiquetas y nivel de Bloom, importe desde CSV o JSON y genere nuevas con IA para revisar.", highlights: ["Filtros por Bloom y dificultad", "Importación CSV/JSON", "Generación por IA"] },
        { title: "Compositor de exámenes y PDF", desc: "Arme el examen arrastrando preguntas del banco, con encabezado de la institución, secciones y clave de respuestas, y exporte un PDF listo para imprimir.", highlights: ["Arrastrar y soltar", "Encabezado personalizado", "PDF con clave"] },
        { title: "Exámenes en línea con monitoreo", desc: "Publique con código de acceso y tiempo límite, siga a los alumnos en vivo y reciba las respuestas con corrección automática.", highlights: ["Código de acceso", "Tiempo límite", "Seguimiento en vivo"] },
        { title: "Prueba de progreso, SCT, KFE y SJT", desc: "Formatos para medir el razonamiento clínico más allá de la opción múltiple: prueba de progreso, concordancia de guion, key feature y juicio situacional.", highlights: ["Prueba de progreso", "SCT y KFE", "Juicio situacional"] },
      ],
    },
    {
      id: "clinica", label: "Práctica clínica", intro: "Actividades presenciales y en el aula, evaluadas por criterios.",
      items: [
        { title: "OSCE", desc: "Arme circuitos con estaciones, listas de verificación y rotación, use el QR para el evaluador e incluya un paciente virtual con audio en tiempo real.", highlights: ["Estaciones y listas", "Rotación automática", "Paciente virtual con audio"] },
        { title: "Simulación realística de anamnesis", desc: "Dos alumnos atienden y uno observa. El paciente sigue un guion estandarizado, el registro va en un formulario en pantalla o en PDF, y el profesor y el observador evalúan por criterios.", highlights: ["Guion del paciente en PDF", "Formulario con tablas", "Criterios con “No aplica”"] },
        { title: "SOAP, conciliación, documentación y observación clínica", desc: "Salas para practicar el registro profesional: notas SOAP, conciliación de medicamentos, documentación clínica y observación clínica evaluada.", highlights: ["SOAP", "Conciliación", "Documentación clínica"] },
      ],
    },
    {
      id: "virtual", label: "Paciente virtual y juicio", intro: "Práctica con IA y con compañeros, sin necesidad de actor.",
      items: [
        { title: "Paciente Virtual", desc: "El alumno conversa con un paciente simulado por IA, recibe un debriefing paso a paso con el razonamiento detrás de cada frase y puede ser evaluado por compañeros.", highlights: ["Casos por área", "Debriefing paso a paso", "Evaluación entre pares"] },
        { title: "Juicio simulado", desc: "Actividad de argumentación en grupo, con evaluación entre pares por criterios y corrección asistida por IA.", highlights: ["Evaluación entre pares", "Corrección asistida por IA", "Grupos de alumnos"] },
      ],
    },
    {
      id: "ia", label: "Inteligencia artificial", intro: "Apoyo para el trabajo repetitivo, siempre con la decisión del profesor.",
      items: [
        { title: "La IA sugiere, el profesor decide", desc: "Sugiere la puntuación del registro escrito comparándolo con el guion del paciente, escribe el feedback a partir de sus anotaciones con ejemplos del caso atendido y arma el debriefing. Nada se vuelve nota sin su confirmación.", highlights: ["Puntuación sugerida del registro", "Feedback con ejemplos del paciente", "Usted confirma cada nota"] },
      ],
    },
    {
      id: "turmas", label: "Cursos y seguimiento", intro: "De la organización de la asignatura al historial del alumno.",
      items: [
        { title: "Cursos y asignaturas", desc: "Organice asignaturas por semestre, registre alumnos, vincule exámenes y actividades al curso y siga todo en un calendario.", highlights: ["Asignaturas y semestres", "Actividades vinculadas", "Calendario"] },
        { title: "Boletín y análisis", desc: "Vea el boletín del curso y el análisis de desempeño, con distribución de notas, preguntas más falladas y tendencia.", highlights: ["Boletín del curso", "Distribución de notas", "Preguntas más falladas"] },
        { title: "Competencias y portafolio", desc: "Mapee las competencias evaluadas y deje que el alumno reúna su historial y desempeño en el portafolio.", highlights: ["Mapa de competencias", "Portafolio del alumno", "Gamificación"] },
      ],
    },
    {
      id: "plataforma", label: "Plataforma", intro: "Lo que sostiene el uso del día a día.",
      items: [
        { title: "Marketplace", desc: "Comparta exámenes y descubra los creados por otros profesores, con valoración e importación en un clic.", highlights: ["Compartir", "Valorar y comentar", "Importar"] },
        { title: "Integración con LMS y check-in por QR", desc: "Lleve las notas al entorno virtual de aprendizaje de la institución y registre la asistencia del curso por QR.", highlights: ["Integración con LMS", "Check-in por QR", "Asistencia"] },
        { title: "Seguridad, privacidad y accesibilidad", desc: "Cada profesor accede solo a sus datos, con control por rol. Política de privacidad clara y ajustes de lectura y contraste para el alumno.", highlights: ["Control por rol", "Privacidad y protección de datos", "Accesibilidad para el alumno"] },
      ],
    },
  ],
  cta: { heading: "Véalo en la práctica", sub: "Cree su cuenta y empiece por un modelo listo de su área.", primary: "Crear mi cuenta", secondary: "Ver planes" },
};

const plansPt: PlansPageContent = {
  eyebrow: "Planos",
  title: "Planos e preços",
  sub: "Comece gratuitamente e faça upgrade quando precisar de mais recursos.",
  perMonth: "/mês", unlimited: "Ilimitado",
  free: { name: "Gratuito", desc: "Para experimentar o ProvaFácil", cta: "Começar grátis" },
  premium: { name: "Premium", desc: "Para professores que precisam de mais", trial: "7 dias grátis para testar · Cancele quando quiser", cta: "Assinar Premium", loading: "Redirecionando..." },
  rows: ["Questões por mês", "Provas por mês", "Exportação em PDF", "Provas online", "Alunos por prova", "Correção com IA", "Monitoramento em tempo real", "Suporte prioritário"],
  featuresLink: "Quer ver tudo o que a plataforma faz?", featuresLinkCta: "Veja as funcionalidades",
  errorTitle: "Erro", errorFallback: "Não foi possível iniciar o checkout.",
};

const plansEn: PlansPageContent = {
  eyebrow: "Plans",
  title: "Plans and pricing",
  sub: "Start for free and upgrade when you need more features.",
  perMonth: "/month", unlimited: "Unlimited",
  free: { name: "Free", desc: "To try ProvaFácil", cta: "Start free" },
  premium: { name: "Premium", desc: "For teachers who need more", trial: "7-day free trial · Cancel anytime", cta: "Subscribe to Premium", loading: "Redirecting..." },
  rows: ["Questions per month", "Exams per month", "PDF export", "Online exams", "Students per exam", "AI grading", "Real-time monitoring", "Priority support"],
  featuresLink: "Want to see everything the platform does?", featuresLinkCta: "See the features",
  errorTitle: "Error", errorFallback: "Could not start checkout.",
};

const plansEs: PlansPageContent = {
  eyebrow: "Planes",
  title: "Planes y precios",
  sub: "Empiece gratis y mejore su plan cuando necesite más recursos.",
  perMonth: "/mes", unlimited: "Ilimitado",
  free: { name: "Gratis", desc: "Para probar ProvaFácil", cta: "Empezar gratis" },
  premium: { name: "Premium", desc: "Para profesores que necesitan más", trial: "7 días gratis para probar · Cancele cuando quiera", cta: "Suscribirse a Premium", loading: "Redirigiendo..." },
  rows: ["Preguntas por mes", "Exámenes por mes", "Exportación en PDF", "Exámenes en línea", "Alumnos por examen", "Corrección con IA", "Monitoreo en tiempo real", "Soporte prioritario"],
  featuresLink: "¿Quiere ver todo lo que hace la plataforma?", featuresLinkCta: "Vea las funcionalidades",
  errorTitle: "Error", errorFallback: "No se pudo iniciar el pago.",
};

export const FEATURES_PAGE: Record<Language, FeaturesPageContent> = { pt: featuresPt, en: featuresEn, es: featuresEs };
export const PLANS_PAGE: Record<Language, PlansPageContent> = { pt: plansPt, en: plansEn, es: plansEs };
