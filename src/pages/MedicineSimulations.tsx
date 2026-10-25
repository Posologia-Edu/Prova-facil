import AreaSimulationsPage from "@/components/simulation/AreaSimulationsPage";
import { medicineModules } from "@/lib/medicine-modules";

const config = {
  prefix: "medicine",
  title: "Medicina",
  subtitle: "Anamnese Médica, Exame Físico, Raciocínio Clínico e Plano Terapêutico.",
  modules: medicineModules.filter((m) => m.id !== "aggregator"),
};

export default function MedicineSimulations() {
  return <AreaSimulationsPage config={config} />;
}
