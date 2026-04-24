import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Character {
  side: "prosecution" | "defense";
  name: string;
  profession: string;
  instructions: string;
}

interface Props {
  caseId: string;
  characters: Character[];
  onChange: (chars: Character[]) => void;
}

export function WitnessesEditor({ caseId, characters, onChange }: Props) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState<Character | null>(null);

  const persist = async (next: Character[]) => {
    onChange(next);
    const { error } = await supabase
      .from("mock_trial_cases")
      .update({ characters_json: next as any })
      .eq("id", caseId);
    if (error) toast.error("Erro ao salvar testemunha: " + error.message);
  };

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setDraft({ ...characters[idx] });
  };

  const startAdd = (side: "prosecution" | "defense") => {
    const newChar: Character = {
      side,
      name: "Nova Testemunha",
      profession: "",
      instructions:
        "1. Que perguntas você faria à parte oposta para evidenciar seu argumento?\n" +
        "2. Quais pontos do prontuário/laudos sustentam sua tese?\n" +
        "3. Que diretriz ou evidência da literatura você citaria como reforço?\n" +
        "4. Como você responderia se confrontado com a tese contrária?",
    };
    const next = [...characters, newChar];
    persist(next);
    setEditingIdx(next.length - 1);
    setDraft(newChar);
  };

  const saveEdit = () => {
    if (editingIdx === null || !draft) return;
    const next = characters.map((c, i) => (i === editingIdx ? draft : c));
    persist(next);
    setEditingIdx(null);
    setDraft(null);
    toast.success("Testemunha atualizada");
  };

  const cancelEdit = () => {
    setEditingIdx(null);
    setDraft(null);
  };

  const remove = (idx: number) => {
    if (!window.confirm("Excluir esta testemunha?")) return;
    const next = characters.filter((_, i) => i !== idx);
    persist(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Testemunhas técnicas</p>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => startAdd("defense")}>
            <Plus className="h-3 w-3 mr-1" /> Defesa
          </Button>
          <Button size="sm" variant="outline" onClick={() => startAdd("prosecution")}>
            <Plus className="h-3 w-3 mr-1" /> Acusação
          </Button>
        </div>
      </div>
      {characters.length === 0 && (
        <p className="text-xs text-muted-foreground italic">Nenhuma testemunha cadastrada.</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {characters.map((char, idx) => (
          <Card key={idx} className="p-3 bg-muted/30">
            {editingIdx === idx && draft ? (
              <div className="space-y-2">
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={draft.side === "defense" ? "default" : "outline"}
                    onClick={() => setDraft({ ...draft, side: "defense" })}
                  >
                    Defesa
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={draft.side === "prosecution" ? "destructive" : "outline"}
                    onClick={() => setDraft({ ...draft, side: "prosecution" })}
                  >
                    Acusação
                  </Button>
                </div>
                <div>
                  <Label className="text-xs">Nome</Label>
                  <Input
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Profissão / Especialidade</Label>
                  <Input
                    value={draft.profession}
                    onChange={(e) => setDraft({ ...draft, profession: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Perguntas socráticas para o aluno refletir</Label>
                  <Textarea
                    value={draft.instructions}
                    onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
                    rows={6}
                    className="text-xs"
                  />
                </div>
                <div className="flex gap-1 justify-end">
                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                    <X className="h-3 w-3 mr-1" /> Cancelar
                  </Button>
                  <Button size="sm" onClick={saveEdit}>
                    <Check className="h-3 w-3 mr-1" /> Salvar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={char.side === "prosecution" ? "destructive" : "default"}>
                      {char.side === "prosecution" ? "Acusação" : "Defesa"}
                    </Badge>
                    <span className="text-sm font-medium">{char.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEdit(idx)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => remove(idx)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{char.profession}</p>
                {char.instructions && (
                  <p className="text-xs mt-1 whitespace-pre-wrap line-clamp-4">{char.instructions}</p>
                )}
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
