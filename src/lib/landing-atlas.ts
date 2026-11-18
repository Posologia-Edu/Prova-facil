import type { Language } from "@/i18n/LanguageContext";

export interface AtlasScene {
  label: string;
  title: string;
  emphasis: string;
  description: string;
  alt: string;
}

interface AtlasCopy {
  gallery: string;
  zoom: string;
  reset: string;
  play: string;
  pause: string;
  figure: string;
  scenes: [AtlasScene, AtlasScene, AtlasScene];
}

export const ATLAS_CONTENT: Record<Language, AtlasCopy> = {
  pt: {
    gallery: "Explore a plataforma",
    zoom: "Ampliar a peça",
    reset: "Restaurar a ampliação",
    play: "Reproduzir sequência",
    pause: "Pausar sequência",
    figure: "Fig.",
    scenes: [
      {
        label: "Simulações", title: "A anatomia", emphasis: "da avaliação.",
        description: "Da prova escrita à consulta simulada, acompanhe como cada aluno pensa, decide e aprende.",
        alt: "Coração anatômico esculpido em vidro, com vasos iluminados em âmbar.",
      },
      {
        label: "Provas", title: "Cada questão,", emphasis: "uma escolha.",
        description: "Organize o banco por tema e nível de Bloom. Monte a prova para aplicar online ou imprimir em A4.",
        alt: "Folhas de uma prova em vidro translúcido, separadas em camadas.",
      },
      {
        label: "Feedback", title: "Da observação", emphasis: "ao feedback.",
        description: "Transforme o que viu no atendimento em uma devolutiva individual. A IA prepara o rascunho e você dá a palavra final.",
        alt: "Onda sonora construída com lâminas de vidro âmbar.",
      },
    ],
  },
  en: {
    gallery: "Explore the platform",
    zoom: "Magnify the specimen",
    reset: "Reset magnification",
    play: "Play sequence",
    pause: "Pause sequence",
    figure: "Fig.",
    scenes: [
      {
        label: "Simulations", title: "The anatomy", emphasis: "of assessment.",
        description: "From the written exam to the simulated consultation, see how each student thinks, decides and learns.",
        alt: "An anatomical glass heart with amber light tracing its vessels.",
      },
      {
        label: "Exams", title: "A purpose for", emphasis: "every question.",
        description: "Organize questions by topic and Bloom level. Build an exam to deliver online or print on A4.",
        alt: "Translucent glass exam sheets suspended in layers.",
      },
      {
        label: "Feedback", title: "Observation", emphasis: "into feedback.",
        description: "Turn what you saw in a consultation into individual feedback. AI prepares a draft and you have the final say.",
        alt: "An acoustic waveform sculpted from fins of amber glass.",
      },
    ],
  },
  es: {
    gallery: "Explore la plataforma",
    zoom: "Ampliar la pieza",
    reset: "Restablecer la ampliación",
    play: "Reproducir secuencia",
    pause: "Pausar secuencia",
    figure: "Fig.",
    scenes: [
      {
        label: "Simulaciones", title: "Anatomía de", emphasis: "la evaluación.",
        description: "Del examen escrito a la consulta simulada, observe cómo cada alumno piensa, decide y aprende.",
        alt: "Corazón anatómico de vidrio con vasos iluminados en ámbar.",
      },
      {
        label: "Exámenes", title: "Un propósito", emphasis: "por pregunta.",
        description: "Organice las preguntas por tema y nivel de Bloom. Prepare un examen para aplicar en línea o imprimir en A4.",
        alt: "Hojas de examen en vidrio translúcido suspendidas en capas.",
      },
      {
        label: "Feedback", title: "De la observación", emphasis: "al feedback.",
        description: "Convierta lo que observó en una devolución individual. La IA prepara el borrador y usted tiene la última palabra.",
        alt: "Una onda sonora esculpida con láminas de vidrio ámbar.",
      },
    ],
  },
};
