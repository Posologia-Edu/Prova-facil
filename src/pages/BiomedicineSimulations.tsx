import AreaSimulationsPage from "@/components/simulation/AreaSimulationsPage";
import { biomedicineModules } from "@/lib/biomedicine-modules";

const config = {
  prefix: "biomedicine",
  title: "Biomedicina",
  subtitle: "Análise Laboratorial, Controle de Qualidade, Interpretação e Laudo Técnico.",
  modules: biomedicineModules.filter((m) => m.id !== "aggregator"),
};

export default function BiomedicineSimulations() {
  return <AreaSimulationsPage config={config} />;
}
