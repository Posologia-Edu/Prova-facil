import AreaSimulationsPage from "@/components/simulation/AreaSimulationsPage";
import { nursingModules } from "@/lib/nursing-modules";

const config = {
  prefix: "nursing",
  title: "Enfermagem Clínica",
  subtitle: "Acolhimento, SAE, Evolução e Passagem de Plantão.",
  modules: nursingModules.filter((m) => m.id !== "aggregator"),
};

export default function NursingSimulations() {
  return <AreaSimulationsPage config={config} />;
}
