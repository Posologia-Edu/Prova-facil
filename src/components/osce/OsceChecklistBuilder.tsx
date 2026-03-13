import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["Comunicação", "Raciocínio Clínico", "Domínio Técnico", "Empatia", "Ética", "Geral"];

interface Props {
  stationId: string;
}

export function OsceChecklistBuilder({ stationId }: Props) {
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["osce-checklist", stationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("osce_checklist_items")
        .select("*")
        .eq("station_id", stationId)
        .order("position");
      if (error) throw error;
      return data;
    },
  });

  const addItem = useMutation({
    mutationFn: async () => {
      const nextPos = (items?.length || 0) + 1;
      const { error } = await supabase.from("osce_checklist_items").insert({
        station_id: stationId,
        position: nextPos,
        description: "",
        type: "binary",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["osce-checklist", stationId] }),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase.from("osce_checklist_items").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["osce-checklist", stationId] }),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("osce_checklist_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["osce-checklist", stationId] });
      toast.success("Item removido");
    },
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando checklist...</div>;

  return (
    <div className="space-y-2">
      {items?.map((item: any, idx: number) => (
        <div key={item.id} className="flex items-start gap-2 p-3 rounded-lg border bg-card">
          <span className="text-xs text-muted-foreground mt-2 w-5">{idx + 1}.</span>
          <div className="flex-1 space-y-2">
            <Input
              value={item.description}
              onChange={(e) => updateItem.mutate({ id: item.id, updates: { description: e.target.value } })}
              placeholder="Descrição do item..."
              className="text-sm"
            />
            <div className="flex items-center gap-3 flex-wrap">
              <Select
                value={item.type}
                onValueChange={(v) => updateItem.mutate({ id: item.id, updates: { type: v } })}
              >
                <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="binary">Feito/Não</SelectItem>
                  <SelectItem value="likert">Likert</SelectItem>
                  <SelectItem value="score">Pontuação</SelectItem>
                </SelectContent>
              </Select>

              {item.type === "likert" && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Escala 1-</span>
                  <Input
                    type="number"
                    value={item.likert_max}
                    onChange={(e) => updateItem.mutate({ id: item.id, updates: { likert_max: Number(e.target.value) } })}
                    className="w-14 h-7 text-xs"
                    min={2}
                    max={10}
                  />
                </div>
              )}

              <Select
                value={item.category || "Geral"}
                onValueChange={(v) => updateItem.mutate({ id: item.id, updates: { category: v } })}
              >
                <SelectTrigger className="w-36 h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Peso:</span>
                <Input
                  type="number"
                  value={item.weight}
                  onChange={(e) => updateItem.mutate({ id: item.id, updates: { weight: Number(e.target.value) } })}
                  className="w-14 h-7 text-xs"
                  min={0}
                  step={0.5}
                />
              </div>

              <div className="flex items-center gap-1.5">
                <Switch
                  checked={item.is_critical}
                  onCheckedChange={(v) => updateItem.mutate({ id: item.id, updates: { is_critical: v } })}
                  className="scale-75"
                />
                <span className="text-xs flex items-center gap-0.5">
                  {item.is_critical && <AlertTriangle className="h-3 w-3 text-destructive" />}
                  Crítico
                </span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteItem.mutate(item.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={() => addItem.mutate()} className="gap-1">
        <Plus className="h-3 w-3" /> Adicionar Item
      </Button>
    </div>
  );
}
