import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Check, X, Pencil } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

type EditableRoomTitleProps = {
  roomId: string;
  title: string;
  tableName: string;
  invalidateKeys: string[];
};

export default function EditableRoomTitle({ roomId, title, tableName, invalidateKeys }: EditableRoomTitleProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === title) {
      setEditing(false);
      setValue(title);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from(tableName as any).update({ title: trimmed }).eq("id", roomId);
      if (error) throw error;
      invalidateKeys.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
      toast({ title: "Título atualizado" });
      setEditing(false);
    } catch {
      toast({ title: "Erro", description: "Erro ao atualizar título.", variant: "destructive" });
      setValue(title);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          value={value}
          onChange={e => setValue(e.target.value)}
          className="h-7 text-base font-semibold px-1"
          autoFocus
          onKeyDown={e => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") { setEditing(false); setValue(title); }
          }}
          disabled={saving}
        />
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleSave} disabled={saving}>
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditing(false); setValue(title); }}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <span
      className="text-lg font-semibold cursor-pointer hover:text-primary transition-colors group inline-flex items-center gap-1"
      onClick={() => setEditing(true)}
      title="Clique para editar"
    >
      {title}
      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
    </span>
  );
}
