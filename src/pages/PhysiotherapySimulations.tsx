import AreaSimulationsPage from "@/components/simulation/AreaSimulationsPage";
import { physiotherapyModules } from "@/lib/physiotherapy-modules";

const config = {
  prefix: "physiotherapy",
  title: "Fisioterapia",
  subtitle: "Avaliação Funcional, Diagnóstico Cinético-Funcional, Plano e Evolução.",
  modules: physiotherapyModules.filter((m) => m.id !== "aggregator"),
};

export default function PhysiotherapySimulations() {
  return <AreaSimulationsPage config={config} />;
}
