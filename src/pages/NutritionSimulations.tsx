import AreaSimulationsPage from "@/components/simulation/AreaSimulationsPage";
import { nutritionModules } from "@/lib/nutrition-modules";

const config = {
  prefix: "nutrition",
  title: "Nutrição Clínica",
  subtitle: "Anamnese Nutricional, Avaliação Antropométrica, Plano Alimentar e Orientação.",
  modules: nutritionModules.filter((m) => m.id !== "aggregator"),
};

export default function NutritionSimulations() {
  return <AreaSimulationsPage config={config} />;
}
