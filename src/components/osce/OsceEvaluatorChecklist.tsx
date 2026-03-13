import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check, X, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";

interface ChecklistItem {
  id: string;
  description: string;
  type: string;
  likert_max: number;
  max_points: number;
  weight: number;
  is_critical: boolean;
  category: string;
}

interface EvalItemValue {
  checklist_item_id: string;
  value: number;
  notes: string;
}

interface Props {
  checklistItems: ChecklistItem[];
  evaluationId: string;
  initialValues?: EvalItemValue[];
  onScoreChange?: (total: number, max: number, passed: boolean) => void;
}

export function OsceEvaluatorChecklist({ checklistItems, evaluationId, initialValues, onScoreChange }: Props) {
  const [values, setValues] = useState<Record<string, { value: number; notes: string }>>({});

  useEffect(() => {
    const init: Record<string, { value: number; notes: string }> = {};
    checklistItems.forEach((item) => {
      const existing = initialValues?.find((v) => v.checklist_item_id === item.id);
      init[item.id] = { value: existing?.value ?? 0, notes: existing?.notes ?? "" };
    });
    setValues(init);
  }, [checklistItems, initialValues]);

  const saveItem = useMutation({
    mutationFn: async ({ itemId, value, notes }: { itemId: string; value: number; notes: string }) => {
      const { data: existing } = await supabase
        .from("osce_evaluation_items")
        .select("id")
        .eq("evaluation_id", evaluationId)
        .eq("checklist_item_id", itemId)
        .maybeSingle();

      if (existing) {
        await supabase.from("osce_evaluation_items").update({ value, notes }).eq("id", existing.id);
      } else {
        await supabase.from("osce_evaluation_items").insert([{
          evaluation_id: evaluationId,
          checklist_item_id: itemId,
          value,
          notes,
        }]);
      }
    },
  });

  const updateValue = useCallback((itemId: string, value: number) => {
    setValues((prev) => {
      const updated = { ...prev, [itemId]: { ...prev[itemId], value } };
      // Auto-save
      saveItem.mutate({ itemId, value, notes: updated[itemId]?.notes || "" });
      // Recalculate scores
      recalculate(updated);
      return updated;
    });
  }, []);

  const updateNotes = useCallback((itemId: string, notes: string) => {
    setValues((prev) => {
      const updated = { ...prev, [itemId]: { ...prev[itemId], notes } };
      saveItem.mutate({ itemId, value: updated[itemId]?.value || 0, notes });
      return updated;
    });
  }, []);

  const recalculate = (vals: Record<string, { value: number; notes: string }>) => {
    let total = 0;
    let max = 0;
    let passed = true;

    checklistItems.forEach((item) => {
      const v = vals[item.id]?.value || 0;
      const itemMax = item.type === "binary" ? 1 : item.type === "likert" ? item.likert_max : item.max_points;
      max += itemMax * item.weight;
      total += v * item.weight;
      if (item.is_critical && v === 0) passed = false;
    });

    onScoreChange?.(total, max, passed);
  };

  const groupedItems = checklistItems.reduce((acc, item) => {
    const cat = item.category || "Geral";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedItems).map(([category, items]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{category}</h3>
          <div className="space-y-2">
            {items.map((item) => {
              const val = values[item.id];
              return (
                <div key={item.id} className={`p-4 rounded-xl border-2 transition-colors ${
                  item.is_critical ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"
                }`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-tight">{item.description}</p>
                      {item.is_critical && (
                        <Badge variant="destructive" className="mt-1 text-xs gap-1">
                          <AlertTriangle className="h-3 w-3" /> Item Crítico
                        </Badge>
                      )}
                    </div>
                    {item.weight !== 1 && (
                      <Badge variant="outline" className="text-xs shrink-0">Peso {item.weight}</Badge>
                    )}
                  </div>

                  {item.type === "binary" && (
                    <div className="flex gap-3 mt-3">
                      <Button
                        size="lg"
                        variant={val?.value === 1 ? "default" : "outline"}
                        className="flex-1 h-14 text-lg gap-2"
                        onClick={() => updateValue(item.id, 1)}
                      >
                        <Check className="h-5 w-5" /> Feito
                      </Button>
                      <Button
                        size="lg"
                        variant={val?.value === 0 && val !== undefined ? "destructive" : "outline"}
                        className="flex-1 h-14 text-lg gap-2"
                        onClick={() => updateValue(item.id, 0)}
                      >
                        <X className="h-5 w-5" /> Não Feito
                      </Button>
                    </div>
                  )}

                  {item.type === "likert" && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">1</span>
                        <span className="text-lg font-bold">{val?.value || 0}</span>
                        <span className="text-xs text-muted-foreground">{item.likert_max}</span>
                      </div>
                      <Slider
                        value={[val?.value || 0]}
                        onValueChange={([v]) => updateValue(item.id, v)}
                        min={0}
                        max={item.likert_max}
                        step={1}
                        className="py-2"
                      />
                    </div>
                  )}

                  {item.type === "score" && (
                    <div className="mt-3 flex items-center gap-3">
                      <Slider
                        value={[val?.value || 0]}
                        onValueChange={([v]) => updateValue(item.id, v)}
                        min={0}
                        max={Number(item.max_points)}
                        step={0.5}
                        className="flex-1 py-2"
                      />
                      <span className="text-lg font-bold w-16 text-center">{val?.value || 0}/{item.max_points}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
