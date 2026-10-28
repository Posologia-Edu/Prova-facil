import type { Language } from "@/i18n/LanguageContext";

// Textos da landing page (pt, en, es). Só afirmações verificáveis no sistema: 7 áreas, 13 formatos de avaliação, 3 idiomas.
// A IA aparece sempre como sugestão que o professor revisa e confirma. Os cartões do hero usam conteúdo de exemplo.

export type LandingContent = {
  nav: { platform: string; areas: string; how: string; plans: string; features: string; docs: string; student: string; menu: string };
  hero: { badge: string; eyebrow: string; title1: string; titleEm: string; subtitle: string; primary: string; secondary: string };
  cards: {
    example: string;
    debrief: string; found: string; essential: string; improveLabel: string; improveText: string;
    grade: string; gradeSub: string; naCount: string; naSub: string;
    feedback: string; feedbackText: string; aiBadge: string;
  };
  areas: { eyebrow: string; heading: string; sub: string; items: string[]; mostComplete: string };
  modules: { eyebrow: string; heading: string; sub: string; sim: { tag: string; rows: string[]; na: string }; items: { title: string; premium?: boolean; desc: string; tags: string[] }[] };
  ai: {
    eyebrow: string; heading: string; sub: string; quote: string; confirm: string;
    items: { title: string; desc: string; sample: string }[];
  };
  roles: { eyebrow: string; heading: string; teacher: { label: string; points: string[] }; student: { label: string; points: string[] } };
  how: { eyebrow: string; heading: string; steps: { title: string; desc: string }[] };
  trust: {
    eyebrow: string; heading: string;
    stats: { value: string; label: string }[];
    items: { title: string; desc: string }[];
  };
  cta: { heading: string; sub: string; primary: string; secondary: string };
  footer: string;
};

const pt: LandingContent = {
  nav: { platform: "Plataforma", areas: "Áreas", how: "Como funciona", plans: "Planos", features: "Funcionalidades", docs: "Documentação", student: "Sou aluno", menu: "Menu" },
  hero: {
    badge: "Agora com feedback por IA nas simulações",
    eyebrow: "Ciências da saúde · 7 áreas",
    title1: "Avalie do papel ao ",
    titleEm: "consultório simulado",
    subtitle: "Provas, OSCE, pacientes virtuais e simulações clínicas em um só lugar, com IA que ajuda a corrigir e a devolver feedback. O professor decide, o aluno aprende com o retorno.",
    primary: "Começar agora",
    secondary: "Ver como funciona",
  },
  cards: {
    example: "exemplo",
    debrief: "Debriefing", found: "informações do caso descobertas", essential: "informações essenciais", improveLabel: "Poderia melhorar:", improveText: "a pressão foi aferida, mas sem indicar a posição.",
    grade: "Nota da rodada", gradeSub: "70% avaliações + 30% registro", naCount: "1 critério", naSub: "marcado “Não se aplica”",
    feedback: "Feedback ao aluno", feedbackText: "Você acolheu bem e investigou o uso do chá de hibisco.", aiBadge: "Escrito pela IA · você revisa antes de enviar",
  },
  areas: {
    eyebrow: "Áreas",
    heading: "Feito para quem forma profissionais de saúde",
    sub: "Modelos e casos organizados por área, para você começar de algo pronto e adaptar.",
    items: ["Farmácia", "Enfermagem", "Medicina", "Odontologia", "Nutrição", "Fisioterapia", "Biomedicina"],
    mostComplete: "A mais completa hoje",
  },
  modules: {
    eyebrow: "Plataforma",
    heading: "Um ciclo completo, do estudo à nota",
    sub: "Cada módulo funciona sozinho e todos conversam entre si, com turmas e boletim no centro.",
    sim: { tag: "Ficha do professor · exemplo", rows: ["Investigou o uso real dos medicamentos", "Reconheceu os sinais de alerta do caso", "Investigou chás, plantas e produtos sem prescrição"], na: "Não se aplica" },
    items: [
      { title: "Simulação realística", premium: true, desc: "Dois alunos atendem e um observa. O paciente segue um roteiro padronizado, o professor e o observador avaliam, e o registro escrito é pontuado.", tags: ["Anamnese", "SOAP", "Reconciliação", "Documentação", "Roteiro do paciente"] },
      { title: "Paciente Virtual", premium: true, desc: "O aluno conversa com um paciente simulado por IA e recebe o debriefing passo a passo, com avaliação entre pares.", tags: ["Casos por área", "Debriefing", "Pares"] },
      { title: "OSCE", premium: true, desc: "Estações, checklists, rodízio e paciente virtual com áudio em tempo real.", tags: ["QR", "Rodízio", "Áudio"] },
      { title: "Provas e banco de questões", desc: "Questões por tópico e Bloom, geração por IA, compositor A4 e prova online com monitoramento.", tags: ["IA", "A4", "Online"] },
      { title: "Júri simulado", desc: "Argumentação em grupo, com avaliação entre pares e correção assistida por IA.", tags: ["Pares", "IA"] },
      { title: "Turmas e boletim", desc: "Disciplinas, semestres, atividades vinculadas à turma, competências e portfólio do aluno.", tags: ["Turmas", "Boletim", "Portfólio"] },
    ],
  },
  ai: {
    eyebrow: "Inteligência artificial",
    heading: "A IA sugere, o professor decide",
    sub: "Ela faz o trabalho repetitivo e deixa à vista o que sugeriu. Nada vira nota sem a sua confirmação.",
    quote: "A nota final é sempre do professor.",
    confirm: "Professor confirma",
    items: [
      { title: "Gera questões e casos", desc: "Múltipla escolha, V/F e dissertativas por tópico e nível de Bloom, prontas para revisar.", sample: "10 questões de farmacologia, Bloom 3" },
      { title: "Sugere a pontuação do registro", desc: "Compara o registro do aluno com o roteiro do paciente e justifica cada critério. Você ajusta e confirma.", sample: "Plano de cuidado: sugestão 3 de 4 · você confirma" },
      { title: "Escreve o feedback", desc: "Parte dos pontos fortes e melhorias que você anotou e dá exemplos do paciente que o aluno atendeu.", sample: "Rascunho pronto · você revisa antes de enviar" },
      { title: "Monta o debriefing", desc: "No paciente virtual, mostra o raciocínio por trás de cada fala e o que o aluno descobriu do caso.", sample: "4 de 5 informações do caso descobertas" },
    ],
  },
  roles: {
    eyebrow: "Para quem usa",
    heading: "Do lado do professor e do lado do aluno",
    teacher: { label: "Professor", points: ["Monte do zero ou importe um modelo pronto da sua área", "Aplique ao vivo, com PIN e acompanhamento em tempo real", "Pontue com ajuda da IA e confirme cada nota", "Envie o relatório e o feedback por e-mail"] },
    student: { label: "Aluno", points: ["Entra com PIN e e-mail, sem instalar nada", "Faz a prova ou a simulação no celular ou no computador", "Recebe o relatório com a nota e o feedback por e-mail", "Reúne o histórico e as competências no portfólio"] },
  },
  how: {
    eyebrow: "Como funciona",
    heading: "Três passos, do modelo ao retorno",
    steps: [
      { title: "Monte ou importe", desc: "Comece de um modelo pronto da sua área ou crie o seu, com o construtor de formulários e o banco de questões." },
      { title: "Aplique ao vivo", desc: "Os alunos entram com PIN ou QR e você acompanha cada rodada em tempo real." },
      { title: "Avalie e devolva", desc: "Nota, IA como apoio e relatório por e-mail, com o feedback que ajuda o aluno a melhorar." },
    ],
  },
  trust: {
    eyebrow: "Em números",
    heading: "O que já existe na plataforma",
    stats: [{ value: "7", label: "áreas da saúde" }, { value: "13", label: "formatos de avaliação" }, { value: "3", label: "idiomas: português, inglês e espanhol" }],
    items: [
      { title: "Privacidade e LGPD", desc: "Seus dados e os dos alunos ficam protegidos, com política e termos claros." },
      { title: "Acessibilidade", desc: "Ajustes de leitura e de contraste para quem usa a plataforma como aluno." },
      { title: "Integração com LMS", desc: "Leve as notas para o ambiente virtual que a sua instituição já usa." },
      { title: "Marketplace", desc: "Compartilhe e descubra provas criadas por outros professores." },
    ],
  },
  cta: { heading: "Leve a avaliação da sua disciplina para o próximo nível", sub: "Crie sua conta e comece por um modelo pronto da sua área.", primary: "Criar minha conta", secondary: "Ver planos" },
  footer: "Plataforma de avaliação para as ciências da saúde: provas, OSCE, pacientes virtuais e simulações clínicas.",
};

const en: LandingContent = {
  nav: { platform: "Platform", areas: "Fields", how: "How it works", plans: "Plans", features: "Features", docs: "Docs", student: "I'm a student", menu: "Menu" },
  hero: {
    badge: "Now with AI feedback in simulations",
    eyebrow: "Health sciences · 7 fields",
    title1: "Assess from paper to the ",
    titleEm: "simulated clinic",
    subtitle: "Exams, OSCE, virtual patients and clinical simulations in one place, with AI that helps grade and give feedback. The teacher decides, the student learns from the feedback.",
    primary: "Get started",
    secondary: "See how it works",
  },
  cards: {
    example: "example",
    debrief: "Debriefing", found: "case facts uncovered", essential: "essential facts", improveLabel: "Could improve:", improveText: "blood pressure was measured, but the position was not stated.",
    grade: "Round grade", gradeSub: "70% assessments + 30% write-up", naCount: "1 criterion", naSub: "marked “Not applicable”",
    feedback: "Student feedback", feedbackText: "You welcomed the patient well and explored the hibiscus tea use.", aiBadge: "Written by AI · you review before sending",
  },
  areas: {
    eyebrow: "Fields",
    heading: "Built for those who train health professionals",
    sub: "Templates and cases organized by field, so you can start from something ready and adapt it.",
    items: ["Pharmacy", "Nursing", "Medicine", "Dentistry", "Nutrition", "Physiotherapy", "Biomedicine"],
    mostComplete: "Most complete today",
  },
  modules: {
    eyebrow: "Platform",
    heading: "A complete cycle, from study to grade",
    sub: "Each module works on its own and they all talk to each other, with classes and gradebook at the center.",
    sim: { tag: "Teacher form · example", rows: ["Explored real medication use", "Recognized the case's red flags", "Asked about teas, herbs and non-prescription products"], na: "Not applicable" },
    items: [
      { title: "Realistic simulation", premium: true, desc: "Two students run the encounter and one observes. The patient follows a standardized script, the teacher and the observer assess, and the written record is scored.", tags: ["Medical history", "SOAP", "Reconciliation", "Documentation", "Patient script"] },
      { title: "Virtual Patient", premium: true, desc: "Students talk to an AI-simulated patient and get a step-by-step debriefing, with peer assessment.", tags: ["Cases by field", "Debriefing", "Peers"] },
      { title: "OSCE", premium: true, desc: "Stations, checklists, rotation and a virtual patient with real-time audio.", tags: ["QR", "Rotation", "Audio"] },
      { title: "Exams and question bank", desc: "Questions by topic and Bloom level, AI generation, A4 composer and online exams with monitoring.", tags: ["AI", "A4", "Online"] },
      { title: "Mock trial", desc: "Group argumentation with peer assessment and AI-assisted grading.", tags: ["Peers", "AI"] },
      { title: "Classes and gradebook", desc: "Courses, terms, activities linked to the class, competencies and the student's portfolio.", tags: ["Classes", "Gradebook", "Portfolio"] },
    ],
  },
  ai: {
    eyebrow: "Artificial intelligence",
    heading: "AI suggests, the teacher decides",
    sub: "It does the repetitive work and shows what it suggested. Nothing becomes a grade without your confirmation.",
    quote: "The final grade is always the teacher's.",
    confirm: "Teacher confirms",
    items: [
      { title: "Generates questions and cases", desc: "Multiple choice, true/false and essay questions by topic and Bloom level, ready to review.", sample: "10 pharmacology questions, Bloom 3" },
      { title: "Suggests the write-up score", desc: "Compares the student's record with the patient script and explains each criterion. You adjust and confirm.", sample: "Care plan: suggested 3 of 4 · you confirm" },
      { title: "Writes the feedback", desc: "Starts from the strengths and improvements you noted and gives examples from the patient the student saw.", sample: "Draft ready · you review before sending" },
      { title: "Builds the debriefing", desc: "In the virtual patient, shows the reasoning behind each line and what the student uncovered.", sample: "4 of 5 case facts uncovered" },
    ],
  },
  roles: {
    eyebrow: "Who uses it",
    heading: "For the teacher and for the student",
    teacher: { label: "Teacher", points: ["Build from scratch or import a ready template for your field", "Run it live, with a PIN and real-time tracking", "Score with AI help and confirm every grade", "Send the report and feedback by email"] },
    student: { label: "Student", points: ["Joins with a PIN and email, nothing to install", "Takes the exam or simulation on phone or computer", "Gets the report with grade and feedback by email", "Gathers history and competencies in the portfolio"] },
  },
  how: {
    eyebrow: "How it works",
    heading: "Three steps, from template to feedback",
    steps: [
      { title: "Build or import", desc: "Start from a ready template for your field or create your own with the form builder and question bank." },
      { title: "Run it live", desc: "Students join with a PIN or QR and you follow each round in real time." },
      { title: "Assess and give feedback", desc: "Grade, AI as support and a report by email, with feedback that helps students improve." },
    ],
  },
  trust: {
    eyebrow: "By the numbers",
    heading: "What the platform already has",
    stats: [{ value: "7", label: "health fields" }, { value: "13", label: "assessment formats" }, { value: "3", label: "languages: Portuguese, English and Spanish" }],
    items: [
      { title: "Privacy and data protection", desc: "Your data and your students' data are protected, with a clear policy and terms." },
      { title: "Accessibility", desc: "Reading and contrast settings for people using the platform as students." },
      { title: "LMS integration", desc: "Take grades to the virtual learning environment your institution already uses." },
      { title: "Marketplace", desc: "Share and discover exams created by other teachers." },
    ],
  },
  cta: { heading: "Take your course's assessment to the next level", sub: "Create your account and start from a ready template for your field.", primary: "Create my account", secondary: "See plans" },
  footer: "Assessment platform for the health sciences: exams, OSCE, virtual patients and clinical simulations.",
};

const es: LandingContent = {
  nav: { platform: "Plataforma", areas: "Áreas", how: "Cómo funciona", plans: "Planes", features: "Funcionalidades", docs: "Documentación", student: "Soy alumno", menu: "Menú" },
  hero: {
    badge: "Ahora con feedback por IA en las simulaciones",
    eyebrow: "Ciencias de la salud · 7 áreas",
    title1: "Evalúe del papel al ",
    titleEm: "consultorio simulado",
    subtitle: "Exámenes, OSCE, pacientes virtuales y simulaciones clínicas en un solo lugar, con IA que ayuda a corregir y a dar feedback. El profesor decide, el alumno aprende con la devolución.",
    primary: "Empezar ahora",
    secondary: "Ver cómo funciona",
  },
  cards: {
    example: "ejemplo",
    debrief: "Debriefing", found: "datos del caso descubiertos", essential: "datos esenciales", improveLabel: "Podría mejorar:", improveText: "se midió la presión, pero sin indicar la posición.",
    grade: "Nota de la ronda", gradeSub: "70% evaluaciones + 30% registro", naCount: "1 criterio", naSub: "marcado “No aplica”",
    feedback: "Feedback al alumno", feedbackText: "Usted recibió bien al paciente e investigó el uso del té de hibisco.", aiBadge: "Escrito por la IA · usted revisa antes de enviar",
  },
  areas: {
    eyebrow: "Áreas",
    heading: "Hecho para quien forma profesionales de la salud",
    sub: "Modelos y casos organizados por área, para empezar de algo listo y adaptarlo.",
    items: ["Farmacia", "Enfermería", "Medicina", "Odontología", "Nutrición", "Fisioterapia", "Biomedicina"],
    mostComplete: "La más completa hoy",
  },
  modules: {
    eyebrow: "Plataforma",
    heading: "Un ciclo completo, del estudio a la nota",
    sub: "Cada módulo funciona solo y todos se conectan, con cursos y boletín en el centro.",
    sim: { tag: "Ficha del profesor · ejemplo", rows: ["Investigó el uso real de los medicamentos", "Reconoció las señales de alarma del caso", "Preguntó por tés, plantas y productos sin receta"], na: "No aplica" },
    items: [
      { title: "Simulación realística", premium: true, desc: "Dos alumnos atienden y uno observa. El paciente sigue un guion estandarizado, el profesor y el observador evalúan, y el registro escrito se puntúa.", tags: ["Anamnesis", "SOAP", "Conciliación", "Documentación", "Guion del paciente"] },
      { title: "Paciente Virtual", premium: true, desc: "El alumno conversa con un paciente simulado por IA y recibe el debriefing paso a paso, con evaluación entre pares.", tags: ["Casos por área", "Debriefing", "Pares"] },
      { title: "OSCE", premium: true, desc: "Estaciones, listas de verificación, rotación y paciente virtual con audio en tiempo real.", tags: ["QR", "Rotación", "Audio"] },
      { title: "Exámenes y banco de preguntas", desc: "Preguntas por tema y Bloom, generación por IA, compositor A4 y examen en línea con monitoreo.", tags: ["IA", "A4", "En línea"] },
      { title: "Juicio simulado", desc: "Argumentación en grupo, con evaluación entre pares y corrección asistida por IA.", tags: ["Pares", "IA"] },
      { title: "Cursos y boletín", desc: "Asignaturas, semestres, actividades vinculadas al curso, competencias y portafolio del alumno.", tags: ["Cursos", "Boletín", "Portafolio"] },
    ],
  },
  ai: {
    eyebrow: "Inteligencia artificial",
    heading: "La IA sugiere, el profesor decide",
    sub: "Hace el trabajo repetitivo y deja a la vista lo que sugirió. Nada se vuelve nota sin su confirmación.",
    quote: "La nota final es siempre del profesor.",
    confirm: "Profesor confirma",
    items: [
      { title: "Genera preguntas y casos", desc: "Opción múltiple, V/F y de desarrollo por tema y nivel de Bloom, listas para revisar.", sample: "10 preguntas de farmacología, Bloom 3" },
      { title: "Sugiere la puntuación del registro", desc: "Compara el registro del alumno con el guion del paciente y justifica cada criterio. Usted ajusta y confirma.", sample: "Plan de cuidado: sugerido 3 de 4 · usted confirma" },
      { title: "Escribe el feedback", desc: "Parte de los puntos fuertes y mejoras que usted anotó y da ejemplos del paciente que el alumno atendió.", sample: "Borrador listo · usted revisa antes de enviar" },
      { title: "Arma el debriefing", desc: "En el paciente virtual, muestra el razonamiento detrás de cada frase y lo que el alumno descubrió del caso.", sample: "4 de 5 datos del caso descubiertos" },
    ],
  },
  roles: {
    eyebrow: "Para quién",
    heading: "Del lado del profesor y del lado del alumno",
    teacher: { label: "Profesor", points: ["Arme desde cero o importe un modelo listo de su área", "Aplique en vivo, con PIN y seguimiento en tiempo real", "Puntúe con ayuda de la IA y confirme cada nota", "Envíe el informe y el feedback por correo"] },
    student: { label: "Alumno", points: ["Entra con PIN y correo, sin instalar nada", "Hace el examen o la simulación en el celular o la computadora", "Recibe el informe con la nota y el feedback por correo", "Reúne el historial y las competencias en el portafolio"] },
  },
  how: {
    eyebrow: "Cómo funciona",
    heading: "Tres pasos, del modelo a la devolución",
    steps: [
      { title: "Arme o importe", desc: "Empiece de un modelo listo de su área o cree el suyo, con el constructor de formularios y el banco de preguntas." },
      { title: "Aplique en vivo", desc: "Los alumnos entran con PIN o QR y usted sigue cada ronda en tiempo real." },
      { title: "Evalúe y devuelva", desc: "Nota, IA como apoyo e informe por correo, con el feedback que ayuda al alumno a mejorar." },
    ],
  },
  trust: {
    eyebrow: "En números",
    heading: "Lo que ya existe en la plataforma",
    stats: [{ value: "7", label: "áreas de la salud" }, { value: "13", label: "formatos de evaluación" }, { value: "3", label: "idiomas: portugués, inglés y español" }],
    items: [
      { title: "Privacidad y protección de datos", desc: "Sus datos y los de los alumnos están protegidos, con política y términos claros." },
      { title: "Accesibilidad", desc: "Ajustes de lectura y de contraste para quien usa la plataforma como alumno." },
      { title: "Integración con LMS", desc: "Lleve las notas al entorno virtual que su institución ya usa." },
      { title: "Marketplace", desc: "Comparta y descubra exámenes creados por otros profesores." },
    ],
  },
  cta: { heading: "Lleve la evaluación de su asignatura al siguiente nivel", sub: "Cree su cuenta y empiece por un modelo listo de su área.", primary: "Crear mi cuenta", secondary: "Ver planes" },
  footer: "Plataforma de evaluación para las ciencias de la salud: exámenes, OSCE, pacientes virtuales y simulaciones clínicas.",
};

export const LANDING_CONTENT: Record<Language, LandingContent> = { pt, en, es };
