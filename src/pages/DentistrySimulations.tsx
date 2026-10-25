import AreaSimulationsPage from "@/components/simulation/AreaSimulationsPage";
import { dentistryModules } from "@/lib/dentistry-modules";

const config = {
  prefix: "dentistry",
  title: "Odontologia Clínica",
  subtitle: "Anamnese Odontológica, Exame Clínico, Plano de Tratamento e Orientação de Higiene.",
  modules: dentistryModules.filter((m) => m.id !== "aggregator"),
};

export default function DentistrySimulations() {
  return <AreaSimulationsPage config={config} />;
}
