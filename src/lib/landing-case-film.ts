import type { Language } from "@/i18n/LanguageContext";

interface FilmCopy {
  open: string;
  skip: string;
  replay: string;
  example: string;
  title: string;
  chapters: [string, string, string, string];
  scenes: [SceneCopy, SceneCopy, SceneCopy];
  script: string;
  patient: string;
  criteria: [string, string, string];
  next: string;
  advice: string;
}

export interface SceneCopy { title: string; emphasis: string; body: string }

export const CASE_FILM: Record<Language, FilmCopy> = {
  pt: {
    open: "Role para abrir o caso", skip: "Pular sequência", replay: "Rever o caso",
    example: "Caso simulado", title: "Consulta farmacêutica",
    chapters: ["Abertura", "Consulta", "Observação", "Devolutiva"],
    scenes: [
      { title: "Tudo começa", emphasis: "com a escuta.", body: "Na consulta simulada, a paciente conta o que toma em casa. Cabe ao aluno descobrir o que ficou de fora da lista de medicamentos." },
      { title: "O que o professor", emphasis: "consegue ver?", body: "O roteiro e a ficha se separam. De um lado, o que a paciente poderia revelar. Do outro, as perguntas que o aluno realmente fez." },
      { title: "A mesma cena,", emphasis: "outro olhar.", body: "O aluno recebe um retorno sobre a própria conduta. A IA ajuda a redigir, e o professor revisa antes do envio." },
    ],
    script: "Roteiro da paciente", patient: "Também tomo chá de hibisco em casa.",
    criteria: ["Ouviu o relato da paciente", "Perguntou sobre o uso de chás", "Registrou a posição ao medir a pressão"],
    next: "Para a próxima consulta", advice: "Ao registrar a pressão, inclua a posição em que a paciente estava.",
  },
  en: {
    open: "Scroll to open the case", skip: "Skip sequence", replay: "Replay the case",
    example: "Simulated case", title: "Pharmacy consultation",
    chapters: ["Opening", "Consultation", "Observation", "Feedback"],
    scenes: [
      { title: "It starts", emphasis: "with listening.", body: "In a simulated consultation, the patient describes what she takes at home. The student needs to find out what is missing from her medication list." },
      { title: "What can the", emphasis: "teacher see?", body: "The patient script and observation sheet separate. One shows what the patient could reveal. The other records what the student actually asked." },
      { title: "The same scene,", emphasis: "a fresh perspective.", body: "The student gets feedback on their own actions. AI helps draft it and the teacher reviews it before sending." },
    ],
    script: "Patient script", patient: "I also drink hibiscus tea at home.",
    criteria: ["Listened to the patient", "Asked about herbal tea", "Recorded the position for the blood pressure reading"],
    next: "For the next consultation", advice: "When you record blood pressure, include the patient’s position.",
  },
  es: {
    open: "Deslice para abrir el caso", skip: "Saltar secuencia", replay: "Volver al caso",
    example: "Caso simulado", title: "Consulta farmacéutica",
    chapters: ["Apertura", "Consulta", "Observación", "Devolución"],
    scenes: [
      { title: "Todo comienza", emphasis: "con la escucha.", body: "En la consulta simulada, la paciente cuenta qué toma en casa. El alumno debe descubrir qué falta en su lista de medicamentos." },
      { title: "¿Qué observa", emphasis: "el profesor?", body: "El guion y la ficha se separan. Por un lado, lo que la paciente podía revelar. Por el otro, las preguntas que el alumno realmente hizo." },
      { title: "La misma escena,", emphasis: "otra mirada.", body: "El alumno recibe comentarios sobre su propia actuación. La IA ayuda a redactarlos y el profesor los revisa antes del envío." },
    ],
    script: "Guion de la paciente", patient: "También tomo té de hibisco en casa.",
    criteria: ["Escuchó el relato de la paciente", "Preguntó por el uso de infusiones", "Registró la posición al medir la presión"],
    next: "Para la próxima consulta", advice: "Al registrar la presión, incluya la posición en la que estaba la paciente.",
  },
};
