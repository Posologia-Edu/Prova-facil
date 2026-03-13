import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, FileText, TestTube, ImageIcon, File, Upload } from "lucide-react";
import { toast } from "sonner";

interface Props {
  stationId: string;
}

const MATERIAL_TYPES = [
  { value: "prescription", label: "Prescrição", icon: FileText },
  { value: "lab_result", label: "Resultado de Exame", icon: TestTube },
  { value: "imaging", label: "Exame de Imagem", icon: ImageIcon },
  { value: "other", label: "Outro", icon: File },
];

export function OsceStationMaterials({ stationId }: Props) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: materials } = useQuery({
    queryKey: ["osce-materials", stationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("osce_station_materials")
        .select("*")
        .eq("station_id", stationId)
        .order("position");
      if (error) throw error;
      return data;
    },
  });

  const addMaterial = useMutation({
    mutationFn: async () => {
      const pos = (materials?.length || 0) + 1;
      const { error } = await supabase.from("osce_station_materials").insert([{
        station_id: stationId,
        title: `Material ${pos}`,
        type: "other",
        position: pos,
      }]);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["osce-materials", stationId] }),
  });

  const updateMaterial = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase.from("osce_station_materials").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["osce-materials", stationId] }),
  });

  const deleteMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("osce_station_materials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["osce-materials", stationId] });
      toast.success("Material removido");
    },
  });

  const handleFileUpload = async (materialId: string, file: globalThis.File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${stationId}/${materialId}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("osce-materials").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("osce-materials").getPublicUrl(path);
      await updateMaterial.mutateAsync({ id: materialId, updates: { file_url: publicUrl } });
      toast.success("Arquivo enviado");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="font-semibold">Materiais Clínicos</Label>
        <Button variant="outline" size="sm" onClick={() => addMaterial.mutate()} className="gap-1">
          <Plus className="h-3 w-3" /> Adicionar
        </Button>
      </div>

      {materials?.map((mat: any) => {
        const typeInfo = MATERIAL_TYPES.find(t => t.value === mat.type) || MATERIAL_TYPES[3];
        const Icon = typeInfo.icon;
        return (
          <Card key={mat.id} className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <Input
                value={mat.title}
                onChange={e => updateMaterial.mutate({ id: mat.id, updates: { title: e.target.value } })}
                className="h-8 text-sm flex-1"
                placeholder="Título do material"
              />
              <Select value={mat.type} onValueChange={v => updateMaterial.mutate({ id: mat.id, updates: { type: v } })}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMaterial.mutate(mat.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <Textarea
              value={mat.content || ""}
              onChange={e => updateMaterial.mutate({ id: mat.id, updates: { content: e.target.value } })}
              placeholder="Conteúdo textual (prescrição, resultados, etc.)"
              rows={3}
              className="text-sm"
            />
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(mat.id, file);
                  }}
                />
                <Badge variant="outline" className="cursor-pointer gap-1 text-xs">
                  <Upload className="h-3 w-3" /> {uploading ? "Enviando..." : "Upload"}
                </Badge>
              </label>
              {mat.file_url && (
                <a href={mat.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                  Ver arquivo
                </a>
              )}
            </div>
          </Card>
        );
      })}

      {(!materials || materials.length === 0) && (
        <p className="text-xs text-muted-foreground text-center py-2">Nenhum material adicionado</p>
      )}
    </div>
  );
}
