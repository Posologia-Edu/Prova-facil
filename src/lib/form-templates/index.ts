import { pharmacyTemplates } from "./pharmacy";
import { nursingTemplates } from "./nursing";
import { nutritionTemplates } from "./nutrition";
import { dentistryTemplates } from "./dentistry";
import { medicineTemplates } from "./medicine";
import { physiotherapyTemplates } from "./physiotherapy";
import { biomedicineTemplates } from "./biomedicine";

export type NativeTemplate = {
  area: string;
  module_type: string;
  form_type: string;
  title: string;
  description: string;
  content_json: any[];
};

export const allNativeTemplates: NativeTemplate[] = [
  ...pharmacyTemplates,
  ...nursingTemplates,
  ...nutritionTemplates,
  ...dentistryTemplates,
  ...medicineTemplates,
  ...physiotherapyTemplates,
  ...biomedicineTemplates,
];

export function getNativeTemplates(area: string, moduleType?: string, formType?: string): NativeTemplate[] {
  return allNativeTemplates.filter(t => {
    if (t.area !== area) return false;
    if (moduleType && t.module_type !== moduleType) return false;
    if (formType && t.form_type !== formType) return false;
    return true;
  });
}
